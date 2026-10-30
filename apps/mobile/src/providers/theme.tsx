import { radii, spacing, themes, type SemanticColors } from '@tamurt/ui';
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

export interface AppTheme {
  dark: boolean;
  colors: SemanticColors;
  spacing: typeof spacing;
  radii: typeof radii;
}

const ThemeContext = createContext<AppTheme | null>(null);

/** Thème clair/sombre automatique, avec les mêmes jetons de couleur que le site web. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const scheme = useColorScheme();
  const value = useMemo<AppTheme>(() => {
    const dark = scheme === 'dark';
    return { dark, colors: dark ? themes.dark : themes.light, spacing, radii };
  }, [scheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): AppTheme {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme doit être utilisé dans ThemeProvider');
  return context;
}
