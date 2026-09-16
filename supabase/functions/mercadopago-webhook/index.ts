// supabase/functions/mercadopago-webhook/index.ts
// Recebe webhook de notificação do Mercado Pago e credita os power-ups no Supabase

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

    const url = new URL(req.url);
    const body = await req.json().catch(() => ({}));

    // Suporte a simulação de teste direto do cliente (para desenvolvimento)
    if (body.action === 'simulate_test_payment' && body.orderId) {
      const { data: order, error: findError } = await supabase
        .from('payment_orders')
        .select('*')
        .eq('id', body.orderId)
        .single();

      if (findError || !order) {
        return new Response(JSON.stringify({ error: 'Ordem não encontrada' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      await creditPlayerInventory(supabase, order);
      return new Response(JSON.stringify({ success: true, simulated: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Mercado Pago pode enviar ID na query string (?data.id=...&type=payment) ou no JSON
    const paymentId = body?.data?.id || url.searchParams.get('data.id') || url.searchParams.get('id');
    const topic = body?.type || body?.topic || url.searchParams.get('type') || url.searchParams.get('topic');

    if (!paymentId || (topic && topic !== 'payment')) {
      return new Response(JSON.stringify({ message: 'Evento ignorado' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Consultar dados do pagamento no Mercado Pago
    if (!mpAccessToken) {
      console.warn('MERCADOPAGO_ACCESS_TOKEN não configurado para validar webhook.');
      return new Response(JSON.stringify({ message: 'Aguardando configuração de token' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { 'Authorization': `Bearer ${mpAccessToken}` }
    });

    if (!mpRes.ok) {
      console.error(`Erro ao consultar pagamento ${paymentId}:`, await mpRes.text());
      return new Response(JSON.stringify({ error: 'Erro ao consultar MP' }), { status: 500 });
    }

    const paymentData = await mpRes.json();

    if (paymentData.status === 'approved') {
      const externalRef = paymentData.external_reference; // É o order.id
      let query = supabase.from('payment_orders').select('*');
      
      if (externalRef) {
        query = query.eq('id', externalRef);
      } else {
        query = query.eq('external_order_id', String(paymentId));
      }

      const { data: order, error: orderErr } = await query.single();

      if (orderErr || !order) {
        console.error('Ordem correspondente não encontrada:', externalRef || paymentId);
        return new Response(JSON.stringify({ message: 'Ordem não encontrada' }), { status: 200 });
      }

      if (order.status === 'paid') {
        // Já processado anteriormente (idempotência)
        return new Response(JSON.stringify({ message: 'Já processado' }), { status: 200 });
      }

      await creditPlayerInventory(supabase, order);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('Erro no webhook do Mercado Pago:', err);
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500 });
  }
});

async function creditPlayerInventory(supabase: any, order: any) {
  // 1. Atualizar ordem para 'paid'
  await supabase
    .from('payment_orders')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString()
    })
    .eq('id', order.id);

  // 2. Buscar inventário atual do jogador
  const { data: currentInv } = await supabase
    .from('player_inventory')
    .select('*')
    .eq('player_id', order.player_id)
    .single();

  let rerollAdd = 0;
  let lightningAdd = 0;

  if (order.item_type === 'reroll' || order.item_type === 'pack_reroll') {
    rerollAdd = order.quantity;
  } else if (order.item_type === 'lightning' || order.item_type === 'pack_lightning') {
    lightningAdd = order.quantity;
  } else if (order.item_type === 'combo_pack') {
    rerollAdd = 10;
    lightningAdd = 10;
  }

  const newReroll = (currentInv?.reroll_count || 0) + rerollAdd;
  const newLightning = (currentInv?.lightning_count || 0) + lightningAdd;

  await supabase
    .from('player_inventory')
    .upsert({
      player_id: order.player_id,
      reroll_count: newReroll,
      lightning_count: newLightning,
      updated_at: new Date().toISOString()
    });

  console.log(`[Inventário Atualizado] Jogador: ${order.player_id} | +${rerollAdd} rerolls, +${lightningAdd} raios.`);
}
