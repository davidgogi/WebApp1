import { MigrationInterface, QueryRunner } from "typeorm";

export class CounterpartyDeferredPayment1794986791046 implements MigrationInterface {
    name = 'CounterpartyDeferredPayment1794986791046'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "counterparties" ADD "deferred_payment_days" integer`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "counterparties" DROP COLUMN "deferred_payment_days"`);
    }

}
