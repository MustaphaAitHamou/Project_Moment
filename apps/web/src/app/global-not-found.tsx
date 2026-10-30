import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: '404 — Tamurt Events', robots: { index: false } };

/** URL hors de toute langue (cas rare : le proxy redirige normalement vers /fr). */
export default function GlobalNotFound() {
  return (
    <html lang="fr">
      <body className="grid min-h-dvh place-items-center p-6 text-center">
        <div className="space-y-3">
          <h1 className="font-display text-3xl font-bold">Page introuvable</h1>
          <p className="text-muted">Cette page n&apos;existe pas ou n&apos;est plus disponible.</p>
          <a href="/fr" className="inline-block rounded-full bg-primary px-5 py-2.5 font-semibold text-on-primary">
            Retour à l&apos;accueil
          </a>
        </div>
      </body>
    </html>
  );
}
