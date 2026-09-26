import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifyStripeSignature } from '../_shared/security.js';

serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const secret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  if (!secret) return new Response('Webhook unavailable', { status: 503 });
  const raw = await req.text();
  if (!await verifyStripeSignature(raw, req.headers.get('stripe-signature'), secret)) {
    return new Response('Invalid signature', { status: 400 });
  }
  try {
    const event = JSON.parse(raw);
    if (!['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(event.type)) {
      return Response.json({ received: true });
    }
    const session = event.data.object;
    if (session.payment_status !== 'paid') return Response.json({ received: true });
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: order, error } = await supabase.from('payment_orders').select('*')
      .eq('external_order_id', session.id).single();
    if (error || !order) throw new Error('Order not available; retry event');
    if (order.gateway !== 'stripe' || order.player_id !== session.client_reference_id ||
        order.currency.toLowerCase() !== session.currency || Math.round(Number(order.amount) * 100) !== session.amount_total) {
      return new Response('Payment mismatch', { status: 400 });
    }
    const { error: creditError } = await supabase.rpc('fulfill_payment', { p_order_id: order.id });
    if (creditError) throw creditError;
    return Response.json({ received: true });
  } catch (error) {
    console.error('Stripe fulfillment failed', error);
    return new Response('Unable to process event', { status: 500 });
  }
});
