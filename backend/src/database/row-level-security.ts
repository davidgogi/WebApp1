import { createHmac } from 'node:crypto';
import { DataSource, EntityManager } from 'typeorm';
import { PostgresDataSourceOptions } from 'typeorm/driver/postgres/PostgresDataSourceOptions.js';
import { PostgresQueryRunner } from 'typeorm/driver/postgres/PostgresQueryRunner.js';
import { currentScope } from './tenant-scope.js';

const POLICY = 'company_isolation';
const ROLE_NAME = /^[a-z_][a-z0-9_]*$/;

type ScopedClient = {
  query: (sql: string, values?: unknown[]) => Promise<unknown>;
  tenantKey?: string;
};

let installed = false;

export function installTenantSetting(): void {
  if (installed) {
    return;
  }
  installed = true;
  const prototype = PostgresQueryRunner.prototype;
  const query = prototype.query;
  const rollbackTransaction = prototype.rollbackTransaction;

  prototype.query = async function (
    this: PostgresQueryRunner,
    ...args: Parameters<typeof query>
  ) {
    const client = (await this.connect()) as ScopedClient;
    const scope = currentScope();

    const allCompanies = scope?.allCompanies ? 'on' : 'off';
    const companyId = scope?.companyId ?? '';
    const key = `${allCompanies}|${companyId}`;
    if (client.tenantKey !== key) {
      await client.query(
        `SELECT set_config('app.all_companies', $1, false), set_config('app.company_id', $2, false)`,
        [allCompanies, companyId],
      );
      client.tenantKey = key;
    }
    return query.apply(this, args);
  } as typeof query;

  prototype.rollbackTransaction = async function (this: PostgresQueryRunner) {
    try {
      await rollbackTransaction.call(this);
    } finally {
      if (this.databaseConnection) {
        delete (this.databaseConnection as ScopedClient).tenantKey;
      }
    }
  };
}

export function deriveAppPassword(ownerPassword: string): string {
  return createHmac('sha256', ownerPassword)
    .update('webapp limited database role')
    .digest('hex');
}

export async function prepareDatabase(
  owner: PostgresDataSourceOptions,
  appUser: string,
  appPassword: string,
): Promise<void> {
  if (!ROLE_NAME.test(appUser)) {
    throw new Error(`DB_APP_USERNAME "${appUser}" is not a plain role name`);
  }
  if (appUser === owner.username) {
    throw new Error(
      'DB_APP_USERNAME must differ from DB_USERNAME: the owner bypasses Row-Level Security',
    );
  }
  if (!appPassword) {
    throw new Error('DB_APP_PASSWORD is empty');
  }
  const dataSource = new DataSource(owner);
  await dataSource.initialize();
  try {
    await dataSource.transaction(async (manager) => {
      await ensureAppRole(manager, appUser, appPassword);
      const tables = await manager.query<{ table_name: string }[]>(
        `SELECT table_name FROM information_schema.columns
         WHERE table_schema = 'public' AND column_name = 'company_id'`,
      );

      const rule = `current_setting('app.all_companies', true) = 'on'
        OR company_id = NULLIF(current_setting('app.company_id', true), '')::uuid`;

      for (const { table_name } of tables) {
        await manager.query(
          `ALTER TABLE "${table_name}" ENABLE ROW LEVEL SECURITY`,
        );
        await manager.query(
          `DROP POLICY IF EXISTS ${POLICY} ON "${table_name}"`,
        );
        await manager.query(
          `CREATE POLICY ${POLICY} ON "${table_name}" USING (${rule}) WITH CHECK (${rule})`,
        );
      }
      await manager.query(`GRANT USAGE ON SCHEMA public TO ${appUser}`);
      await manager.query(
        `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${appUser}`,
      );
      await manager.query(
        `GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO ${appUser}`,
      );
      await manager.query(`REVOKE ALL ON TABLE migrations FROM ${appUser}`);
    });
  } finally {
    await dataSource.destroy();
  }
}

async function ensureAppRole(
  manager: EntityManager,
  appUser: string,
  appPassword: string,
): Promise<void> {
  const [role] = await manager.query<
    { rolsuper: boolean; rolbypassrls: boolean }[]
  >(`SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = $1`, [
    appUser,
  ]);
  if (role?.rolsuper || role?.rolbypassrls) {
    throw new Error(
      `Database role "${appUser}" bypasses Row-Level Security: it must not be a superuser or have BYPASSRLS`,
    );
  }
  const [{ allowed }] = await manager.query<{ allowed: boolean }[]>(
    `SELECT rolsuper OR rolcreaterole AS allowed FROM pg_roles WHERE rolname = current_user`,
  );
  if (!allowed) {
    if (role) {
      return;
    }
    throw new Error(
      `Database role "${appUser}" doesn't exist and DB_USERNAME isn't allowed to create it: give DB_USERNAME the CREATEROLE right, or create the role by hand and set DB_APP_PASSWORD`,
    );
  }
  const template = role
    ? 'ALTER ROLE %I LOGIN PASSWORD %L'
    : 'CREATE ROLE %I LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS';
  const [{ statement }] = await manager.query<{ statement: string }[]>(
    `SELECT format($1::text, $2::text, $3::text) AS statement`,
    [template, appUser, appPassword],
  );
  await manager.query(statement);
}
