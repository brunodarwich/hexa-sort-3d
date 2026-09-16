// supabase/functions/stripe-webhook/index.ts
// Recebe webhook de confirmação do Stripe Checkout e credita os power-ups no Supabase

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
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const event = await req.json();

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const playerId = session.client_reference_id || session.metadata?.playerId;
      const itemType = session.metadata?.itemType || 'pack_lightning';
      const quantity = parseInt(session.metadata?.quantity || '10', 10);

      if (playerId) {
        // Atualizar pedido
        await supabase
          .from('payment_orders')
          .update({ status: 'paid', paid_at: new Date().toISOString() })
          .eq('external_order_id', session.id);

        // Buscar inventário atual
        const { data: inv } = await supabase
          .from('player_inventory')
          .select('*')
          .eq('player_id', playerId)
          .single();

        let rerollAdd = 0;
        let lightningAdd = 0;

        if (itemType === 'pack_reroll') rerollAdd = quantity;
        else if (itemType === 'pack_lightning') lightningAdd = quantity;
        else if (itemType === 'combo_pack') {
          rerollAdd = 10;
          lightningAdd = 10;
        }

        await supabase.from('player_inventory').upsert({
          player_id: playerId,
          reroll_count: (inv?.reroll_count || 0) + rerollAdd,
          lightning_count: (inv?.lightning_count || 0) + lightningAdd,
          updated_at: new Date().toISOString()
        });

        console.log(`[Stripe Sucesso] Jogador ${playerId} creditado com +${rerollAdd} rerolls e +${lightningAdd} raios.`);
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('Erro no Stripe Webhook:', err);
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500 });
  }
});
