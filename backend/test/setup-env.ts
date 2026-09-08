/**
 * Loads `backend/.env` before any test runs.
 *
 * The integration suites talk to a real Postgres and a real Redis rather
 * than mocking the drivers, so they need DATABASE_URL and REDIS_URL in the
 * process environment. CI sets both as job-level `env:` entries; a laptop
 * has only the `.env` the README tells you to create, and nothing was
 * reading it — so `npm test` failed locally with a driver-level error
 * (`SASL: client password must be a string`) that names neither variable.
 *
 * `dotenv` does not overwrite variables that are already set, so CI keeps
 * pointing at its own service containers and this file is a no-op there.
 */
import { config } from 'dotenv';
import { join } from 'node:path';

config({ path: join(__dirname, '..', '.env') });
config({ path: join(__dirname, '..', '..', '.env') });

process.env.DATABASE_URL =
  process.env.DATABASE_URL ??
  'postgresql://storeadvisor:localdev@localhost:5432/storeadvisor';
process.env.REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';

// When running tests on the host machine, root .env points to @postgres:5432 and redis:6379
// (Docker Compose container names). Map them to localhost if not inside a container.
if (process.env.DATABASE_URL.includes('@postgres:')) {
  process.env.DATABASE_URL = process.env.DATABASE_URL.replace(
    '@postgres:',
    '@localhost:',
  );
}
if (process.env.REDIS_URL.includes('://redis:')) {
  process.env.REDIS_URL = process.env.REDIS_URL.replace(
    '://redis:',
    '://localhost:',
  );
}
