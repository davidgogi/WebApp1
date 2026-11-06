import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNickname1793961270355 implements MigrationInterface {
    name = 'AddNickname1793961270355'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "employees" ADD "nickname" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "employees" DROP COLUMN "nickname"`);
    }

}
