-- Apply together with the updated client and Edge Functions.
-- Guest players now use Supabase anonymous Auth; legacy device IDs remain untouched.
create or replace function public.is_admin() returns boolean
language sql stable security invoker set search_path = '' as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin';
$$;

do $$ declare p record; begin
  for p in select tablename, policyname from pg_policies
    where schemaname = 'public' and tablename in ('players','game_sessions','player_inventory','payment_orders','inventory_events')
  loop execute format('drop policy %I on public.%I', p.policyname, p.tablename); end loop;
end $$;

revoke all on public.players, public.game_sessions, public.player_inventory, public.payment_orders from anon, authenticated;
grant select on public.players, public.player_inventory, public.payment_orders to authenticated;
grant insert (id, username, avatar_emoji, last_active_at), update (id, username, avatar_emoji, last_active_at) on public.players to authenticated;
grant select on public.game_sessions to anon, authenticated;
grant insert on public.game_sessions to authenticated;

create policy players_read on public.players for select to authenticated using (id = auth.uid() or public.is_admin());
create policy players_insert on public.players for insert to authenticated with check (id = auth.uid());
create policy players_update on public.players for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy sessions_read on public.game_sessions for select to anon, authenticated using (true);
create policy sessions_insert on public.game_sessions for insert to authenticated with check (player_id = auth.uid());
create policy inventory_read on public.player_inventory for select to authenticated using (player_id = auth.uid() or public.is_admin());
create policy orders_read on public.payment_orders for select to authenticated using (player_id = auth.uid() or public.is_admin());
alter view public.global_leaderboard set (security_invoker = true);

-- Append-only audit trail. Clients may read their own entries, never write them.
create table if not exists public.inventory_events (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  order_id uuid unique references public.payment_orders(id),
  reason text not null check (reason in ('purchase', 'consumption')),
  reroll_delta integer not null default 0,
  lightning_delta integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists inventory_events_player_date on public.inventory_events(player_id, created_at desc);
alter table public.inventory_events enable row level security;
revoke all on public.inventory_events from anon, authenticated;
grant select on public.inventory_events to authenticated;
create policy events_read on public.inventory_events for select to authenticated using (player_id = auth.uid() or public.is_admin());

-- One atomic debit: two devices cannot spend the same balance.
create or replace function public.consume_powerup(p_type text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare result public.player_inventory;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_type = 'reroll' then
    update public.player_inventory set reroll_count = reroll_count - 1, updated_at = now()
      where player_id = auth.uid() and reroll_count > 0 returning * into result;
  elsif p_type = 'lightning' then
    update public.player_inventory set lightning_count = lightning_count - 1, updated_at = now()
      where player_id = auth.uid() and lightning_count > 0 returning * into result;
  else raise exception 'Invalid power-up'; end if;
  if result.player_id is null then raise exception 'Insufficient balance'; end if;
  insert into public.inventory_events(player_id, reason, reroll_delta, lightning_delta)
    values (auth.uid(), 'consumption', case when p_type = 'reroll' then -1 else 0 end, case when p_type = 'lightning' then -1 else 0 end);
  return jsonb_build_object('reroll', result.reroll_count, 'lightning', result.lightning_count);
end $$;
revoke all on function public.consume_powerup(text) from public, anon;
grant execute on function public.consume_powerup(text) to authenticated;

-- The row lock, inventory credit and paid status commit or roll back together.
create or replace function public.fulfill_payment(p_order_id uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare o public.payment_orders; r integer := 0; l integer := 0;
begin
  select * into o from public.payment_orders where id = p_order_id for update;
  if not found then raise exception 'Order not found'; end if;
  if o.status = 'paid' then return false; end if;
  if o.status not in ('pending', 'expired') then raise exception 'Invalid order status'; end if;
  if o.item_type in ('reroll','pack_reroll','combo_pack') then r := o.quantity; end if;
  if o.item_type in ('lightning','pack_lightning','combo_pack') then l := o.quantity; end if;
  if r + l = 0 then raise exception 'Invalid product'; end if;
  insert into public.player_inventory (player_id, reroll_count, lightning_count)
    values (o.player_id, r, l)
    on conflict (player_id) do update set
      reroll_count = public.player_inventory.reroll_count + excluded.reroll_count,
      lightning_count = public.player_inventory.lightning_count + excluded.lightning_count,
      updated_at = now();
  insert into public.inventory_events(player_id, order_id, reason, reroll_delta, lightning_delta)
    values (o.player_id, o.id, 'purchase', r, l);
  update public.payment_orders set status = 'paid', paid_at = now() where id = o.id;
  return true;
end $$;
revoke all on function public.fulfill_payment(uuid) from public, anon, authenticated;
grant execute on function public.fulfill_payment(uuid) to service_role;
revoke all on function public.expire_old_payment_orders() from public, anon, authenticated;
alter function public.expire_old_payment_orders() set search_path = public;
grant execute on function public.expire_old_payment_orders() to service_role;
