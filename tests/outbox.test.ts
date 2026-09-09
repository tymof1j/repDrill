import { describe, expect, it, vi } from 'vitest';
import { ProgressOutbox, type OutboxStorage } from '../src/lib/training/outbox';
import type { ProgressEvent } from '../src/lib/training/progress';
class MemoryStorage implements OutboxStorage {
  rows = new Map<string, string>();
  get length() { return this.rows.size; }
  key(i: number) { return [...this.rows.keys()][i] ?? null; }
  getItem(k: string) { return this.rows.get(k) ?? null; }
  setItem(k: string, v: string) { this.rows.set(k, v); }
  removeItem(k: string) { this.rows.delete(k); }
}
const event = (): ProgressEvent => ({ id: crypto.randomUUID(), kind: 'review', cardId: crypto.randomUUID(), correct: true, responseTimeMs: 2500, reviewedAt: Date.now() });
const acknowledge = async (events: ProgressEvent[]) => ({ acknowledged: events.map(e => e.id) });
describe('durable progress outbox', () => {
  it('records locally without waiting for a slow server, including more moves during a save', async () => {
    const storage = new MemoryStorage();
    let release!: () => void;
    const send = vi.fn(async (events: ProgressEvent[]) => { await new Promise<void>(resolve => { release = resolve; }); return acknowledge(events); });
    const outbox = new ProgressOutbox('user', storage, send);
    outbox.enqueue(event());
    const request = outbox.flush();
    outbox.enqueue(event());
    expect(storage.length).toBe(2);
    expect(outbox.getSnapshot().pending).toBe(2);
    release();
    await vi.waitFor(() => expect(send).toHaveBeenCalledTimes(2));
    release();
    await request;
    expect(storage.length).toBe(0);
  });
  it('survives offline, reload and a lost acknowledgement using the original IDs', async () => {
    const storage = new MemoryStorage(); const first = event();
    const outbox = new ProgressOutbox('user', storage, async () => { throw new Error('offline'); });
    outbox.enqueue(first); await outbox.flush();
    expect(outbox.getSnapshot().error).toBeTruthy();
    const send = vi.fn(acknowledge);
    const reloaded = new ProgressOutbox('user', storage, send);
    await reloaded.flush();
    expect(send).toHaveBeenCalledWith([first]);
    expect(reloaded.getSnapshot().pending).toBe(0);
  });
  it('keeps account queues separate and does not overwrite another tab', async () => {
    const storage = new MemoryStorage();
    const a = new ProgressOutbox('alice', storage, acknowledge);
    const b = new ProgressOutbox('alice', storage, acknowledge);
    const sendBob = vi.fn(acknowledge);
    const bob = new ProgressOutbox('bob', storage, sendBob);
    a.enqueue(event()); b.enqueue(event());
    await bob.flush(); expect(sendBob).not.toHaveBeenCalled();
    await a.flush(); expect(storage.length).toBe(0);
  });
  it('retains unacknowledged results and reports unavailable browser storage', async () => {
    const outbox = new ProgressOutbox('user', null, async () => ({ acknowledged: [] }));
    outbox.enqueue(event()); await outbox.flush();
    expect(outbox.getSnapshot()).toMatchObject({ pending: 1, durable: false });
    expect(outbox.getSnapshot().error).toBeTruthy();
  });
});
