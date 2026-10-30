/**
 * Horloge serveur injectable : centralise l'heure courante utilisée par les pages (tests
 * déterministes possibles, et rendu des Server Components explicitement dépendant de l'instant).
 */
export function serverNowMs(): number {
  return Date.now();
}
