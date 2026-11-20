import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AuditService } from '../../audit/audit.service.js';
import { AuthUser } from '../../auth/auth-user.js';
import { ProductPosStatus } from '../../wms/products/product-pos-status.enum.js';
import { ProductStatus } from '../../wms/products/product-status.enum.js';
import { ProductUnit } from '../../wms/products/product-unit.enum.js';
import { ProductUsage } from '../../wms/products/product-usage.enum.js';
import { Product } from '../../wms/products/product.entity.js';
import { ProductWarehouse } from '../../wms/stock/product-warehouse.entity.js';
import { WarehouseStatus } from '../../wms/warehouses/warehouse-status.enum.js';
import { CashRegisterService, saleCode } from '../cash-register/cash-register.service.js';
import { PaymentMethod } from '../cash-register/payment-method.enum.js';
import { SaleKind } from '../cash-register/sale-kind.enum.js';
import { round2 } from '../store-scope.js';
import { CreateSaleDto } from '../sales/dto/sale.dto.js';
import { NewSaleLine, SaleDetail, SalesService } from '../sales/sales.service.js';

export interface PosProduct {
  id: string;
  name: string;
  barcode: string;
  categoryId: string;
  unit: ProductUnit;
  price: number;
  stock: number;
}

export interface PosCatalog {
  sessionId: string;
  registerNo: number;
  store: { id: string; name: string };
  warehouse: { id: string; code: string; name: string };
  categories: { id: string; name: string }[];
  products: PosProduct[];
}

const SELLABLE = {
  status: ProductStatus.ACTIVE,
  posStatus: ProductPosStatus.POS,
  usage: In([ProductUsage.SALE, ProductUsage.BOTH]),
};

@Injectable()
export class PosService {
  constructor(
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    @InjectRepository(ProductWarehouse)
    private readonly balancesRepository: Repository<ProductWarehouse>,
    private readonly cashRegister: CashRegisterService,
    private readonly sales: SalesService,
    private readonly audit: AuditService,
  ) {}

  async catalog(actor: AuthUser): Promise<PosCatalog> {
    const manager = this.productsRepository.manager;
    const { session, store } = await this.cashRegister.openSessionForSale(manager, actor, false);
    const warehouse = await this.sales.saleWarehouse(manager, actor, store);
    const [products, balances] = await Promise.all([
      this.productsRepository.find({
        where: { companyId: actor.companyId!, ...SELLABLE },
        relations: { category: true },
        order: { name: 'ASC' },
      }),
      this.balancesRepository.find({ where: { companyId: actor.companyId!, warehouseId: warehouse.id } }),
    ]);
    const stock = new Map(balances.map((balance) => [balance.productId, balance.quantity]));
    const categories = new Map(products.map((product) => [product.categoryId, product.category!.name]));
    return {
      sessionId: session.id,
      registerNo: session.registerNo,
      store: { id: store.id, name: store.name },
      warehouse: { id: warehouse.id, code: warehouse.code, name: warehouse.name },
      categories: [...categories].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name)),
      products: products.map((product) => ({
        id: product.id,
        name: product.name,
        barcode: product.barcode,
        categoryId: product.categoryId,
        unit: product.unit,
        price: product.salePrice,
        stock: stock.get(product.id) ?? 0,
      })),
    };
  }

  async sell(actor: AuthUser, dto: CreateSaleDto): Promise<SaleDetail> {
    const created = await this.productsRepository.manager.transaction(async (manager) => {
      const { session, store } = await this.cashRegister.openSessionForSale(manager, actor);
      const warehouse = await this.sales.saleWarehouse(manager, actor, store);
      if (warehouse.status !== WarehouseStatus.ACTIVE) {
        throw new BadRequestException(`The store's warehouse ${warehouse.code} is inactive, so nothing can be sold`);
      }

      const quantities = new Map<string, number>();
      for (const item of dto.items) {
        quantities.set(item.productId, Math.round(((quantities.get(item.productId) ?? 0) + item.quantity) * 1000) / 1000);
      }
      const products = await manager.find(Product, { where: { id: In([...quantities.keys()]), companyId: actor.companyId! } });
      if (products.length !== quantities.size) {
        throw new BadRequestException('One or more products do not exist');
      }
      const byId = new Map(products.map((product) => [product.id, product]));
      const lines: NewSaleLine[] = [...quantities].map(([productId, quantity]) => {
        const product = byId.get(productId)!;
        const sellable =
          product.status === ProductStatus.ACTIVE &&
          product.posStatus === ProductPosStatus.POS &&
          product.usage !== ProductUsage.INGREDIENT;
        if (!sellable) {
          throw new BadRequestException(`${product.name} is not for sale at the POS`);
        }
        return {
          productId,
          productName: product.name,
          barcode: product.barcode,
          unit: product.unit,
          quantity,
          unitPrice: product.salePrice,
          lineTotal: round2(product.salePrice * quantity),
        };
      });
      const total = round2(lines.reduce((sum, line) => sum + line.lineTotal, 0));
      if (total <= 0) {
        throw new BadRequestException('The sale total must be more than ₾0');
      }
      let cashReceived: number | null = null;
      let changeGiven: number | null = null;
      if (dto.paymentMethod === PaymentMethod.CASH) {
        cashReceived = dto.cashReceived ?? total;
        if (cashReceived < total) {
          throw new BadRequestException(`The customer gave ₾${cashReceived.toFixed(2)}, but the total is ₾${total.toFixed(2)}`);
        }
        changeGiven = round2(cashReceived - total);
      }
      const sale = await this.sales.record(manager, actor, {
        kind: SaleKind.SALE,
        sessionId: session.id,
        storeId: store.id,
        warehouseId: warehouse.id,
        paymentMethod: dto.paymentMethod,
        cashReceived,
        changeGiven,
        lines,
      });
      return { sale, store, registerNo: session.registerNo };
    });
    await this.audit.record(
      actor,
      'sale.create',
      `${saleCode(created.sale)}: ₾${created.sale.total.toFixed(2)} (${created.sale.paymentMethod}) on register ${created.registerNo} in ${created.store.name}`,
    );
    return this.sales.findOne(actor, created.sale.id);
  }
}
