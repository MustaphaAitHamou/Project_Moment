import AsyncStorage from '@react-native-async-storage/async-storage';
import { getMessages, isLocale, isRtl, negotiateLocale, type Locale } from '@tamurt/i18n';
import { getLocales } from 'expo-localization';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Alert, I18nManager } from 'react-native';
import { IntlProvider } from 'use-intl';

const STORAGE_KEY = 'tamurt.locale';

interface LocaleState {
  locale: Locale;
  setLocale: (next: Locale) => Promise<void>;
}

const LocaleContext = createContext<LocaleState | null>(null);

function systemLocale(): Locale {
  return negotiateLocale(getLocales().map((entry) => entry.languageTag));
}

/**
 * Langue de l'interface : préférence enregistrée, sinon langue du système (fr/en/ar).
 * L'arabe active la mise en page de droite à gauche (redémarrage de l'application nécessaire).
 */
export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(systemLocale);

  useEffect(() => {
    void AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (isLocale(saved)) setLocaleState(saved);
    });
  }, []);

  const setLocale = useCallback(async (next: Locale) => {
    await AsyncStorage.setItem(STORAGE_KEY, next);
    setLocaleState(next);
    const rtl = isRtl(next);
    if (I18nManager.isRTL !== rtl) {
      I18nManager.allowRTL(rtl);
      I18nManager.forceRTL(rtl);
      const messages = getMessages(next);
      Alert.alert(messages.settings.language, messages.settings.restartForDirection);
    }
  }, []);

  const value = useMemo(() => ({ locale, setLocale }), [locale, setLocale]);
  return (
    <LocaleContext.Provider value={value}>
      <IntlProvider locale={locale} messages={getMessages(locale)} timeZone="UTC" onError={() => undefined}>
        {children}
      </IntlProvider>
    </LocaleContext.Provider>
  );
}

export function useLocaleState(): LocaleState {
  const context = useContext(LocaleContext);
  if (!context) throw new Error('useLocaleState doit être utilisé dans I18nProvider');
  return context;
}
