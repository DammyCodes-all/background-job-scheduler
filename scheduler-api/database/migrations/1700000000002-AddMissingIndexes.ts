import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMissingIndexes1700000000002 implements MigrationInterface {
  name = 'AddMissingIndexes1700000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX "IDX_JOBS_IN_DLQ" ON "jobs" ("inDlq") WHERE "inDlq" = true
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_JOBS_CREATED_AT" ON "jobs" ("createdAt" DESC)
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_JOBS_LAST_PRIORITY_BOOSTED_AT" ON "jobs" ("lastPriorityBoostedAt")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_JOB_LOGS_JOB_ID" ON "job_logs" ("jobId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "public"."IDX_JOB_LOGS_JOB_ID"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "public"."IDX_JOBS_LAST_PRIORITY_BOOSTED_AT"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "public"."IDX_JOBS_CREATED_AT"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "public"."IDX_JOBS_IN_DLQ"
    `);
  }
}
