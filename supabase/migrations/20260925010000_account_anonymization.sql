-- Migration: 20260925010000_account_anonymization.sql
-- Description: RPC delete_and_anonymize_user para conformidade com a LGPD (Art. 12) e diretrizes do Google Play

create or replace function public.delete_and_anonymize_user()
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_count integer := 0;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  -- 1. Anonimizar pontuações no placar global (mantém integridade histórica das estatísticas sem dados pessoais)
  update public.game_sessions
  set player_name = 'Jogador Anônimo'
  where player_id = v_uid;
  
  get diagnostics v_count = row_count;

  -- 2. Deletar perfil em public.players
  -- Devido às constraints ON DELETE CASCADE, isto remove automaticamente:
  -- - player_inventory
  -- - inventory_events
  -- - payment_orders
  -- E desvincula game_sessions (ON DELETE SET NULL)
  delete from public.players where id = v_uid;

  return jsonb_build_object(
    'success', true,
    'sessions_anonymized', v_count
  );
end $$;

revoke all on function public.delete_and_anonymize_user() from public, anon;
grant execute on function public.delete_and_anonymize_user() to authenticated;
