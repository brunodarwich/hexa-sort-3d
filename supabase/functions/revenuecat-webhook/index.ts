// supabase/functions/revenuecat-webhook/index.ts
// Recebe e valida eventos de compra in-app do RevenueCat (Google Play / App Store)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getProduct } from '../_shared/catalog.js';

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const webhookSecret = Deno.env.get('REVENUECAT_WEBHOOK_SECRET');
  if (!webhookSecret) {
    console.error('REVENUECAT_WEBHOOK_SECRET não configurado.');
    return new Response(JSON.stringify({ error: 'Webhook unavailable' }), { status: 503, headers: { 'Content-Type': 'application/json' } });
  }

  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (token !== webhookSecret) {
    console.warn('Tentativa de acesso não autorizada ao webhook do RevenueCat');
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const payload = await req.json();
    const event = payload.event || payload;

    if (!event || !event.type) {
      return new Response(JSON.stringify({ received: true, ignored: 'No event data' }), { status: 200 });
    }

    // Suporte ao evento de teste de webhook do painel do RevenueCat
    if (event.type === 'TEST') {
      return new Response(JSON.stringify({ received: true, test: true }), { status: 200 });
    }

    // Processar apenas compras consumíveis ou iniciais
    const allowedTypes = ['NON_RENEWING_PURCHASE', 'INITIAL_PURCHASE'];
    if (!allowedTypes.includes(event.type)) {
      return new Response(JSON.stringify({ received: true, ignored: event.type }), { status: 200 });
    }

    const playerId = event.app_user_id;
    const productId = event.product_id;
    const transactionId = event.transaction_id || event.id;

    if (!playerId || !productId || !transactionId) {
      console.warn('Evento RevenueCat sem campos obrigatórios:', { playerId, productId, transactionId });
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
    }

    const prod = getProduct(productId);
    if (!prod) {
      console.warn(`Produto não reconhecido no catálogo: ${productId}`);
      return new Response(JSON.stringify({ error: 'Unknown product' }), { status: 400 });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    );

    // Garantir registro do jogador
    await supabase.from('players').upsert({
      id: playerId,
      username: 'Jogador Mobile',
      last_active_at: new Date().toISOString()
    }, { onConflict: 'id', ignoreDuplicates: true });

    // Inserir ou recuperar a ordem para garantir idempotência
    const { data: order, error: orderError } = await supabase.from('payment_orders').upsert({
      player_id: playerId,
      gateway: 'revenuecat',
      external_order_id: transactionId,
      item_type: productId,
      quantity: prod.quantity,
      amount: event.price_in_purchased_currency || (prod.usdCents ? prod.usdCents / 100 : 0.99),
      currency: event.currency || 'USD',
      status: 'pending'
    }, { onConflict: 'external_order_id' }).select().single();

    if (orderError || !order) {
      console.error('Erro ao registrar ordem do RevenueCat:', orderError);
      return new Response(JSON.stringify({ error: 'Failed to record order' }), { status: 500 });
    }

    // Execução atômica da entrega dos power-ups
    const { error: fulfillError } = await supabase.rpc('fulfill_payment', { p_order_id: order.id });
    if (fulfillError) {
      console.error('Erro ao executar fulfill_payment para RevenueCat:', fulfillError);
      return new Response(JSON.stringify({ error: 'Fulfillment failed' }), { status: 500 });
    }

    return new Response(JSON.stringify({ success: true, delivered: true, orderId: order.id }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('Falha geral no webhook RevenueCat:', err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
