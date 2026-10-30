import { describe, expect, it } from 'vitest';
import { AllowlistEmailAdapter, DisabledEmailAdapter, holderRefFor, readServerEnv, stableHash, type EmailAdapter } from '../src';
import { invitationCodeHash } from '../src/services/beta';
import { renderNotification } from '../src/services/notifications';

describe('utilitaires serveur', () => {
  it('produit une empreinte stable indépendante de l’ordre des clés', () => {
    expect(stableHash({ a: 1, b: { c: 2, d: [1, 2] } })).toBe(stableHash({ b: { d: [1, 2], c: 2 }, a: 1 }));
    expect(stableHash({ a: 1 })).not.toBe(stableHash({ a: 2 }));
  });

  it('dérive une référence titulaire opaque et stable', () => {
    const ref = holderRefFor('secret-secret-secret-secret-secret', 'user-1');
    expect(ref).toMatch(/^usr_[0-9a-f]{24}$/);
    expect(ref).toBe(holderRefFor('secret-secret-secret-secret-secret', 'user-1'));
    expect(ref).not.toContain('user-1');
  });

  it('hache les codes d’invitation après normalisation', () => {
    const secret = 'secret-secret-secret-secret-secret';
    expect(invitationCodeHash(secret, 'tamurt abcd efgh')).toBe(invitationCodeHash(secret, 'TAMURT-ABCD-EFGH'));
  });

  it('exige TAMURT_SERVER_SECRET en production', () => {
    const base = { SUPABASE_URL: 'http://127.0.0.1:54321', SUPABASE_ANON_KEY: 'a'.repeat(30), SUPABASE_SERVICE_ROLE_KEY: 'b'.repeat(30) };
    expect(() => readServerEnv({ ...base, NODE_ENV: 'production' })).toThrow(/TAMURT_SERVER_SECRET/);
    expect(readServerEnv({ ...base, NODE_ENV: 'development' }).TAMURT_SERVER_SECRET.length).toBeGreaterThanOrEqual(32);
  });

  it('n’envoie aucun e-mail hors liste blanche', async () => {
    const sent: string[] = [];
    const inner: EmailAdapter = { enabled: true, name: 'fake', send: async (m) => (sent.push(m.to), { delivered: true }) };
    const adapter = new AllowlistEmailAdapter(inner, 'tamurt.test, equipe@exemple.org');
    expect(await adapter.send({ to: 'a@tamurt.test', subject: '', text: '', html: '' })).toEqual({ delivered: true });
    expect(await adapter.send({ to: 'equipe@exemple.org', subject: '', text: '', html: '' })).toEqual({ delivered: true });
    expect((await adapter.send({ to: 'inconnu@gmail.com', subject: '', text: '', html: '' })).delivered).toBe(false);
    expect(sent).toEqual(['a@tamurt.test', 'equipe@exemple.org']);
    expect((await new DisabledEmailAdapter().send()).delivered).toBe(false);
  });

  it('rend les notifications dans la langue de l’utilisateur', () => {
    expect(renderNotification('en', 'order_confirmed', { order_number: 'TD-1' }, null, null).title).toBe('Order TD-1 confirmed.');
    expect(renderNotification('fr', 'event_announcement', { event_title: 'X' }, 'Titre organisateur', 'Corps').body).toBe('Corps');
  });
});
