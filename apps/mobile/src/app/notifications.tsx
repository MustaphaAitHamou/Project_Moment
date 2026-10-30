import { markNotificationsRead } from '@tamurt/api-client';
import { getMessages, type Locale } from '@tamurt/i18n';
import * as Notifications from 'expo-notifications';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, RefreshControl, View } from 'react-native';
import { createTranslator, useLocale, useTranslations } from 'use-intl';
import { AppText, Badge, Banner, Button, Card, EmptyState, ErrorState, LoadingState, Screen } from '@/components/ui';
import { enablePushNotifications } from '@/lib/push';
import { useNotifications } from '@/lib/queries';
import { supabase } from '@/lib/supabase';
import { useApi } from '@/providers/api';
import { useAuth } from '@/providers/auth';
import { useTheme } from '@/providers/theme';

function render(locale: Locale, type: string, data: Record<string, unknown>, title: string | null, body: string | null) {
  const t = createTranslator({ locale, messages: getMessages(locale) as unknown as Record<string, unknown> });
  let text = type;
  try {
    text = t(`notifications.types.${type}` as never, Object.fromEntries(Object.entries(data).map(([k, v]) => [k, typeof v === 'number' ? v : String(v ?? '')])) as never);
  } catch {
    // type inconnu : libellé technique
  }
  return { title: title ?? text, body: body ?? (title ? text : '') };
}

export default function NotificationsScreen() {
  const t = useTranslations();
  const locale = useLocale();
  const api = useApi();
  const router = useRouter();
  const client = useQueryClient();
  const { colors } = useTheme();
  const { viewer } = useAuth();
  const query = useNotifications(Boolean(viewer));
  const [permission, setPermission] = useState<string>('undetermined');
  const [pushMessage, setPushMessage] = useState<string | null>(null);
  useEffect(() => {
    void Notifications.getPermissionsAsync().then((result) => setPermission(result.status));
  }, []);

  if (!viewer) return <EmptyState icon="notifications-outline" title={t('common.requiresLogin')} />;
  return (
    <Screen edges={[]} refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} />}>
      {permission !== 'granted' ? (
        <Card>
          <AppText variant="heading">{t('notifications.permissionTitle')}</AppText>
          <AppText variant="muted">{t('notifications.permissionText')}</AppText>
          <Button
            title={t('notifications.permissionAllow')}
            icon="notifications-outline"
            onPress={async () => {
              const result = await enablePushNotifications(api).catch(() => 'unsupported' as const);
              setPermission(result === 'registered' || result === 'not_configured' ? 'granted' : permission);
              setPushMessage(result === 'denied' ? t('notifications.permissionDenied') : result === 'not_configured' || result === 'unsupported' ? t('common.notAvailable') : null);
            }}
          />
          {pushMessage ? <Banner tone="warning" text={pushMessage} /> : null}
        </Card>
      ) : null}
      {query.data?.some((item) => !item.read_at) ? (
        <Button title={t('notifications.markAllRead')} variant="outline" onPress={async () => { await markNotificationsRead(supabase); void client.invalidateQueries({ queryKey: ['notifications'] }); }} />
      ) : null}
      {query.isLoading ? <LoadingState /> : query.isError ? <ErrorState onRetry={() => void query.refetch()} /> : !query.data?.length ? <EmptyState icon="notifications-off-outline" title={t('notifications.empty')} /> : (
        query.data.map((item) => {
          const rendered = render(locale, item.type, (item.data ?? {}) as Record<string, unknown>, item.title, item.body);
          const eventSlug = item.link?.match(/\/events\/([a-z0-9-]+)/)?.[1];
          return (
            <Pressable key={item.id} accessibilityRole={eventSlug ? 'link' : undefined} onPress={() => eventSlug && router.push({ pathname: '/events/[slug]', params: { slug: eventSlug } })} style={{ flexDirection: 'row', gap: 10, backgroundColor: item.read_at ? colors.surface : colors.primarySoft, borderRadius: 12, padding: 12 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, marginTop: 6, backgroundColor: item.read_at ? 'transparent' : colors.primary }} />
              <View style={{ flex: 1, gap: 4 }}>
                <AppText variant="label">{rendered.title}</AppText>
                {rendered.body ? <AppText variant="muted">{rendered.body}</AppText> : null}
                {item.is_demo ? <Badge label={t('notifications.demoTag')} tone="demo" /> : null}
              </View>
            </Pressable>
          );
        })
      )}
    </Screen>
  );
}
