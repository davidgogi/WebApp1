import { MigrationInterface, QueryRunner } from 'typeorm';

export class SuppliersBecomePartners1794225600000 implements MigrationInterface {
  name = 'SuppliersBecomePartners1794225600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "suppliers" RENAME TO "partners"`);
    await queryRunner.query(
      `ALTER TYPE "public"."suppliers_type_enum" RENAME TO "partners_type_enum"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."suppliers_status_enum" RENAME TO "partners_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "partners" RENAME CONSTRAINT "PK_b70ac51766a9e3144f778cfe81e" TO "PK_998645b20820e4ab99aeae03b41"`,
    );
    await queryRunner.query(
      `ALTER TABLE "partners" RENAME CONSTRAINT "UQ_314e67681d6e180fd057859a94e" TO "UQ_eab66fa97ad4b632139369243a6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "partners" RENAME CONSTRAINT "FK_6a9681499416e80c1ffac4fe86c" TO "FK_f8de8ad3f9d8767da622f2b94d5"`,
    );
    await queryRunner.query(
      `ALTER TABLE "partners" ADD "is_supplier" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "partners" ADD "is_client" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(`UPDATE "partners" SET "is_supplier" = true`);
    await queryRunner.query(
      `ALTER TABLE "partners" ADD CONSTRAINT "CHK_3a0999536b03f6ae1754bed7d7" CHECK ("is_supplier" OR "is_client")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "partners" WHERE NOT "is_supplier"`);
    await queryRunner.query(
      `ALTER TABLE "partners" DROP CONSTRAINT "CHK_3a0999536b03f6ae1754bed7d7"`,
    );
    await queryRunner.query(`ALTER TABLE "partners" DROP COLUMN "is_client"`);
    await queryRunner.query(`ALTER TABLE "partners" DROP COLUMN "is_supplier"`);
    await queryRunner.query(
      `ALTER TABLE "partners" RENAME CONSTRAINT "FK_f8de8ad3f9d8767da622f2b94d5" TO "FK_6a9681499416e80c1ffac4fe86c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "partners" RENAME CONSTRAINT "UQ_eab66fa97ad4b632139369243a6" TO "UQ_314e67681d6e180fd057859a94e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "partners" RENAME CONSTRAINT "PK_998645b20820e4ab99aeae03b41" TO "PK_b70ac51766a9e3144f778cfe81e"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."partners_status_enum" RENAME TO "suppliers_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."partners_type_enum" RENAME TO "suppliers_type_enum"`,
    );
    await queryRunner.query(`ALTER TABLE "partners" RENAME TO "suppliers"`);
  }
}
