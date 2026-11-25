import { MigrationInterface, QueryRunner } from "typeorm";

export class StoreExpenses1795517375669 implements MigrationInterface {
    name = 'StoreExpenses1795517375669'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."expense_item_status" AS ENUM('active', 'inactive')`);
        await queryRunner.query(`CREATE TABLE "bank_accounts" ("company_id" uuid NOT NULL, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(140) NOT NULL, "account_number" character varying(40), "opening_balance" numeric(12,2) NOT NULL DEFAULT '0', "status" "public"."expense_item_status" NOT NULL DEFAULT 'active', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_234d2ad02177607cd323b2f738f" UNIQUE ("company_id", "id"), CONSTRAINT "PK_c872de764f2038224a013ff25ed" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "expense_types" ("company_id" uuid NOT NULL, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "category_id" uuid NOT NULL, "name" character varying(140) NOT NULL, "status" "public"."expense_item_status" NOT NULL DEFAULT 'active', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_6a3f49c46e578c633f4b2d44382" UNIQUE ("company_id", "id"), CONSTRAINT "PK_84c519d5ded69fbf55ab41910df" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "expense_categories" ("company_id" uuid NOT NULL, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(140) NOT NULL, "status" "public"."expense_item_status" NOT NULL DEFAULT 'active', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_bf04e40ce11217c8243dea9f633" UNIQUE ("company_id", "id"), CONSTRAINT "PK_d0ef31e189d9523461215b62775" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."expense_source" AS ENUM('cash', 'bank')`);
        await queryRunner.query(`CREATE TYPE "public"."expense_status" AS ENUM('active', 'voided')`);
        await queryRunner.query(`CREATE TABLE "expenses" ("company_id" uuid NOT NULL, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "number" integer NOT NULL, "store_id" uuid NOT NULL, "source" "public"."expense_source" NOT NULL, "session_id" uuid, "bank_account_id" uuid, "category_id" uuid NOT NULL, "type_id" uuid NOT NULL, "supplier_id" uuid, "supplier_name" character varying(140), "expense_date" date NOT NULL, "amount" numeric(12,2) NOT NULL, "purpose" character varying(500) NOT NULL, "status" "public"."expense_status" NOT NULL DEFAULT 'active', "created_by_name" character varying NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "voided_at" TIMESTAMP WITH TIME ZONE, "voided_by_name" character varying, "void_reason" character varying(500), CONSTRAINT "UQ_6d91d3db9ce775107a144f8412a" UNIQUE ("company_id", "number"), CONSTRAINT "CHK_c6585c49a0016de7a7960d0e49" CHECK (("source" = 'cash' AND "session_id" IS NOT NULL AND "bank_account_id" IS NULL) OR ("source" = 'bank' AND "bank_account_id" IS NOT NULL AND "session_id" IS NULL)), CONSTRAINT "CHK_d155a408491aa866c979927ff6" CHECK ("amount" > 0), CONSTRAINT "PK_94c3ceb17e3140abc9282c20610" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_569223b3c97fd4ccce61196f7b" ON "expenses"  ("company_id", "expense_date") `);
        await queryRunner.query(`CREATE INDEX "IDX_ebace88d707706bd01749e9b10" ON "expenses"  ("company_id", "session_id") `);
        await queryRunner.query(`ALTER TABLE "bank_accounts" ADD CONSTRAINT "FK_869d5463de72be0afa52f0859e8" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "expense_types" ADD CONSTRAINT "FK_0305cacd7dac7170fd119f9c1cb" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "expense_types" ADD CONSTRAINT "FK_a2b8810fd9f1d0ab8aef8327423" FOREIGN KEY ("category_id", "company_id") REFERENCES "expense_categories"("id","company_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "expense_categories" ADD CONSTRAINT "FK_b7298b378d07911d4f2981cf4f6" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "expenses" ADD CONSTRAINT "FK_85389c627f20798554ac2bfb052" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "expenses" ADD CONSTRAINT "FK_36059a19747c9b6fd599086d795" FOREIGN KEY ("store_id", "company_id") REFERENCES "stores"("id","company_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "expenses" ADD CONSTRAINT "FK_ebace88d707706bd01749e9b10d" FOREIGN KEY ("session_id", "company_id") REFERENCES "register_sessions"("id","company_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "expenses" ADD CONSTRAINT "FK_a19d75cb9ae54ab6b57c7adb7cc" FOREIGN KEY ("bank_account_id", "company_id") REFERENCES "bank_accounts"("id","company_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "expenses" ADD CONSTRAINT "FK_4e88fba527ebc93c14588b57f31" FOREIGN KEY ("category_id", "company_id") REFERENCES "expense_categories"("id","company_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "expenses" ADD CONSTRAINT "FK_74327050a485ef4cf25ab3c1555" FOREIGN KEY ("type_id", "company_id") REFERENCES "expense_types"("id","company_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "expenses" DROP CONSTRAINT "FK_74327050a485ef4cf25ab3c1555"`);
        await queryRunner.query(`ALTER TABLE "expenses" DROP CONSTRAINT "FK_4e88fba527ebc93c14588b57f31"`);
        await queryRunner.query(`ALTER TABLE "expenses" DROP CONSTRAINT "FK_a19d75cb9ae54ab6b57c7adb7cc"`);
        await queryRunner.query(`ALTER TABLE "expenses" DROP CONSTRAINT "FK_ebace88d707706bd01749e9b10d"`);
        await queryRunner.query(`ALTER TABLE "expenses" DROP CONSTRAINT "FK_36059a19747c9b6fd599086d795"`);
        await queryRunner.query(`ALTER TABLE "expenses" DROP CONSTRAINT "FK_85389c627f20798554ac2bfb052"`);
        await queryRunner.query(`ALTER TABLE "expense_categories" DROP CONSTRAINT "FK_b7298b378d07911d4f2981cf4f6"`);
        await queryRunner.query(`ALTER TABLE "expense_types" DROP CONSTRAINT "FK_a2b8810fd9f1d0ab8aef8327423"`);
        await queryRunner.query(`ALTER TABLE "expense_types" DROP CONSTRAINT "FK_0305cacd7dac7170fd119f9c1cb"`);
        await queryRunner.query(`ALTER TABLE "bank_accounts" DROP CONSTRAINT "FK_869d5463de72be0afa52f0859e8"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ebace88d707706bd01749e9b10"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_569223b3c97fd4ccce61196f7b"`);
        await queryRunner.query(`DROP TABLE "expenses"`);
        await queryRunner.query(`DROP TYPE "public"."expense_status"`);
        await queryRunner.query(`DROP TYPE "public"."expense_source"`);
        await queryRunner.query(`DROP TABLE "expense_categories"`);
        await queryRunner.query(`DROP TABLE "expense_types"`);
        await queryRunner.query(`DROP TABLE "bank_accounts"`);
        await queryRunner.query(`DROP TYPE "public"."expense_item_status"`);
    }

}
