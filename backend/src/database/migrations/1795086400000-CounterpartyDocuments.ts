import { MigrationInterface, QueryRunner } from "typeorm";

export class CounterpartyDocuments1795086400000 implements MigrationInterface {
    name = 'CounterpartyDocuments1795086400000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."counterparty_documents_type_enum" AS ENUM('contract', 'extract', 'power_of_attorney', 'other')`);
        await queryRunner.query(`CREATE TABLE "counterparty_documents" ("company_id" uuid NOT NULL, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "counterparty_id" uuid NOT NULL, "name" character varying NOT NULL, "type" "public"."counterparty_documents_type_enum" NOT NULL, "valid_until" date, "mime_type" character varying NOT NULL, "size" integer NOT NULL, "content" bytea NOT NULL, "uploaded_by_name" character varying NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_720fc1971182bd3120886bdd7a8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "counterparty_documents" ADD CONSTRAINT "FK_3939fabef0505849252391365a5" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "counterparty_documents" ADD CONSTRAINT "FK_8b2b5f60993da77a21471f96994" FOREIGN KEY ("counterparty_id", "company_id") REFERENCES "counterparties"("id","company_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "counterparty_documents" DROP CONSTRAINT "FK_8b2b5f60993da77a21471f96994"`);
        await queryRunner.query(`ALTER TABLE "counterparty_documents" DROP CONSTRAINT "FK_3939fabef0505849252391365a5"`);
        await queryRunner.query(`DROP TABLE "counterparty_documents"`);
        await queryRunner.query(`DROP TYPE "public"."counterparty_documents_type_enum"`);
    }

}
