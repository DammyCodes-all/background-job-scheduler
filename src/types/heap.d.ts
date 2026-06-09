declare module 'heap' {
  export default class Heap<T> {
    constructor(compare?: (a: T, b: T) => number);
    push(item: T): void;
    pop(): T | undefined;
    peek(): T | undefined;
    size(): number;
    empty(): boolean;
  }
}
