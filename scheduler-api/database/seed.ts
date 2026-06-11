import { DataSource } from 'typeorm';
import { dataSourceOptions } from './data-source';
import { Job, JobInterval } from '../src/jobs/entities/job.entity';

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

async function seed() {
  const ds = new DataSource({ ...dataSourceOptions });
  await ds.initialize();
  console.log('Connected to database');

  const repo = ds.getRepository(Job);
  const now = new Date();
  const batch: Job[] = [];

  for (let i = 1; i <= 24; i++) {
    const scheduledAt = new Date(now.getTime() + (i - 1) * 5000);
    const job = repo.create({
      type: 'send_email',
      priority: ((i - 1) % 3) + 1,
      maxRetries: 3,
      scheduledAt,
      interval: JobInterval.EVERY_MINUTE,
      payload: {
        to: `user-${pad(i)}@example.com`,
        subject: `Demo Report #${pad(i)} — ${scheduledAt.toISOString()}`,
        body: `This is automated demo email #${pad(i)}. Sent at ${scheduledAt.toISOString()}.`,
      },
    });
    batch.push(job);
  }

  await repo.save(batch);
  console.log(`Seeded ${batch.length} scheduled jobs (5s stagger over 2 min)`);

  await ds.destroy();
}

seed().catch((err) => {
  console.error('Failed to seed database:', err);
  process.exit(1);
});
