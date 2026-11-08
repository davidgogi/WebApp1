import { MigrationInterface, QueryRunner } from "typeorm";

export class TransferIssuesRsWaybill1794139200000 implements MigrationInterface {
    name = 'TransferIssuesRsWaybill1794139200000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "transfers" ADD "driver_name" character varying`);
        await queryRunner.query(`ALTER TABLE "transfers" ADD "driver_id" character varying`);
        await queryRunner.query(`ALTER TABLE "transfers" ADD "car_number" character varying`);
        await queryRunner.query(`ALTER TABLE "transfers" ADD "rs_issued" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "transfers" DROP COLUMN "rs_issued"`);
        await queryRunner.query(`ALTER TABLE "transfers" DROP COLUMN "car_number"`);
        await queryRunner.query(`ALTER TABLE "transfers" DROP COLUMN "driver_id"`);
        await queryRunner.query(`ALTER TABLE "transfers" DROP COLUMN "driver_name"`);
    }

}
