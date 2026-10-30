import { signInSchema } from '@tamurt/validation';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslations } from 'use-intl';
import { Banner, Button, Screen, TextField } from '@/components/ui';
import { supabase } from '@/lib/supabase';

export default function LoginScreen() {
  const t = useTranslations();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit() {
    const parsed = signInSchema.safeParse({ email, password });
    if (!parsed.success) return setError(t('validation.invalid_email'));
    setBusy(true);
    setError(null);
    const { error: authError } = await supabase.auth.signInWithPassword(parsed.data);
    setBusy(false);
    if (authError) return setError(authError.code === 'email_not_confirmed' ? t('auth.emailNotConfirmed') : authError.status === 429 ? t('auth.tooManyAttempts') : t('auth.invalidCredentials'));
    router.back();
  }
  return (
    <Screen edges={['bottom']}>
      {error ? <Banner tone="danger" text={error} /> : null}
      <TextField label={t('auth.email')} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" />
      <TextField label={t('auth.password')} value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" textContentType="password" onSubmitEditing={() => void submit()} />
      <Button title={t('auth.login')} loading={busy} onPress={() => void submit()} />
      <Link href="/auth/forgot" asChild><Button title={t('auth.forgotPassword')} variant="ghost" /></Link>
      <Link href="/auth/register" asChild><Button title={t('auth.register')} variant="outline" /></Link>
    </Screen>
  );
}
