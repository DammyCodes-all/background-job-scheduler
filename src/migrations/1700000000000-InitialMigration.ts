import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialMigration1700000000000 implements MigrationInterface {
  name = 'InitialMigration1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "public"."jobs_status_enum" AS ENUM('pending', 'processing', 'completed', 'failed', 'cancelled')
    `);
    
    await queryRunner.query(`
      CREATE TABLE "jobs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "type" character varying NOT NULL,
        "payload" jsonb,
        "priority" integer NOT NULL DEFAULT 1,
        "status" "public"."jobs_status_enum" NOT NULL DEFAULT 'pending',
        "retryCount" integer NOT NULL DEFAULT 0,
        "maxRetries" integer NOT NULL DEFAULT 3,
        "scheduledAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "interval" character varying,
        "dependencyIds" uuid array NOT NULL DEFAULT '{}',
        "errorMessage" text,
        "inDlq" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "startedAt" TIMESTAMP WITH TIME ZONE,
        "completedAt" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_b34046205d04dd427218bc283f6" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_JOBS_PENDING" ON "jobs" ("status", "scheduledAt", "priority") WHERE status = 'pending'
    `);

    await queryRunner.query(`
      CREATE TABLE "job_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "jobId" uuid NOT NULL,
        "event" character varying NOT NULL,
        "message" text,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_78b27d42cfb2a60bf7246b19a00" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "job_logs" ADD CONSTRAINT "FK_286c12ec5852efec37ebce18e9d" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "job_logs" DROP CONSTRAINT "FK_286c12ec5852efec37ebce18e9d"
    `);
    await queryRunner.query(`
      DROP TABLE "job_logs"
    `);
    await queryRunner.query(`
      DROP INDEX "public"."IDX_JOBS_PENDING"
    `);
    await queryRunner.query(`
      DROP TABLE "jobs"
    `);
    await queryRunner.query(`
      DROP TYPE "public"."jobs_status_enum"
    `);
  }
}
