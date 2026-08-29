// Prisma CLI configuration.
//
// `datasource.url` deliberately reads `process.env` directly rather than
// Prisma's `env()` helper. The helper resolves eagerly when the config file
// loads, so it throws PrismaConfigEnvError on `prisma generate` — a command
// that never touches the database. That breaks any Docker build, where the
// real DATABASE_URL is only known at runtime.
// See https://github.com/prisma/prisma/issues/28590
import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env.DATABASE_URL as string,
  },
});
