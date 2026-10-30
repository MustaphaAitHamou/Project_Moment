import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import { runDemoStoreContract } from '@tamurt/ticketing';
import { PostgresDemoInventoryStore } from '../src';
import { adminClient, closePool, sql } from './helpers';

// Même suite de contrat que le store mémoire, exécutée contre les fonctions SQL atomiques.
runDemoStoreContract(
  'PostgreSQL',
  async () => ({
    store: new PostgresDemoInventoryStore(adminClient()),
    uid: () => randomUUID().slice(0, 12),
    expireHold: async (holdRef) => {
      await sql().query(`update demo_provider.holds set expires_at = now() - interval '1 second' where hold_ref = $1`, [holdRef]);
    },
  }),
  { describe, it, expect: expect as never },
);

afterAll(async () => {
  await closePool();
});
