import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLastPriorityBoostedAt1700000000001
  implements MigrationInterface
{
  name = 'AddLastPriorityBoostedAt1700000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "jobs"
      ADD COLUMN "lastPriorityBoostedAt" TIMESTAMP WITH TIME ZONE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "jobs"
      DROP COLUMN "lastPriorityBoostedAt"
    `);
  }
}
