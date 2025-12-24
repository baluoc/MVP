import { AppEvent, OverlayCommand, UserStats } from "../core/types";

export interface AddonManifest {
  id: string;
  name: string;
  version: string;
  main: string;
  description?: string;
  author?: string;
  permissions?: string[]; // e.g. ["overlay", "stats"]
  configSchema?: Record<string, any>; // simple JSON schema
  ui?: any; // reserved for GUI layout hints
}

export interface AddonContext {
  events: {
    subscribe(fn: (ev: AppEvent) => void): () => void;
  };
  overlay: {
    emit(cmd: OverlayCommand): void;
  };
  stats: {
    getAll(): UserStats[];
    getByKey(key: string): UserStats | undefined;
  };
  config: {
    get(): any; // get config for this addon
    set(cfg: any): void; // update config for this addon
  };
}

export interface AddonModule {
  activate(ctx: AddonContext): void | (() => void);
}
