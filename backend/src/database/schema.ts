import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DataSource } from 'typeorm';
import { PostgresDataSourceOptions } from 'typeorm/driver/postgres/PostgresDataSourceOptions.js';
import { addMissingCompanyIds } from './company-id-backfill.js';

const compiledRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

export function schemaOptions(
  owner: PostgresDataSourceOptions,
): PostgresDataSourceOptions {
  return {
    ...owner,
    entities: [join(compiledRoot, '**', '*.entity.js')],
    migrations: [join(compiledRoot, 'database', 'migrations', '*.js')],
    synchronize: false,
    migrationsRun: false,
  };
}

async function builtBySynchronize(dataSource: DataSource): Promise<boolean> {
  const runner = dataSource.createQueryRunner();
  try {
    if (!(await runner.hasTable('companies'))) {
      return false;
    }
    if (!(await runner.hasTable('migrations'))) {
      return true;
    }
    const done = await dataSource.query<unknown[]>(
      'SELECT 1 FROM migrations LIMIT 1',
    );
    return done.length === 0;
  } finally {
    await runner.release();
  }
}

export async function migrateDatabase(
  owner: PostgresDataSourceOptions,
): Promise<void> {
  const dataSource = new DataSource(schemaOptions(owner));
  await dataSource.initialize();
  try {
    if (await builtBySynchronize(dataSource)) {
      console.log(
        'Database was built by synchronize: bringing it up to date and marking the migrations as done',
      );
      await addMissingCompanyIds(owner);
      await dataSource.synchronize();
      await dataSource.runMigrations({ fake: true });
    }
    const done = await dataSource.runMigrations();
    for (const migration of done) {
      console.log(`Migration ran: ${migration.name}`);
    }
  } finally {
    await dataSource.destroy();
  }
}
