import { FIELDS_PER_UPDATE } from './constants';
import { MarketGenerator } from './market-generator';
import { ProducerEngine } from './producer-engine';
import { Scheduler } from './scheduler';
import {
  SnapshotPayload,
  StatusPayload,
  WorkerMessageType,
} from './worker-messages';

class FakeGenerator implements MarketGenerator {
  public readonly batchSizes: number[] = [];
  public disposed = false;

  public generateBatch(count: number): Int32Array {
    this.batchSizes.push(count);
    const row = [0, 10_000, 1, 9_990, 10_010, 10, 10];
    const out = new Int32Array(count * FIELDS_PER_UPDATE);
    for (let i = 0; i < count; i += 1) {
      out.set(row, i * FIELDS_PER_UPDATE);
    }
    return out;
  }

  public symbol(instrumentIdx: number): string {
    return `INST${instrumentIdx}`;
  }

  public dispose(): void {
    this.disposed = true;
  }
}

class FakeScheduler implements Scheduler {
  private nowMs = 0;
  private nextId = 1;
  private timers: Array<{
    id: number;
    fireAt: number;
    handler: () => void;
  }> = [];

  public now(): number {
    return this.nowMs;
  }

  public setTimeout(handler: () => void, delayMs: number): number {
    const id = this.nextId;
    this.nextId += 1;
    this.timers.push({ id, fireAt: this.nowMs + delayMs, handler });
    return id;
  }

  public clearTimeout(handle: unknown): void {
    const id = handle as number;
    this.timers = this.timers.filter(timer => timer.id !== id);
  }

  public advance(ms: number): void {
    this.nowMs += ms;
    this.runDueTimers();
  }

  private runDueTimers(): void {
    while (true) {
      const due = this.timers
        .filter(timer => timer.fireAt <= this.nowMs)
        .sort((a, b) => a.fireAt - b.fireAt || a.id - b.id);
      if (due.length === 0) {
        return;
      }
      const next = due[0];
      this.timers = this.timers.filter(timer => timer.id !== next.id);
      next.handler();
    }
  }
}

describe('ProducerEngine', () => {
  const batchIntervalMs = 50;
  const snapshotIntervalMs = 100;
  const updatesPerBatch = 3;

  function createEngine(
    generator: FakeGenerator,
    scheduler: FakeScheduler
  ): {
    engine: ProducerEngine;
    snapshots: SnapshotPayload[];
    statuses: StatusPayload[];
  } {
    const snapshots: SnapshotPayload[] = [];
    const statuses: StatusPayload[] = [];
    const engine = new ProducerEngine(
      generator,
      {
        onSnapshot: payload => snapshots.push(payload),
        onStatus: payload => statuses.push(payload),
      },
      {
        scheduler,
        snapshotIntervalMs,
      }
    );
    return { engine, snapshots, statuses };
  }

  it('stops generating batches while paused', () => {
    const generator = new FakeGenerator();
    const scheduler = new FakeScheduler();
    const { engine } = createEngine(generator, scheduler);

    engine.start({
      runId: 1,
      instrumentCount: 1,
      updatesPerBatch,
      batchIntervalMs,
    });

    scheduler.advance(batchIntervalMs);
    expect(generator.batchSizes.length).toBe(1);

    engine.pause();
    const batchesBeforePause = generator.batchSizes.length;
    scheduler.advance(batchIntervalMs * 5);
    expect(generator.batchSizes.length).toBe(batchesBeforePause);
  });

  it('does not catch up missed batches after resume', () => {
    const generator = new FakeGenerator();
    const scheduler = new FakeScheduler();
    const { engine } = createEngine(generator, scheduler);

    engine.start({
      runId: 1,
      instrumentCount: 1,
      updatesPerBatch,
      batchIntervalMs,
    });

    scheduler.advance(batchIntervalMs);
    engine.pause();
    scheduler.advance(batchIntervalMs * 4);

    engine.resume();
    expect(generator.batchSizes.length).toBe(1);
    scheduler.advance(batchIntervalMs);
    expect(generator.batchSizes.length).toBe(2);
  });

  it('keeps accumulated metrics after resume', () => {
    const generator = new FakeGenerator();
    const scheduler = new FakeScheduler();
    const { engine, snapshots } = createEngine(generator, scheduler);

    engine.start({
      runId: 1,
      instrumentCount: 1,
      updatesPerBatch,
      batchIntervalMs,
    });

    scheduler.advance(batchIntervalMs);
    engine.pause();
    scheduler.advance(batchIntervalMs * 3);
    engine.resume();
    scheduler.advance(batchIntervalMs);

    const lastSnapshot = snapshots.at(-1);
    expect(lastSnapshot?.instruments[0].volume).toBe(updatesPerBatch * 2);
  });

  it('throttles snapshot emissions to the configured interval', () => {
    const generator = new FakeGenerator();
    const scheduler = new FakeScheduler();
    const { engine, snapshots } = createEngine(generator, scheduler);

    engine.start({
      runId: 1,
      instrumentCount: 1,
      updatesPerBatch: 1,
      batchIntervalMs: 10,
    });

    const initialSnapshots = snapshots.length;
    scheduler.advance(10);
    scheduler.advance(10);
    scheduler.advance(10);
    scheduler.advance(10);

    expect(snapshots.length - initialSnapshots).toBeLessThanOrEqual(2);
  });

  it('emits running and paused status transitions', () => {
    const generator = new FakeGenerator();
    const scheduler = new FakeScheduler();
    const { engine, statuses } = createEngine(generator, scheduler);

    engine.start({
      runId: 7,
      instrumentCount: 1,
      updatesPerBatch: 1,
      batchIntervalMs,
    });

    expect(statuses.some(s => s.status === 'running' && s.runId === 7)).toBe(
      true
    );

    engine.pause();
    expect(statuses.at(-1)?.status).toBe('paused');

    engine.resume();
    expect(statuses.at(-1)?.status).toBe('running');
  });

  it('disposes the generator', () => {
    const generator = new FakeGenerator();
    const scheduler = new FakeScheduler();
    const { engine } = createEngine(generator, scheduler);

    engine.start({
      runId: 1,
      instrumentCount: 1,
      updatesPerBatch: 1,
      batchIntervalMs,
    });
    engine.dispose();
    expect(generator.disposed).toBe(true);
  });

  it('includes snapshot message type on emissions', () => {
    const generator = new FakeGenerator();
    const scheduler = new FakeScheduler();
    const { engine, snapshots } = createEngine(generator, scheduler);

    engine.start({
      runId: 2,
      instrumentCount: 1,
      updatesPerBatch: 1,
      batchIntervalMs,
    });

    expect(snapshots[0]?.type).toBe(WorkerMessageType.Snapshot);
  });
});
