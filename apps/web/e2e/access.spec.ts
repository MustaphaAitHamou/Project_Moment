import { expect, test } from '@playwright/test';
import { login } from './helpers';

test.describe("contrôle d'accès", () => {
  test("l'administration est introuvable (404) pour un utilisateur non autorisé", async ({ page }) => {
    await login(page, 'visiteur');
    const response = await page.goto('/fr/admin');
    expect(response?.status()).toBe(404);
    await expect(page.locator('a[href="/fr/admin/moderation"]')).toHaveCount(0);
  });

  test('un visiteur anonyme est redirigé vers la connexion', async ({ page }) => {
    await page.goto('/fr/account/tickets');
    await expect(page).toHaveURL(/\/fr\/auth\/login\?next=%2Faccount%2Ftickets/);
  });

  test("l'administrateur accède au tableau de bord et aux connecteurs (sans fausse intégration)", async ({ page }) => {
    await login(page, 'admin');
    await page.goto('/fr/admin');
    await expect(page.getByRole('heading', { name: 'Tableau de bord' })).toBeVisible();
    await page.goto('/fr/admin/providers');
    await expect(page.getByText('Ticketmaster').first()).toBeVisible();
    await expect(page.getByText(/Aucune capacité|aucune capacité/i).first()).toBeVisible();
  });

  test("l'organisateur crée et publie un événement depuis le formulaire", async ({ page }) => {
    await login(page, 'organisateur', '/organizer');
    await page.goto('/fr/organizer/events/new');
    await page.locator('#ev-title').fill(`Atelier E2E ${Date.now()}`);
    await page.locator('#ev-start-date').fill('2027-05-20');
    await page.locator('#ev-start-time').fill('18:30');
    await expect.poll(async () => page.locator('#ev-city option').count()).toBeGreaterThan(1);
    await page.locator('#ev-city').selectOption({ index: 1 });
    await page.getByRole('button', { name: /Publier|Soumettre/ }).click();
    await expect(page).toHaveURL(/\/fr\/organizer\/events\/[0-9a-f-]{36}\?saved=/);
  });
});
