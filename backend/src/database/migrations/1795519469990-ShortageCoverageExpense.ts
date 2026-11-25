import { MigrationInterface, QueryRunner } from "typeorm";

export class ShortageCoverageExpense1795519469990 implements MigrationInterface {
    name = 'ShortageCoverageExpense1795519469990'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "expenses" DROP CONSTRAINT "CHK_c6585c49a0016de7a7960d0e49"`);
        await queryRunner.query(`ALTER TABLE "shortage_coverages" ADD "expense_id" uuid`);
        await queryRunner.query(`ALTER TABLE "expenses" DROP CONSTRAINT "FK_4e88fba527ebc93c14588b57f31"`);
        await queryRunner.query(`ALTER TABLE "expenses" DROP CONSTRAINT "FK_74327050a485ef4cf25ab3c1555"`);
        await queryRunner.query(`ALTER TYPE "public"."expense_source" RENAME TO "expense_source_old"`);
        await queryRunner.query(`CREATE TYPE "public"."expense_source" AS ENUM('cash', 'bank', 'shortage')`);
        await queryRunner.query(`ALTER TABLE "expenses" ALTER COLUMN "source" TYPE "public"."expense_source" USING "source"::"text"::"public"."expense_source"`);
        await queryRunner.query(`DROP TYPE "public"."expense_source_old"`);
        await queryRunner.query(`ALTER TABLE "expenses" ALTER COLUMN "category_id" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "expenses" ALTER COLUMN "type_id" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "expenses" ADD CONSTRAINT "CHK_5f47dbdbc2a377f1145fdf46c3" CHECK ("source" = 'shortage' OR ("category_id" IS NOT NULL AND "type_id" IS NOT NULL))`);
        await queryRunner.query(`ALTER TABLE "expenses" ADD CONSTRAINT "CHK_12459fc96b2b6a52ef621ce1ff" CHECK (("source" IN ('cash', 'shortage') AND "session_id" IS NOT NULL AND "bank_account_id" IS NULL) OR ("source" = 'bank' AND "bank_account_id" IS NOT NULL AND "session_id" IS NULL))`);
        await queryRunner.query(`ALTER TABLE "expenses" ADD CONSTRAINT "UQ_925e625d74fc361ccb547b8e14c" UNIQUE ("company_id", "id")`);
        await queryRunner.query(`ALTER TABLE "expenses" ADD CONSTRAINT "FK_4e88fba527ebc93c14588b57f31" FOREIGN KEY ("category_id", "company_id") REFERENCES "expense_categories"("id","company_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "expenses" ADD CONSTRAINT "FK_74327050a485ef4cf25ab3c1555" FOREIGN KEY ("type_id", "company_id") REFERENCES "expense_types"("id","company_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "shortage_coverages" ADD CONSTRAINT "FK_a874f515900b4652a2e0331737f" FOREIGN KEY ("expense_id", "company_id") REFERENCES "expenses"("id","company_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`
            WITH source AS MATERIALIZED (
                SELECT
                    coverage.id AS coverage_id,
                    uuid_generate_v4() AS expense_id,
                    coverage.company_id,
                    COALESCE((SELECT MAX(existing.number) FROM "expenses" existing WHERE existing.company_id = coverage.company_id), 0)
                        + ROW_NUMBER() OVER (PARTITION BY coverage.company_id ORDER BY coverage.created_at, coverage.number) AS number,
                    session.store_id,
                    coverage.session_id,
                    (coverage.created_at AT TIME ZONE 'Asia/Tbilisi')::date AS expense_date,
                    coverage.amount,
                    COALESCE(coverage.note, 'Shortage of register ' || session.register_no || ' (' || session.cashier_name || ')') AS purpose,
                    coverage.covered_by_name,
                    coverage.created_at
                FROM "shortage_coverages" coverage
                JOIN "register_sessions" session ON session.id = coverage.session_id AND session.company_id = coverage.company_id
                WHERE coverage.expense_id IS NULL
            ),
            inserted AS (
                INSERT INTO "expenses" ("company_id", "id", "number", "store_id", "source", "session_id", "expense_date", "amount", "purpose", "status", "created_by_name", "created_at")
                SELECT company_id, expense_id, number, store_id, 'shortage', session_id, expense_date, amount, purpose, 'active', covered_by_name, created_at
                FROM source
                RETURNING "id"
            )
            UPDATE "shortage_coverages" coverage
            SET "expense_id" = source.expense_id
            FROM source
            WHERE coverage.id = source.coverage_id AND source.expense_id IN (SELECT id FROM inserted)
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "shortage_coverages" DROP CONSTRAINT "FK_a874f515900b4652a2e0331737f"`);
        await queryRunner.query(`UPDATE "shortage_coverages" SET "expense_id" = NULL`);
        await queryRunner.query(`DELETE FROM "expenses" WHERE "source" = 'shortage'`);
        await queryRunner.query(`ALTER TABLE "expenses" DROP CONSTRAINT "FK_74327050a485ef4cf25ab3c1555"`);
        await queryRunner.query(`ALTER TABLE "expenses" DROP CONSTRAINT "FK_4e88fba527ebc93c14588b57f31"`);
        await queryRunner.query(`ALTER TABLE "expenses" DROP CONSTRAINT "UQ_925e625d74fc361ccb547b8e14c"`);
        await queryRunner.query(`ALTER TABLE "expenses" DROP CONSTRAINT "CHK_12459fc96b2b6a52ef621ce1ff"`);
        await queryRunner.query(`ALTER TABLE "expenses" DROP CONSTRAINT "CHK_5f47dbdbc2a377f1145fdf46c3"`);
        await queryRunner.query(`ALTER TABLE "expenses" ALTER COLUMN "type_id" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "expenses" ALTER COLUMN "category_id" SET NOT NULL`);
        await queryRunner.query(`CREATE TYPE "public"."expense_source_old" AS ENUM('cash', 'bank')`);
        await queryRunner.query(`ALTER TABLE "expenses" ALTER COLUMN "source" TYPE "public"."expense_source_old" USING "source"::"text"::"public"."expense_source_old"`);
        await queryRunner.query(`DROP TYPE "public"."expense_source"`);
        await queryRunner.query(`ALTER TYPE "public"."expense_source_old" RENAME TO "expense_source"`);
        await queryRunner.query(`ALTER TABLE "expenses" ADD CONSTRAINT "FK_74327050a485ef4cf25ab3c1555" FOREIGN KEY ("type_id", "company_id") REFERENCES "expense_types"("id","company_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "expenses" ADD CONSTRAINT "FK_4e88fba527ebc93c14588b57f31" FOREIGN KEY ("category_id", "company_id") REFERENCES "expense_categories"("id","company_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "shortage_coverages" DROP COLUMN "expense_id"`);
        await queryRunner.query(`ALTER TABLE "expenses" ADD CONSTRAINT "CHK_c6585c49a0016de7a7960d0e49" CHECK ((((source = 'cash'::expense_source) AND (session_id IS NOT NULL) AND (bank_account_id IS NULL)) OR ((source = 'bank'::expense_source) AND (bank_account_id IS NOT NULL) AND (session_id IS NULL))))`);
    }

}
