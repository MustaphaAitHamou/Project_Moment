import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        test: { name: 'unit', include: ['test/**/*.unit.test.ts'], environment: 'node' },
      },
      {
        test: {
          name: 'integration',
          include: ['test/**/*.int.test.ts'],
          environment: 'node',
          // Les tests d'intégration partagent une base Supabase locale : exécution séquentielle.
          fileParallelism: false,
          testTimeout: 60_000,
          hookTimeout: 60_000,
          globalSetup: ['test/global-setup.ts'],
        },
      },
    ],
  },
});
