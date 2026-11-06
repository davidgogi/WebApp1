import { MigrationInterface, QueryRunner } from 'typeorm';

export class Baseline1793952726079 implements MigrationInterface {
  name = 'Baseline1793952726079';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "audit_log" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "company_id" uuid, "actor_name" character varying NOT NULL, "actor_role" character varying NOT NULL, "action" character varying NOT NULL, "summary" text NOT NULL, CONSTRAINT "PK_07fefa57f7f5ab8fc3f52b3ed0b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2ad7930a7c2af80585c8c1b770" ON "audit_log"  ("created_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f8377051a51b17b8ef7d0db51a" ON "audit_log"  ("company_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."companies_legal_form_enum" AS ENUM('llc', 'jsc', 'individual_entrepreneur', 'other')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."companies_status_enum" AS ENUM('active', 'suspended', 'cancelled')`,
    );
    await queryRunner.query(
      `CREATE TABLE "companies" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "modules" text array NOT NULL DEFAULT '{}', "module_prices" jsonb NOT NULL DEFAULT '{}', "legal_name" character varying, "legal_form" "public"."companies_legal_form_enum", "identification_code" character varying, "vat_payer" boolean NOT NULL DEFAULT false, "legal_address" character varying, "contact_email" character varying, "contact_phone" character varying, "status" "public"."companies_status_enum" NOT NULL DEFAULT 'active', "subscription_start" date, "trial_ends_on" date, "notes" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_3dacbb3eb4f095e29372ff8e131" UNIQUE ("name"), CONSTRAINT "UQ_6c70c9a927384eb1db1be2b39a7" UNIQUE ("identification_code"), CONSTRAINT "PK_d4bc3e82a314fa9e29f652c2c22" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."employees_role_enum" AS ENUM('admin', 'manager', 'cashier', 'system_admin')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."app_module" AS ENUM('wms', 'store', 'restaurant')`,
    );
    await queryRunner.query(
      `CREATE TABLE "employees" ("company_id" uuid NOT NULL, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "first_name" character varying, "last_name" character varying, "personal_id" character varying(11), "email" character varying, "phone" character varying, "birth_date" date, "hire_date" date, "position" character varying, "end_date" date, "role" "public"."employees_role_enum", "module" "public"."app_module", "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_7ab55d4953b026a9f4af3b8dc54" UNIQUE ("company_id", "id"), CONSTRAINT "UQ_dfd0a4eb02b29cdf6c0bdd10100" UNIQUE ("company_id", "personal_id"), CONSTRAINT "PK_b9535a98350d5b26e7eb0c26af4" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."user_role" AS ENUM('superuser', 'system_admin', 'module_admin', 'manager', 'cashier')`,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "username" character varying NOT NULL, "password_hash" character varying NOT NULL, "display_name" character varying NOT NULL, "role" "public"."user_role" NOT NULL, "module" "public"."app_module", "company_id" uuid, "employee_id" uuid, "language" character varying(2) NOT NULL DEFAULT 'en', "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_fe0bb3f6520ee0469504521e710" UNIQUE ("username"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "rs_connections" ("company_id" uuid NOT NULL, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "username" character varying NOT NULL, "password_encrypted" character varying NOT NULL, "rs_un_id" integer, "rs_user_id" integer, "checked_at" TIMESTAMP WITH TIME ZONE, "check_ok" boolean NOT NULL DEFAULT false, "updated_by" character varying NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_c3040bfe96bdf4284ae6c0444f4" UNIQUE ("company_id"), CONSTRAINT "PK_788ada0f59e22d977e5bc50c054" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "stores" ("company_id" uuid NOT NULL, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "address" character varying NOT NULL, "registers" integer NOT NULL DEFAULT '1', "manager_id" uuid, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_b0b82b402ca8a56f50ae0107e8c" UNIQUE ("company_id", "id"), CONSTRAINT "PK_7aa6e7d71fa7acdd7ca43d7c9cb" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "sale_lines" ("company_id" uuid NOT NULL, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "sale_id" uuid NOT NULL, "product_name" character varying NOT NULL, "unit_price" numeric(12,2) NOT NULL, "quantity" integer NOT NULL, "line_total" numeric(12,2) NOT NULL, CONSTRAINT "PK_d3e4396511029d8a97d9e946fb1" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "sales" ("company_id" uuid NOT NULL, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "session_id" uuid NOT NULL, "number" integer NOT NULL, "total" numeric(12,2) NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_be6745050dc0b8d2dfd90e8cd41" UNIQUE ("company_id", "id"), CONSTRAINT "PK_4f0bc990ae81dba46da680895ea" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "register_sessions" ("company_id" uuid NOT NULL, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "store_id" uuid NOT NULL, "cashier_id" uuid, "cashier_name" character varying NOT NULL, "register_no" integer NOT NULL, "opening_cash" numeric(12,2) NOT NULL, "closing_cash" numeric(12,2), "opened_at" TIMESTAMP NOT NULL DEFAULT now(), "closed_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_1d9d698323074f0ff8a41066a46" UNIQUE ("company_id", "id"), CONSTRAINT "PK_ddccd1bf0b5a1dfef68f85103ca" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_open_register_session" ON "register_sessions"  ("store_id", "register_no") WHERE "closed_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE TABLE "store_products" ("company_id" uuid NOT NULL, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "price" numeric(12,2) NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_2b42017b5d7c8bc0a2320a7295c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "store_employees" ("company_id" uuid NOT NULL, "store_id" uuid NOT NULL, "employee_id" uuid NOT NULL, CONSTRAINT "PK_7108cc820ccd44fec10cd7bddc1" PRIMARY KEY ("store_id", "employee_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_da050bd34473052e2cdda068df" ON "store_employees"  ("employee_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."company_payments_method_enum" AS ENUM('bank_transfer', 'cash', 'card', 'other')`,
    );
    await queryRunner.query(
      `CREATE TABLE "company_payments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "company_id" uuid NOT NULL, "paid_on" date NOT NULL, "amount" numeric(12,2) NOT NULL, "method" "public"."company_payments_method_enum" NOT NULL, "period_from" date NOT NULL, "period_to" date NOT NULL, "reference" character varying, "note" character varying, "recorded_by" character varying NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_acda1a3b3f738d73f50f972fe41" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."suppliers_type_enum" AS ENUM('company', 'individual')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."suppliers_status_enum" AS ENUM('active', 'inactive')`,
    );
    await queryRunner.query(
      `CREATE TABLE "suppliers" ("company_id" uuid NOT NULL, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "type" "public"."suppliers_type_enum" NOT NULL DEFAULT 'company', "identification_code" character varying, "vat_payer" boolean NOT NULL DEFAULT false, "contact_person" character varying, "phone" character varying, "email" character varying, "address" character varying, "status" "public"."suppliers_status_enum" NOT NULL DEFAULT 'active', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_314e67681d6e180fd057859a94e" UNIQUE ("company_id", "identification_code"), CONSTRAINT "PK_b70ac51766a9e3144f778cfe81e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."warehouses_type_enum" AS ENUM('main', 'sales')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."warehouses_status_enum" AS ENUM('active', 'inactive')`,
    );
    await queryRunner.query(
      `CREATE TABLE "warehouses" ("company_id" uuid NOT NULL, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "code" character varying NOT NULL, "type" "public"."warehouses_type_enum" NOT NULL, "branch" character varying, "address" character varying NOT NULL, "status" "public"."warehouses_status_enum" NOT NULL DEFAULT 'active', "manager_id" uuid, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_3b68e2c597819867d3641d78197" UNIQUE ("company_id", "id"), CONSTRAINT "UQ_83a2f7c3947e29b4e04b6ccc76a" UNIQUE ("company_id", "code"), CONSTRAINT "PK_56ae21ee2432b2270b48867e4be" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."product_categories_status_enum" AS ENUM('active', 'inactive')`,
    );
    await queryRunner.query(
      `CREATE TABLE "product_categories" ("company_id" uuid NOT NULL, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "description" character varying, "status" "public"."product_categories_status_enum" NOT NULL DEFAULT 'active', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_7069dac60d88408eca56fdc9e0c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "product_warehouses" ("company_id" uuid NOT NULL, "product_id" uuid NOT NULL, "warehouse_id" uuid NOT NULL, "quantity" numeric(12,3) NOT NULL DEFAULT '0', CONSTRAINT "PK_f96c405ceebf42d44be831498c9" PRIMARY KEY ("product_id", "warehouse_id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."products_status_enum" AS ENUM('active', 'inactive')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."products_usage_enum" AS ENUM('sale', 'ingredient', 'both')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."products_pos_status_enum" AS ENUM('storage', 'pos')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."products_unit_enum" AS ENUM('kg', 'pcs')`,
    );
    await queryRunner.query(
      `CREATE TABLE "products" ("company_id" uuid NOT NULL, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "barcode" character varying NOT NULL, "category_id" uuid NOT NULL, "product_group" character varying NOT NULL, "supplier_id" uuid NOT NULL, "status" "public"."products_status_enum" NOT NULL DEFAULT 'active', "usage" "public"."products_usage_enum" NOT NULL, "pos_status" "public"."products_pos_status_enum" NOT NULL DEFAULT 'storage', "unit" "public"."products_unit_enum" NOT NULL DEFAULT 'pcs', "cost_price" numeric(12,2) NOT NULL DEFAULT '0', "sale_price" numeric(12,2) NOT NULL DEFAULT '0', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_6b912271b0b0d98c6c25b466983" UNIQUE ("company_id", "barcode"), CONSTRAINT "PK_0806c755e0aca124e67c0cf6d7d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "receipt_lines" ("company_id" uuid NOT NULL, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "receipt_id" uuid NOT NULL, "position" integer NOT NULL, "product_id" uuid, "quantity" numeric(12,3) NOT NULL, "unit_cost" numeric(12,2) NOT NULL, "rs_name" character varying, "rs_barcode" character varying, "rs_unit_id" integer, "rs_unit" character varying, CONSTRAINT "PK_740759608403983f4864f394145" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."receipts_status_enum" AS ENUM('draft', 'posted', 'cancelled')`,
    );
    await queryRunner.query(
      `CREATE TABLE "receipts" ("company_id" uuid NOT NULL, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "number" integer NOT NULL, "status" "public"."receipts_status_enum" NOT NULL DEFAULT 'draft', "warehouse_id" uuid NOT NULL, "supplier_id" uuid, "rs_waybill_id" character varying, "rs_seller_tin" character varying, "rs_seller_name" character varying, "rs_confirmed_at" TIMESTAMP WITH TIME ZONE, "waybill_number" character varying, "date" date NOT NULL, "note" character varying, "created_by_name" character varying NOT NULL, "posted_by_name" character varying, "posted_at" TIMESTAMP WITH TIME ZONE, "cancelled_by_name" character varying, "cancelled_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_36d19a4a5e264995d93af72fed3" UNIQUE ("company_id", "number"), CONSTRAINT "PK_5e8182d7c29e023da6e1ff33bfe" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_receipts_rs_waybill" ON "receipts"  ("company_id", "rs_waybill_id") WHERE "rs_waybill_id" IS NOT NULL AND "status" <> 'cancelled'`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."stock_movements_kind_enum" AS ENUM('opening', 'receipt', 'receipt_cancel', 'transfer_out', 'transfer_in', 'transfer_cancel')`,
    );
    await queryRunner.query(
      `CREATE TABLE "stock_movements" ("company_id" uuid NOT NULL, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "kind" "public"."stock_movements_kind_enum" NOT NULL, "product_id" uuid NOT NULL, "warehouse_id" uuid NOT NULL, "quantity" numeric(12,3) NOT NULL, "balance_after" numeric(12,3) NOT NULL, "document_id" uuid, "note" character varying, "created_by_name" character varying NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_57a26b190618550d8e65fb860e7" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_efa0467b3f731be4419cdf8e29" ON "stock_movements"  ("company_id", "warehouse_id", "created_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_465facea17abbac5c55b606ab5" ON "stock_movements"  ("company_id", "product_id", "created_at") `,
    );
    await queryRunner.query(
      `CREATE TABLE "rs_product_links" ("company_id" uuid NOT NULL, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "seller_tin" character varying NOT NULL, "goods_key" character varying NOT NULL, "product_id" uuid NOT NULL, "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_cc08008ebdce2a5f594a0856e66" UNIQUE ("company_id", "seller_tin", "goods_key"), CONSTRAINT "PK_8bad3bee64f5f5473bc38ecd836" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "transfer_lines" ("company_id" uuid NOT NULL, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "transfer_id" uuid NOT NULL, "position" integer NOT NULL, "product_id" uuid, "quantity" numeric(12,3) NOT NULL, "received_quantity" numeric(12,3), "rs_name" character varying, "rs_barcode" character varying, "rs_unit_id" integer, "rs_unit" character varying, CONSTRAINT "PK_baac07f8ef171dce3095043fa84" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."transfers_status_enum" AS ENUM('draft', 'in_transit', 'received', 'cancelled')`,
    );
    await queryRunner.query(
      `CREATE TABLE "transfers" ("company_id" uuid NOT NULL, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "number" integer NOT NULL, "status" "public"."transfers_status_enum" NOT NULL DEFAULT 'draft', "from_warehouse_id" uuid NOT NULL, "to_warehouse_id" uuid NOT NULL, "date" date NOT NULL, "note" character varying, "rs_waybill_id" character varying, "waybill_number" character varying, "rs_seller_tin" character varying, "rs_closed_at" TIMESTAMP WITH TIME ZONE, "created_by_name" character varying NOT NULL, "sent_by_name" character varying, "sent_at" TIMESTAMP WITH TIME ZONE, "received_by_name" character varying, "received_at" TIMESTAMP WITH TIME ZONE, "cancelled_by_name" character varying, "cancelled_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_923bba6a8668a705ae175ca8886" UNIQUE ("company_id", "number"), CONSTRAINT "PK_f712e908b465e0085b4408cabc3" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_transfers_rs_waybill" ON "transfers"  ("company_id", "rs_waybill_id") WHERE "rs_waybill_id" IS NOT NULL AND "status" <> 'cancelled'`,
    );
    await queryRunner.query(
      `CREATE TABLE "warehouse_employees" ("company_id" uuid NOT NULL, "warehouse_id" uuid NOT NULL, "employee_id" uuid NOT NULL, CONSTRAINT "PK_0a3df9c0cae3c32c39a64a9474d" PRIMARY KEY ("warehouse_id", "employee_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c3ec50a4e59ac55f54a08ee7af" ON "warehouse_employees"  ("employee_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "employees" ADD CONSTRAINT "FK_7f3eeef59eece4147effe7bfa6a" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "FK_7ae6334059289559722437bcc1c" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "FK_9760615d88ed518196bb79ea03d" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "rs_connections" ADD CONSTRAINT "FK_c3040bfe96bdf4284ae6c0444f4" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "stores" ADD CONSTRAINT "FK_2be771fa4dcfdc26f586264a62e" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "stores" ADD CONSTRAINT "FK_0935835219e12e170ad79137da2" FOREIGN KEY ("manager_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "sale_lines" ADD CONSTRAINT "FK_b0370405f84aeaef5bd1b31aeb0" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "sale_lines" ADD CONSTRAINT "FK_d15d913d376804afaf7fbd38ed9" FOREIGN KEY ("sale_id", "company_id") REFERENCES "sales"("id","company_id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "sales" ADD CONSTRAINT "FK_6126ce1093dd7ed2d023c47633c" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "sales" ADD CONSTRAINT "FK_aab2f98f73468591878f647f1fe" FOREIGN KEY ("session_id", "company_id") REFERENCES "register_sessions"("id","company_id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "register_sessions" ADD CONSTRAINT "FK_ec711b5afbd73d56b038a34dad9" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "register_sessions" ADD CONSTRAINT "FK_e821eb41128513dd3a73c858a44" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "store_products" ADD CONSTRAINT "FK_094a95b08d5b8dcf3647228a22d" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "store_employees" ADD CONSTRAINT "FK_f919aa9f7adbfe5c108dcb2a910" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "store_employees" ADD CONSTRAINT "FK_8f99dd9b4d0848b2592f4687536" FOREIGN KEY ("store_id", "company_id") REFERENCES "stores"("id","company_id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "store_employees" ADD CONSTRAINT "FK_3ce38565d9704d404920beba527" FOREIGN KEY ("employee_id", "company_id") REFERENCES "employees"("id","company_id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "company_payments" ADD CONSTRAINT "FK_0efc41495293b16fc1505b3537a" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "suppliers" ADD CONSTRAINT "FK_6a9681499416e80c1ffac4fe86c" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouses" ADD CONSTRAINT "FK_3fcbfd5832b46945f514a7d1f56" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouses" ADD CONSTRAINT "FK_6c0a3017732f03feb52e47fad96" FOREIGN KEY ("manager_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_categories" ADD CONSTRAINT "FK_e9ed40fdcfa05ccc3db08a9c022" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_warehouses" ADD CONSTRAINT "FK_d27a0c11e6f7a6fc4be0b3db39c" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_warehouses" ADD CONSTRAINT "FK_b74f734db26700c383dc3c07ac3" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_warehouses" ADD CONSTRAINT "FK_9714e449a31b8b2848ce8ddc816" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD CONSTRAINT "FK_b417f1726f6ccafb18730adffb0" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD CONSTRAINT "FK_9a5f6868c96e0069e699f33e124" FOREIGN KEY ("category_id") REFERENCES "product_categories"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD CONSTRAINT "FK_0ec433c1e1d444962d592d86c86" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "receipt_lines" ADD CONSTRAINT "FK_3a71829852e1feae73c08cbe9c2" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "receipt_lines" ADD CONSTRAINT "FK_255e717dfa7494df655418ab6dd" FOREIGN KEY ("receipt_id") REFERENCES "receipts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "receipt_lines" ADD CONSTRAINT "FK_20bf1fb0c87ccc1597812a70c87" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "receipts" ADD CONSTRAINT "FK_a560b337c02d397720dad8f8193" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "receipts" ADD CONSTRAINT "FK_7b93c4017d06d436f369554c761" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "receipts" ADD CONSTRAINT "FK_82b046e2cc21b54080edb4454c6" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_movements" ADD CONSTRAINT "FK_5c64f92a726ebd11df7f4a45ae6" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_movements" ADD CONSTRAINT "FK_2c1bb05b80ddcc562cd28d826c6" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_movements" ADD CONSTRAINT "FK_e7831147f5a8ee3c42e6eaeee2e" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "rs_product_links" ADD CONSTRAINT "FK_57cac61db4610c3754c163ddd8e" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "rs_product_links" ADD CONSTRAINT "FK_7ae08b6e4a80b57e62ffcc3b787" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "transfer_lines" ADD CONSTRAINT "FK_16c6f4ecddcf59ff7df782e302e" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "transfer_lines" ADD CONSTRAINT "FK_34ea85053a1a744e60162c3b43c" FOREIGN KEY ("transfer_id") REFERENCES "transfers"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "transfer_lines" ADD CONSTRAINT "FK_a08f1c25d87879b008186cd525b" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "transfers" ADD CONSTRAINT "FK_e353153ace9cd3051c0935c3a35" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "transfers" ADD CONSTRAINT "FK_ac268c695d846ad6e71a3272ddf" FOREIGN KEY ("from_warehouse_id") REFERENCES "warehouses"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "transfers" ADD CONSTRAINT "FK_fb2ba8b79d0e1f87f925c727a95" FOREIGN KEY ("to_warehouse_id") REFERENCES "warehouses"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_employees" ADD CONSTRAINT "FK_24302c4c456887ee6f4cae30dfc" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_employees" ADD CONSTRAINT "FK_933c5765698f3127de585632750" FOREIGN KEY ("warehouse_id", "company_id") REFERENCES "warehouses"("id","company_id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_employees" ADD CONSTRAINT "FK_26e631b22ba1d68db974bc6160b" FOREIGN KEY ("employee_id", "company_id") REFERENCES "employees"("id","company_id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "warehouse_employees" DROP CONSTRAINT "FK_26e631b22ba1d68db974bc6160b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_employees" DROP CONSTRAINT "FK_933c5765698f3127de585632750"`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_employees" DROP CONSTRAINT "FK_24302c4c456887ee6f4cae30dfc"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transfers" DROP CONSTRAINT "FK_fb2ba8b79d0e1f87f925c727a95"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transfers" DROP CONSTRAINT "FK_ac268c695d846ad6e71a3272ddf"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transfers" DROP CONSTRAINT "FK_e353153ace9cd3051c0935c3a35"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transfer_lines" DROP CONSTRAINT "FK_a08f1c25d87879b008186cd525b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transfer_lines" DROP CONSTRAINT "FK_34ea85053a1a744e60162c3b43c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transfer_lines" DROP CONSTRAINT "FK_16c6f4ecddcf59ff7df782e302e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "rs_product_links" DROP CONSTRAINT "FK_7ae08b6e4a80b57e62ffcc3b787"`,
    );
    await queryRunner.query(
      `ALTER TABLE "rs_product_links" DROP CONSTRAINT "FK_57cac61db4610c3754c163ddd8e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_movements" DROP CONSTRAINT "FK_e7831147f5a8ee3c42e6eaeee2e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_movements" DROP CONSTRAINT "FK_2c1bb05b80ddcc562cd28d826c6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_movements" DROP CONSTRAINT "FK_5c64f92a726ebd11df7f4a45ae6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "receipts" DROP CONSTRAINT "FK_82b046e2cc21b54080edb4454c6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "receipts" DROP CONSTRAINT "FK_7b93c4017d06d436f369554c761"`,
    );
    await queryRunner.query(
      `ALTER TABLE "receipts" DROP CONSTRAINT "FK_a560b337c02d397720dad8f8193"`,
    );
    await queryRunner.query(
      `ALTER TABLE "receipt_lines" DROP CONSTRAINT "FK_20bf1fb0c87ccc1597812a70c87"`,
    );
    await queryRunner.query(
      `ALTER TABLE "receipt_lines" DROP CONSTRAINT "FK_255e717dfa7494df655418ab6dd"`,
    );
    await queryRunner.query(
      `ALTER TABLE "receipt_lines" DROP CONSTRAINT "FK_3a71829852e1feae73c08cbe9c2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" DROP CONSTRAINT "FK_0ec433c1e1d444962d592d86c86"`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" DROP CONSTRAINT "FK_9a5f6868c96e0069e699f33e124"`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" DROP CONSTRAINT "FK_b417f1726f6ccafb18730adffb0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_warehouses" DROP CONSTRAINT "FK_9714e449a31b8b2848ce8ddc816"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_warehouses" DROP CONSTRAINT "FK_b74f734db26700c383dc3c07ac3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_warehouses" DROP CONSTRAINT "FK_d27a0c11e6f7a6fc4be0b3db39c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_categories" DROP CONSTRAINT "FK_e9ed40fdcfa05ccc3db08a9c022"`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouses" DROP CONSTRAINT "FK_6c0a3017732f03feb52e47fad96"`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouses" DROP CONSTRAINT "FK_3fcbfd5832b46945f514a7d1f56"`,
    );
    await queryRunner.query(
      `ALTER TABLE "suppliers" DROP CONSTRAINT "FK_6a9681499416e80c1ffac4fe86c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "company_payments" DROP CONSTRAINT "FK_0efc41495293b16fc1505b3537a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "store_employees" DROP CONSTRAINT "FK_3ce38565d9704d404920beba527"`,
    );
    await queryRunner.query(
      `ALTER TABLE "store_employees" DROP CONSTRAINT "FK_8f99dd9b4d0848b2592f4687536"`,
    );
    await queryRunner.query(
      `ALTER TABLE "store_employees" DROP CONSTRAINT "FK_f919aa9f7adbfe5c108dcb2a910"`,
    );
    await queryRunner.query(
      `ALTER TABLE "store_products" DROP CONSTRAINT "FK_094a95b08d5b8dcf3647228a22d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "register_sessions" DROP CONSTRAINT "FK_e821eb41128513dd3a73c858a44"`,
    );
    await queryRunner.query(
      `ALTER TABLE "register_sessions" DROP CONSTRAINT "FK_ec711b5afbd73d56b038a34dad9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sales" DROP CONSTRAINT "FK_aab2f98f73468591878f647f1fe"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sales" DROP CONSTRAINT "FK_6126ce1093dd7ed2d023c47633c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sale_lines" DROP CONSTRAINT "FK_d15d913d376804afaf7fbd38ed9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sale_lines" DROP CONSTRAINT "FK_b0370405f84aeaef5bd1b31aeb0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stores" DROP CONSTRAINT "FK_0935835219e12e170ad79137da2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stores" DROP CONSTRAINT "FK_2be771fa4dcfdc26f586264a62e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "rs_connections" DROP CONSTRAINT "FK_c3040bfe96bdf4284ae6c0444f4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "FK_9760615d88ed518196bb79ea03d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "FK_7ae6334059289559722437bcc1c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "employees" DROP CONSTRAINT "FK_7f3eeef59eece4147effe7bfa6a"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c3ec50a4e59ac55f54a08ee7af"`,
    );
    await queryRunner.query(`DROP TABLE "warehouse_employees"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_transfers_rs_waybill"`);
    await queryRunner.query(`DROP TABLE "transfers"`);
    await queryRunner.query(`DROP TYPE "public"."transfers_status_enum"`);
    await queryRunner.query(`DROP TABLE "transfer_lines"`);
    await queryRunner.query(`DROP TABLE "rs_product_links"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_465facea17abbac5c55b606ab5"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_efa0467b3f731be4419cdf8e29"`,
    );
    await queryRunner.query(`DROP TABLE "stock_movements"`);
    await queryRunner.query(`DROP TYPE "public"."stock_movements_kind_enum"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_receipts_rs_waybill"`);
    await queryRunner.query(`DROP TABLE "receipts"`);
    await queryRunner.query(`DROP TYPE "public"."receipts_status_enum"`);
    await queryRunner.query(`DROP TABLE "receipt_lines"`);
    await queryRunner.query(`DROP TABLE "products"`);
    await queryRunner.query(`DROP TYPE "public"."products_unit_enum"`);
    await queryRunner.query(`DROP TYPE "public"."products_pos_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."products_usage_enum"`);
    await queryRunner.query(`DROP TYPE "public"."products_status_enum"`);
    await queryRunner.query(`DROP TABLE "product_warehouses"`);
    await queryRunner.query(`DROP TABLE "product_categories"`);
    await queryRunner.query(
      `DROP TYPE "public"."product_categories_status_enum"`,
    );
    await queryRunner.query(`DROP TABLE "warehouses"`);
    await queryRunner.query(`DROP TYPE "public"."warehouses_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."warehouses_type_enum"`);
    await queryRunner.query(`DROP TABLE "suppliers"`);
    await queryRunner.query(`DROP TYPE "public"."suppliers_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."suppliers_type_enum"`);
    await queryRunner.query(`DROP TABLE "company_payments"`);
    await queryRunner.query(
      `DROP TYPE "public"."company_payments_method_enum"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_da050bd34473052e2cdda068df"`,
    );
    await queryRunner.query(`DROP TABLE "store_employees"`);
    await queryRunner.query(`DROP TABLE "store_products"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_open_register_session"`);
    await queryRunner.query(`DROP TABLE "register_sessions"`);
    await queryRunner.query(`DROP TABLE "sales"`);
    await queryRunner.query(`DROP TABLE "sale_lines"`);
    await queryRunner.query(`DROP TABLE "stores"`);
    await queryRunner.query(`DROP TABLE "rs_connections"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "public"."user_role"`);
    await queryRunner.query(`DROP TABLE "employees"`);
    await queryRunner.query(`DROP TYPE "public"."app_module"`);
    await queryRunner.query(`DROP TYPE "public"."employees_role_enum"`);
    await queryRunner.query(`DROP TABLE "companies"`);
    await queryRunner.query(`DROP TYPE "public"."companies_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."companies_legal_form_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f8377051a51b17b8ef7d0db51a"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2ad7930a7c2af80585c8c1b770"`,
    );
    await queryRunner.query(`DROP TABLE "audit_log"`);
  }
}
