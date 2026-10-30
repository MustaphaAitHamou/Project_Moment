import { AppError } from '@tamurt/core';

/**
 * Signature HMAC-SHA256 des webhooks du fournisseur fictif (même principe que la plupart des
 * prestataires : horodatage + corps signé, tolérance limitée contre le rejeu).
 * En-tête : x-demo-signature: t=<unix>,v1=<hex>
 * Implémenté avec Web Crypto (Node ≥ 18, navigateurs, environnements edge).
 */

const encoder = new TextEncoder();

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return Array.from(new Uint8Array(signature), (b) => b.toString(16).padStart(2, '0')).join('');
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function signDemoWebhook(secret: string, rawBody: string, timestampSeconds: number): Promise<string> {
  const signature = await hmacHex(secret, `${timestampSeconds}.${rawBody}`);
  return `t=${timestampSeconds},v1=${signature}`;
}

export async function verifyDemoWebhookSignature(
  secret: string,
  header: string | undefined,
  rawBody: string,
  nowSeconds: number = Math.floor(Date.now() / 1000),
  toleranceSeconds = 300,
): Promise<void> {
  if (!header) throw new AppError('forbidden', 'signature absente');
  const parts = Object.fromEntries(
    header.split(',').map((part) => {
      const [key = '', value = ''] = part.trim().split('=');
      return [key, value];
    }),
  );
  const timestamp = Number(parts.t);
  const provided = parts.v1;
  if (!Number.isInteger(timestamp) || !provided) throw new AppError('forbidden', 'signature mal formée');
  if (Math.abs(nowSeconds - timestamp) > toleranceSeconds) throw new AppError('forbidden', 'signature expirée');
  const expected = await hmacHex(secret, `${timestamp}.${rawBody}`);
  if (!timingSafeEqualHex(expected, provided)) throw new AppError('forbidden', 'signature invalide');
}
