import { expect, test } from '@playwright/test';
import { findTicketedEventSlug, login } from './helpers';

test("parcours d'achat FICTIF complet : réservation, refus simulé, paiement simulé, billet spécimen", async ({ page }) => {
  const slug = await findTicketedEventSlug(page);
  await login(page, 'acheteur', `/events/${slug}`);
  await page.getByRole('button', { name: /^Réserver/ }).click();
  await expect(page).toHaveURL(/\/fr\/checkout\/[0-9a-f-]{36}$/);
  await expect(page.getByText(/Vos places sont réservées/)).toBeVisible();
  await expect(page.getByText(/aucune donnée de carte bancaire/i)).toBeVisible();

  await page.getByRole('button', { name: /Continuer vers le paiement/ }).click();
  await page.getByRole('radio', { name: /refusé/ }).check();
  await page.getByRole('button', { name: /Payer/ }).click();
  await expect(page.getByText(/Paiement refusé \(simulation\)/)).toBeVisible();

  await page.getByRole('radio', { name: /accepté/ }).check();
  await page.getByRole('button', { name: /Payer/ }).click();
  await expect(page).toHaveURL(/\/fr\/checkout\/confirmation\//);
  await expect(page.getByRole('heading', { name: 'Commande confirmée !' })).toBeVisible();

  await page.getByRole('link', { name: 'Voir mes billets' }).click();
  await page.locator('a[href*="/account/tickets/"]').first().click();
  await expect(page.getByText(/BILLET DE DÉMONSTRATION — NON VALABLE/)).toBeVisible();
  await expect(page.getByText(/Aucun code d'accès/)).toBeVisible();
  // Jamais de QR code ni de code-barres pour un billet fictif.
  await expect(page.locator('canvas, img[alt*="QR" i], svg[aria-label*="QR" i]')).toHaveCount(0);
});

test('API : réservation refusée sans authentification et requêtes inter-origines bloquées', async ({ request }) => {
  const anonymous = await request.post('/api/v1/checkout/reservations', {
    data: { offerId: '00000000-0000-4000-8000-000000000000', quantity: 1 },
    headers: { 'idempotency-key': 'e2e-test-key-123456' },
  });
  expect(anonymous.status()).toBe(401);
  expect((await anonymous.json()).error.code).toBe('unauthenticated');
});

test('API : une requête authentifiée par cookie mais venant d’une autre origine est refusée (CSRF)', async ({ page }) => {
  const { login } = await import('./helpers');
  await login(page, 'acheteur');
  const response = await page.request.post('/api/v1/checkout/reservations', {
    data: { offerId: '00000000-0000-4000-8000-000000000000', quantity: 1 },
    headers: { 'idempotency-key': 'e2e-test-key-csrf-1', origin: 'https://site-malveillant.example' },
  });
  expect(response.status()).toBe(403);
});
