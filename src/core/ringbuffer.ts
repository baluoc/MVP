import { AppEvent } from "./types";

export class RingBuffer {
  private buffer: AppEvent[];
  private capacity: number;

  constructor(capacity: number = 200) {
    this.capacity = capacity;
    this.buffer = [];
  }

  push(ev: AppEvent) {
    if (this.buffer.length >= this.capacity) {
      this.buffer.shift();
    }
    this.buffer.push(ev);
  }

  getAll(): AppEvent[] {
    return [...this.buffer];
  }
}
