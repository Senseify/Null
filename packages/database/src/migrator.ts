import fs from 'fs';
import path from 'path';
import { getDatabaseClient, DbClient } from './client';

export async function runMigrations(customMigrationsDir?: string): Promise<string[]> {
  const db: DbClient = getDatabaseClient();

  // Ensure migrations tracking table exists
  await db.query(`
    CREATE TABLE IF NOT EXISTS _schema_migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Locate migrations folder
  const possibleDirs = [
    customMigrationsDir,
    path.resolve(__dirname, '../migrations'),
    path.resolve(__dirname, '../../migrations'),
    path.resolve(process.cwd(), 'packages/database/migrations'),
    path.resolve(process.cwd(), 'migrations'),
  ].filter(Boolean) as string[];

  let migrationsDir = possibleDirs.find((dir) => fs.existsSync(dir));
  if (!migrationsDir) {
    throw new Error(`Could not locate migrations directory. Checked: ${possibleDirs.join(', ')}`);
  }

  console.log(`[Migrations] Scanning migrations in: ${migrationsDir}`);

  // Fetch already executed migrations
  const executedResult = await db.query<{ name: string }>(
    'SELECT name FROM _schema_migrations ORDER BY id ASC;'
  );
  const executedSet = new Set(executedResult.rows.map((r) => r.name));

  // Read files and sort
  const files = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  const appliedMigrations: string[] = [];

  for (const file of files) {
    if (executedSet.has(file)) {
      continue;
    }

    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf-8');

    console.log(`[Migrations] Applying: ${file}...`);

    await db.transaction(async (tx) => {
      // Execute migration SQL
      await tx.exec(sql);

      // Record migration
      await tx.query(
        'INSERT INTO _schema_migrations (name) VALUES ($1);',
        [file]
      );
    });

    console.log(`[Migrations] Successfully applied: ${file}`);
    appliedMigrations.push(file);
  }

  if (appliedMigrations.length === 0) {
    console.log('[Migrations] Database is up to date. No pending migrations.');
  } else {
    console.log(`[Migrations] Successfully applied ${appliedMigrations.length} migration(s).`);
  }

  return appliedMigrations;
}

// Standalone execution support
if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log('[Migrations] Migration run finished.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Migrations Error]', err);
      process.exit(1);
    });
}
