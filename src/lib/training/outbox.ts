import { validateProgressEvents, type ProgressEvent } from './progress';

export interface OutboxStorage {
  readonly length: number;
  key(index: number): string | null;
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}
export type SyncState = { pending: number; syncing: boolean; error: string | null; durable: boolean };
type Send = (events: ProgressEvent[]) => Promise<{ acknowledged: string[] }>;

/** One key per event prevents separate tabs from overwriting each other's queue.
 * Events are removed only after the server acknowledges their immutable IDs. */
export class ProgressOutbox {
  private readonly prefix: string;
  private memory = new Map<string, ProgressEvent>();
  private listeners = new Set<() => void>();
  private inFlight: Promise<void> | null = null;
  private snapshot: SyncState = { pending: 0, syncing: false, error: null, durable: true };

  constructor(userId: string, private storage: OutboxStorage | null, private send: Send) {
    this.prefix = `repdrill:progress:v1:${userId}:`;
    this.refresh();
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };
  getSnapshot = () => this.snapshot;

  private update(next: Partial<SyncState>) {
    this.snapshot = { ...this.snapshot, ...next };
    this.listeners.forEach((listener) => listener());
  }

  refresh = () => {
    try {
      if (!this.storage) throw new Error('Storage unavailable');
      for (let i = 0; i < this.storage.length; i++) {
        const key = this.storage.key(i);
        if (!key?.startsWith(this.prefix)) continue;
        try {
          const [event] = validateProgressEvents([JSON.parse(this.storage.getItem(key) ?? 'null')]);
          if (key === this.prefix + event.id) this.memory.set(event.id, event);
        } catch {
          // Leave damaged records intact for recovery, but do not let one
          // invalid record prevent all other answers from reaching the server.
          this.update({ durable: false });
        }
      }
      this.update({ pending: this.memory.size });
    } catch {
      this.update({ pending: this.memory.size, durable: false });
    }
  };

  enqueue(event: ProgressEvent) {
    // Store before advancing the board, even while another batch is in flight.
    this.memory.set(event.id, event);
    try {
      if (!this.storage) throw new Error('Storage unavailable');
      this.storage.setItem(this.prefix + event.id, JSON.stringify(event));
    } catch {
      this.update({ durable: false });
    }
    this.update({ pending: this.memory.size });
  }

  flush = (): Promise<void> => {
    if (this.inFlight) return this.inFlight;
    this.refresh();
    if (!this.memory.size) return Promise.resolve();
    this.update({ syncing: true, error: null });
    this.inFlight = (async () => {
      try {
        while (this.memory.size) {
          const batch: ProgressEvent[] = [];
          let bytes = 0;
          for (const event of [...this.memory.values()].sort((a, b) => a.reviewedAt - b.reviewedAt)) {
            const size = new TextEncoder().encode(JSON.stringify(event)).length;
            // Stay below fetch keepalive's 64 KiB body budget, including the envelope.
            if (batch.length && (batch.length >= 100 || bytes + size > 48_000)) break;
            batch.push(event);
            bytes += size;
          }
          const { acknowledged } = await this.send(batch);
          const ids = new Set(acknowledged);
          if (!batch.every((event) => ids.has(event.id))) throw new Error('Incomplete save acknowledgement');
          for (const event of batch) {
            this.storage?.removeItem(this.prefix + event.id);
            this.memory.delete(event.id);
          }
          this.update({ pending: this.memory.size });
        }
      } catch {
        this.update({ error: 'Progress is waiting to sync. We will retry automatically.' });
      } finally {
        this.inFlight = null;
        this.update({ syncing: false });
      }
    })();
    return this.inFlight;
  };
}
