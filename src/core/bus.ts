import { AppEvent } from "./types";

type Handler = (ev: AppEvent) => void;

export class EventBus {
  private handlers = new Set<Handler>();

  subscribe(fn: Handler) {
    this.handlers.add(fn);
    return () => this.handlers.delete(fn);
  }

  publish(ev: AppEvent) {
    for (const fn of this.handlers) fn(ev);
  }
}
