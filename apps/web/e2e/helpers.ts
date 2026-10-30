import { expect, type Page } from '@playwright/test';

/** Comptes FICTIFS créés par le jeu de données de démonstration (scripts/seed). */
export const DEMO_PASSWORD = 'Demo-Tamurt-2026';
export const account = (role: 'admin' | 'moderateur' | 'organisateur' | 'association' | 'testeur' | 'acheteur' | 'visiteur') => `${role}@tamurt-demo.example`;

export async function login(page: Page, role: Parameters<typeof account>[0], next = '/account') {
  await page.goto(`/fr/auth/login?next=${encodeURIComponent(next)}`);
  await page.locator('#email').fill(account(role));
  await page.locator('#password').fill(DEMO_PASSWORD);
  await page.locator('form button[type=submit]').click();
  await expect(page).toHaveURL(new RegExp(`/fr${next.replace(/[/]/g, '\\/')}(\\?|$)`));
}

/** Premier événement fictif avec billetterie de démonstration, trouvé via l'API de recherche. */
export async function findTicketedEventSlug(page: Page): Promise<string> {
  await page.goto('/fr/search?country=FR');
  const links = await page.locator('article h3 a').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('href') ?? ''));
  for (const href of links) {
    await page.goto(href);
    if (await page.getByRole('button', { name: /Réserver|Connectez-vous pour réserver/ }).count()) return href.split('/').pop()!;
    if (await page.getByRole('link', { name: /Connectez-vous pour réserver/ }).count()) return href.split('/').pop()!;
  }
  throw new Error('Aucun événement avec billetterie de démonstration trouvé');
}
