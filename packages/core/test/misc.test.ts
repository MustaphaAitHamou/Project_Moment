import { describe, expect, it } from 'vitest';
import {
  AppError,
  buildGoogleCalendarUrl,
  buildIcsEvent,
  canTransitionResaleTx,
  computeResaleQuote,
  eventTimeState,
  filtersToRpcArgs,
  foldIcsLine,
  formatAddress,
  formatDistance,
  formatPhone,
  generateIdempotencyKey,
  generateInvitationCode,
  haversineKm,
  hasAppAccess,
  isInvitationCodeFormat,
  missingResaleLiveConditions,
  normalizeInvitationCode,
  normalizePhone,
  offerSellability,
  organizerRoleHasPermission,
  parseSearchParams,
  serializeSearchParams,
  slugify,
  toAppError,
  transitionEventStatus,
  uniqueSlug,
  COUNTRIES,
} from '../src';

describe('ICS et agendas externes', () => {
  const input = {
    uid: 'evt-1@tamurt.events',
    title: 'Concert de démonstration, édition; spéciale',
    description: 'Ligne 1\nLigne 2',
    location: 'Salle Fictive, Paris',
    url: 'https://tamurt.events/fr/events/demo',
    start: new Date('2026-11-14T19:30:00Z'),
    end: new Date('2026-11-14T22:00:00Z'),
    now: new Date('2026-10-30T00:00:00Z'),
  };

  it('génère un fichier iCalendar valide avec échappement et fins de ligne CRLF', () => {
    const ics = buildIcsEvent(input);
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics).toContain('DTSTART:20261114T193000Z');
    expect(ics).toContain('SUMMARY:Concert de démonstration\\, édition\\; spéciale');
    expect(ics).toContain('DESCRIPTION:Ligne 1\\nLigne 2');
    expect(ics.split('\r\n').every((line) => new TextEncoder().encode(line).length <= 75)).toBe(true);
  });

  it('plie les lignes longues sans couper les caractères multi-octets', () => {
    const folded = foldIcsLine('SUMMARY:' + 'é'.repeat(80));
    const lines = folded.split('\r\n');
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.every((l) => new TextEncoder().encode(l).length <= 75)).toBe(true);
    expect(lines.map((l, i) => (i === 0 ? l : l.slice(1))).join('')).toBe('SUMMARY:' + 'é'.repeat(80));
  });

  it('construit un lien Google Agenda', () => {
    const url = new URL(buildGoogleCalendarUrl(input));
    expect(url.hostname).toBe('calendar.google.com');
    expect(url.searchParams.get('dates')).toBe('20261114T193000Z/20261114T220000Z');
  });
});

describe('permissions et cycle de vie', () => {
  it('applique la matrice des rôles organisateur', () => {
    expect(organizerRoleHasPermission('owner', 'manage_team')).toBe(true);
    expect(organizerRoleHasPermission('editor', 'manage_events')).toBe(true);
    expect(organizerRoleHasPermission('editor', 'publish_events')).toBe(false);
    expect(organizerRoleHasPermission('analyst', 'view_sales')).toBe(true);
    expect(organizerRoleHasPermission('analyst', 'manage_events')).toBe(false);
  });

  it('contrôle l’accès pendant la bêta fermée', () => {
    expect(hasAppAccess({ authenticated: true, suspended: false, roles: [], betaMode: 'closed' })).toBe(false);
    expect(hasAppAccess({ authenticated: true, suspended: false, roles: ['beta_tester'], betaMode: 'closed' })).toBe(true);
    expect(hasAppAccess({ authenticated: true, suspended: true, roles: ['admin'], betaMode: 'open' })).toBe(false);
    expect(hasAppAccess({ authenticated: true, suspended: false, roles: [], betaMode: 'open' })).toBe(true);
  });

  it('convertit une publication non vérifiée en demande de modération', () => {
    expect(transitionEventStatus('draft', 'published', { actor: 'member', organizerVerified: false, canPublish: true })).toEqual({
      allowed: true,
      effectiveStatus: 'pending_review',
    });
    expect(transitionEventStatus('draft', 'published', { actor: 'member', organizerVerified: true, canPublish: true })).toEqual({
      allowed: true,
      effectiveStatus: 'published',
    });
    expect(transitionEventStatus('published', 'draft', { actor: 'member', organizerVerified: true, canPublish: true }).allowed).toBe(false);
    expect(transitionEventStatus('archived', 'published', { actor: 'staff', organizerVerified: true, canPublish: true }).allowed).toBe(false);
  });

  it('détermine l’état temporel d’un événement', () => {
    const now = new Date('2026-11-14T20:00:00Z');
    expect(eventTimeState('2026-11-15T20:00:00Z', null, now)).toBe('upcoming');
    expect(eventTimeState('2026-11-14T19:00:00Z', null, now)).toBe('ongoing');
    expect(eventTimeState('2026-11-13T19:00:00Z', '2026-11-13T21:00:00Z', now)).toBe('past');
  });
});

describe('revente', () => {
  const rule = {
    enabled: true,
    maxPriceBps: 10000,
    minPriceBps: 0,
    sellerFeeBps: 0,
    buyerFeeBps: 500,
    buyerFeeFixedMinor: 0,
    listingCutoffHours: 2,
    legalStatus: 'not_reviewed' as const,
  };

  it('plafonne le prix au prix d’origine par défaut', () => {
    expect(computeResaleQuote(4000, 4000, rule).allowed).toBe(true);
    const above = computeResaleQuote(4000, 4001, rule);
    expect(above.allowed).toBe(false);
    expect(above.reason).toBe('resale_price_above_cap');
    expect(above.maxAllowedPriceMinor).toBe(4000);
  });

  it('calcule les frais acheteur / vendeur en entiers', () => {
    const q = computeResaleQuote(4000, 3500, { ...rule, sellerFeeBps: 300 });
    expect(q.buyerFeeMinor).toBe(175);
    expect(q.sellerFeeMinor).toBe(105);
    expect(q.buyerTotalMinor).toBe(3675);
    expect(q.sellerPayoutMinor).toBe(3395);
  });

  it('refuse toute revente si la règle l’interdit', () => {
    expect(computeResaleQuote(4000, 1000, { ...rule, legalStatus: 'prohibited' }).reason).toBe('resale_not_allowed');
  });

  it('suit la machine d’état des transactions', () => {
    expect(canTransitionResaleTx('payment_pending', 'paid')).toBe(true);
    expect(canTransitionResaleTx('completed', 'payment_pending')).toBe(false);
    expect(canTransitionResaleTx('cancelled', 'paid')).toBe(false);
  });

  it('liste toutes les conditions manquantes pour le mode réel', () => {
    const missing = missingResaleLiveConditions({
      platformLiveEnabled: false,
      countryResaleLiveEnabled: false,
      countryLegalStatus: 'not_reviewed',
      providerLiveEnabled: false,
      providerContractSigned: false,
      providerSupportsTransfer: true,
      providerSupportsOwnershipVerification: false,
    });
    expect(missing).toContain('legal_review_missing');
    expect(missing).toContain('provider_contract_missing');
    expect(missing).not.toContain('provider_transfer_unsupported');
  });
});

describe('vente', () => {
  const event = { status: 'published', visibility: 'public', registration_mode: 'tickets', starts_at: '2026-12-01T20:00:00Z' };
  const offer = { status: 'on_sale', sales_start_at: null, sales_end_at: null, min_per_order: 1, max_per_order: 6 };
  it('détermine si une offre est en vente', () => {
    const now = new Date('2026-11-01T00:00:00Z');
    expect(offerSellability(offer, event, now)).toBe('ok');
    expect(offerSellability(offer, { ...event, status: 'cancelled' }, now)).toBe('event_not_on_sale');
    expect(offerSellability({ ...offer, sales_start_at: '2026-11-10T00:00:00Z' }, event, now)).toBe('sales_not_started');
    expect(offerSellability(offer, event, new Date('2026-12-02T00:00:00Z'))).toBe('sales_ended');
  });
});

describe('recherche', () => {
  it('analyse et sérialise les filtres d’URL de façon tolérante', () => {
    const filters = parseSearchParams(
      new URLSearchParams('q=concert&country=fr&category=concerts,invalid&date=weekend&free=1&sort=popularity&page=2'),
    );
    expect(filters).toMatchObject({ q: 'concert', country: 'FR', categories: ['concerts'], date: 'weekend', free: true, sort: 'popularity', page: 2 });
    const params = serializeSearchParams(filters);
    expect(params.get('category')).toBe('concerts');
    expect(params.get('page')).toBe('2');
  });

  it('ignore un tri par distance sans position', () => {
    expect(parseSearchParams({ sort: 'distance' }).sort).toBe('date');
  });

  it('traduit les filtres en arguments SQL avec période locale', () => {
    const args = filtersToRpcArgs(parseSearchParams({ date: 'today', city: '9d3c1c8e-1111-4222-8333-444455556666' }), {
      now: new Date('2026-11-18T10:00:00Z'),
      timeZone: 'Africa/Algiers',
      week: COUNTRIES.DZ.week,
      pageSize: 20,
    });
    expect(args.p_city_id).toBe('9d3c1c8e-1111-4222-8333-444455556666');
    expect(args.p_to).toBe('2026-11-18T23:00:00.000Z');
    expect(args.p_offset).toBe(0);
  });
});

describe('utilitaires', () => {
  it('génère des slugs lisibles', () => {
    expect(slugify('Fête de la Musique à Béjaïa !')).toBe('fete-de-la-musique-a-bejaia');
    expect(slugify('حفل موسيقي')).toBe('');
    expect(uniqueSlug('حفل موسيقي', 'a1b2c3d4')).toBe('evenement-a1b2c3');
  });

  it('normalise les numéros de téléphone des quatre pays', () => {
    expect(normalizePhone('06 12 34 56 78', 'FR')).toBe('+33612345678');
    expect(normalizePhone('0555 12 34 56', 'DZ')).toBe('+213555123456');
    expect(normalizePhone('(514) 555-0123', 'CA')).toBe('+15145550123');
    expect(normalizePhone('+1 212 555 0199', 'FR')).toBe('+12125550199');
    expect(normalizePhone('123', 'US')).toBeNull();
    expect(formatPhone('+33612345678')).toBe('+33 6 12 34 56 78');
  });

  it('calcule et formate les distances', () => {
    const km = haversineKm({ lat: 48.8566, lng: 2.3522 }, { lat: 45.764, lng: 4.8357 });
    expect(km).toBeGreaterThan(389);
    expect(km).toBeLessThan(393);
    expect(formatDistance(16.0934, 'mi', 'en-US')).toBe('10 mi');
  });

  it('formate les adresses selon le pays', () => {
    expect(formatAddress({ line1: '1 rue Fictive', postalCode: '75001', city: 'Paris' }, 'FR')).toEqual(['1 rue Fictive', '75001 Paris']);
    expect(formatAddress({ line1: '1 Demo St', postalCode: '10001', city: 'New York', regionCode: 'NY' }, 'US')).toEqual([
      '1 Demo St',
      'New York, NY 10001',
    ]);
  });

  it('génère et normalise les codes d’invitation', () => {
    const code = generateInvitationCode();
    expect(isInvitationCodeFormat(code)).toBe(true);
    expect(normalizeInvitationCode(code.toLowerCase().replace(/-/g, ' '))).toBe(code);
    expect(generateIdempotencyKey()).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('convertit les erreurs SQL en erreurs applicatives', () => {
    expect(toAppError({ message: 'sold_out', code: 'P0001' })).toMatchObject({ code: 'sold_out', status: 409 });
    expect(toAppError({ message: 'resale_price_above_cap', details: '{"max_allowed_price_minor":4000}' }).details).toEqual({
      max_allowed_price_minor: 4000,
    });
    expect(toAppError(new Error('boom')).code).toBe('internal_error');
    expect(new AppError('forbidden').status).toBe(403);
  });
});
