// Creates a "Demo Company" that has bought every module, with sample employees, warehouses,
// products and stores, and prints a login for each person who can log in.
// Run with: npm run seed. Skips everything if the company already exists.
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { WarehousesService } from './wms/warehouses/warehouses.service.js';
import { WarehouseStatus } from './wms/warehouses/warehouse-status.enum.js';
import { WarehouseType } from './wms/warehouses/warehouse-type.enum.js';
import { CreateWarehouseDto } from './wms/warehouses/dto/create-warehouse.dto.js';
import { ProductsService } from './wms/products/products.service.js';
import { ProductUnit } from './wms/products/product-unit.enum.js';
import { CreateProductDto } from './wms/products/dto/create-product.dto.js';
import { EmployeesService } from './hr/employees/employees.service.js';
import { EmployeeRole } from './hr/employees/employee-role.enum.js';
import { CreateEmployeeDto } from './hr/employees/dto/create-employee.dto.js';
import { AuthUser } from './auth/auth-user.js';
import { UserRole } from './auth/user-role.enum.js';
import { AppModuleName, ALL_APP_MODULES } from './companies/app-module.enum.js';
import { CompaniesService } from './superadmin/companies/companies.service.js';
import { StoresService } from './store/stores/stores.service.js';

const SAMPLE_WAREHOUSES: CreateWarehouseDto[] = [
  {
    name: 'Central Warehouse',
    type: WarehouseType.MAIN,
    branches: ['Vake', 'Saburtalo', 'Gldani'],
    address: '12 Kakheti Highway, Tbilisi',
    stock: 18450,
  },
  {
    name: 'Kutaisi Distribution Center',
    type: WarehouseType.MAIN,
    branches: ['Kutaisi Center', 'Zestaponi'],
    address: '45 Nikea St, Kutaisi',
    stock: 9320,
  },
  {
    name: 'Vake Sales Warehouse',
    type: WarehouseType.SALES,
    branches: ['Vake'],
    address: '23 Chavchavadze Ave, Tbilisi',
    stock: 2140,
  },
  {
    name: 'Saburtalo Sales Warehouse',
    type: WarehouseType.SALES,
    branches: ['Saburtalo', 'Didi Dighomi'],
    address: '71 Vazha-Pshavela Ave, Tbilisi',
    stock: 1875,
  },
  {
    name: 'Batumi Sales Warehouse',
    type: WarehouseType.SALES,
    branches: ['Batumi Boulevard', 'Old Batumi'],
    address: '15 Gorgiladze St, Batumi',
    stock: 3260,
  },
  {
    name: 'Rustavi Sales Warehouse',
    type: WarehouseType.SALES,
    branches: ['Rustavi'],
    address: '8 Merab Kostava St, Rustavi',
    stock: 0,
    status: WarehouseStatus.INACTIVE,
  },
];

// `warehouseCodes` are looked up after the warehouses exist and replaced with their ids.
type SampleProduct = Omit<CreateProductDto, 'warehouseIds'> & {
  warehouseCodes: string[];
};

const SAMPLE_PRODUCTS: SampleProduct[] = [
  {
    name: 'Sunflower Oil 1L',
    sku: 'GRC-OIL-001',
    category: 'Grocery',
    supplier: 'Kakheti Agro',
    amount: 420,
    unit: ProductUnit.PCS,
    warehouseCodes: ['WH-MAIN-01', 'WH-SALE-01', 'WH-SALE-02'],
  },
  {
    name: 'Basmati Rice',
    sku: 'GRC-RCE-001',
    category: 'Grocery',
    supplier: 'Batumi Imports',
    amount: 1250.5,
    unit: ProductUnit.KG,
    warehouseCodes: ['WH-MAIN-01', 'WH-MAIN-02'],
  },
  {
    name: 'Sulguni Cheese',
    sku: 'DRY-SUL-001',
    category: 'Dairy',
    supplier: 'Imereti Dairy',
    amount: 86.4,
    unit: ProductUnit.KG,
    warehouseCodes: ['WH-SALE-01', 'WH-SALE-03'],
  },
  {
    name: 'Mineral Water 0.5L',
    sku: 'BEV-WTR-001',
    category: 'Beverages',
    supplier: 'Caucasus Springs',
    amount: 2400,
    unit: ProductUnit.PCS,
    warehouseCodes: ['WH-MAIN-01', 'WH-SALE-01', 'WH-SALE-02', 'WH-SALE-03'],
  },
  {
    name: 'Black Tea 100g',
    sku: 'BEV-TEA-001',
    category: 'Beverages',
    supplier: 'Guria Tea',
    amount: 560,
    unit: ProductUnit.PCS,
    warehouseCodes: ['WH-MAIN-01', 'WH-SALE-03'],
  },
  {
    name: 'Churchkhela',
    sku: 'SNK-CHU-001',
    category: 'Snacks',
    supplier: 'Kakheti Agro',
    amount: 310,
    unit: ProductUnit.PCS,
    warehouseCodes: ['WH-SALE-02'],
  },
  {
    name: 'Walnuts',
    sku: 'NUT-WAL-001',
    category: 'Nuts',
    supplier: 'Samegrelo Farms',
    amount: 145.75,
    unit: ProductUnit.KG,
    warehouseCodes: ['WH-MAIN-02'],
  },
  {
    name: 'Tkemali Sauce 500ml',
    sku: 'GRC-TKM-001',
    category: 'Grocery',
    supplier: 'Racha Preserves',
    amount: 0,
    unit: ProductUnit.PCS,
    warehouseCodes: ['WH-SALE-04'],
  },
];

// Fictional people: example.com emails, made-up phone and personal ID numbers.
// Roles show the different views: module admins, managers, cashiers, and plain staff.
const person = (
  firstName: string,
  lastName: string,
  personalId: string,
  position: string,
  branch: string,
  birthDate: string,
  hireDate: string,
  role: EmployeeRole | null,
  module: AppModuleName | null,
  endDate?: string,
): CreateEmployeeDto => ({
  firstName,
  lastName,
  personalId,
  email: `${firstName}.${lastName}@example.com`.toLowerCase(),
  phone: `+995 555 ${personalId.slice(-6, -4)} ${personalId.slice(-4, -2)} ${personalId.slice(-2)}`,
  branch,
  position,
  birthDate,
  hireDate,
  endDate,
  role,
  module,
});

const SAMPLE_EMPLOYEES: CreateEmployeeDto[] = [
  person('Mariam', 'Lomidze', '01008045678', 'WMS Administrator', 'Vake', '1990-05-27', '2020-06-01', EmployeeRole.ADMIN, AppModuleName.WMS),
  person('Ketevan', 'Abashidze', '61001056789', 'Store Administrator', 'Old Batumi', '1982-12-08', '2017-11-13', EmployeeRole.ADMIN, AppModuleName.STORE),
  person('Nino', 'Beridze', '01001012345', 'Warehouse Manager', 'Vake', '1986-03-14', '2019-02-15', EmployeeRole.MANAGER, AppModuleName.WMS),
  person('Levan', 'Gvelesiani', '01024056789', 'Warehouse Manager', 'Gldani', '1994-08-23', '2022-04-11', EmployeeRole.MANAGER, AppModuleName.WMS),
  person('Sandro', 'Javakhishvili', '60002089012', 'Store Manager', 'Kutaisi Center', '1988-09-05', '2022-01-10', EmployeeRole.MANAGER, AppModuleName.STORE),
  person('Giorgi', 'Kapanadze', '01030034567', 'Cashier', 'Saburtalo', '1999-01-19', '2023-09-01', EmployeeRole.CASHIER, AppModuleName.STORE),
  person('Luka', 'Tsiklauri', '61004067890', 'Cashier', 'Batumi Boulevard', '2001-07-30', '2023-03-15', EmployeeRole.CASHIER, AppModuleName.STORE),
  person('David', 'Gogichaishvili', '01017023456', 'IT Specialist', 'Vake', '1993-11-02', '2021-06-01', null, null),
  person('Ana', 'Kvaratskhelia', '01019078901', 'Accountant', 'Saburtalo', '1991-02-11', '2021-10-04', null, null),
  person('Nika', 'Meladze', '01015012345', 'Warehouse Operator', 'Rustavi', '1989-06-03', '2018-07-02', null, null, '2025-03-31'),
];

const DEMO_COMPANY = 'Demo Company';

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  const companies = app.get(CompaniesService);

  if ((await companies.findAll()).some((company) => company.name === DEMO_COMPANY)) {
    console.log(`${DEMO_COMPANY} already exists, skipped`);
    await app.close();
    return;
  }

  const superuser: AuthUser = {
    userId: 'seed',
    username: 'seed',
    displayName: 'Seed script',
    role: UserRole.SUPERUSER,
    module: null,
    companyId: null,
    companyName: null,
    companyModules: [],
    employeeId: null,
  };
  const { company, credentials } = await companies.create(superuser, {
    name: DEMO_COMPANY,
    adminFirstName: 'Demo',
    adminLastName: 'Admin',
    modules: ALL_APP_MODULES,
  });
  console.log(`company: created ${company.name} (${company.modules.join(', ')})`);

  // From here on, act as the company's system admin.
  const admin: AuthUser = {
    ...superuser,
    displayName: credentials.displayName,
    role: UserRole.SYSTEM_ADMIN,
    companyId: company.id,
    companyName: company.name,
    companyModules: company.modules,
  };

  // Each level adds the next one down, like in the app: the system admin adds module admins (and
  // people without a role), module admins add managers, managers add cashiers.
  const employees = app.get(EmployeesService);
  const createdEmployees = new Map<string, string>(); // "First Last" -> id
  const actors = new Map<string, AuthUser>(); // "First Last" -> that person acting as himself
  const nameOf = (dto: CreateEmployeeDto) => `${dto.firstName} ${dto.lastName}`;
  const asPerson = (dto: CreateEmployeeDto, id: string, role: UserRole): AuthUser => ({
    ...admin,
    displayName: nameOf(dto),
    role,
    module: dto.module ?? null,
    employeeId: id,
  });
  const moduleAdminOf = (module: AppModuleName | null | undefined) =>
    [...actors.values()].find((a) => a.role === UserRole.MODULE_ADMIN && a.module === module)!;
  const add = async (actor: AuthUser, dto: CreateEmployeeDto) => {
    const created = await employees.create(actor, dto);
    createdEmployees.set(nameOf(dto), created.id);
    console.log(`employees: added ${nameOf(dto)} (${created.role ?? 'no role'})`);
    return created;
  };

  for (const dto of SAMPLE_EMPLOYEES.filter((e) => e.role === EmployeeRole.ADMIN || !e.role)) {
    const created = await add(admin, dto);
    if (dto.role) {
      actors.set(nameOf(dto), asPerson(dto, created.id, UserRole.MODULE_ADMIN));
    }
  }
  for (const dto of SAMPLE_EMPLOYEES.filter((e) => e.role === EmployeeRole.MANAGER)) {
    const created = await add(moduleAdminOf(dto.module), dto);
    actors.set(nameOf(dto), asPerson(dto, created.id, UserRole.MANAGER));
  }

  const warehouses = app.get(WarehousesService);
  const createdWarehouses = [];
  for (const dto of SAMPLE_WAREHOUSES) {
    const created = await warehouses.create(admin, dto);
    createdWarehouses.push(created);
    console.log(`warehouses: added ${created.code} ${created.name}`);
  }
  // Two managers, two warehouses each: Nino has Central + Vake, Levan has Kutaisi + Saburtalo.
  const nino = createdEmployees.get('Nino Beridze')!;
  const levan = createdEmployees.get('Levan Gvelesiani')!;
  for (const [index, managerId] of [[0, nino], [2, nino], [1, levan], [3, levan]] as const) {
    await warehouses.update(admin, createdWarehouses[index].id, { managerId });
  }

  // Nino adds a warehouse worker without a role (no app access) to his two warehouses.
  await add(
    actors.get('Nino Beridze')!,
    {
      ...person('Zurab', 'Kiknadze', '01012098765', 'Warehouse Operator', 'Vake', '1992-09-09', '2024-02-01', null, AppModuleName.WMS),
      workplaceIds: [createdWarehouses[0].id, createdWarehouses[2].id],
    },
  );

  const products = app.get(ProductsService);
  const idsByCode = new Map(createdWarehouses.map((w) => [w.code, w.id]));
  for (const { warehouseCodes, ...fields } of SAMPLE_PRODUCTS) {
    const warehouseIds = warehouseCodes.map((code) => idsByCode.get(code)).filter((id) => id !== undefined);
    const created = await products.create(admin, { ...fields, warehouseIds });
    console.log(`products: added ${created.sku} ${created.name}`);
  }

  const stores = app.get(StoresService);
  const storeAdmin = moduleAdminOf(AppModuleName.STORE);
  const sandro = createdEmployees.get('Sandro Javakhishvili')!;
  const vake = await stores.create(storeAdmin, { name: 'Vake Store', address: '23 Chavchavadze Ave, Tbilisi', managerId: sandro, registers: 2 });
  const saburtalo = await stores.create(storeAdmin, { name: 'Saburtalo Store', address: '71 Vazha-Pshavela Ave, Tbilisi', managerId: sandro, registers: 1 });
  console.log('stores: added Vake Store, Saburtalo Store');

  // Sandro's cashiers: Giorgi works in Vake, Luka in both stores.
  const sandroActor = actors.get('Sandro Javakhishvili')!;
  const storesOf: Record<string, string[]> = {
    'Giorgi Kapanadze': [vake.id],
    'Luka Tsiklauri': [vake.id, saburtalo.id],
  };
  for (const dto of SAMPLE_EMPLOYEES.filter((e) => e.role === EmployeeRole.CASHIER)) {
    await add(sandroActor, { ...dto, workplaceIds: storesOf[nameOf(dto)] });
  }

  console.log('\nLogins (change nothing here; the passwords are shown only once):');
  console.log(`  system admin   ${credentials.username.padEnd(30)} ${credentials.password}`);
  for (const dto of SAMPLE_EMPLOYEES.filter((e) => e.role !== null)) {
    const id = createdEmployees.get(`${dto.firstName} ${dto.lastName}`)!;
    // The person who added them issues the login: the system admin for module admins, module
    // admins for managers, the manager for cashiers.
    const issuer =
      dto.role === EmployeeRole.ADMIN ? admin : dto.role === EmployeeRole.MANAGER ? moduleAdminOf(dto.module) : sandroActor;
    const login = await employees.issueCredentials(issuer, id);
    console.log(`  ${(dto.module + ' ' + dto.role).padEnd(14)} ${login.username.padEnd(30)} ${login.password}  (${login.displayName})`);
  }

  await app.close();
}

await seed();
