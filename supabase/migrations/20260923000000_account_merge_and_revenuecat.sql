-- Migration: 20260923000000_account_merge_and_revenuecat.sql
-- Description: RPC merge_player_accounts para unificação de convidados com contas Google e suporte a RevenueCat

-- 1. Ajustar constraint da tabela inventory_events para permitir razões de fusão de contas
alter table public.inventory_events drop constraint if exists inventory_events_reason_check;
alter table public.inventory_events add constraint inventory_events_reason_check check (reason in ('purchase', 'consumption', 'merge_credit', 'merge_debit'));

-- 2. Função RPC para fusão atômica de contas de jogadores
create or replace function public.merge_player_accounts(p_guest_id uuid, p_target_id uuid)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  guest_inv public.player_inventory;
  transferred_reroll integer := 0;
  transferred_lightning integer := 0;
begin
  -- Validação de parâmetros
  if p_guest_id is null or p_target_id is null then
    raise exception 'Both guest_id and target_id are required';
  end if;
  
  if p_guest_id = p_target_id then
    return jsonb_build_object('success', true, 'message', 'Same account, no merge needed');
  end if;

  -- Apenas o próprio usuário autenticado (ou service_role/admin) pode disparar o merge
  if auth.uid() is not null and auth.uid() != p_target_id and auth.uid() != p_guest_id and not public.is_admin() then
    raise exception 'Unauthorized to merge these accounts';
  end if;

  -- Bloquear e obter inventário do convidado
  select * into guest_inv from public.player_inventory where player_id = p_guest_id for update;

  if found then
    transferred_reroll := coalesce(guest_inv.reroll_count, 0);
    transferred_lightning := coalesce(guest_inv.lightning_count, 0);

    if transferred_reroll > 0 or transferred_lightning > 0 then
      -- Adicionar saldo na conta alvo
      insert into public.player_inventory (player_id, reroll_count, lightning_count, updated_at)
      values (p_target_id, transferred_reroll, transferred_lightning, now())
      on conflict (player_id) do update set
        reroll_count = public.player_inventory.reroll_count + excluded.reroll_count,
        lightning_count = public.player_inventory.lightning_count + excluded.lightning_count,
        updated_at = now();

      -- Zerar o inventário do convidado
      update public.player_inventory
      set reroll_count = 0, lightning_count = 0, updated_at = now()
      where player_id = p_guest_id;

      -- Registrar auditoria em inventory_events
      insert into public.inventory_events (player_id, reason, reroll_delta, lightning_delta)
      values (p_target_id, 'merge_credit', transferred_reroll, transferred_lightning);

      insert into public.inventory_events (player_id, reason, reroll_delta, lightning_delta)
      values (p_guest_id, 'merge_debit', -transferred_reroll, -transferred_lightning);
    end if;
  end if;

  -- Migrar histórico de game_sessions
  update public.game_sessions set player_id = p_target_id where player_id = p_guest_id;

  -- Migrar histórico de payment_orders
  update public.payment_orders set player_id = p_target_id where player_id = p_guest_id;

  -- Migrar eventos de auditoria restantes
  update public.inventory_events set player_id = p_target_id where player_id = p_guest_id;

  return jsonb_build_object(
    'success', true,
    'guest_id', p_guest_id,
    'target_id', p_target_id,
    'reroll_transferred', transferred_reroll,
    'lightning_transferred', transferred_lightning
  );
end $$;

-- Permissões de execução
revoke all on function public.merge_player_accounts(uuid, uuid) from public, anon;
grant execute on function public.merge_player_accounts(uuid, uuid) to authenticated, service_role;
