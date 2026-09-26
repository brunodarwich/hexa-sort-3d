-- ====================================================================
-- HEXA INFINITY — SCRIPT DE MIGRAÇÃO CONSOLIDADA PARA PRODUÇÃO
-- Execute este script no SQL Editor do Supabase (https://supabase.com/dashboard)
-- Projeto: wlqtezyjfkmzgmjsrnay
-- ====================================================================

-- --------------------------------------------------------------------
-- ETAPA 1: 20260915184500_create_leaderboard_schema.sql
-- --------------------------------------------------------------------

-- 1. Tabela de Jogadores (Identidade / Perfil)
CREATE TABLE IF NOT EXISTS public.players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) NOT NULL,
    avatar_emoji VARCHAR(10) DEFAULT '🎮',
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    last_active_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. Tabela de Partidas / Pontuações
CREATE TABLE IF NOT EXISTS public.game_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID REFERENCES public.players(id) ON DELETE SET NULL,
    player_name VARCHAR(50) NOT NULL,
    score INTEGER NOT NULL CHECK (score >= 0),
    time_seconds INTEGER NOT NULL CHECK (time_seconds >= 0),
    clears INTEGER NOT NULL DEFAULT 0 CHECK (clears >= 0),
    combo INTEGER NOT NULL DEFAULT 1 CHECK (combo >= 1),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 3. Índices de Alta Performance para o Ranking
CREATE INDEX IF NOT EXISTS idx_game_sessions_score_desc 
ON public.game_sessions (score DESC, time_seconds ASC, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_game_sessions_player_id 
ON public.game_sessions (player_id);

-- 4. View de Ranking Global (Top Scores únicos por jogador ou melhor partida)
CREATE OR REPLACE VIEW public.global_leaderboard AS
SELECT 
    gs.id,
    gs.player_id,
    gs.player_name,
    gs.score,
    gs.time_seconds,
    gs.clears,
    gs.combo,
    gs.created_at,
    RANK() OVER (ORDER BY gs.score DESC, gs.time_seconds ASC) AS rank
FROM public.game_sessions gs
ORDER BY gs.score DESC, gs.time_seconds ASC;

-- Habilitar RLS
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------------------------------
-- ETAPA 2: 20260916000000_create_powerups_and_payments.sql
-- --------------------------------------------------------------------

-- 1. Atualizar Tabela de Jogadores com colunas de perfil Google
ALTER TABLE public.players 
ADD COLUMN IF NOT EXISTS email VARCHAR(255),
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2. Tabela de Inventário de Power-ups do Jogador
CREATE TABLE IF NOT EXISTS public.player_inventory (
    player_id UUID PRIMARY KEY REFERENCES public.players(id) ON DELETE CASCADE,
    reroll_count INTEGER NOT NULL DEFAULT 0 CHECK (reroll_count >= 0),
    lightning_count INTEGER NOT NULL DEFAULT 0 CHECK (lightning_count >= 0),
    recovery_email VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 3. Tabela de Pedidos de Pagamento (Pix & Stripe)
CREATE TABLE IF NOT EXISTS public.payment_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID REFERENCES public.players(id) ON DELETE CASCADE,
    gateway VARCHAR(30) NOT NULL, -- 'mercadopago' ou 'stripe'
    external_order_id VARCHAR(100) UNIQUE,
    item_type VARCHAR(50) NOT NULL, -- 'reroll', 'lightning', 'pack_reroll', 'pack_lightning', 'combo_pack'
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(10) NOT NULL DEFAULT 'BRL', -- 'BRL' ou 'USD'
    status VARCHAR(30) NOT NULL DEFAULT 'pending', -- 'pending', 'paid', 'expired', 'refunded'
    qr_code TEXT,
    qr_code_base64 TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    paid_at TIMESTAMPTZ
);

-- 4. Índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_payment_orders_player_id ON public.payment_orders (player_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_status ON public.payment_orders (status);
CREATE INDEX IF NOT EXISTS idx_payment_orders_external_id ON public.payment_orders (external_order_id);

-- Habilitar RLS
ALTER TABLE public.player_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;

-- Adicionar tabelas à Publicação Realtime do Supabase
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'payment_orders'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_orders;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'player_inventory'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.player_inventory;
    END IF;
END $$;

-- --------------------------------------------------------------------
-- ETAPA 3: 20260921000000_expire_pending_orders.sql
-- --------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.expire_old_payment_orders()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    affected_rows INTEGER;
BEGIN
    UPDATE public.payment_orders
    SET status = 'expired'
    WHERE status = 'pending'
      AND created_at < NOW() - INTERVAL '1 hour';
      
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    RETURN affected_rows;
END;
$$;

-- --------------------------------------------------------------------
-- ETAPA 4: 20260922000000_secure_data_access.sql
-- --------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
  SELECT coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin';
$$;

DO $$ DECLARE p record; BEGIN
  FOR p IN SELECT tablename, policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename IN ('players','game_sessions','player_inventory','payment_orders')
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p.policyname, p.tablename); END LOOP;
END $$;

REVOKE ALL ON public.players, public.game_sessions, public.player_inventory, public.payment_orders FROM anon, authenticated;
GRANT SELECT ON public.players, public.player_inventory, public.payment_orders TO authenticated;
GRANT INSERT (id, username, avatar_emoji, last_active_at), UPDATE (id, username, avatar_emoji, last_active_at) ON public.players TO authenticated;
GRANT SELECT ON public.game_sessions TO anon, authenticated;
GRANT INSERT ON public.game_sessions TO authenticated;

CREATE POLICY players_read ON public.players FOR SELECT TO authenticated USING (id = auth.uid() OR public.is_admin());
CREATE POLICY players_insert ON public.players FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY players_update ON public.players FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY sessions_read ON public.game_sessions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY sessions_insert ON public.game_sessions FOR INSERT TO authenticated WITH CHECK (player_id = auth.uid());
CREATE POLICY inventory_read ON public.player_inventory FOR SELECT TO authenticated USING (player_id = auth.uid() OR public.is_admin());
CREATE POLICY orders_read ON public.payment_orders FOR SELECT TO authenticated USING (player_id = auth.uid() OR public.is_admin());
ALTER VIEW public.global_leaderboard SET (security_invoker = true);

-- Tabela de auditoria de eventos de inventário
CREATE TABLE IF NOT EXISTS public.inventory_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  order_id UUID UNIQUE REFERENCES public.payment_orders(id),
  reason TEXT NOT NULL CHECK (reason IN ('purchase', 'consumption')),
  reroll_delta INTEGER NOT NULL DEFAULT 0,
  lightning_delta INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS inventory_events_player_date ON public.inventory_events(player_id, created_at DESC);
ALTER TABLE public.inventory_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.inventory_events FROM anon, authenticated;
GRANT SELECT ON public.inventory_events TO authenticated;
DROP POLICY IF EXISTS events_read ON public.inventory_events;
CREATE POLICY events_read ON public.inventory_events FOR SELECT TO authenticated USING (player_id = auth.uid() OR public.is_admin());

-- Débito atômico de power-up
CREATE OR REPLACE FUNCTION public.consume_powerup(p_type TEXT) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE result public.player_inventory;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_type = 'reroll' THEN
    UPDATE public.player_inventory SET reroll_count = reroll_count - 1, updated_at = now()
      WHERE player_id = auth.uid() AND reroll_count > 0 RETURNING * INTO result;
  ELSIF p_type = 'lightning' THEN
    UPDATE public.player_inventory SET lightning_count = lightning_count - 1, updated_at = now()
      WHERE player_id = auth.uid() AND lightning_count > 0 RETURNING * INTO result;
  ELSE RAISE EXCEPTION 'Invalid power-up'; END IF;
  IF result.player_id IS NULL THEN RAISE EXCEPTION 'Insufficient balance'; END IF;
  INSERT INTO public.inventory_events(player_id, reason, reroll_delta, lightning_delta)
    VALUES (auth.uid(), 'consumption', CASE WHEN p_type = 'reroll' THEN -1 ELSE 0 END, CASE WHEN p_type = 'lightning' THEN -1 ELSE 0 END);
  RETURN jsonb_build_object('reroll', result.reroll_count, 'lightning', result.lightning_count);
END $$;
REVOKE ALL ON FUNCTION public.consume_powerup(TEXT) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.consume_powerup(TEXT) TO authenticated;

-- Entrega transacional e idempotente de pagamentos
CREATE OR REPLACE FUNCTION public.fulfill_payment(p_order_id UUID) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE o public.payment_orders; r INTEGER := 0; l INTEGER := 0;
BEGIN
  SELECT * INTO o FROM public.payment_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF o.status = 'paid' THEN RETURN false; END IF;
  IF o.status NOT IN ('pending', 'expired') THEN RAISE EXCEPTION 'Invalid order status'; END IF;
  IF o.item_type IN ('reroll','pack_reroll','combo_pack') THEN r := o.quantity; END IF;
  IF o.item_type IN ('lightning','pack_lightning','combo_pack') THEN l := o.quantity; END IF;
  IF r + l = 0 THEN RAISE EXCEPTION 'Invalid product'; END IF;
  INSERT INTO public.player_inventory (player_id, reroll_count, lightning_count)
    VALUES (o.player_id, r, l)
    ON CONFLICT (player_id) DO UPDATE SET
      reroll_count = public.player_inventory.reroll_count + excluded.reroll_count,
      lightning_count = public.player_inventory.lightning_count + excluded.lightning_count,
      updated_at = now();
  INSERT INTO public.inventory_events(player_id, order_id, reason, reroll_delta, lightning_delta)
    VALUES (o.player_id, o.id, 'purchase', r, l);
  UPDATE public.payment_orders SET status = 'paid', paid_at = now() WHERE id = o.id;
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.fulfill_payment(UUID) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fulfill_payment(UUID) TO service_role;
REVOKE ALL ON FUNCTION public.expire_old_payment_orders() FROM public, anon, authenticated;
ALTER FUNCTION public.expire_old_payment_orders() SET search_path = public;
GRANT EXECUTE ON FUNCTION public.expire_old_payment_orders() TO service_role;

-- --------------------------------------------------------------------
-- ETAPA 5: 20260923000000_account_merge_and_revenuecat.sql
-- --------------------------------------------------------------------

ALTER TABLE public.inventory_events DROP CONSTRAINT IF EXISTS inventory_events_reason_check;
ALTER TABLE public.inventory_events ADD CONSTRAINT inventory_events_reason_check CHECK (reason IN ('purchase', 'consumption', 'merge_credit', 'merge_debit'));

CREATE OR REPLACE FUNCTION public.merge_player_accounts(p_guest_id UUID, p_target_id UUID)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  guest_inv public.player_inventory;
  transferred_reroll INTEGER := 0;
  transferred_lightning INTEGER := 0;
BEGIN
  IF p_guest_id IS NULL OR p_target_id IS NULL THEN
    RAISE EXCEPTION 'Both guest_id and target_id are required';
  END IF;
  
  IF p_guest_id = p_target_id THEN
    RETURN jsonb_build_object('success', true, 'message', 'Same account, no merge needed');
  END IF;

  IF auth.uid() IS NOT NULL AND auth.uid() != p_target_id AND auth.uid() != p_guest_id AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized to merge these accounts';
  END IF;

  SELECT * INTO guest_inv FROM public.player_inventory WHERE player_id = p_guest_id FOR UPDATE;

  IF FOUND THEN
    transferred_reroll := coalesce(guest_inv.reroll_count, 0);
    transferred_lightning := coalesce(guest_inv.lightning_count, 0);

    IF transferred_reroll > 0 OR transferred_lightning > 0 THEN
      INSERT INTO public.player_inventory (player_id, reroll_count, lightning_count, updated_at)
      VALUES (p_target_id, transferred_reroll, transferred_lightning, now())
      ON CONFLICT (player_id) DO UPDATE SET
        reroll_count = public.player_inventory.reroll_count + excluded.reroll_count,
        lightning_count = public.player_inventory.lightning_count + excluded.lightning_count,
        updated_at = now();

      UPDATE public.player_inventory
      SET reroll_count = 0, lightning_count = 0, updated_at = now()
      WHERE player_id = p_guest_id;

      INSERT INTO public.inventory_events (player_id, reason, reroll_delta, lightning_delta)
      VALUES (p_target_id, 'merge_credit', transferred_reroll, transferred_lightning);

      INSERT INTO public.inventory_events (player_id, reason, reroll_delta, lightning_delta)
      VALUES (p_guest_id, 'merge_debit', -transferred_reroll, -transferred_lightning);
    END IF;
  END IF;

  UPDATE public.game_sessions SET player_id = p_target_id WHERE player_id = p_guest_id;
  UPDATE public.payment_orders SET player_id = p_target_id WHERE player_id = p_guest_id;
  UPDATE public.inventory_events SET player_id = p_target_id WHERE player_id = p_guest_id;

  RETURN jsonb_build_object(
    'success', true,
    'guest_id', p_guest_id,
    'target_id', p_target_id,
    'reroll_transferred', transferred_reroll,
    'lightning_transferred', transferred_lightning
  );
END $$;

REVOKE ALL ON FUNCTION public.merge_player_accounts(UUID, UUID) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.merge_player_accounts(UUID, UUID) TO authenticated, service_role;

-- --------------------------------------------------------------------
-- ETAPA 6: 20260924000000_ranking_avatar_support.sql
-- --------------------------------------------------------------------

ALTER TABLE public.players ADD COLUMN IF NOT EXISTS avatar_url TEXT;

GRANT INSERT (id, username, avatar_emoji, avatar_url, last_active_at), 
      UPDATE (id, username, avatar_emoji, avatar_url, last_active_at) 
ON public.players TO authenticated;

DROP POLICY IF EXISTS players_read ON public.players;
CREATE POLICY players_read ON public.players FOR SELECT TO authenticated USING (id = auth.uid() OR public.is_admin());
GRANT SELECT ON public.players TO authenticated;

DROP VIEW IF EXISTS public.global_leaderboard CASCADE;

CREATE VIEW public.global_leaderboard AS
SELECT 
    gs.id,
    gs.player_id,
    gs.player_name,
    gs.score,
    gs.time_seconds,
    gs.clears,
    gs.combo,
    gs.created_at,
    p.avatar_url,
    RANK() OVER (ORDER BY gs.score DESC, gs.time_seconds ASC) AS rank
FROM public.game_sessions gs
LEFT JOIN public.players p ON p.id = gs.player_id
ORDER BY gs.score DESC, gs.time_seconds ASC;

GRANT SELECT ON public.global_leaderboard TO anon, authenticated;

