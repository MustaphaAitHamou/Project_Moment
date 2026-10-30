import { useQuery } from '@tanstack/react-query';
import { Link } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { useTranslations } from 'use-intl';
import { AppText, Banner, Button, Card, Chip, Row, Screen, TextField } from '@/components/ui';
import { useApi } from '@/providers/api';
import { useAuth } from '@/providers/auth';

export default function BetaScreen() {
  const t = useTranslations();
  const api = useApi();
  const { viewer, refresh } = useAuth();
  const info = useQuery({ queryKey: ['beta-info'], queryFn: () => api.beta.info() });
  const [code, setCode] = useState('');
  const [kind, setKind] = useState<'bug' | 'suggestion'>('bug');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const isTester = Boolean(viewer?.roles.includes('beta_tester') || viewer?.isStaff);
  const store = Platform.OS === 'ios' ? info.data?.testflightUrl : info.data?.playTestingUrl;
  return (
    <Screen edges={[]}>
      <AppText variant="title">{t('beta.title')}</AppText>
      <AppText variant="muted">{t('beta.subtitle')}</AppText>
      {info.data && info.data.seatsTotal > 0 ? <AppText variant="label">{t('beta.seats', { used: info.data.seatsUsed, total: info.data.seatsTotal })}</AppText> : null}
      {!viewer ? (
        <Link href="/auth/login" asChild><Button title={t('nav.login')} /></Link>
      ) : isTester ? (
        <>
          <Banner tone="success" text={t('beta.testerWelcome')} />
          <Card>
            <AppText variant="heading">{t('beta.downloads')}</AppText>
            {store ? <Button title={Platform.OS === 'ios' ? t('beta.testflight') : t('beta.playTesting')} onPress={() => void WebBrowser.openBrowserAsync(store)} /> : <AppText variant="muted">{t('beta.linkNotAvailable')}</AppText>}
          </Card>
          <Card>
            <AppText variant="heading">{t('beta.feedbackTitle')}</AppText>
            <Row>
              <Chip label={t('beta.feedbackKinds.bug')} selected={kind === 'bug'} onPress={() => setKind('bug')} />
              <Chip label={t('beta.feedbackKinds.suggestion')} selected={kind === 'suggestion'} onPress={() => setKind('suggestion')} />
            </Row>
            <TextField label={t('beta.feedbackTitleLabel')} value={title} onChangeText={setTitle} maxLength={140} />
            <TextField label={t('beta.feedbackMessage')} value={message} onChangeText={setMessage} multiline numberOfLines={5} maxLength={4000} hint={kind === 'bug' ? t('beta.feedbackBugHelp') : undefined} style={{ minHeight: 110, textAlignVertical: 'top' }} />
            {feedback ? <Banner tone={feedback.ok ? 'success' : 'danger'} text={feedback.text} /> : null}
            <Button
              title={t('common.send')}
              disabled={title.trim().length < 3 || message.trim().length < 3}
              onPress={async () => {
                try {
                  await api.beta.feedback({ kind, title: title.trim(), message: message.trim(), platform: Platform.OS === 'ios' ? 'ios' : 'android', appVersion: Constants.expoConfig?.version, deviceInfo: { os: Platform.OS, osVersion: String(Platform.Version) } });
                  setFeedback({ ok: true, text: t('beta.feedbackSent') });
                  setTitle('');
                  setMessage('');
                } catch (error) {
                  setFeedback({ ok: false, text: (error as Error).message });
                }
              }}
            />
          </Card>
        </>
      ) : (
        <Card>
          <AppText variant="heading">{t('beta.redeemTitle')}</AppText>
          <AppText variant="muted">{t('beta.redeemHelp')}</AppText>
          <TextField label={t('beta.code')} value={code} onChangeText={(value) => setCode(value.toUpperCase())} autoCapitalize="characters" placeholder="TAMURT-XXXX-XXXX" />
          {feedback ? <Banner tone={feedback.ok ? 'success' : 'danger'} text={feedback.text} /> : null}
          <Button
            title={t('beta.redeem')}
            disabled={code.trim().length < 6}
            onPress={async () => {
              try {
                await api.beta.redeem(code);
                setFeedback({ ok: true, text: t('beta.redeemed') });
                await refresh();
              } catch (error) {
                setFeedback({ ok: false, text: (error as Error).message });
              }
            }}
          />
        </Card>
      )}
    </Screen>
  );
}
