import 'reflect-metadata';
import {
  JobPriorityHeap,
  type HeapEntry,
} from '../src/scheduler/job-priority-heap';
import { TimingWheel } from './timing-wheel';

interface MockJob {
  id: string;
  priority: number;
  scheduledAt: Date;
  createdAt: Date;
}

function generateJobs(count: number, timeWindowMs: number): MockJob[] {
  const now = Date.now();
  return Array.from({ length: count }, (_, i) => ({
    id: `job-${i}`,
    priority: Math.floor(Math.random() * 5) + 1,
    scheduledAt: new Date(now + Math.random() * timeWindowMs),
    createdAt: new Date(now + i),
  }));
}

function bytes(n: number): string {
  const units = ['B', 'KB', 'MB'];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(1)} ${units[i]}`;
}

function benchmark(): void {
  const COUNT = 10000;
  const TIME_WINDOW_MS = 60000;
  const TICK_MS = 10;
  const SLOTS = 10000;
  const SPAN_SECONDS = (TICK_MS * SLOTS) / 1000;

  const jobs = generateJobs(COUNT, TIME_WINDOW_MS);

  const memBefore = process.memoryUsage().heapUsed;

  const wheel = new TimingWheel(TICK_MS, SLOTS);

  const wStart = process.hrtime.bigint();
  for (const job of jobs) {
    wheel.schedule(job);
  }
  const wInsert = Number(process.hrtime.bigint() - wStart);

  const wDStart = process.hrtime.bigint();
  const wheelDrained = wheel.drainAll();
  const wDrain = Number(process.hrtime.bigint() - wDStart);

  if (wheelDrained.length !== COUNT) {
    console.error(
      `Wheel drain count mismatch: ${wheelDrained.length} vs ${COUNT}`,
    );
    process.exit(1);
  }

  const heap = new JobPriorityHeap();

  const hStart = process.hrtime.bigint();
  for (const job of jobs) {
    heap.push(job);
  }
  const hInsert = Number(process.hrtime.bigint() - hStart);

  const hDStart = process.hrtime.bigint();
  const popped: HeapEntry[] = [];
  while (!heap.isEmpty()) {
    const entry = heap.pop();
    if (entry) popped.push(entry);
  }
  const hDrain = Number(process.hrtime.bigint() - hDStart);

  if (popped.length !== COUNT) {
    console.error(`Heap drain count mismatch: ${popped.length} vs ${COUNT}`);
    process.exit(1);
  }

  let heapOrderCorrect = true;
  for (let i = 1; i < popped.length; i++) {
    const prev = popped[i - 1];
    const curr = popped[i];
    if (curr.priority < prev.priority) {
      heapOrderCorrect = false;
      break;
    }
    if (curr.priority === prev.priority) {
      if (curr.scheduledAt.getTime() < prev.scheduledAt.getTime()) {
        heapOrderCorrect = false;
        break;
      }
    }
  }

  const memAfter = process.memoryUsage().heapUsed;

  const us = (ns: number): string => (ns / 1000).toFixed(1);
  const ratio = (ns: number, base: number): string =>
    base > 0 ? `${(ns / base).toFixed(2)}x` : '-';

  console.log();
  console.log('='.repeat(72));
  console.log('  Timing Wheel vs Min-Heap  (academic comparison)');
  console.log('='.repeat(72));
  console.log(`  Jobs:      ${COUNT.toLocaleString()}`);
  console.log(`  Time span: ${TIME_WINDOW_MS / 1000}s uniform`);
  console.log(
    `  Tick:      ${TICK_MS}ms  |  Slots: ${SLOTS}  |  Wheel span: ${SPAN_SECONDS}s`,
  );
  console.log(`  Heap used: ${bytes(memAfter - memBefore)}`);
  console.log('-'.repeat(72));
  console.log('  Insert');
  console.log(
    `    Wheel:  ${us(wInsert).padStart(8)} us  ${ratio(wInsert, hInsert)} vs heap`,
  );
  console.log(`    Heap:   ${us(hInsert).padStart(8)} us  (baseline)`);
  console.log();
  console.log('  Drain');
  console.log(
    `    Wheel:  ${us(wDrain).padStart(8)} us  ${ratio(wDrain, hDrain)} vs heap  (FIFO per slot)`,
  );
  console.log(
    `    Heap:   ${us(hDrain).padStart(8)} us  (${heapOrderCorrect ? 'correct' : 'FAIL'} priority order)`,
  );
  console.log('-'.repeat(72));
  console.log('  Order guarantee');
  console.log(`    Heap:  YES -- always returns highest-priority job next`);
  console.log(
    `    Wheel: NO  -- jobs within a slot are FIFO, regardless of priority`,
  );
  console.log('='.repeat(72));
  console.log('  Design trade-off: insert throughput vs ordering correctness.');
  console.log('  The wheel trades the ability to reorder by priority for O(1)');
  console.log(
    '  insertion and O(1) per-tick drain. The heap preserves ordering',
  );
  console.log('  at O(log n) cost on every push and pop.');
  console.log('='.repeat(72));
  console.log();
}

benchmark();
