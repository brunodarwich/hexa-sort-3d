export function equalHex(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function hmac(secret, value) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(value));
  return [...new Uint8Array(signature)].map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyStripeSignature(raw, header, secret, now = Date.now()) {
  if (!secret || !header) return false;
  const parts = header.split(',').map(part => part.trim().split('='));
  const timestamp = parts.find(([key]) => key === 't')?.[1];
  if (!timestamp || !Number.isFinite(Number(timestamp)) || Math.abs(now / 1000 - Number(timestamp)) > 300) return false;
  const expected = await hmac(secret, `${timestamp}.${raw}`);
  return parts.some(([key, value]) => key === 'v1' && equalHex(value, expected));
}

export async function requireUser(req, supabase) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) throw new Error('Authentication required');
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) throw new Error('Authentication required');
  return data.user;
}

export async function verifyMercadoPagoSignature(url, headers, secret) {
  if (!secret) return false;
  const parts = (headers.get('x-signature') || '').split(',').map(part => part.trim().split('='));
  const timestamp = parts.find(([key]) => key === 'ts')?.[1];
  const signature = parts.find(([key]) => key === 'v1')?.[1];
  const id = new URL(url).searchParams.get('data.id');
  const requestId = headers.get('x-request-id');
  if (!timestamp || !signature || !id || !requestId) return false;
  const manifest = `id:${id.toLowerCase()};request-id:${requestId};ts:${timestamp};`;
  return equalHex(signature, await hmac(secret, manifest));
}
