import { Injectable } from '@nestjs/common';
import Heap from 'heap';

export interface HeapEntry {
  id: string;
  priority: number;
  scheduledAt: Date;
  createdAt: Date;
}

@Injectable()
export class JobPriorityHeap {
  private readonly heap = new Heap<HeapEntry>((left, right) => {
    const priorityDiff = left.priority - right.priority;

    if (priorityDiff !== 0) {
      return priorityDiff;
    }

    const scheduledDiff =
      left.scheduledAt.getTime() - right.scheduledAt.getTime();

    if (scheduledDiff !== 0) {
      return scheduledDiff;
    }

    return left.createdAt.getTime() - right.createdAt.getTime();
  });

  push(entry: HeapEntry): void {
    this.heap.push(entry);
  }

  pop(): HeapEntry | undefined {
    return this.heap.pop();
  }

  peek(): HeapEntry | undefined {
    return this.heap.peek();
  }

  size(): number {
    return this.heap.size();
  }

  isEmpty(): boolean {
    return this.heap.empty();
  }

  clear(): void {
    this.heap.clear();
  }
}
