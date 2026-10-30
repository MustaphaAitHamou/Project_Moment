import Ionicons from '@expo/vector-icons/Ionicons';
import { Link, type Href } from 'expo-router';
import { Pressable, View } from 'react-native';
import { useTranslations } from 'use-intl';
import { AppText, Badge, Button, Card, Row, Screen, type IconName } from '@/components/ui';
import { useAuth } from '@/providers/auth';
import { useTheme } from '@/providers/theme';

function Item({ href, icon, label }: { href: Href; icon: IconName; label: string }) {
  const { colors } = useTheme();
  return (
    <Link href={href} asChild>
      <Pressable accessibilityRole="link" style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 }}>
        <Ionicons name={icon} size={22} color={colors.primary} />
        <AppText variant="label" style={{ flex: 1 }}>{label}</AppText>
        <Ionicons name="chevron-forward" size={18} color={colors.textSubtle} />
      </Pressable>
    </Link>
  );
}

export default function ProfileScreen() {
  const t = useTranslations();
  const { viewer, signOut } = useAuth();
  const { colors } = useTheme();
  return (
    <Screen>
      <AppText variant="title">{t('nav.profile')}</AppText>
      {viewer ? (
        <Card>
          <Row>
            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center' }}>
              <AppText variant="heading" style={{ color: '#FFFFFF' }}>{viewer.displayName.slice(0, 1).toUpperCase()}</AppText>
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="heading">{viewer.displayName}</AppText>
              <AppText variant="caption">{viewer.email}</AppText>
            </View>
          </Row>
          <Row>{viewer.roles.map((role) => <Badge key={role} label={role} tone={role === 'beta_tester' ? 'warning' : 'info'} />)}</Row>
          {viewer.suspended ? <AppText variant="muted" style={{ color: colors.danger }}>{t('account.suspended')}</AppText> : null}
        </Card>
      ) : (
        <Card>
          <AppText variant="muted">{t('auth.loginSubtitle')}</AppText>
          <Link href="/auth/login" asChild><Button title={t('nav.login')} /></Link>
          <Link href="/auth/register" asChild><Button title={t('nav.register')} variant="outline" /></Link>
        </Card>
      )}
      <Card style={{ paddingVertical: 4, gap: 0 }}>
        <Item href="/notifications" icon="notifications-outline" label={t('nav.notifications')} />
        <Item href="/resale" icon="repeat-outline" label={t('nav.resale')} />
        <Item href="/organizer" icon="business-outline" label={t('nav.organizer')} />
        <Item href="/beta" icon="sparkles-outline" label={t('nav.beta')} />
        <Item href="/settings" icon="settings-outline" label={t('nav.settings')} />
      </Card>
      {viewer ? <Button title={t('nav.logout')} variant="ghost" icon="log-out-outline" onPress={() => void signOut()} /> : null}
      <AppText variant="caption" style={{ textAlign: 'center' }}>{t('app.publisher')}</AppText>
    </Screen>
  );
}
