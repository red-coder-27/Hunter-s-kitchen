import fs from 'fs';
import path from 'path';
import { postgresDb } from '../../src/server/db/postgres';
import { logger } from '../../src/server/utils/logger';

export async function runMigrations(): Promise<void> {
  await postgresDb.initialize();

  const migrationsDir = path.join(process.cwd(), 'database', 'migrations');
  if (!fs.existsSync(migrationsDir)) {
    throw new Error(`Migrations directory not found at ${migrationsDir}`);
  }

  // Create schema_migrations tracker table if not present
  await postgresDb.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  const appliedRes = await postgresDb.query<{ version: string }>(
    'SELECT version FROM schema_migrations ORDER BY version ASC'
  );
  const appliedVersions = new Set(appliedRes.rows.map((r) => r.version));

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    if (appliedVersions.has(file)) {
      console.log(`[MIGRATION] Skipping already applied migration: ${file}`);
      continue;
    }

    console.log(`[MIGRATION] Applying migration: ${file}...`);
    const sqlPath = path.join(migrationsDir, file);
    const sqlContent = fs.readFileSync(sqlPath, 'utf-8');

    await postgresDb.transaction(async (client) => {
      await client.query(sqlContent);
      await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [file]);
    });

    console.log(`[MIGRATION] Successfully applied: ${file}`);
  }

  console.log('[MIGRATION] All database schema migrations are up to date.');
}

if (process.argv[1] && process.argv[1].includes('migrate_schema')) {
  runMigrations()
    .then(async () => {
      await postgresDb.close();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('Migration failed:', err);
      await postgresDb.close().catch(() => {});
      process.exit(1);
    });
}
