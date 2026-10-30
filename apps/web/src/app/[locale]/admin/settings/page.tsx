import { getTranslations, setRequestLocale } from 'next-intl/server';
import { BetaSettingsForm } from '@/components/admin/settings-forms';
import { Alert } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { PageHeader, SectionHeader } from '@/components/ui/page-header';
import type { AppLocale } from '@/i18n/routing';
import { requireAdminViewer } from '@/lib/guards';
import { getSupabase } from '@/lib/session';

/**
 * Paramètres de la plateforme (administrateurs uniquement). Les ventes et la revente RÉELLES ne sont
 * pas activables depuis l'interface : elles exigent accords, validation juridique et configuration serveur.
 */
export default async function AdminSettingsPage({ params }: PageProps<'/[locale]/admin/settings'>) {
  const locale = (await params).locale as AppLocale;
  setRequestLocale(locale);
  await requireAdminViewer(locale, '/admin/settings');
  const t = await getTranslations('admin');
  const { data } = await (await getSupabase()).from('app_settings').select('key, value');
  const settings = Object.fromEntries((data ?? []).map((row) => [row.key, row.value])) as Record<string, Record<string, unknown>>;
  const beta = settings.beta ?? {};
  return (
    <>
      <PageHeader title={t('settings')} />
      <Card>
        <SectionHeader title={t('betaSettings')} />
        <BetaSettingsForm
          initial={{
            mode: beta.mode === 'open' ? 'open' : 'closed',
            max_testers: Number(beta.max_testers ?? 0),
            testflight_url: (beta.testflight_url as string | null) ?? null,
            play_testing_url: (beta.play_testing_url as string | null) ?? null,
          }}
        />
      </Card>
      <Card className="space-y-3">
        <SectionHeader title={t('dangerZone')} />
        <Alert tone="warning" title="Vente réelle et revente réelle : désactivées">
          Activation impossible depuis l&apos;interface. Conditions préalables : accord commercial signé avec un partenaire de billetterie, accès API
          officiel, connecteur réel implémenté et testé, prestataire de paiement réel configuré, validation juridique par pays (revente),
          transfert sécurisé du billet garanti par le partenaire, puis activation explicite côté serveur.
        </Alert>
        <pre className="overflow-auto rounded-lg bg-sunken p-3 font-mono text-xs">{JSON.stringify({ commerce: settings.commerce, resale: settings.resale }, null, 2)}</pre>
      </Card>
    </>
  );
}
