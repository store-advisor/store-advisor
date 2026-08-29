// Prisma CLI configuration.
//
// `datasource.url` deliberately reads `process.env` directly rather than
// Prisma's `env()` helper. The helper resolves eagerly when the config file
// loads, so it throws PrismaConfigEnvError on `prisma generate` - a command
// that never touches the database. That breaks any Docker build, where the
// real DATABASE_URL is only known at runtime.
// See https://github.com/prisma/prisma/issues/28590
import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    // `prisma db seed` entry point. tsx rather than a compiled step so the
    // fixture stays runnable straight from a checkout, and rather than
    // ts-node because the project's nodenext module resolution needs
    // overrides that ts-node and tsconfig then disagree about.
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: process.env.DATABASE_URL as string,
    // Only needed by commands that replay migrations into a scratch database
    // (`migrate dev`, and `migrate diff --from-migrations`, which CI uses to
    // detect a schema edited without a matching migration). Left undefined
    // everywhere else, which is fine - no other command reads it.
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL,
  },
});
