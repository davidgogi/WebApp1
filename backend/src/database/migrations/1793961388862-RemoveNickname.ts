import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveNickname1793961388862 implements MigrationInterface {
    name = 'RemoveNickname1793961388862'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "employees" DROP COLUMN "nickname"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "employees" ADD "nickname" character varying`);
    }

}
