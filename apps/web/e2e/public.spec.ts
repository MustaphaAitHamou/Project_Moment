import { expect, test } from '@playwright/test';

test.describe('pages publiques', () => {
  test("l'accueil affiche le bandeau de démonstration et les sections", async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/fr$/);
    await expect(page.getByText(/Version de démonstration/)).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Ce week-end' })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
  });

  test('bascule en anglais puis en arabe (RTL, traduction signalée comme brouillon)', async ({ page }) => {
    await page.goto('/en');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await page.goto('/ar');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('body')).toContainText(/الترجمة|العربية/);
  });

  test('recherche filtrée (gratuits) puis fiche événement fictive non indexée, sans JSON-LD', async ({ page }) => {
    await page.goto('/fr/search?free=1');
    await expect(page.getByText(/événement/).first()).toBeVisible();
    // Une carte marquée « Démo » (contenu fictif du jeu de données).
    await page.locator('article', { hasText: 'Démo' }).first().locator('h3 a').click();
    await expect(page.getByText(/Événement fictif de démonstration/)).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
    await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(0);
  });

  test("agenda : l'Algérie commence la semaine le samedi", async ({ page }) => {
    await page.goto('/fr/agenda?country=DZ&view=month&date=2026-11-01');
    const headers = page.locator('.grid-cols-7 > div').first();
    await expect(headers).toHaveText(/sam/i);
  });

  test('les URL inconnues renvoient une vraie 404', async ({ page }) => {
    const response = await page.goto('/fr/events/evenement-qui-n-existe-pas');
    expect(response?.status()).toBe(404);
    await expect(page.getByText('Page introuvable')).toBeVisible();
  });

  test('en-têtes de sécurité et CSP avec nonce', async ({ request }) => {
    const response = await request.get('/fr');
    const csp = response.headers()['content-security-policy'] ?? '';
    expect(csp).toContain("'strict-dynamic'");
    expect(csp).toMatch(/'nonce-[A-Za-z0-9+/=]+'/);
    expect(csp).toContain("frame-ancestors 'none'");
    expect(response.headers()['x-content-type-options']).toBe('nosniff');
  });

  test("robots.txt bloque l'indexation hors production", async ({ request }) => {
    const body = await (await request.get('/robots.txt')).text();
    expect(body).toMatch(/Disallow: \//);
  });
});
