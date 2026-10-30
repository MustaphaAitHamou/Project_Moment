import { listMyOrganizations } from '@tamurt/api-client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useLocale, useTranslations } from 'use-intl';
import { AppText, Badge, Button, Card, EmptyState, LoadingState, Row, Screen } from '@/components/ui';
import { webUrl } from '@/lib/env';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth';

/** Espace organisateur (résumé). La gestion avancée (équipe, statistiques détaillées) se fait sur le web. */
export default function OrganizerScreen() {
  const t = useTranslations();
  const locale = useLocale();
  const { viewer } = useAuth();
  const query = useQuery({ queryKey: ['my-orgs', viewer?.id], enabled: Boolean(viewer), queryFn: () => listMyOrganizations(supabase, viewer!.id) });
  if (!viewer) return <EmptyState icon="business-outline" title={t('common.requiresLogin')} action={<Link href="/auth/login" asChild><Button title={t('nav.login')} /></Link>} />;
  if (query.isLoading) return <LoadingState />;
  return (
    <Screen edges={[]}>
      <AppText variant="muted">{t('organizer.dashboardSubtitle')}</AppText>
      <Link href="/create" asChild><Button title={t('organizer.newEvent')} icon="add" /></Link>
      {!query.data?.length ? (
        <EmptyState icon="business-outline" title={t('organizer.noOrganizations')} action={<Button title={t('organizer.createOrganization')} variant="outline" onPress={() => void WebBrowser.openBrowserAsync(webUrl(locale, '/organizer/new'))} />} />
      ) : (
        query.data.map(({ organizer, role }) => (
          <Card key={organizer.id}>
            <AppText variant="heading">{organizer.name}</AppText>
            <Row>
              <Badge label={t(`organizer.roles.${role}`)} tone="info" />
              <Badge label={t(`organizer.verification.${organizer.verification_status}`)} tone={organizer.verification_status === 'verified' ? 'success' : 'neutral'} />
              {organizer.is_demo ? <Badge label={t('app.demoBadge')} tone="demo" /> : null}
            </Row>
            <Button title={t('organizer.dashboardTitle')} variant="outline" icon="open-outline" onPress={() => void WebBrowser.openBrowserAsync(webUrl(locale, `/organizer/${organizer.id}`))} />
          </Card>
        ))
      )}
    </Screen>
  );
}
