// supabase/functions/create-pix-order/index.ts
// Cria uma ordem de pagamento Pix no Mercado Pago e registra no Supabase

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PRICING_BRL: Record<string, { amount: number; qty: number; name: string }> = {
  reroll: { amount: 0.25, qty: 1, name: 'Atualizar Deque (1x)' },
  lightning: { amount: 0.25, qty: 1, name: 'Raio Destruidor (1x)' },
  pack_reroll: { amount: 2.50, qty: 10, name: 'Pacote Atualizar Deque (10x)' },
  pack_lightning: { amount: 2.50, qty: 10, name: 'Pacote Raio (10x)' },
  combo_pack: { amount: 4.50, qty: 10, name: 'Combo Mestre (10x Raios + 10x Atualizações)' }
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

    const body = await req.json();
    const { playerId, itemType = 'lightning', recoveryEmail } = body;

    if (!playerId) {
      return new Response(
        JSON.stringify({ error: 'playerId é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const itemConfig = PRICING_BRL[itemType] || PRICING_BRL.lightning;
    const amount = itemConfig.amount;
    const quantity = itemConfig.qty;

    // Validar formato UUID (ou gerar um UUID válido)
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(playerId);
    const validPlayerId = isUuid ? playerId : crypto.randomUUID();

    // Garantir que o jogador exista na tabela players para satisfazer a foreign key
    await supabase.from('players').upsert({
      id: validPlayerId,
      username: recoveryEmail ? recoveryEmail.split('@')[0] : 'Jogador',
      email: recoveryEmail || null,
      last_active_at: new Date().toISOString()
    }, { onConflict: 'id' });

    const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    // 0. Expirar pedidos pendentes antigos do jogador (mais de 1 hora)
    await supabase
      .from('payment_orders')
      .update({ status: 'expired' })
      .eq('player_id', validPlayerId)
      .eq('status', 'pending')
      .lt('created_at', oneHourAgo);

    // 1. Verificar se já existe pedido pendente recente (últimos 15 min) para reaproveitar
    const { data: existingOrder } = await supabase
      .from('payment_orders')
      .select('*')
      .eq('player_id', validPlayerId)
      .eq('item_type', itemType)
      .eq('gateway', 'mercadopago')
      .eq('status', 'pending')
      .gte('created_at', fifteenMinAgo)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingOrder && existingOrder.qr_code) {
      return new Response(
        JSON.stringify({
          orderId: existingOrder.id,
          externalId: existingOrder.external_order_id,
          amount: Number(existingOrder.amount),
          itemName: itemConfig.name,
          qrCode: existingOrder.qr_code,
          qrCodeBase64: existingOrder.qr_code_base64 || null,
          isSandbox: !mpAccessToken,
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

    // 3. Se o Access Token do Mercado Pago não estiver configurado, retorna modo simulado para testes locais
    if (!mpAccessToken) {
      const mockQrCode = `00020126580014br.gov.bcb.pix0136hexasort3d-demo-${order.id}520400005303986540${amount.toFixed(2)}5802BR5912HexaSort3D6009SaoPaulo62070503***6304ABCD`;
      
      // Salvar mockQrCode no banco para poder ser reutilizado durante os 15 min
      await supabase
        .from('payment_orders')
        .update({ qr_code: mockQrCode })
        .eq('id', order.id);

      return new Response(
        JSON.stringify({
          orderId: order.id,
          amount: amount,
          itemName: itemConfig.name,
          qrCode: mockQrCode,
          qrCodeBase64: null,
          isSandbox: true,
          message: 'MERCADOPAGO_ACCESS_TOKEN não configurado nas Secrets do Supabase. Modo demonstração ativado.'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
