import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

// Override with TEST_DATABASE_URL env var to point to any postgres instance.
// Default assumes docker-compose is running locally.
const TEST_DB_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://workshop:workshop@localhost:5432/mecanica_test_db'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/integration/**/*.test.ts'],
    globalSetup: ['tests/integration/global-setup.ts'],
    setupFiles: ['tests/integration/setup.ts'],
    env: {
      DATABASE_URL: TEST_DB_URL,
      NODE_ENV: 'test',
      JWT_SECRET: 'integration-test-secret',
      JWT_EXPIRES_IN: '1h',
      ADMIN_EMAIL: 'admin@test.com',
      ADMIN_PASSWORD: 'Admin@123',
    },
    sequence: { concurrent: false },
    testTimeout: 30000,
  },
  resolve: {
    alias: {
      '@domain': resolve(__dirname, 'src/domain'),
      '@application': resolve(__dirname, 'src/application'),
      '@infrastructure': resolve(__dirname, 'src/infrastructure'),
      '@shared': resolve(__dirname, 'src/shared'),
    },
  },
})
