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
