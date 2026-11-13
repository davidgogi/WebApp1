import { MigrationInterface, QueryRunner } from 'typeorm';

export class CounterpartyCategoryNoteHistory1794571200000 implements MigrationInterface {
  name = 'CounterpartyCategoryNoteHistory1794571200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "audit_log" ADD "entity_id" uuid`);
    await queryRunner.query(
      `ALTER TABLE "audit_log" ADD "source" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "partners" ADD "category" character varying`,
    );
    await queryRunner.query(`ALTER TABLE "partners" ADD "note" text`);
    await queryRunner.query(
      `CREATE INDEX "IDX_c6c5d74b38ecfe778182348e7c" ON "audit_log" ("entity_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c6c5d74b38ecfe778182348e7c"`,
    );
    await queryRunner.query(`ALTER TABLE "partners" DROP COLUMN "note"`);
    await queryRunner.query(`ALTER TABLE "partners" DROP COLUMN "category"`);
    await queryRunner.query(`ALTER TABLE "audit_log" DROP COLUMN "source"`);
    await queryRunner.query(`ALTER TABLE "audit_log" DROP COLUMN "entity_id"`);
  }
}
