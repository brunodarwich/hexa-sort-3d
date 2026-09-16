// supabase/functions/create-stripe-session/index.ts
// Gera uma sessão de Stripe Checkout para pacotes de power-ups internacionais ($1.00)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const STRIPE_PRODUCTS_USD: Record<string, { amountCents: number; name: string; qty: number }> = {
  pack_reroll: { amountCents: 100, name: 'Hexa Sort 3D - 10x Deck Re-rolls', qty: 10 },
  pack_lightning: { amountCents: 100, name: 'Hexa Sort 3D - 10x Lightning Strikes', qty: 10 },
  combo_pack: { amountCents: 180, name: 'Hexa Sort 3D - Master Combo (10x Strikes + 10x Re-rolls)', qty: 10 }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY') || '';

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { playerId, itemType = 'pack_lightning', successUrl, cancelUrl } = await req.json();

    if (!playerId) {
      return new Response(JSON.stringify({ error: 'playerId é obrigatório' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const prod = STRIPE_PRODUCTS_USD[itemType] || STRIPE_PRODUCTS_USD.pack_lightning;

    // Se Stripe Secret Key ainda não foi configurada, informa modo demonstração
    if (!stripeSecretKey) {
      return new Response(
        JSON.stringify({
          isSandbox: true,
          message: 'STRIPE_SECRET_KEY não configurada nas Secrets do Supabase.',
          mockSuccess: true
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Criar sessão de Checkout via Stripe API (urlencoded)
    const params = new URLSearchParams();
    params.append('payment_method_types[]', 'card');
    params.append('line_items[0][price_data][currency]', 'usd');
    params.append('line_items[0][price_data][product_data][name]', prod.name);
    params.append('line_items[0][price_data][unit_amount]', String(prod.amountCents));
    params.append('line_items[0][quantity]', '1');
    params.append('mode', 'payment');
    params.append('client_reference_id', playerId);
    params.append('metadata[playerId]', playerId);
    params.append('metadata[itemType]', itemType);
    params.append('metadata[quantity]', String(prod.qty));
    params.append('success_url', successUrl || 'https://hexasort.game/?payment=success');
    params.append('cancel_url', cancelUrl || 'https://hexasort.game/?payment=cancel');

    const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    const sessionData = await stripeRes.json();

    if (!stripeRes.ok) {
      return new Response(JSON.stringify({ error: sessionData }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(playerId);
    const validPlayerId = isUuid ? playerId : crypto.randomUUID();

    await supabase.from('players').upsert({
      id: validPlayerId,
      username: 'Jogador Internacional',
      last_active_at: new Date().toISOString()
    }, { onConflict: 'id' });

    // Registrar ordem no Supabase
    await supabase.from('payment_orders').insert({
      player_id: validPlayerId,
      gateway: 'stripe',
      external_order_id: sessionData.id,
      item_type: itemType,
      quantity: prod.qty,
      amount: prod.amountCents / 100,
      currency: 'USD',
      status: 'pending'
    });

    return new Response(JSON.stringify({ url: sessionData.url, sessionId: sessionData.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
