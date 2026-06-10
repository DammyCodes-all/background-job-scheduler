import { DataSource } from 'typeorm';
import { dataSourceOptions } from './data-source';

async function clear() {
  const ds = new DataSource({ ...dataSourceOptions });
  await ds.initialize();
  console.log('Connected to database');
  await ds.query('TRUNCATE TABLE jobs CASCADE');
  console.log('All jobs cleared');
  await ds.destroy();
}

clear().catch((err) => {
  console.error('Failed to clear database:', err);
  process.exit(1);
});
