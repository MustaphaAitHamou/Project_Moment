/**
 * Identifiants aléatoires (crypto.getRandomValues : Node ≥ 19, navigateurs, React Native avec expo-crypto).
 */

// Alphabet sans caractères ambigus (0/O, 1/I/L).
const INVITE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/** Sous-ensemble de Web Crypto disponible sur toutes les plateformes cibles. */
interface RandomSource {
  getRandomValues<T extends ArrayBufferView>(array: T): T;
  randomUUID?: () => string;
}

function getCrypto(): RandomSource {
  const c = (globalThis as { crypto?: RandomSource }).crypto;
  if (!c || typeof c.getRandomValues !== 'function') {
    throw new Error('crypto.getRandomValues indisponible dans cet environnement');
  }
  return c;
}

export function randomString(length: number, alphabet: string = INVITE_ALPHABET): string {
  const bytes = new Uint8Array(length);
  const max = 256 - (256 % alphabet.length);
  let result = '';
  while (result.length < length) {
    getCrypto().getRandomValues(bytes);
    for (const byte of bytes) {
      if (byte < max && result.length < length) {
        result += alphabet[byte % alphabet.length];
      }
    }
  }
  return result;
}

/** Code d'invitation bêta lisible : TAMURT-XXXX-XXXX (≈ 40 bits d'entropie). */
export function generateInvitationCode(): string {
  return `TAMURT-${randomString(4)}-${randomString(4)}`;
}

export function normalizeInvitationCode(input: string): string {
  const compact = input.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const body = compact.startsWith('TAMURT') ? compact.slice(6) : compact;
  if (body.length !== 8) return input.trim().toUpperCase();
  return `TAMURT-${body.slice(0, 4)}-${body.slice(4)}`;
}

export function isInvitationCodeFormat(value: string): boolean {
  return /^TAMURT-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/.test(value);
}

/** UUID v4 (clés d'idempotence côté client). */
export function generateIdempotencyKey(): string {
  const c = getCrypto();
  if (typeof c.randomUUID === 'function') return c.randomUUID();
  const bytes = new Uint8Array(16);
  c.getRandomValues(bytes);
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function shortId(uuid: string): string {
  return uuid.replace(/-/g, '').slice(0, 6);
}
