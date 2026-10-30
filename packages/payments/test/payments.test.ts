import { describe, expect, it } from 'vitest';
import { DemoPaymentProvider, PaymentRouter } from '../src';

describe('paiement simulé', () => {
  const provider = new DemoPaymentProvider();

  it('accepte, refuse ou échoue selon le scénario', async () => {
    const ok = await provider.charge({ amountMinor: 5000, currency: 'EUR', reference: 'o1', idempotencyKey: 'key-0001-abcd' });
    expect(ok).toMatchObject({ status: 'succeeded', externalRef: 'demo_pay_key-0001-abcd', failureCode: null });
    const declined = await provider.charge({ amountMinor: 5000, currency: 'EUR', reference: 'o1', idempotencyKey: 'key-0002-abcd', scenario: 'declined' });
    expect(declined).toMatchObject({ status: 'failed', failureCode: 'card_declined_simulated' });
    await expect(provider.charge({ amountMinor: 5000, currency: 'EUR', reference: 'o1', idempotencyKey: 'key-0003-abcd', scenario: 'error' })).rejects.toMatchObject({ code: 'payment_failed' });
  });

  it('ne conserve aucune donnée de carte', async () => {
    const result = await provider.charge({ amountMinor: 100, currency: 'USD', reference: 'o2', idempotencyKey: 'key-0004-abcd' });
    expect(JSON.stringify(result.raw)).not.toMatch(/card_number|cvc|pan|expiry/i);
  });

  it('est idempotent par clé', async () => {
    const a = await provider.charge({ amountMinor: 100, currency: 'USD', reference: 'o3', idempotencyKey: 'same-key-123' });
    const b = await provider.charge({ amountMinor: 100, currency: 'USD', reference: 'o3', idempotencyKey: 'same-key-123' });
    expect(a.externalRef).toBe(b.externalRef);
  });

  it('rembourse uniquement des paiements simulés', async () => {
    await expect(provider.refund('demo_pay_abc12345', 100)).resolves.toMatchObject({ status: 'succeeded' });
    await expect(provider.refund('pi_real_123', 100)).rejects.toMatchObject({ code: 'forbidden' });
  });

  it('refuse le mode réel sans prestataire configuré', () => {
    const router = new PaymentRouter({ demo: provider });
    expect(router.resolve('demo')).toBe(provider);
    expect(() => router.resolve('live')).toThrowError(expect.objectContaining({ code: 'live_mode_disabled' }));
  });
});
