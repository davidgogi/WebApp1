import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DataSource } from 'typeorm';
import { PostgresDataSourceOptions } from 'typeorm/driver/postgres/PostgresDataSourceOptions.js';
import { addMissingCompanyIds } from './company-id-backfill.js';
import { SuppliersBecomePartners1794225600000 } from './migrations/1794225600000-SuppliersBecomePartners.js';
import { ProductGroupsBecomeRecords1794312000000 } from './migrations/1794312000000-ProductGroupsBecomeRecords.js';
import { SuperuserBecomesPlatformAdmin1794398400000 } from './migrations/1794398400000-SuperuserBecomesPlatformAdmin.js';

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

async function runDataMigrations(dataSource: DataSource): Promise<void> {
  const runner = dataSource.createQueryRunner();
  try {
    const pending = [
      (await runner.hasTable('suppliers'))
        ? new SuppliersBecomePartners1794225600000()
        : null,
      (await runner.hasColumn('products', 'product_group'))
        ? new ProductGroupsBecomeRecords1794312000000()
        : null,
      (await runner.hasTable('users')) &&
      !(await runner.hasTable('platform_admins'))
        ? new SuperuserBecomesPlatformAdmin1794398400000()
        : null,
    ].filter((migration) => migration !== null);
    for (const migration of pending) {
      await runner.startTransaction();
      await migration.up(runner);
      await runner.commitTransaction();
    }
  } catch (error) {
    if (runner.isTransactionActive) {
      await runner.rollbackTransaction();
    }
    throw error;
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
      await runDataMigrations(dataSource);
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
