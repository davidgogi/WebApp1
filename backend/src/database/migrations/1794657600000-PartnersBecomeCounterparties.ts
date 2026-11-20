import { MigrationInterface, QueryRunner } from 'typeorm';

const CONSTRAINTS: [table: string, from: string, to: string][] = [
  ['counterparties', 'PK_998645b20820e4ab99aeae03b41', 'PK_9f045dc184ca2426af5e9dfb13b'],
  ['counterparties', 'UQ_211498d816f9737fb9a55cfbc8c', 'UQ_12e3dd079960a05f703c1dd9542'],
  ['counterparties', 'UQ_eab66fa97ad4b632139369243a6', 'UQ_2068cc49c20fa8442fd17bcee6d'],
  ['counterparties', 'CHK_3a0999536b03f6ae1754bed7d7', 'CHK_66cfc842ef3eb2f659eff31f60'],
  ['counterparties', 'FK_f8de8ad3f9d8767da622f2b94d5', 'FK_82a88acf8213f01c126e02299eb'],
  ['counterparty_contacts', 'PK_a4e5730c20984e72a26178cfcb3', 'PK_956f2e4406df2fb3905c48665c4'],
  ['counterparty_contacts', 'FK_cbc2b294f4cec1cfb6be1c7a6c0', 'FK_1e9a9ecb594a12b9441f9177b85'],
  ['counterparty_contacts', 'FK_2ae0c0c047e9cc13b2768536d8b', 'FK_049e5e2675c0322454667034527'],
];

async function constraintExists(
  queryRunner: QueryRunner,
  name: string,
): Promise<boolean> {
  const rows: unknown[] = await queryRunner.query(
    `SELECT 1 FROM pg_constraint WHERE conname = $1`,
    [name],
  );
  return rows.length > 0;
}

export class PartnersBecomeCounterparties1794657600000 implements MigrationInterface {
  name = 'PartnersBecomeCounterparties1794657600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "partners" RENAME TO "counterparties"`);
    await queryRunner.query(
      `ALTER TABLE "counterparties" RENAME COLUMN "type" TO "organization_type"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."partners_type_enum" RENAME TO "counterparties_organization_type_enum"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."partners_status_enum" RENAME TO "counterparties_status_enum"`,
    );
    if (await queryRunner.hasTable('partner_contacts')) {
      await queryRunner.query(
        `ALTER TABLE "partner_contacts" RENAME TO "counterparty_contacts"`,
      );
      await queryRunner.query(
        `ALTER TABLE "counterparty_contacts" RENAME COLUMN "partner_id" TO "counterparty_id"`,
      );
    }
    for (const [table, from, to] of CONSTRAINTS) {
      if (await constraintExists(queryRunner, from)) {
        await queryRunner.query(
          `ALTER TABLE "${table}" RENAME CONSTRAINT "${from}" TO "${to}"`,
        );
      }
    }
    await queryRunner.query(
      `UPDATE "audit_log" SET "action" = 'counterparty.' || substr("action", 9) WHERE "action" LIKE 'partner.%'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "audit_log" SET "action" = 'partner.' || substr("action", 14) WHERE "action" LIKE 'counterparty.%'`,
    );
    for (const [table, from, to] of CONSTRAINTS) {
      await queryRunner.query(
        `ALTER TABLE "${table}" RENAME CONSTRAINT "${to}" TO "${from}"`,
      );
    }
    await queryRunner.query(
      `ALTER TABLE "counterparty_contacts" RENAME COLUMN "counterparty_id" TO "partner_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "counterparty_contacts" RENAME TO "partner_contacts"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."counterparties_status_enum" RENAME TO "partners_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."counterparties_organization_type_enum" RENAME TO "partners_type_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "counterparties" RENAME COLUMN "organization_type" TO "type"`,
    );
    await queryRunner.query(`ALTER TABLE "counterparties" RENAME TO "partners"`);
  }
}
