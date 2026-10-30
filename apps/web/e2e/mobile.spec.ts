import { expect, test } from '@playwright/test';

test('mobile : barre à 5 onglets et bouton de création', async ({ page }) => {
  await page.goto('/fr');
  const tabBar = page.locator('nav.fixed.bottom-0');
  await expect(tabBar).toBeVisible();
  for (const label of ['Découvrir', 'Agenda', 'Billets', 'Favoris', 'Profil']) {
    await expect(tabBar.getByRole('link', { name: label })).toBeVisible();
  }
  await expect(tabBar.getByRole('link', { name: 'Créer un événement' })).toBeVisible();
  // Pas de défilement horizontal parasite.
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
