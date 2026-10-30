import { AppError, assertNonNegativeMinor } from '@tamurt/core';

/**
 * Prestataires de paiement. Tamurt ne stocke et ne manipule JAMAIS de données complètes de carte :
 * un prestataire réel (certifié PCI DSS) fournira ses propres composants de saisie.
 * Seul le prestataire SIMULÉ est implémenté ; aucun faux connecteur réel n'est fourni.
 */

export type PaymentMode = 'demo' | 'live';
export type DemoScenario = 'success' | 'declined' | 'error';

export interface ChargeRequest {
  amountMinor: number;
  currency: string;
  /** Référence de l'objet payé (commande ou transaction de revente). */
  reference: string;
  /** Clé idempotente : un même essai ne débite jamais deux fois. */
  idempotencyKey: string;
  description?: string;
  /** Scénario de démonstration (ignoré par un prestataire réel). */
  scenario?: DemoScenario;
}

export interface ChargeResult {
  provider: string;
  externalRef: string;
  status: 'succeeded' | 'failed';
  amountMinor: number;
  currency: string;
  failureCode: string | null;
  /** Données assainies conservées pour l'audit (jamais de numéro de carte). */
  raw: Record<string, unknown>;
}

export interface RefundResult {
  status: 'succeeded' | 'failed';
  refundRef: string;
}

export interface PaymentProvider {
  readonly id: string;
  readonly mode: PaymentMode;
  charge(request: ChargeRequest): Promise<ChargeResult>;
  refund(externalRef: string, amountMinor: number): Promise<RefundResult>;
}

/** Paiement SIMULÉ : aucun moyen de paiement collecté, résultat choisi par le scénario. */
export class DemoPaymentProvider implements PaymentProvider {
  readonly id = 'demo';
  readonly mode = 'demo' as const;

  async charge(request: ChargeRequest): Promise<ChargeResult> {
    assertNonNegativeMinor(request.amountMinor, 'amountMinor');
    if (!/^[A-Za-z0-9_-]{8,128}$/.test(request.idempotencyKey)) {
      throw new AppError('validation_failed', 'clé idempotente invalide');
    }
    const scenario = request.scenario ?? 'success';
    if (scenario === 'error') {
      throw new AppError('payment_failed', 'erreur technique simulée du prestataire de paiement');
    }
    const externalRef = `demo_pay_${request.idempotencyKey}`;
    const succeeded = scenario === 'success';
    return {
      provider: this.id,
      externalRef,
      status: succeeded ? 'succeeded' : 'failed',
      amountMinor: request.amountMinor,
      currency: request.currency,
      failureCode: succeeded ? null : 'card_declined_simulated',
      raw: { simulated: true, scenario, reference: request.reference },
    };
  }

  async refund(externalRef: string, amountMinor: number): Promise<RefundResult> {
    assertNonNegativeMinor(amountMinor, 'amountMinor');
    if (!externalRef.startsWith('demo_pay_')) {
      throw new AppError('forbidden', 'remboursement simulé réservé aux paiements simulés');
    }
    return { status: 'succeeded', refundRef: `demo_refund_${externalRef.slice('demo_pay_'.length)}` };
  }
}

export interface PaymentRouterOptions {
  demo: PaymentProvider;
  live?: PaymentProvider | null;
}

/** Sélectionne le prestataire selon l'environnement ; le mode réel exige un prestataire configuré. */
export class PaymentRouter {
  constructor(private readonly options: PaymentRouterOptions) {
    if (options.demo.mode !== 'demo') throw new Error('le prestataire de démonstration doit être en mode demo');
    if (options.live && options.live.mode !== 'live') throw new Error('le prestataire réel doit être en mode live');
  }

  resolve(environment: PaymentMode): PaymentProvider {
    if (environment === 'demo') return this.options.demo;
    if (!this.options.live) throw new AppError('live_mode_disabled', 'aucun prestataire de paiement réel configuré');
    return this.options.live;
  }
}
