import { forgotPasswordSchema } from '@tamurt/validation';
import { useState } from 'react';
import { useTranslations } from 'use-intl';
import { AppText, Banner, Button, Screen, TextField } from '@/components/ui';
import { supabase } from '@/lib/supabase';

export default function ForgotScreen() {
  const t = useTranslations('auth');
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  if (sent) return <Screen><Banner tone="success" text={t('resetSent')} /></Screen>;
  return (
    <Screen edges={['bottom']}>
      <AppText variant="muted">{t('forgotHelp')}</AppText>
      <TextField label={t('email')} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      <Button
        title={t('sendResetLink')}
        loading={busy}
        onPress={async () => {
          const parsed = forgotPasswordSchema.safeParse({ email });
          if (!parsed.success) return;
          setBusy(true);
          await supabase.auth.resetPasswordForEmail(parsed.data.email);
          setBusy(false);
          setSent(true); // même message dans tous les cas : aucune énumération des comptes
        }}
      />
    </Screen>
  );
}
