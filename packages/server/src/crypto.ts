import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function hmacSha256Hex(secret: string, value: string): string {
  return createHmac('sha256', secret).update(value).digest('hex');
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

/** Empreinte stable d'un corps de requête (clés triées) pour l'idempotence. */
export function stableHash(value: unknown): string {
  const normalize = (input: unknown): unknown => {
    if (Array.isArray(input)) return input.map(normalize);
    if (input && typeof input === 'object') {
      return Object.fromEntries(
        Object.entries(input as Record<string, unknown>)
          .filter(([, v]) => v !== undefined)
          .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
          .map(([k, v]) => [k, normalize(v)]),
      );
    }
    return input;
  };
  return sha256Hex(JSON.stringify(normalize(value)));
}

/**
 * Référence opaque d'un titulaire transmise aux fournisseurs de billetterie : aucune donnée
 * personnelle n'est communiquée, mais la référence est stable pour un même utilisateur.
 */
export function holderRefFor(secret: string, userId: string): string {
  return `usr_${hmacSha256Hex(secret, `holder:${userId}`).slice(0, 24)}`;
}
