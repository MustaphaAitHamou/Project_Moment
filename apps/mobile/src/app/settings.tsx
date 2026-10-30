import { LOCALE_INFO, LOCALES } from '@tamurt/i18n';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Alert } from 'react-native';
import { useTranslations } from 'use-intl';
import { AppText, Banner, Button, Card, Chip, Row, Screen, TextField } from '@/components/ui';
import { webUrl } from '@/lib/env';
import { clearCache } from '@/lib/offline';
import { useApi } from '@/providers/api';
import { useAuth } from '@/providers/auth';
import { useLocaleState } from '@/providers/i18n';

export default function SettingsScreen() {
  const t = useTranslations();
  const { locale, setLocale } = useLocaleState();
  const { viewer, signOut } = useAuth();
  const api = useApi();
  const [password, setPassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  return (
    <Screen edges={[]}>
      <Card>
        <AppText variant="heading">{t('settings.language')}</AppText>
        <Row>{LOCALES.map((code) => <Chip key={code} label={LOCALE_INFO[code].nativeName} selected={locale === code} onPress={() => void setLocale(code)} />)}</Row>
        {locale === 'ar' ? <Banner tone="warning" text={t('app.arabicDraftNotice')} /> : null}
      </Card>
      <Card>
        <AppText variant="heading">{t('settings.permissions')}</AppText>
        <AppText variant="muted">{t('search.locationConsent')}</AppText>
        <Button title={t('settings.openSystemSettings')} variant="outline" onPress={() => void Linking.openSettings()} />
      </Card>
      <Card>
        <AppText variant="heading">{t('settings.cache')}</AppText>
        <Button title={t('settings.clearCache')} variant="outline" onPress={async () => { await clearCache(); setMessage(t('settings.cacheCleared')); }} />
        {message ? <Banner tone="success" text={message} /> : null}
      </Card>
      <Card>
        <AppText variant="heading">{t('nav.legal')}</AppText>
        <Button title={t('legal.terms')} variant="ghost" onPress={() => void WebBrowser.openBrowserAsync(webUrl(locale, '/legal/terms'))} />
        <Button title={t('legal.privacy')} variant="ghost" onPress={() => void WebBrowser.openBrowserAsync(webUrl(locale, '/legal/privacy'))} />
        <Button title={t('nav.support')} variant="ghost" onPress={() => void WebBrowser.openBrowserAsync(webUrl(locale, '/support'))} />
      </Card>
      {viewer ? (
        <Card>
          <AppText variant="heading">{t('account.deleteAccount')}</AppText>
          <AppText variant="muted">{t('account.deleteAccountText')}</AppText>
          <TextField label={t('account.deletePasswordLabel')} value={password} onChangeText={setPassword} secureTextEntry />
          <Button
            title={t('account.deleteAccountButton')}
            variant="danger"
            loading={deleting}
            disabled={!password}
            onPress={() =>
              Alert.alert(t('account.deleteAccount'), t('account.deleteConfirmLabel'), [
                { text: t('common.cancel'), style: 'cancel' },
                {
                  text: t('common.confirm'),
                  style: 'destructive',
                  onPress: async () => {
                    setDeleting(true);
                    try {
                      await api.account.delete(password);
                      await signOut();
                      Alert.alert(t('account.accountDeleted'));
                    } catch (error) {
                      Alert.alert(t('common.error'), (error as Error).message);
                    }
                    setDeleting(false);
                  },
                },
              ])
            }
          />
        </Card>
      ) : null}
      <AppText variant="caption" style={{ textAlign: 'center' }}>{t('settings.version', { version: Constants.expoConfig?.version ?? '0.0.0' })}</AppText>
    </Screen>
  );
}
