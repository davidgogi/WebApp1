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
type SampleProduct = Omit<CreateProductDto, 'warehouseIds'> & { warehouseCodes: string[] };

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

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
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
    const idsByCode = new Map((await warehouses.findAll()).map((w) => [w.code, w.id]));
    for (const { warehouseCodes, ...fields } of SAMPLE_PRODUCTS) {
      const warehouseIds = warehouseCodes.map((code) => idsByCode.get(code)).filter((id) => id !== undefined);
      const created = await products.create({ ...fields, warehouseIds });
      console.log(`products: added ${created.sku} ${created.name}`);
    }
  }

  await app.close();
}

await seed();
