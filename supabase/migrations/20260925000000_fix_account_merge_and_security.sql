-- Migration: 20260925000000_fix_account_merge_and_security.sql
-- Description: Correção crítica de IDOR em merge_player_accounts e constraint anti-cheat em game_sessions

-- 1. Recriar função merge_player_accounts com autorização estrita (apenas o dono da conta convidada pode autorizar o merge)
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

  -- SEGURANÇA CRÍTICA (Anti-IDOR): Apenas o próprio convidado detentor dos bens pode autorizar a transferência para uma nova conta
  if auth.uid() is not null and auth.uid() != p_guest_id and not public.is_admin() then
    raise exception 'Unauthorized to merge these accounts: only the guest account owner can authorize inventory transfer';
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

revoke all on function public.merge_player_accounts(uuid, uuid) from public, anon;
grant execute on function public.merge_player_accounts(uuid, uuid) to authenticated, service_role;

-- 2. Constraint de plausibilidade física para submissão de pontuação (Anti-cheat básico)
-- Limite: pontuação não pode exceder 1500 pts por segundo com folga de 50.000 pts para combos
alter table public.game_sessions
drop constraint if exists check_realistic_score_rate;

alter table public.game_sessions
add constraint check_realistic_score_rate
check (score <= (greatest(time_seconds, 10) * 1500) + 50000);
