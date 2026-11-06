import { DataSource } from 'typeorm';
import { PostgresDataSourceOptions } from 'typeorm/driver/postgres/PostgresDataSourceOptions.js';

const TABLES = [
  { table: 'warehouse_employees', parent: 'warehouses', key: 'warehouse_id' },
  { table: 'store_employees', parent: 'stores', key: 'store_id' },
  { table: 'sales', parent: 'register_sessions', key: 'session_id' },
  { table: 'sale_lines', parent: 'sales', key: 'sale_id' },
];

export async function addMissingCompanyIds(
  owner: PostgresDataSourceOptions,
): Promise<void> {
  const dataSource = new DataSource(owner);
  await dataSource.initialize();
  try {
    await dataSource.transaction(async (manager) => {
      for (const { table, parent, key } of TABLES) {
        const needed = await manager.query<unknown[]>(
          `SELECT 1 FROM information_schema.tables t
           WHERE t.table_schema = 'public' AND t.table_name = $1
             AND NOT EXISTS (
               SELECT 1 FROM information_schema.columns c
               WHERE c.table_schema = 'public' AND c.table_name = t.table_name
                 AND c.column_name = 'company_id'
             )`,
          [table],
        );
        if (needed.length === 0) {
          continue;
        }
        await manager.query(`ALTER TABLE "${table}" ADD COLUMN company_id uuid`);
        await manager.query(
          `UPDATE "${table}" child SET company_id = p.company_id
           FROM "${parent}" p WHERE p.id = child.${key}`,
        );
        await manager.query(
          `ALTER TABLE "${table}" ALTER COLUMN company_id SET NOT NULL`,
        );
      }
    });
  } finally {
    await dataSource.destroy();
  }
}
