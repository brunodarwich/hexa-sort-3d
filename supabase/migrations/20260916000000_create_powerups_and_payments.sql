-- Migration: 20260916000000_create_powerups_and_payments.sql
-- Description: Schema para Power-ups (Reroll, Raio), Inventário de Jogadores e Pedidos de Pagamento (Mercado Pago Pix e Stripe)

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

-- 5. Habilitar Row Level Security (RLS)
ALTER TABLE public.player_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;

-- Políticas para player_inventory
CREATE POLICY "Permitir leitura pública/autenticada do próprio inventário"
ON public.player_inventory
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Permitir criação inicial de inventário"
ON public.player_inventory
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Permitir atualização de inventário via backend"
ON public.player_inventory
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Políticas para payment_orders
CREATE POLICY "Permitir leitura de pedidos pelo cliente"
ON public.payment_orders
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Permitir inserção de pedidos pelo cliente ou edge function"
ON public.payment_orders
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Permitir atualização de pedidos via webhook"
ON public.payment_orders
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- 6. Adicionar tabelas à Publicação Realtime do Supabase
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
