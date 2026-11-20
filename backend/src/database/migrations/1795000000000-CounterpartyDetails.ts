import { MigrationInterface, QueryRunner } from 'typeorm';

export class CounterpartyDetails1795000000000 implements MigrationInterface {
  name = 'CounterpartyDetails1795000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "counterparties" ADD "number" integer`);
    await queryRunner.query(
      `UPDATE "counterparties" AS c SET "number" = numbered.n
       FROM (
         SELECT "id", row_number() OVER (PARTITION BY "company_id" ORDER BY "created_at", "id") AS n
         FROM "counterparties"
       ) AS numbered
       WHERE c."id" = numbered."id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "counterparties" ALTER COLUMN "number" SET NOT NULL`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."counterparties_legal_form_enum" AS ENUM('llc', 'jsc', 'cooperative', 'other', 'individual_entrepreneur', 'natural_person')`,
    );
    await queryRunner.query(
      `ALTER TABLE "counterparties" ADD "legal_form" "public"."counterparties_legal_form_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "counterparties" ADD "actual_address" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "counterparties" ADD "discount_percent" numeric(5,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "counterparties" ADD "credit_limit" numeric(12,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "counterparties" ADD "supplier_payment_days" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "counterparties" ADD "delivery_days" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "counterparties" ADD "bank_account" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "counterparties" ADD CONSTRAINT "UQ_fc5a43bcc248df5ec064d182038" UNIQUE ("company_id", "number")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "counterparties" DROP CONSTRAINT "UQ_fc5a43bcc248df5ec064d182038"`,
    );
    await queryRunner.query(`ALTER TABLE "counterparties" DROP COLUMN "bank_account"`);
    await queryRunner.query(`ALTER TABLE "counterparties" DROP COLUMN "delivery_days"`);
    await queryRunner.query(
      `ALTER TABLE "counterparties" DROP COLUMN "supplier_payment_days"`,
    );
    await queryRunner.query(`ALTER TABLE "counterparties" DROP COLUMN "credit_limit"`);
    await queryRunner.query(
      `ALTER TABLE "counterparties" DROP COLUMN "discount_percent"`,
    );
    await queryRunner.query(`ALTER TABLE "counterparties" DROP COLUMN "actual_address"`);
    await queryRunner.query(`ALTER TABLE "counterparties" DROP COLUMN "legal_form"`);
    await queryRunner.query(`DROP TYPE "public"."counterparties_legal_form_enum"`);
    await queryRunner.query(`ALTER TABLE "counterparties" DROP COLUMN "number"`);
  }
}
