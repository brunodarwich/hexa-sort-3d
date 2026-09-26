import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { hmac, verifyStripeSignature, requireUser, verifyMercadoPagoSignature } from '../supabase/functions/_shared/security.js';

const a = '11111111-1111-4111-8111-111111111111';
const b = '22222222-2222-4222-8222-222222222222';
const order = '33333333-3333-4333-8333-333333333333';
let db;
before(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
    grant usage on schema auth, public to anon, authenticated, service_role;
    grant execute on all functions in schema auth to anon, authenticated, service_role;
    create publication supabase_realtime;
  `);
  for (const file of [
    '20260915184500_create_leaderboard_schema.sql',
    '20260916000000_create_powerups_and_payments.sql',
    '20260921000000_expire_pending_orders.sql',
    '20260922000000_secure_data_access.sql',
    '20260923000000_account_merge_and_revenuecat.sql',
    '20260924000000_ranking_avatar_support.sql'
  ]) {
    await db.exec(await readFile(new URL('../supabase/migrations/' + file, import.meta.url), 'utf8'));
  }
  await db.exec(`insert into players(id, username, email) values ('${a}', 'Alice', 'private@example.test'), ('${b}', 'Bob', 'other@example.test');
    insert into player_inventory(player_id, reroll_count) values ('${a}', 1), ('${b}', 20);
    insert into payment_orders(id, player_id, gateway, external_order_id, item_type, quantity, amount) values ('${order}', '${a}', 'stripe', 'cs_test', 'pack_reroll', 10, 1);`);
});
after(async () => { await db?.close(); });
async function asRole(role, id, sql, claims = '{}') {
  await db.exec(`set role ${role}; select set_config('request.jwt.claim.sub', '${id || ''}', false); select set_config('request.jwt.claims', '${claims}', false);`);
  try { return await db.query(sql); } finally { await db.exec('reset role'); }
}
test('anonymous visitors cannot read profiles, orders or inventories', async () => {
  for (const table of ['players', 'payment_orders', 'player_inventory']) await assert.rejects(asRole('anon', '', `select * from ${table}`), /permission denied/);
});
test('player reads only own private records', async () => {
  const profiles = await asRole('authenticated', a, 'select id from players');
  assert.deepEqual(profiles.rows, [{ id: a }]);
  const inventories = await asRole('authenticated', b, 'select player_id from player_inventory');
  assert.deepEqual(inventories.rows, [{ player_id: b }]);
  assert.equal((await asRole('authenticated', b, 'select * from payment_orders')).rows.length, 0);
});
test('client cannot mint inventory, forge paid orders, or execute fulfillment', async () => {
  for (const sql of ["update player_inventory set reroll_count = 999", "update payment_orders set status = 'paid'", `select fulfill_payment('${order}')`]) {
    await assert.rejects(asRole('authenticated', a, sql), /permission denied/);
  }
});
test('profile upsert works for owner but cannot change another player', async () => {
  await asRole('authenticated', a, `insert into players(id, username) values ('${a}', 'New name') on conflict(id) do update set id=excluded.id, username=excluded.username`);
  assert.equal((await asRole('authenticated', a, `update players set username='Changed' where id='${b}' returning id`)).rows.length, 0);
  await assert.rejects(asRole('authenticated', a, `insert into game_sessions(player_id, player_name, score, time_seconds) values ('${b}', 'Fake', 10, 1)`), /row-level security/);
});
test('inventory debit cannot spend below zero', async () => {
  const result = await asRole('authenticated', a, "select consume_powerup('reroll') as balance");
  assert.equal(result.rows[0].balance.reroll, 0);
  await assert.rejects(asRole('authenticated', a, "select consume_powerup('reroll')"), /Insufficient balance/);
  await assert.rejects(asRole('authenticated', a, "select consume_powerup('unknown')"), /Invalid power-up/);
});
test('fulfillment is idempotent and credits catalog quantity exactly once', async () => {
  assert.equal((await asRole('service_role', '', `select fulfill_payment('${order}') as credited`)).rows[0].credited, true);
  assert.equal((await asRole('service_role', '', `select fulfill_payment('${order}') as credited`)).rows[0].credited, false);
  const result = await db.query(`select reroll_count from player_inventory where player_id='${a}'`);
  assert.equal(result.rows[0].reroll_count, 10);
});
test('admin claim allows reporting but user_metadata cannot grant admin access', async () => {
  assert.equal((await asRole('authenticated', a, 'select * from players', '{"user_metadata":{"role":"admin"}}')).rows.length, 1);
  assert.equal((await asRole('authenticated', a, 'select * from players', '{"app_metadata":{"role":"admin"}}')).rows.length, 2);
});
test('Stripe validates raw body, rotated signatures and timestamp window', async () => {
  const secret = 'test-only-secret';
  const now = 1700000000000;
  const raw = '{"type":"checkout.session.completed"}';
  const signature = await hmac(secret, `${now / 1000}.${raw}`);
  assert.equal(await verifyStripeSignature(raw, `t=${now / 1000},v1=invalid,v1=${signature}`, secret, now), true);
  assert.equal(await verifyStripeSignature(raw + ' ', `t=${now / 1000},v1=${signature}`, secret, now), false);
  assert.equal(await verifyStripeSignature(raw, `t=${now / 1000},v1=${signature}`, secret, now + 301000), false);
  assert.equal(await verifyStripeSignature(raw, '', secret, now), false);
  assert.equal(await verifyStripeSignature(raw, `t=${now / 1000},v1=${signature}`, '', now), false);
});
test('payment endpoints require a verified user rather than body playerId', async () => {
  await assert.rejects(requireUser(new Request('https://example.test'), {}), /Authentication required/);
  await assert.rejects(requireUser(new Request('https://example.test', { headers: { authorization: 'Bearer forged' } }), { auth: { getUser: async () => ({ error: new Error('invalid'), data: {} }) } }), /Authentication required/);
});

test('Mercado Pago verifies the signed URL id and request id', async () => {
  const url = 'https://example.test/?data.id=ABC123';
  const secret = 'local-test-secret';
  const signature = await hmac(secret, 'id:abc123;request-id:request-1;ts:1700000000;');
  const headers = new Headers({ 'x-request-id': 'request-1', 'x-signature': `ts=1700000000,v1=${signature}` });
  assert.equal(await verifyMercadoPagoSignature(url, headers, secret), true);
  assert.equal(await verifyMercadoPagoSignature(url.replace('ABC123', 'another'), headers, secret), false);
  assert.equal(await verifyMercadoPagoSignature(url, new Headers(), secret), false);
});
test('audit trail records exactly one purchase and cannot be forged by the client', async () => {
  assert.equal((await db.query(`select * from inventory_events where order_id='${order}'`)).rows.length, 1);
  await assert.rejects(asRole('authenticated', a, `insert into inventory_events(player_id,reason,reroll_delta) values ('${a}','purchase',100)`), /permission denied/);
});
test('failed fulfillment rolls back paid status and inventory together', async () => {
  const id = '44444444-4444-4444-8444-444444444444';
  await db.exec(`insert into payment_orders(id,player_id,gateway,item_type,quantity,amount) values ('${id}','${a}','stripe','invalid-product',10,1)`);
  await assert.rejects(asRole('service_role','',`select fulfill_payment('${id}')`), /Invalid product/);
  assert.equal((await db.query(`select status from payment_orders where id='${id}'`)).rows[0].status, 'pending');
  assert.equal((await db.query(`select reroll_count from player_inventory where player_id='${a}'`)).rows[0].reroll_count, 10);
});

test('store catalog matches quantities and prices advertised in the app', async () => {
  const { getProduct } = await import('../supabase/functions/_shared/catalog.js');
  assert.equal(getProduct('pack_reroll').quantity, 4);
  assert.equal(getProduct('pack_lightning').brlCents, 100);
  assert.equal(getProduct('combo_pack').quantity, 8);
  assert.equal(getProduct('combo_pack').brlCents, 299);
  assert.equal(getProduct('__proto__'), null);
  assert.equal(getProduct('unknown'), null);
});
