import type { Logger } from '../context';
import type { ServerEnv } from '../env';

export interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export interface PushAdapter {
  readonly enabled: boolean;
  send(messages: PushMessage[]): Promise<{ sent: number; invalidTokens: string[] }>;
}

export class DisabledPushAdapter implements PushAdapter {
  readonly enabled = false;
  async send(): Promise<{ sent: number; invalidTokens: string[] }> {
    return { sent: 0, invalidTokens: [] };
  }
}

/**
 * Envoi via le service Expo Push (expo-notifications). Activé uniquement si
 * PUSH_NOTIFICATIONS_ENABLED=true ; EXPO_ACCESS_TOKEN est recommandé (push sécurisé).
 */
export class ExpoPushAdapter implements PushAdapter {
  readonly enabled = true;

  constructor(
    private readonly accessToken: string | undefined,
    private readonly logger: Logger,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async send(messages: PushMessage[]): Promise<{ sent: number; invalidTokens: string[] }> {
    const invalidTokens: string[] = [];
    let sent = 0;
    for (let i = 0; i < messages.length; i += 100) {
      const chunk = messages.slice(i, i + 100);
      const response = await this.fetchImpl('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json',
          ...(this.accessToken ? { authorization: `Bearer ${this.accessToken}` } : {}),
        },
        body: JSON.stringify(chunk.map((m) => ({ to: m.to, title: m.title, body: m.body, data: m.data ?? {}, sound: 'default' }))),
      });
      if (!response.ok) {
        this.logger.warn('push_send_failed', { status: response.status });
        continue;
      }
      const payload = (await response.json()) as { data?: { status: string; details?: { error?: string } }[] };
      payload.data?.forEach((ticket, index) => {
        if (ticket.status === 'ok') sent += 1;
        else if (ticket.details?.error === 'DeviceNotRegistered') invalidTokens.push(chunk[index]?.to ?? '');
      });
    }
    return { sent, invalidTokens: invalidTokens.filter(Boolean) };
  }
}

export function createPushAdapter(env: ServerEnv, logger: Logger): PushAdapter {
  return env.PUSH_NOTIFICATIONS_ENABLED ? new ExpoPushAdapter(env.EXPO_ACCESS_TOKEN, logger) : new DisabledPushAdapter();
}
