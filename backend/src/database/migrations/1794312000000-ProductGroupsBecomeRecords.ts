import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProductGroupsBecomeRecords1794312000000 implements MigrationInterface {
  name = 'ProductGroupsBecomeRecords1794312000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."product_groups_status_enum" AS ENUM('active', 'inactive')`,
    );
    await queryRunner.query(
      `CREATE TABLE "product_groups" ("company_id" uuid NOT NULL, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "category_id" uuid NOT NULL, "name" character varying NOT NULL, "status" "public"."product_groups_status_enum" NOT NULL DEFAULT 'active', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_a2a075563f8761d3e5dd2304178" UNIQUE ("company_id", "category_id", "name"), CONSTRAINT "UQ_79d1a66874d0d0df113ddac4dde" UNIQUE ("company_id", "id"), CONSTRAINT "PK_bccc8805f3453d0cce77c1beedb" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_categories" ADD CONSTRAINT "UQ_611eaf771efce0d09df3cafae34" UNIQUE ("company_id", "id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_groups" ADD CONSTRAINT "FK_e30ed67c469e0fdde7ad2562425" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_groups" ADD CONSTRAINT "FK_469af2b008770a899c06eb478e3" FOREIGN KEY ("category_id", "company_id") REFERENCES "product_categories"("id","company_id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `INSERT INTO "product_groups" ("company_id", "category_id", "name")
       SELECT "company_id", "category_id", MIN(REGEXP_REPLACE(BTRIM(product_group), '\\s+', ' ', 'g'))
       FROM "products"
       WHERE BTRIM("product_group") <> ''
       GROUP BY "company_id", "category_id", LOWER(REGEXP_REPLACE(BTRIM(product_group), '\\s+', ' ', 'g'))`,
    );
    await queryRunner.query(`ALTER TABLE "products" ADD "group_id" uuid`);
    await queryRunner.query(
      `UPDATE "products" p SET "group_id" = g."id"
       FROM "product_groups" g
       WHERE g."company_id" = p."company_id"
         AND g."category_id" = p."category_id"
         AND LOWER(REGEXP_REPLACE(BTRIM(g.name), '\\s+', ' ', 'g')) = LOWER(REGEXP_REPLACE(BTRIM(p.product_group), '\\s+', ' ', 'g'))`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" DROP COLUMN "product_group"`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD CONSTRAINT "FK_bb2611ddd9ee5df3466fcb2677c" FOREIGN KEY ("group_id", "company_id") REFERENCES "product_groups"("id","company_id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "products" DROP CONSTRAINT "FK_bb2611ddd9ee5df3466fcb2677c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD "product_group" character varying`,
    );
    await queryRunner.query(
      `UPDATE "products" p SET "product_group" = COALESCE(g."name", '')
       FROM "products" q
       LEFT JOIN "product_groups" g ON g."id" = q."group_id"
       WHERE q."id" = p."id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ALTER COLUMN "product_group" SET NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "group_id"`);
    await queryRunner.query(
      `ALTER TABLE "product_groups" DROP CONSTRAINT "FK_469af2b008770a899c06eb478e3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_groups" DROP CONSTRAINT "FK_e30ed67c469e0fdde7ad2562425"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_categories" DROP CONSTRAINT "UQ_611eaf771efce0d09df3cafae34"`,
    );
    await queryRunner.query(`DROP TABLE "product_groups"`);
    await queryRunner.query(`DROP TYPE "public"."product_groups_status_enum"`);
  }
}
