import { spawn, type ChildProcess } from 'node:child_process';
import { randomBytes, randomInt } from 'node:crypto';
import { existsSync } from 'node:fs';
import { createServer } from 'node:net';
import ExcelJS from 'exceljs';
import { DataSource, type QueryRunner } from 'typeorm';

if (existsSync('.env')) {
  process.loadEnvFile('.env');
}

const owner = {
  type: 'postgres' as const,
  host: process.env.DB_HOST ?? '127.0.0.1',
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USERNAME ?? 'postgres',
  password: process.env.DB_PASSWORD ?? '',
};
const suffix = randomBytes(4).toString('hex');
const database = `webapp_e2e_${suffix}`;
const appRole = `webapp_e2e_${suffix}`;
const appPassword = randomBytes(16).toString('hex');
const superuserPassword = randomBytes(12).toString('hex');
const today = new Date().toISOString().slice(0, 10);

interface Tenant {
  label: string;
  secret: string;
  companyId: string;
  systemAdmin: string;
  wmsAdmin: string;
  employeeId: string;
  categoryId: string;
  groupId: string;
  supplierId: string;
  warehouseId: string;
  productId: string;
  receiptId: string;
}

interface Reply {
  status: number;
  body: any;
  text: string;
}

let server: ChildProcess | undefined;
let serverLog = '';
let baseUrl = '';
let a: Tenant;
let b: Tenant;

function digits(count: number): string {
  return Array.from({ length: count }, (_, i) =>
    String(i === 0 ? randomInt(1, 10) : randomInt(0, 10)),
  ).join('');
}

function partnerDetails() {
  return {
    type: 'company',
    identificationCode: digits(9),
    vatPayer: false,
    contactPerson: 'Nino',
    phone: '+995 555 12 34 56',
    email: 'test@example.com',
    address: 'Tbilisi',
    category: 'Groceries',
    status: 'active',
  };
}

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const address = probe.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      probe.close(() => resolve(port));
    });
  });
}

async function ownerQuery(sql: string): Promise<void> {
  const connection = new DataSource({ ...owner, database: 'postgres' });
  await connection.initialize();
  try {
    await connection.query(sql);
  } finally {
    await connection.destroy();
  }
}

async function call(
  method: string,
  path: string,
  token?: string,
  body?: unknown,
): Promise<Reply> {
  const response = await fetch(baseUrl + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  const json = text.startsWith('{') || text.startsWith('[');
  return {
    status: response.status,
    body: json ? JSON.parse(text) : text,
    text,
  };
}

async function ok(
  method: string,
  path: string,
  token?: string,
  body?: unknown,
): Promise<any> {
  const reply = await call(method, path, token, body);
  if (reply.status >= 300) {
    throw new Error(
      `${method} ${path} answered ${reply.status}: ${reply.text}`,
    );
  }
  return reply.body;
}

async function login(username: string, password: string): Promise<string> {
  const session = await ok('POST', '/auth/login', undefined, {
    username,
    password,
  });
  return session.token;
}

async function startServer(): Promise<void> {
  const port = await freePort();
  baseUrl = `http://127.0.0.1:${port}`;
  server = spawn(process.execPath, ['dist/main.js'], {
    env: {
      ...process.env,
      NODE_ENV: 'test',
      PORT: String(port),
      DB_DATABASE: database,
      DB_APP_USERNAME: appRole,
      DB_APP_PASSWORD: appPassword,
      SUPERUSER_USERNAME: 'superuser',
      SUPERUSER_PASSWORD: superuserPassword,
      AUTH_SECRET: randomBytes(32).toString('hex'),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stdout?.on('data', (chunk) => (serverLog += chunk));
  server.stderr?.on('data', (chunk) => (serverLog += chunk));

  for (let attempt = 0; attempt < 120; attempt++) {
    if (server.exitCode !== null) {
      break;
    }
    const healthy = await fetch(`${baseUrl}/health`).then(
      (health) => health.ok,
      () => false,
    );
    if (healthy) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`The backend did not start:\n${serverLog}`);
}

async function buildTenant(label: string, superuser: string): Promise<Tenant> {
  const secret = `${label} secret ${suffix}`;
  const { company, credentials } = await ok(
    'POST',
    '/superadmin/companies',
    superuser,
    {
      name: `E2E ${label} ${suffix}`,
      legalName: `E2E ${label} ${suffix} LLC`,
      legalForm: 'llc',
      identificationCode: digits(9),
      vatPayer: false,
      legalAddress: 'Tbilisi',
      contactEmail: `${label.toLowerCase()}-${suffix}@example.com`,
      contactPhone: '+995555000000',
      adminFirstName: label,
      adminLastName: 'Admin',
      modules: ['wms'],
      modulePrices: { wms: 0 },
      subscriptionStart: today,
    },
  );
  const systemAdmin = await login(credentials.username, credentials.password);

  const employee = await ok('POST', '/hr/employees', systemAdmin, {
    firstName: secret,
    lastName: 'Person',
    personalId: digits(11),
    email: `${label.toLowerCase()}-admin-${suffix}@example.com`,
    phone: '+995555111111',
    birthDate: '1990-01-01',
    hireDate: '2020-01-01',
    position: 'WMS admin',
    role: 'admin',
    module: 'wms',
  });
  const wmsLogin = await ok(
    'POST',
    `/hr/employees/${employee.id}/credentials`,
    systemAdmin,
  );
  const wmsAdmin = await login(wmsLogin.username, wmsLogin.password);

  const category = await ok('POST', '/wms/categories', wmsAdmin, {
    name: `${secret} category`,
  });
  const group = await ok(
    'POST',
    `/wms/categories/${category.id}/groups`,
    wmsAdmin,
    { name: `${secret} group` },
  );
  const supplier = await ok('POST', '/parameters/partners', wmsAdmin, {
    ...partnerDetails(),
    name: `${secret} supplier`,
    isSupplier: true,
    isClient: false,
    contacts: [
      {
        firstName: `${secret} contact`,
        lastName: 'Beridze',
        phone: '+995 555 12 34 56',
        position: 'Sales manager',
        email: 'contact@example.com',
      },
    ],
  });
  const warehouse = await ok('POST', '/wms/warehouses', wmsAdmin, {
    name: `${secret} warehouse`,
    type: 'main',
    address: 'Tbilisi',
  });
  const product = await ok('POST', '/wms/products', wmsAdmin, {
    name: `${secret} product`,
    barcode: `E2E-${label}-${suffix}`,
    categoryId: category.id,
    groupId: group.id,
    supplierId: supplier.id,
    status: 'active',
    usage: 'sale',
    posStatus: 'pos',
    unit: 'pcs',
    costPrice: 1,
    salePrice: 2,
  });
  const receipt = await ok('POST', '/wms/receipts', wmsAdmin, {
    warehouseId: warehouse.id,
    supplierId: supplier.id,
    date: today,
    lines: [{ productId: product.id, quantity: 1, unitCost: 1 }],
  });

  return {
    label,
    secret,
    companyId: company.id,
    systemAdmin,
    wmsAdmin,
    employeeId: employee.id,
    categoryId: category.id,
    groupId: group.id,
    supplierId: supplier.id,
    warehouseId: warehouse.id,
    productId: product.id,
    receiptId: receipt.id,
  };
}

function expectRefused(reply: Reply, other: Tenant): void {
  expect(reply.status).toBeGreaterThanOrEqual(400);
  expect(reply.status).toBeLessThan(500);
  expect(reply.text).not.toContain(other.secret);
}

async function asAppRole<T>(
  work: (runner: QueryRunner) => Promise<T>,
): Promise<T> {
  const connection = new DataSource({
    ...owner,
    database,
    username: appRole,
    password: appPassword,
  });
  await connection.initialize();
  const runner = connection.createQueryRunner();
  await runner.connect();
  try {
    return await work(runner);
  } finally {
    await runner.release();
    await connection.destroy();
  }
}

beforeAll(async () => {
  await ownerQuery(`CREATE DATABASE "${database}"`);
  await startServer();
  const superuser = (
    await ok('POST', '/auth/superadmin-login', undefined, {
      username: 'superuser',
      password: superuserPassword,
    })
  ).token;
  a = await buildTenant('A', superuser);
  b = await buildTenant('B', superuser);
});

afterAll(async () => {
  if (server && server.exitCode === null) {
    const stopped = new Promise((resolve) => server!.once('exit', resolve));
    server.kill();
    await stopped;
  }
  await ownerQuery(`DROP DATABASE IF EXISTS "${database}" WITH (FORCE)`);
  await ownerQuery(`DROP ROLE IF EXISTS "${appRole}"`);
});

describe('tenant isolation', () => {
  const wmsLists = [
    '/wms/warehouses',
    '/wms/products',
    '/wms/categories',
    '/parameters/partners',
    '/wms/receipts',
  ];

  it('each company sees its own rows', async () => {
    for (const path of wmsLists) {
      expect((await call('GET', path, a.wmsAdmin)).text, path).toContain(
        a.secret,
      );
    }
    expect((await call('GET', '/hr/employees', a.systemAdmin)).text).toContain(
      a.secret,
    );
  });

  it('lists never contain the other company', async () => {
    for (const path of wmsLists) {
      const reply = await call('GET', path, a.wmsAdmin);
      expect(reply.status, path).toBe(200);
      expect(reply.text, path).not.toContain(b.secret);
    }
    for (const path of ['/hr/employees', '/audit', ...wmsLists]) {
      const reply = await call('GET', path, a.systemAdmin);
      expect(reply.status, path).toBe(200);
      expect(reply.text, path).not.toContain(b.secret);
    }
  });

  it("the other company's rows cannot be opened by id", async () => {
    expectRefused(
      await call('GET', `/wms/warehouses/${b.warehouseId}`, a.wmsAdmin),
      b,
    );
    expectRefused(
      await call('GET', `/wms/products/${b.productId}`, a.wmsAdmin),
      b,
    );
    expectRefused(
      await call('GET', `/wms/receipts/${b.receiptId}`, a.wmsAdmin),
      b,
    );
    expectRefused(
      await call('GET', `/hr/employees/${b.employeeId}`, a.systemAdmin),
      b,
    );
    expectRefused(
      await call(
        'GET',
        `/parameters/partners/${b.supplierId}/history`,
        a.wmsAdmin,
      ),
      b,
    );
    const ownHistory = await call(
      'GET',
      `/parameters/partners/${b.supplierId}/history`,
      b.wmsAdmin,
    );
    expect(ownHistory.status).toBe(200);
    expect(ownHistory.body.map((entry: { action: string }) => entry.action)).toContain(
      'partner.create',
    );
  });

  it("the other company's rows cannot be changed", async () => {
    expectRefused(
      await call('PATCH', `/wms/categories/${b.categoryId}/groups/${b.groupId}`, a.wmsAdmin, { name: `hacked by ${a.label}` }),
      b,
    );
    expectRefused(
      await call('PATCH', `/wms/categories/${a.categoryId}/groups/${b.groupId}`, a.wmsAdmin, { name: `hacked by ${a.label}` }),
      b,
    );
    const hacked = { name: `hacked by ${a.label}` };
    expectRefused(
      await call(
        'PATCH',
        `/wms/warehouses/${b.warehouseId}`,
        a.wmsAdmin,
        hacked,
      ),
      b,
    );
    expectRefused(
      await call('PATCH', `/wms/products/${b.productId}`, a.wmsAdmin, hacked),
      b,
    );
    expectRefused(
      await call(
        'PATCH',
        `/wms/categories/${b.categoryId}`,
        a.wmsAdmin,
        hacked,
      ),
      b,
    );
    expectRefused(
      await call('PATCH', `/parameters/partners/${b.supplierId}`, a.wmsAdmin, hacked),
      b,
    );
    expectRefused(
      await call('PATCH', `/wms/receipts/${b.receiptId}`, a.wmsAdmin, {
        warehouseId: a.warehouseId,
        supplierId: a.supplierId,
        date: today,
        lines: [{ productId: a.productId, quantity: 5, unitCost: 1 }],
      }),
      b,
    );
    expectRefused(
      await call('PATCH', `/hr/employees/${b.employeeId}`, a.systemAdmin, {
        position: 'hacked',
      }),
      b,
    );

    for (const path of wmsLists) {
      const text = (await call('GET', path, b.wmsAdmin)).text;
      expect(text, path).toContain(b.secret);
      expect(text, path).not.toContain('hacked');
    }
    expect(
      (await call('GET', `/hr/employees/${b.employeeId}`, b.systemAdmin)).body
        .position,
    ).toBe('WMS admin');
  });

  it("the other company's rows cannot be deleted", async () => {
    expectRefused(
      await call('DELETE', `/wms/categories/${b.categoryId}/groups/${b.groupId}?noGroup=true`, a.wmsAdmin),
      b,
    );
    expectRefused(
      await call('DELETE', `/wms/categories/${a.categoryId}/groups/${b.groupId}?noGroup=true`, a.wmsAdmin),
      b,
    );
    expect((await call('GET', '/wms/categories', b.wmsAdmin)).text).toContain(b.groupId);
    expectRefused(
      await call('DELETE', `/wms/receipts/${b.receiptId}`, a.wmsAdmin),
      b,
    );
    expectRefused(
      await call('DELETE', `/wms/products/${b.productId}`, a.wmsAdmin),
      b,
    );
    expectRefused(
      await call('DELETE', `/wms/warehouses/${b.warehouseId}`, a.wmsAdmin),
      b,
    );
    expectRefused(
      await call('DELETE', `/wms/categories/${b.categoryId}`, a.wmsAdmin),
      b,
    );
    expectRefused(
      await call('DELETE', `/parameters/partners/${b.supplierId}`, a.wmsAdmin),
      b,
    );
    expectRefused(
      await call('DELETE', `/hr/employees/${b.employeeId}`, a.systemAdmin),
      b,
    );

    expect(
      (await call('GET', `/wms/warehouses/${b.warehouseId}`, b.wmsAdmin))
        .status,
    ).toBe(200);
    expect(
      (await call('GET', `/wms/products/${b.productId}`, b.wmsAdmin)).status,
    ).toBe(200);
    expect(
      (await call('GET', `/wms/receipts/${b.receiptId}`, b.wmsAdmin)).status,
    ).toBe(200);
    expect(
      (await call('GET', `/hr/employees/${b.employeeId}`, b.systemAdmin))
        .status,
    ).toBe(200);
    expect((await call('GET', '/wms/categories', b.wmsAdmin)).text).toContain(
      b.categoryId,
    );
    expect((await call('GET', '/parameters/partners', b.wmsAdmin)).text).toContain(
      b.supplierId,
    );
  });

  it("a partners import isn't affected by the other company's partners", async () => {
    const name = `${b.secret} imported`;
    const code = digits(9);
    await ok('POST', '/parameters/partners', b.wmsAdmin, {
      ...partnerDetails(),
      name,
      isSupplier: true,
      isClient: false,
      identificationCode: code,
    });
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Partners');
    sheet.addRow([
      'Counterparty name',
      'Organization type',
      'Counterparty type',
      'Category',
      'Identification code',
      'VAT status',
      'Contact person',
      'Phone',
      'Email',
      'Address',
      'Status',
    ]);
    sheet.addRow([
      name,
      'Company',
      'Client',
      'Groceries',
      code,
      'Not a VAT payer',
      'Nino',
      '+995 555 12 34 56',
      'test@example.com',
      'Tbilisi',
      'Active',
    ]);
    const form = new FormData();
    form.append(
      'file',
      new Blob([(await workbook.xlsx.writeBuffer()) as ArrayBuffer]),
      'partners.xlsx',
    );
    const response = await fetch(`${baseUrl}/parameters/partners/import/check`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${a.wmsAdmin}` },
      body: form,
    });
    const report = await response.json();
    expect(report.errors).toEqual([]);
    expect(report.validRows).toBe(1);
  });

  it("nobody can issue a login for the other company's people", async () => {
    expectRefused(
      await call(
        'POST',
        `/hr/employees/${b.employeeId}/credentials`,
        a.systemAdmin,
      ),
      b,
    );
  });

  it("the other company's ids cannot be used in your own data", async () => {
    expectRefused(
      await call('POST', `/wms/categories/${b.categoryId}/groups`, a.wmsAdmin, { name: 'planted' }),
      b,
    );
    expectRefused(
      await call('DELETE', `/wms/categories/${a.categoryId}?moveToCategoryId=${b.categoryId}`, a.wmsAdmin),
      b,
    );
    expectRefused(
      await call('PATCH', `/wms/products/${a.productId}`, a.wmsAdmin, { groupId: b.groupId }),
      b,
    );
    expect((await call('GET', `/wms/products/${a.productId}`, a.wmsAdmin)).body.groupId).toBe(a.groupId);
    const product = {
      name: `${a.secret} borrowed`,
      barcode: `E2E-borrow-${suffix}`,
      categoryId: a.categoryId,
      supplierId: a.supplierId,
      status: 'active',
      usage: 'sale',
      posStatus: 'pos',
      unit: 'pcs',
      costPrice: 1,
      salePrice: 2,
    };
    expectRefused(
      await call('POST', '/wms/products', a.wmsAdmin, {
        ...product,
        categoryId: b.categoryId,
      }),
      b,
    );
    expectRefused(
      await call('POST', '/wms/products', a.wmsAdmin, {
        ...product,
        supplierId: b.supplierId,
      }),
      b,
    );

    const receipt = {
      warehouseId: a.warehouseId,
      supplierId: a.supplierId,
      date: today,
      lines: [{ productId: a.productId, quantity: 1, unitCost: 1 }],
    };
    expectRefused(
      await call('POST', '/wms/receipts', a.wmsAdmin, {
        ...receipt,
        warehouseId: b.warehouseId,
      }),
      b,
    );
    expectRefused(
      await call('POST', '/wms/receipts', a.wmsAdmin, {
        ...receipt,
        supplierId: b.supplierId,
      }),
      b,
    );
    expectRefused(
      await call('POST', '/wms/receipts', a.wmsAdmin, {
        ...receipt,
        lines: [{ productId: b.productId, quantity: 1, unitCost: 1 }],
      }),
      b,
    );
    expectRefused(
      await call('POST', '/wms/warehouses', a.wmsAdmin, {
        name: `${a.secret} borrowed warehouse`,
        type: 'main',
        address: 'Tbilisi',
        managerId: b.employeeId,
      }),
      b,
    );
  });

  it("the database shows the app role only the current company's rows", async () => {
    await asAppRole(async (runner) => {
      const count = async (sql: string, parameters: unknown[] = []) =>
        Number((await runner.query(sql, parameters))[0].count);

      expect(await count('SELECT count(*) FROM warehouses')).toBe(0);

      await runner.query(`SELECT set_config('app.company_id', $1, false)`, [
        a.companyId,
      ]);
      expect(await count('SELECT count(*) FROM warehouses')).toBeGreaterThan(0);
      expect(
        await count('SELECT count(*) FROM warehouses WHERE company_id <> $1', [
          a.companyId,
        ]),
      ).toBe(0);
      expect(
        await count('SELECT count(*) FROM products WHERE id = $1', [
          b.productId,
        ]),
      ).toBe(0);
      expect(await count('SELECT count(*) FROM product_groups WHERE id = $1', [b.groupId])).toBe(0);
      expect(
        await count('SELECT count(*) FROM employees WHERE id = $1', [
          b.employeeId,
        ]),
      ).toBe(0);

      const updated = await runner.query(
        `UPDATE warehouses SET name = 'hacked' WHERE id = $1 RETURNING id`,
        [b.warehouseId],
      );
      expect(updated).toEqual([[], 0]);

      await expect(
        runner.query(
          `INSERT INTO product_categories (company_id, name) VALUES ($1, 'planted')`,
          [b.companyId],
        ),
      ).rejects.toThrow(/row-level security/);
    });
  });

  it('the database refuses links between two companies', async () => {
    const connection = new DataSource({ ...owner, database });
    await connection.initialize();
    try {
      await expect(
        connection.query(
          `INSERT INTO warehouse_employees (company_id, warehouse_id, employee_id) VALUES ($1, $2, $3)`,
          [a.companyId, b.warehouseId, a.employeeId],
        ),
      ).rejects.toThrow(/foreign key/);
      await expect(
        connection.query(`UPDATE products SET group_id = $1 WHERE id = $2`, [b.groupId, a.productId]),
      ).rejects.toThrow(/foreign key/);
    } finally {
      await connection.destroy();
    }
  });
});
