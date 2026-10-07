import { Module } from '@nestjs/common';
import { RouterModule } from '@nestjs/core';
import { WarehousesModule } from './warehouses/warehouses.module.js';
import { ProductsModule } from './products/products.module.js';

// WMS module: groups its submodules and serves them under /wms (e.g. /wms/warehouses).
@Module({
  imports: [
    WarehousesModule,
    ProductsModule,
    RouterModule.register([{ path: 'wms', children: [WarehousesModule, ProductsModule] }]),
  ],
})
export class WmsModule {}
