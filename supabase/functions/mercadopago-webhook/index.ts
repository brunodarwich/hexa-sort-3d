// supabase/functions/mercadopago-webhook/index.ts
// Recebe webhook de notificação do Mercado Pago e credita os power-ups no Supabase

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

import { verifyMercadoPagoSignature } from '../_shared/security.js';

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

    const secret = Deno.env.get('MERCADOPAGO_WEBHOOK_SECRET');
    if (!secret) return new Response('Webhook unavailable', { status: 503 });
    if (!await verifyMercadoPagoSignature(req.url, req.headers, secret)) return new Response('Invalid signature', { status: 401 });
    const url = new URL(req.url);
    const body = await req.json().catch(() => ({}));

    // Mercado Pago pode enviar ID na query string (?data.id=...&type=payment) ou no JSON
    const paymentId = url.searchParams.get('data.id');
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
      return new Response(JSON.stringify({ message: 'Pagamento indisponível' }), {
        status: 503,
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
        return new Response('Order not available; retry event', { status: 503 });
      }

      if (!order.external_order_id) return new Response('Order still processing', { status: 503 });
      if (order.status === 'paid') {
        // Já processado anteriormente (idempotência)
        return new Response(JSON.stringify({ message: 'Já processado' }), { status: 200 });
      }

      if (order.gateway !== 'mercadopago' || String(paymentData.id) !== order.external_order_id ||
          paymentData.currency_id !== order.currency || Math.round(Number(paymentData.transaction_amount) * 100) !== Math.round(Number(order.amount) * 100)) {
        return new Response('Payment mismatch', { status: 400 });
      }
      const { error } = await supabase.rpc('fulfill_payment', { p_order_id: order.id });
      if (error) throw error;
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
