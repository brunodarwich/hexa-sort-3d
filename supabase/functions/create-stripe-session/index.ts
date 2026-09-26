// supabase/functions/create-stripe-session/index.ts
// Gera uma sessão de Stripe Checkout para pacotes de power-ups internacionais ($1.00)

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
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY') || '';

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
    let user;
    try { user = await requireUser(req, supabase); }
    catch { return new Response(JSON.stringify({ error: 'Entre novamente para comprar.' }), { status: 401, headers: corsHeaders }); }
    const { itemType, returnUrl } = await req.json();
    const playerId = user.id;
    const prod = getProduct(itemType);
    if (!prod?.usdCents) return new Response(JSON.stringify({ error: 'Este produto não está disponível para cartão.' }), { status: 400, headers: corsHeaders });
    const appUrl = returnUrl || Deno.env.get('APP_URL');
    if (!stripeSecretKey || !appUrl || !Deno.env.get('STRIPE_WEBHOOK_SECRET')) return new Response(JSON.stringify({ error: 'Pagamento por cartão indisponível no momento.' }), { status: 503, headers: corsHeaders });
    const successUrl = new URL('?payment=success', appUrl).href;
    const cancelUrl = new URL('?payment=cancel', appUrl).href;

    // Criar sessão de Checkout via Stripe API (urlencoded)
    const params = new URLSearchParams();
    params.append('payment_method_types[]', 'card');
    params.append('line_items[0][price_data][currency]', 'usd');
    params.append('line_items[0][price_data][product_data][name]', prod.name);
    params.append('line_items[0][price_data][unit_amount]', String(prod.usdCents));
    params.append('line_items[0][quantity]', '1');
    params.append('mode', 'payment');
    params.append('client_reference_id', playerId);
    params.append('metadata[playerId]', playerId);
    params.append('metadata[itemType]', itemType);
    params.append('metadata[quantity]', String(prod.quantity));
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

    const validPlayerId = user.id;

    const { error: profileError } = await supabase.from('players').upsert({
      id: validPlayerId,
      username: 'Jogador Internacional',
      last_active_at: new Date().toISOString()
    }, { onConflict: 'id', ignoreDuplicates: true });
    if (profileError) throw profileError;

    // Registrar ordem no Supabase
    const { error: orderError } = await supabase.from('payment_orders').insert({
      player_id: validPlayerId,
      gateway: 'stripe',
      external_order_id: sessionData.id,
      item_type: itemType,
      quantity: prod.quantity,
      amount: prod.usdCents / 100,
      currency: 'USD',
      status: 'pending'
    });

    if (orderError) throw orderError;

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
