const { createHash, randomUUID } = require('node:crypto');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { Client } = require('pg');

function readQuotedEnv(name) {
  const envFile = readFileSync(resolve(__dirname, '..', '.env'), 'utf8');
  const match = envFile.match(new RegExp(`^${name}="([^"]+)"`, 'm'));
  if (!match) {
    throw new Error(`${name} is missing or not double-quoted in .env`);
  }
  return match[1];
}

const connectionString = readQuotedEnv('DATABASE_URL');

const migrationName = '20260914180000_init_identity_and_content';
const sqlPath = resolve(
  __dirname,
  '..',
  'prisma',
  'migrations',
  migrationName,
  'migration.sql',
);
const sql = readFileSync(sqlPath, 'utf8');
const checksum = createHash('sha256').update(sql).digest('hex');

async function main() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  await client.query(sql);
  await client.query(`
    CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
      "id" VARCHAR(36) NOT NULL,
      "checksum" VARCHAR(64) NOT NULL,
      "finished_at" TIMESTAMPTZ,
      "migration_name" VARCHAR(255) NOT NULL,
      "logs" TEXT,
      "rolled_back_at" TIMESTAMPTZ,
      "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "applied_steps_count" INTEGER NOT NULL DEFAULT 0,
      CONSTRAINT "_prisma_migrations_pkey" PRIMARY KEY ("id")
    );
  `);

  const existing = await client.query(
    'SELECT 1 FROM "_prisma_migrations" WHERE migration_name = $1',
    [migrationName],
  );
  if (existing.rowCount === 0) {
    await client.query(
      `INSERT INTO "_prisma_migrations"
        (id, checksum, finished_at, migration_name, started_at, applied_steps_count)
       VALUES ($1, $2, now(), $3, now(), 1)`,
      [randomUUID(), checksum, migrationName],
    );
  }

  const tables = await client.query(`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename IN (
        'workspaces', 'users', 'memberships',
        'brand_briefs', 'content_requests', 'content_drafts',
        '_prisma_migrations'
      )
    ORDER BY tablename;
  `);

  await client.end();
  console.log(
    'Migration applied. Tables:',
    tables.rows.map((row) => row.tablename).join(', '),
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
