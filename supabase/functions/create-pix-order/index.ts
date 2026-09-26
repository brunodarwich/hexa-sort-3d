// supabase/functions/create-pix-order/index.ts
// Cria uma ordem de pagamento Pix no Mercado Pago e registra no Supabase

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

import { requireUser } from '../_shared/security.js';
import { getProduct } from '../_shared/catalog.js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const mpAccessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN') || '';

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
    let user;
    try { user = await requireUser(req, supabase); }
    catch { return new Response(JSON.stringify({ error: 'Entre novamente para comprar.' }), { status: 401, headers: corsHeaders }); }
    if (!mpAccessToken || !Deno.env.get('MERCADOPAGO_WEBHOOK_SECRET')) return new Response(JSON.stringify({ error: 'Pix indisponível no momento. Nenhuma cobrança foi criada.' }), { status: 503, headers: corsHeaders });
    const { itemType, forceNew } = await req.json();
    const itemConfig = getProduct(itemType);
    if (!itemConfig) return new Response(JSON.stringify({ error: 'Produto inválido.' }), { status: 400, headers: corsHeaders });
    const amount = itemConfig.brlCents / 100;
    const quantity = itemConfig.quantity;
    const validPlayerId = user.id;
    const recoveryEmail = user.email || '';
    const { error: profileError } = await supabase.from('players').upsert({
      id: user.id, username: user.user_metadata?.full_name || 'Jogador',
      email: user.email || null, last_active_at: new Date().toISOString()
    }, { onConflict: 'id', ignoreDuplicates: true });
    if (profileError) throw profileError;

    const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    // 0. Expirar pedidos pendentes antigos do jogador (mais de 1 hora ou se solicitado forceNew)
    if (forceNew) {
      await supabase
        .from('payment_orders')
        .update({ status: 'expired' })
        .eq('player_id', validPlayerId)
        .eq('item_type', itemType)
        .eq('gateway', 'mercadopago')
        .eq('status', 'pending');
    } else {
      await supabase
        .from('payment_orders')
        .update({ status: 'expired' })
        .eq('player_id', validPlayerId)
        .eq('status', 'pending')
        .lt('created_at', oneHourAgo);
    }

    // 1. Verificar se já existe pedido pendente recente (últimos 15 min) para reaproveitar (se não for forceNew)
    let existingOrder = null;
    if (!forceNew) {
      const { data } = await supabase
        .from('payment_orders')
        .select('*')
        .eq('player_id', validPlayerId)
        .eq('item_type', itemType)
        .eq('gateway', 'mercadopago')
        .eq('quantity', quantity)
        .eq('amount', amount)
        .eq('status', 'pending')
        .gte('created_at', fifteenMinAgo)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      existingOrder = data;
    }

    if (existingOrder && existingOrder.external_order_id && existingOrder.qr_code) {
      return new Response(
        JSON.stringify({
          orderId: existingOrder.id,
          externalId: existingOrder.external_order_id,
          amount: Number(existingOrder.amount),
          itemName: itemConfig.name,
          qrCode: existingOrder.qr_code,
          qrCodeBase64: existingOrder.qr_code_base64 || null,
          isSandbox: false,
          reused: true
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Criar nova ordem pendente no Supabase se não houver recente
    const { data: order, error: orderError } = await supabase
      .from('payment_orders')
      .insert({
        player_id: validPlayerId,
        gateway: 'mercadopago',
        item_type: itemType,
        quantity: quantity,
        amount: amount,
        currency: 'BRL',
        status: 'pending'
      })
      .select()
      .single();

    if (orderError) {
      console.error('Erro ao registrar ordem:', orderError);
      return new Response(
        JSON.stringify({ error: 'Erro ao registrar pedido', details: orderError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Chamada real à API do Mercado Pago
    const webhookUrl = `${supabaseUrl}/functions/v1/mercadopago-webhook`;
    const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mpAccessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': order.id
      },
      body: JSON.stringify({
        transaction_amount: amount,
        description: `Hexa Infinity - ${itemConfig.name}`,
        payment_method_id: 'pix',
        payer: {
          email: recoveryEmail || 'jogador@hexainfinity.com',
          first_name: 'Jogador',
          last_name: 'HexaInfinity'
        },
        external_reference: order.id,
        notification_url: webhookUrl
      })
    });

    const mpData = await mpResponse.json();

    if (!mpResponse.ok) {
      console.error('Erro na resposta do Mercado Pago:', mpData);
      return new Response(
        JSON.stringify({ error: 'Falha ao gerar Pix no Mercado Pago', details: mpData }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const pixInfo = mpData.point_of_interaction?.transaction_data;
    const qrCode = pixInfo?.qr_code || '';
    const qrCodeBase64 = pixInfo?.qr_code_base64 || '';
    const externalId = String(mpData.id);

    // 5. Atualizar registro com o código Pix
    await supabase
      .from('payment_orders')
      .update({
        external_order_id: externalId,
        qr_code: qrCode,
        qr_code_base64: qrCodeBase64
      })
      .eq('id', order.id);

    return new Response(
      JSON.stringify({
        orderId: order.id,
        externalId: externalId,
        amount: amount,
        itemName: itemConfig.name,
        qrCode: qrCode,
        qrCodeBase64: qrCodeBase64,
        isSandbox: false
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Exceção ao criar Pix:', err);
    return new Response(
      JSON.stringify({ error: 'Erro interno ao criar pedido Pix', message: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
