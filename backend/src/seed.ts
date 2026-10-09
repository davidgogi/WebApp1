// Inserts sample data. Run with: npm run seed
// Skips any table that already has rows, so it's safe to run more than once.
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
const SAMPLE_EMPLOYEES: CreateEmployeeDto[] = [
  {
    firstName: 'Nino',
    lastName: 'Beridze',
    personalId: '01001012345',
    email: 'nino.beridze@example.com',
    phone: '+995 555 10 20 30',
    branch: 'Vake',
    position: 'Store Manager',
    birthDate: '1986-03-14',
    hireDate: '2019-02-15',
    role: EmployeeRole.ADMIN,
  },
  {
    firstName: 'Levan',
    lastName: 'Gvelesiani',
    personalId: '01024056789',
    email: 'levan.gvelesiani@example.com',
    phone: '+995 577 21 43 65',
    branch: 'Gldani',
    position: 'Warehouse Operator',
    birthDate: '1994-08-23',
    hireDate: '2022-04-11',
    role: EmployeeRole.STAFF,
  },
  {
    firstName: 'David',
    lastName: 'Gogichaishvili',
    personalId: '01017023456',
    email: 'david.gogichaishvili@example.com',
    phone: '+995 599 32 54 76',
    branch: 'Vake',
    position: 'IT Specialist',
    birthDate: '1993-11-02',
    hireDate: '2021-06-01',
    role: EmployeeRole.STAFF,
  },
  {
    firstName: 'Giorgi',
    lastName: 'Kapanadze',
    personalId: '01030034567',
    email: 'giorgi.kapanadze@example.com',
    phone: '+995 568 43 65 87',
    branch: 'Saburtalo',
    position: 'Cashier',
    birthDate: '1999-01-19',
    hireDate: '2023-09-01',
    role: EmployeeRole.STAFF,
  },
  {
    firstName: 'Mariam',
    lastName: 'Lomidze',
    personalId: '01008045678',
    email: 'mariam.lomidze@example.com',
    phone: '+995 555 54 76 98',
    branch: 'Vake',
    position: 'HR Specialist',
    birthDate: '1990-05-27',
    hireDate: '2020-06-01',
    role: EmployeeRole.ADMIN,
  },
  {
    firstName: 'Ketevan',
    lastName: 'Abashidze',
    personalId: '61001056789',
    email: 'ketevan.abashidze@example.com',
    phone: '+995 591 65 87 09',
    branch: 'Old Batumi',
    position: 'Regional Manager',
    birthDate: '1982-12-08',
    hireDate: '2017-11-13',
    role: EmployeeRole.ADMIN,
  },
  {
    firstName: 'Luka',
    lastName: 'Tsiklauri',
    personalId: '61004067890',
    email: 'luka.tsiklauri@example.com',
    phone: '+995 593 76 98 10',
    branch: 'Batumi Boulevard',
    position: 'Cashier',
    birthDate: '2001-07-30',
    hireDate: '2023-03-15',
    role: EmployeeRole.STAFF,
  },
  {
    firstName: 'Ana',
    lastName: 'Kvaratskhelia',
    personalId: '01019078901',
    email: 'ana.kvaratskhelia@example.com',
    phone: '+995 595 87 09 21',
    branch: 'Saburtalo',
    position: 'Accountant',
    birthDate: '1991-02-11',
    hireDate: '2021-10-04',
    role: EmployeeRole.STAFF,
  },
  {
    firstName: 'Sandro',
    lastName: 'Javakhishvili',
    personalId: '60002089012',
    email: 'sandro.javakhishvili@example.com',
    phone: '+995 597 98 10 32',
    branch: 'Kutaisi Center',
    position: 'Logistics Coordinator',
    birthDate: '1988-09-05',
    hireDate: '2022-01-10',
    role: EmployeeRole.STAFF,
  },
  {
    firstName: 'Tamar',
    lastName: 'Chikovani',
    personalId: '01027090123',
    email: 'tamar.chikovani@example.com',
    phone: '+995 558 09 21 43',
    branch: 'Didi Dighomi',
    position: 'Merchandiser',
    birthDate: '1997-04-16',
    hireDate: '2024-05-20',
    role: EmployeeRole.STAFF,
  },
  {
    firstName: 'Irakli',
    lastName: 'Shengelia',
    personalId: '60011001234',
    email: 'irakli.shengelia@example.com',
    phone: '+995 574 10 32 54',
    branch: 'Zestaponi',
    position: 'Cashier',
    birthDate: '1995-10-21',
    hireDate: '2022-08-08',
    endDate: '2026-11-30',
    role: EmployeeRole.STAFF,
  },
  {
    firstName: 'Nika',
    lastName: 'Meladze',
    personalId: '01015012345',
    email: 'nika.meladze@example.com',
    phone: '+995 579 21 43 65',
    branch: 'Rustavi',
    position: 'Warehouse Operator',
    birthDate: '1989-06-03',
    hireDate: '2018-07-02',
    endDate: '2025-03-31',
    role: EmployeeRole.STAFF,
  },
  {
    firstName: 'Salome',
    lastName: 'Gelashvili',
    personalId: '01022023456',
    email: 'salome.gelashvili@example.com',
    phone: '+995 592 32 54 76',
    branch: 'Gldani',
    position: 'Sales Consultant',
    birthDate: '1996-01-25',
    hireDate: '2021-02-01',
    endDate: '2024-09-15',
    role: EmployeeRole.STAFF,
  },
];

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  const warehouses = app.get(WarehousesService);

  if ((await warehouses.findAll()).length > 0) {
    console.log('warehouses: already has data, skipped');
  } else {
    for (const dto of SAMPLE_WAREHOUSES) {
      const created = await warehouses.create(dto);
      console.log(`warehouses: added ${created.code} ${created.name}`);
    }
  }

  const products = app.get(ProductsService);

  if ((await products.findAll()).length > 0) {
    console.log('products: already has data, skipped');
  } else {
    const idsByCode = new Map(
      (await warehouses.findAll()).map((w) => [w.code, w.id]),
    );
    for (const { warehouseCodes, ...fields } of SAMPLE_PRODUCTS) {
      const warehouseIds = warehouseCodes
        .map((code) => idsByCode.get(code))
        .filter((id) => id !== undefined);
      const created = await products.create({ ...fields, warehouseIds });
      console.log(`products: added ${created.sku} ${created.name}`);
    }
  }

  const employees = app.get(EmployeesService);

  if ((await employees.findAll()).length > 0) {
    console.log('employees: already has data, skipped');
  } else {
    for (const dto of SAMPLE_EMPLOYEES) {
      const created = await employees.create(dto);
      console.log(`employees: added ${created.firstName} ${created.lastName}`);
    }
  }

  await app.close();
}

await seed();
