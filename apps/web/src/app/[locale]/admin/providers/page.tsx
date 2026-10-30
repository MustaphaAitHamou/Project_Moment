import { CAPABILITY_DESCRIPTIONS, enabledCapabilities } from '@tamurt/ticketing';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { DataTable, Td } from '@/components/admin/data-table';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { PageHeader, SectionHeader } from '@/components/ui/page-header';
import type { AppLocale } from '@/i18n/routing';
import { requireStaffViewer } from '@/lib/guards';
import { getServerContext } from '@/lib/server-context';
import { getSupabase } from '@/lib/session';

/**
 * Connecteurs de billetterie : seul le fournisseur FICTIF est implémenté. Les partenaires prévus
 * apparaissent sans aucune capacité tant qu'aucun accord ni accès API n'existe (aucune fausse connexion).
 */
export default async function ProvidersPage({ params }: PageProps<'/[locale]/admin/providers'>) {
  const locale = (await params).locale as AppLocale;
  setRequestLocale(locale);
  await requireStaffViewer(locale, '/admin/providers');
  const t = await getTranslations('admin');
  const supabase = await getSupabase();
  const [providers, agreements] = await Promise.all([
    supabase.from('ticket_providers').select('id, display_name, kind, status, is_demo, contract_status, live_enabled, integration_notes').order('is_demo', { ascending: false }),
    supabase.from('commercial_agreements').select('id, provider_id, country_code, model, status, commission_bps, fee_share_bps, catalog_discount_bps, customer_service_fee_bps, promo_funding_allowed, notes').order('provider_id'),
  ]);
  const registry = getServerContext().registry.describe();
  return (
    <>
      <PageHeader title={t('providers')} />
      <Alert tone="info">La vente réelle exige un accord commercial signé, un accès API officiel et une activation explicite (TICKETING_LIVE_PROVIDERS). Aucun partenariat n&apos;est présenté comme existant.</Alert>
      <section>
        <SectionHeader title={t('capabilities')} />
        <DataTable head={['ID', t('providerStatus.live'), t('capabilities')]}>
          {registry.map((info) => {
            const capabilities = enabledCapabilities(info.capabilities);
            return (
              <tr key={info.id}>
                <Td><span className="font-semibold">{info.displayName}</span><br /><span className="font-mono text-xs text-subtle">{info.id}</span></Td>
                <Td><Badge tone={info.implemented ? 'success' : 'neutral'}>{info.mode}{info.implemented ? '' : ' · —'}</Badge></Td>
                <Td>
                  {capabilities.length ? (
                    <div className="flex max-w-xl flex-wrap gap-1">{capabilities.map((capability) => <Badge key={capability} tone="secondary" title={CAPABILITY_DESCRIPTIONS[capability]}>{capability}</Badge>)}</div>
                  ) : (
                    <span className="text-muted">{t('noCapabilities')}</span>
                  )}
                </Td>
              </tr>
            );
          })}
        </DataTable>
      </section>
      <section>
        <SectionHeader title={t('providers')} />
        <DataTable head={['ID', t('providerStatus.live'), t('contractStatus.signed'), '']}>
          {(providers.data ?? []).map((provider) => (
            <tr key={provider.id}>
              <Td><span className="font-semibold">{provider.display_name}</span>{provider.is_demo ? <Badge tone="demo" className="ms-2">Démo</Badge> : null}<br /><span className="font-mono text-xs text-subtle">{provider.id}</span></Td>
              <Td><Badge tone={provider.status === 'demo' ? 'demo' : provider.status === 'live' ? 'success' : 'neutral'}>{t(`providerStatus.${provider.status as 'disabled'}`)}</Badge></Td>
              <Td><Badge>{t(`contractStatus.${provider.contract_status as 'no_agreement'}`)}</Badge></Td>
              <Td className="max-w-sm text-xs text-muted">{provider.integration_notes}</Td>
            </tr>
          ))}
        </DataTable>
      </section>
      <section>
        <SectionHeader title="Accords commerciaux" />
        <DataTable head={['Fournisseur', 'Modèle', 'Statut', 'Paramètres (bps)']} empty={agreements.data?.length ? undefined : '—'}>
          {(agreements.data ?? []).map((agreement) => (
            <tr key={agreement.id}>
              <Td>{agreement.provider_id} · {agreement.country_code ?? '*'}</Td>
              <Td>{agreement.model}</Td>
              <Td><Badge tone={agreement.status === 'active' ? 'success' : agreement.status === 'simulation' ? 'demo' : 'warning'}>{agreement.status}</Badge></Td>
              <Td className="text-xs text-muted">commission {agreement.commission_bps} · partage {agreement.fee_share_bps} · remise catalogue {agreement.catalog_discount_bps} · frais service {agreement.customer_service_fee_bps} · promo {agreement.promo_funding_allowed ? 'oui' : 'non'}<p>{agreement.notes}</p></Td>
            </tr>
          ))}
        </DataTable>
      </section>
    </>
  );
}
