import { describe, expect, it } from 'vitest';
import {
  betaFeedbackSchema,
  betaRedeemSchema,
  betaWaitlistSchema,
  createListingSchema,
  createReservationSchema,
  eventFormSchema,
  eventFormToRow,
  flattenIssues,
  organizerProfileSchema,
  signUpSchema,
  updatePasswordSchema,
} from '../src';

const baseEvent = {
  title: 'Soirée de démonstration',
  categorySlug: 'concerts',
  countryCode: 'FR',
  cityId: '2f0c6c62-1d2b-4e5a-9a8f-0c1d2e3f4a5b',
  timezone: 'Europe/Paris',
  startDate: '2026-11-20',
  startTime: '20:30',
  endDate: '2026-11-20',
  endTime: '23:00',
  isFree: false,
  registrationMode: 'tickets',
  priceMinMinor: 1500,
  priceMaxMinor: 3500,
  currency: 'EUR',
};

describe('authentification', () => {
  it('applique la politique de mot de passe de Supabase Auth', () => {
    const ok = signUpSchema.safeParse({
      email: ' Test@Example.COM ',
      password: 'Motdepasse1',
      displayName: 'Testeur',
      locale: 'fr',
      acceptTerms: true,
    });
    expect(ok.success).toBe(true);
    expect(ok.success && ok.data.email).toBe('test@example.com');
    const weak = signUpSchema.safeParse({ email: 'a@b.co', password: 'motdepasse', displayName: 'X1', locale: 'fr', acceptTerms: true });
    expect(weak.success).toBe(false);
    expect(weak.error && flattenIssues(weak.error)).toContainEqual({ path: 'password', message: 'validation.password_weak' });
  });

  it('exige l’acceptation des conditions et deux mots de passe identiques', () => {
    expect(signUpSchema.safeParse({ email: 'a@b.co', password: 'Motdepasse1', displayName: 'Abc', locale: 'en', acceptTerms: false }).success).toBe(false);
    const mismatch = updatePasswordSchema.safeParse({ password: 'Motdepasse1', confirmPassword: 'Motdepasse2' });
    expect(mismatch.error?.issues[0]?.message).toBe('validation.passwords_mismatch');
  });
});

describe('événements', () => {
  it('valide un événement payant et convertit les heures locales en UTC', () => {
    const parsed = eventFormSchema.parse(baseEvent);
    const row = eventFormToRow(parsed);
    expect(row.starts_at).toBe('2026-11-20T19:30:00.000Z');
    expect(row.ends_at).toBe('2026-11-20T22:00:00.000Z');
    expect(row.currency).toBe('EUR');
    expect(row.official_links).toEqual([]);
  });

  it('refuse une fin avant le début', () => {
    const result = eventFormSchema.safeParse({ ...baseEvent, endTime: '19:00' });
    expect(result.success).toBe(false);
    expect(result.error && flattenIssues(result.error)).toContainEqual({ path: 'endTime', message: 'validation.end_before_start' });
  });

  it('refuse la billetterie sur un événement gratuit et exige une capacité pour les inscriptions', () => {
    expect(eventFormSchema.safeParse({ ...baseEvent, isFree: true }).success).toBe(false);
    const rsvp = eventFormSchema.safeParse({ ...baseEvent, isFree: true, registrationMode: 'free_registration' });
    expect(rsvp.error && flattenIssues(rsvp.error)).toContainEqual({ path: 'capacity', message: 'validation.capacity_required' });
  });

  it('valide le téléphone selon le pays et les liens officiels en HTTPS', () => {
    const bad = eventFormSchema.safeParse({
      ...baseEvent,
      contactPhone: '123',
      officialLinks: [{ label: 'Site', url: 'http://exemple.test' }],
    });
    const issues = bad.error ? flattenIssues(bad.error) : [];
    expect(issues).toContainEqual({ path: 'contactPhone', message: 'validation.invalid_phone' });
    expect(issues).toContainEqual({ path: 'officialLinks.0.url', message: 'validation.invalid_url_https' });
    const good = eventFormToRow(eventFormSchema.parse({ ...baseEvent, contactPhone: '06 12 34 56 78' }));
    expect(good.contact_phone).toBe('+33612345678');
  });

  it('refuse un fuseau horaire inconnu', () => {
    expect(eventFormSchema.safeParse({ ...baseEvent, timezone: 'Europe/Atlantis' }).success).toBe(false);
  });
});

describe('organisateurs', () => {
  it('normalise et valide les coordonnées publiques', () => {
    expect(organizerProfileSchema.safeParse({ name: 'Asso Démo', kind: 'association', countryCode: 'DZ', publicPhone: '0555 12 34 56' }).success).toBe(true);
    expect(organizerProfileSchema.safeParse({ name: 'Asso Démo', kind: 'association', countryCode: 'DZ', publicPhone: '12' }).success).toBe(false);
  });
});

describe('billetterie et revente', () => {
  it('borne la quantité et normalise le code promo', () => {
    const parsed = createReservationSchema.parse({ offerId: '2f0c6c62-1d2b-4e5a-9a8f-0c1d2e3f4a5b', quantity: 2, promoCode: 'demo5' });
    expect(parsed.promoCode).toBe('DEMO5');
    expect(createReservationSchema.safeParse({ offerId: '2f0c6c62-1d2b-4e5a-9a8f-0c1d2e3f4a5b', quantity: 11 }).success).toBe(false);
  });

  it('exige un prix de revente entier et positif', () => {
    expect(createListingSchema.safeParse({ ticketId: '2f0c6c62-1d2b-4e5a-9a8f-0c1d2e3f4a5b', askingPriceMinor: 0 }).success).toBe(false);
    expect(createListingSchema.safeParse({ ticketId: '2f0c6c62-1d2b-4e5a-9a8f-0c1d2e3f4a5b', askingPriceMinor: 12.5 }).success).toBe(false);
  });
});

describe('bêta', () => {
  it('exige le consentement et au moins une plateforme', () => {
    const base = { email: 'testeur@example.com', fullName: 'Testeur', countryCode: 'CA', platforms: ['ios'], locale: 'fr', consent: true };
    expect(betaWaitlistSchema.safeParse(base).success).toBe(true);
    expect(betaWaitlistSchema.safeParse({ ...base, consent: false }).success).toBe(false);
    expect(betaWaitlistSchema.safeParse({ ...base, platforms: [] }).success).toBe(false);
  });

  it('normalise les codes d’invitation saisis', () => {
    expect(betaRedeemSchema.parse({ code: ' tamurt abcd efgh ' }).code).toBe('TAMURT-ABCD-EFGH');
    expect(betaRedeemSchema.safeParse({ code: 'pas-un-code' }).success).toBe(false);
  });

  it('valide les retours selon leur type', () => {
    expect(betaFeedbackSchema.safeParse({ kind: 'rating', rating: 5, platform: 'web' }).success).toBe(true);
    expect(betaFeedbackSchema.safeParse({ kind: 'rating', platform: 'web' }).success).toBe(false);
    expect(betaFeedbackSchema.safeParse({ kind: 'bug', title: 'Plantage', platform: 'ios' }).success).toBe(false);
  });
});
