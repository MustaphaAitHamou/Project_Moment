import { signUpSchema } from '@tamurt/validation';
import { useState } from 'react';
import { Switch, View } from 'react-native';
import { useLocale, useTranslations } from 'use-intl';
import { AppText, Banner, Button, Screen, TextField } from '@/components/ui';
import { supabase } from '@/lib/supabase';

export default function RegisterScreen() {
  const t = useTranslations();
  const locale = useLocale();
  const [values, setValues] = useState({ displayName: '', email: '', password: '' });
  const [accepted, setAccepted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  async function submit() {
    const parsed = signUpSchema.safeParse({ ...values, locale, acceptTerms: accepted });
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((issue) => [String(issue.path[0]), t(issue.message as never)])));
      return;
    }
    setErrors({});
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: { data: { display_name: parsed.data.displayName, locale, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone } },
    });
    setBusy(false);
    if (error) return setErrors({ form: error.status === 429 ? t('auth.tooManyAttempts') : t('common.unknownError') });
    setDone(true);
  }
  if (done) return <Screen><Banner tone="success" title={t('auth.checkEmailTitle')} text={t('auth.checkEmailText', { email: values.email })} /></Screen>;
  return (
    <Screen edges={['bottom']}>
      {errors.form ? <Banner tone="danger" text={errors.form} /> : null}
      <TextField label={t('auth.displayName')} value={values.displayName} onChangeText={(displayName) => setValues({ ...values, displayName })} error={errors.displayName} />
      <TextField label={t('auth.email')} value={values.email} onChangeText={(email) => setValues({ ...values, email })} keyboardType="email-address" autoCapitalize="none" autoComplete="email" error={errors.email} />
      <TextField label={t('auth.password')} value={values.password} onChangeText={(password) => setValues({ ...values, password })} secureTextEntry autoComplete="new-password" hint={t('auth.passwordHint')} error={errors.password} />
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <Switch value={accepted} onValueChange={setAccepted} accessibilityLabel={t('auth.acceptTerms')} />
        <AppText variant="muted" style={{ flex: 1 }}>{t('auth.acceptTerms')}</AppText>
      </View>
      {errors.acceptTerms ? <AppText variant="caption">{errors.acceptTerms}</AppText> : null}
      <Button title={t('auth.register')} loading={busy} onPress={() => void submit()} />
    </Screen>
  );
}
