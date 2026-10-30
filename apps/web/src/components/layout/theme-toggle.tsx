'use client';
import { Monitor, Moon, Sun } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

export type ThemePreference = 'system' | 'light' | 'dark';
const ORDER: ThemePreference[] = ['system', 'light', 'dark'];

/** Thème mémorisé dans un cookie (lu côté serveur : pas de flash au chargement). */
export function ThemeToggle({ initial }: { initial: ThemePreference }) {
  const t = useTranslations('app');
  const [theme, setTheme] = useState<ThemePreference>(initial);
  const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length]!;
  const label = theme === 'light' ? t('themeLight') : theme === 'dark' ? t('themeDark') : t('themeSystem');
  const Icon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor;

  function apply() {
    setTheme(next);
    const root = document.documentElement;
    if (next === 'system') delete root.dataset.theme;
    else root.dataset.theme = next;
    document.cookie = `TAMURT_THEME=${next}; path=/; max-age=31536000; samesite=lax`;
  }

  return (
    <button type="button" onClick={apply} className="grid h-10 w-10 place-items-center rounded-full text-muted transition-colors hover:bg-sunken hover:text-fg" title={label} aria-label={label}>
      <Icon className="h-5 w-5" aria-hidden />
    </button>
  );
}
