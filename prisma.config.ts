import { config } from 'dotenv';
import { defineConfig } from 'prisma/config';

config();

function forPrismaCli(url: string) {
  // Prisma Migrate parses postgres.PROJECT_REF as user "postgres". Encode the dot.
  return url.replace(/:\/\/postgres\./, '://postgres%2E');
}

const migrateUrl = forPrismaCli(
  process.env.DIRECT_URL ??
    process.env.DATABASE_URL ??
    'postgresql://postgres:postgres@localhost:5432/postgres',
);

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // Migrate uses DIRECT_URL (port 5432). The Nest API still uses pooled DATABASE_URL.
    url: migrateUrl,
  },
});
