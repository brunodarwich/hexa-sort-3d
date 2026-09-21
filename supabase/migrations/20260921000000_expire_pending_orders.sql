-- Migration: 20260921000000_expire_pending_orders.sql
-- Description: Atualizar pedidos pendentes antigos para expirados e criar função de limpeza

-- 1. Atualizar pedidos pendentes com mais de 1 hora para 'expired'
UPDATE public.payment_orders
SET status = 'expired'
WHERE status = 'pending'
  AND created_at < NOW() - INTERVAL '1 hour';

-- 2. Função utilitária para expirar pedidos pendentes antigos
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
