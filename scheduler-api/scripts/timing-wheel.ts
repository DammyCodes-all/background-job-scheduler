export interface WheelEntry {
  id: string;
  priority: number;
  scheduledAt: Date;
  createdAt: Date;
}

export class TimingWheel {
  private slots: WheelEntry[][];
  private tickDuration: number;
  private slotCount: number;
  private cursor: number;
  private startTime: number;
  private _size: number;

  constructor(tickDuration: number, slotCount: number, now?: number) {
    this.tickDuration = tickDuration;
    this.slotCount = slotCount;
    this.slots = Array.from({ length: slotCount }, () => []);
    this.cursor = 0;
    this.startTime = now ?? Date.now();
    this._size = 0;
  }

  schedule(entry: WheelEntry): void {
    const delay = entry.scheduledAt.getTime() - this.startTime;
    const index =
      Math.max(0, Math.floor(delay / this.tickDuration)) % this.slotCount;
    this.slots[index].push(entry);
    this._size++;
  }

  tick(): WheelEntry[] {
    const slot = this.slots[this.cursor];
    this.slots[this.cursor] = [];
    this.cursor = (this.cursor + 1) % this.slotCount;
    this._size -= slot.length;
    return slot;
  }

  drainAll(): WheelEntry[] {
    const result: WheelEntry[] = [];
    for (let i = 0; i < this.slotCount; i++) {
      const idx = (this.cursor + i) % this.slotCount;
      if (this.slots[idx].length > 0) {
        result.push(...this.slots[idx]);
        this.slots[idx] = [];
      }
    }
    this._size = 0;
    this.cursor = 0;
    return result;
  }

  size(): number {
    return this._size;
  }

  isEmpty(): boolean {
    return this._size === 0;
  }
}
