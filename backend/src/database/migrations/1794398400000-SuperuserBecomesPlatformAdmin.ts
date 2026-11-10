import { MigrationInterface, QueryRunner } from 'typeorm';

export class SuperuserBecomesPlatformAdmin1794398400000 implements MigrationInterface {
  name = 'SuperuserBecomesPlatformAdmin1794398400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "platform_admins" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "username" character varying NOT NULL, "password_hash" character varying NOT NULL, "display_name" character varying NOT NULL, "language" character varying(2) NOT NULL DEFAULT 'en', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_bacdd243f7b8f6ff89b83757c7c" UNIQUE ("username"), CONSTRAINT "PK_faecb3398d1962507b44c76e4f0" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `INSERT INTO "platform_admins" ("id", "username", "password_hash", "display_name", "language", "created_at", "updated_at")
       SELECT "id", "username", "password_hash", "display_name", "language", "created_at", "created_at"
       FROM "users" WHERE "role" = 'superuser'`,
    );
    await queryRunner.query(`DELETE FROM "users" WHERE "role" = 'superuser'`);
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "FK_7ae6334059289559722437bcc1c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "company_id" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "FK_7ae6334059289559722437bcc1c" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "FK_7ae6334059289559722437bcc1c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "company_id" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "FK_7ae6334059289559722437bcc1c" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `INSERT INTO "users" ("id", "username", "password_hash", "display_name", "role", "module", "company_id", "employee_id", "language", "created_at")
       SELECT "id", "username", "password_hash", "display_name", 'superuser', NULL, NULL, NULL, "language", "created_at"
       FROM "platform_admins"`,
    );
    await queryRunner.query(`DROP TABLE "platform_admins"`);
  }
}
