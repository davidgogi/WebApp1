import { MigrationInterface, QueryRunner } from "typeorm";

export class PartnerContacts1794484800000 implements MigrationInterface {
    name = 'PartnerContacts1794484800000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "partner_contacts" ("company_id" uuid NOT NULL, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "partner_id" uuid NOT NULL, "first_name" character varying NOT NULL, "last_name" character varying NOT NULL, "phone" character varying NOT NULL, "position" character varying NOT NULL, "email" character varying NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_a4e5730c20984e72a26178cfcb3" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "partners" ADD CONSTRAINT "UQ_211498d816f9737fb9a55cfbc8c" UNIQUE ("company_id", "id")`);
        await queryRunner.query(`ALTER TABLE "partner_contacts" ADD CONSTRAINT "FK_cbc2b294f4cec1cfb6be1c7a6c0" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "partner_contacts" ADD CONSTRAINT "FK_2ae0c0c047e9cc13b2768536d8b" FOREIGN KEY ("partner_id", "company_id") REFERENCES "partners"("id","company_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "partner_contacts" DROP CONSTRAINT "FK_2ae0c0c047e9cc13b2768536d8b"`);
        await queryRunner.query(`ALTER TABLE "partner_contacts" DROP CONSTRAINT "FK_cbc2b294f4cec1cfb6be1c7a6c0"`);
        await queryRunner.query(`ALTER TABLE "partners" DROP CONSTRAINT "UQ_211498d816f9737fb9a55cfbc8c"`);
        await queryRunner.query(`DROP TABLE "partner_contacts"`);
    }

}
