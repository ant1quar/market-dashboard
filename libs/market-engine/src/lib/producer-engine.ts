import { DEFAULT_SNAPSHOT_INTERVAL_MS } from './constants';
import { MarketGenerator } from './market-generator';
import { MetricsAccumulator } from './metrics-accumulator';
import { Scheduler, defaultScheduler } from './scheduler';
import { SnapshotThrottle } from './snapshot-throttle';
import {
  ProducerLifecycleStatus,
  SnapshotPayload,
  StatusPayload,
  WorkerMessageType,
} from './worker-messages';

export interface ProducerEngineCallbacks {
  onSnapshot: (payload: SnapshotPayload) => void;
  onStatus: (payload: StatusPayload) => void;
}

export interface ProducerEngineOptions {
  generator: MarketGenerator;
  scheduler?: Scheduler;
  snapshotIntervalMs?: number;
  callbacks: ProducerEngineCallbacks;
}

export interface ProducerEngineStartParams {
  runId: number;
  instrumentCount: number;
  updatesPerBatch: number;
  batchIntervalMs: number;
}

type EngineLifecycle = 'idle' | 'running' | 'paused' | 'disposed';

const RATE_WINDOW_MS = 1000;

export class ProducerEngine {
  private readonly scheduler: Scheduler;
  private readonly snapshotIntervalMs: number;
  private readonly snapshotThrottle: SnapshotThrottle;

  private lifecycle: EngineLifecycle = 'idle';
  private runId = 0;
  private updatesPerBatch = 0;
  private batchIntervalMs = 0;
  private batchTimer: unknown = null;
  private nextBatchDueAt = 0;
  private rateWindowStartedAt = 0;
  private updatesInRateWindow = 0;

  private accumulator: MetricsAccumulator;

  public constructor(
    private readonly generator: MarketGenerator,
    private readonly callbacks: ProducerEngineCallbacks,
    options: Omit<ProducerEngineOptions, 'generator' | 'callbacks'> = {}
  ) {
    this.scheduler = options.scheduler ?? defaultScheduler;
    this.snapshotIntervalMs =
      options.snapshotIntervalMs ?? DEFAULT_SNAPSHOT_INTERVAL_MS;
    this.snapshotThrottle = new SnapshotThrottle(
      this.scheduler,
      this.snapshotIntervalMs
    );
    this.accumulator = new MetricsAccumulator(0, idx =>
      this.generator.symbol(idx)
    );
  }

  public start(params: ProducerEngineStartParams): void {
    this.clearBatchTimer();
    this.snapshotThrottle.reset();
    this.runId = params.runId;
    this.updatesPerBatch = params.updatesPerBatch;
    this.batchIntervalMs = params.batchIntervalMs;
    this.lifecycle = 'running';
    this.nextBatchDueAt = 0;
    this.resetRateWindow(this.scheduler.now());
    this.accumulator.reset(params.instrumentCount);
    this.emitSnapshot();
    this.emitStatus();
    this.scheduleNextBatch();
  }

  public pause(): void {
    if (this.lifecycle !== 'running') {
      return;
    }
    this.lifecycle = 'paused';
    this.clearBatchTimer();
    this.emitStatus();
  }

  public resume(): void {
    if (this.lifecycle !== 'paused') {
      return;
    }
    this.lifecycle = 'running';
    const now = this.scheduler.now();
    this.nextBatchDueAt = now + this.batchIntervalMs;
    this.emitStatus();
    this.scheduleNextBatch();
  }

  public dispose(): void {
    if (this.lifecycle === 'disposed') {
      return;
    }
    this.lifecycle = 'disposed';
    this.clearBatchTimer();
    this.snapshotThrottle.dispose();
    this.generator.dispose();
  }

  private scheduleNextBatch(): void {
    if (this.lifecycle !== 'running') {
      return;
    }

    const now = this.scheduler.now();
    if (this.nextBatchDueAt === 0) {
      this.nextBatchDueAt = now + this.batchIntervalMs;
    }

    const delayMs = Math.max(0, this.nextBatchDueAt - now);
    this.batchTimer = this.scheduler.setTimeout(() => {
      this.batchTimer = null;
      this.runBatch();
    }, delayMs);
  }

  private runBatch(): void {
    if (this.lifecycle !== 'running') {
      return;
    }

    const batchStartedAt = this.scheduler.now();
    if (this.nextBatchDueAt === 0) {
      this.nextBatchDueAt = batchStartedAt;
    }

    const batch = this.generator.generateBatch(this.updatesPerBatch);
    this.accumulator.applyBatch(batch);
    this.recordUpdates(this.updatesPerBatch, batchStartedAt);

    this.snapshotThrottle.tick(() => this.emitSnapshot(), batchStartedAt);
    this.emitStatus(batchStartedAt);

    this.nextBatchDueAt += this.batchIntervalMs;
    const afterProcessing = this.scheduler.now();
    if (afterProcessing > this.nextBatchDueAt) {
      this.nextBatchDueAt = afterProcessing;
    }

    this.scheduleNextBatch();
  }

  private recordUpdates(count: number, now: number): void {
    if (this.rateWindowStartedAt === 0) {
      this.resetRateWindow(now);
    }
    this.updatesInRateWindow += count;
    const windowElapsed = now - this.rateWindowStartedAt;
    if (windowElapsed >= RATE_WINDOW_MS) {
      this.resetRateWindow(now);
    }
  }

  private resetRateWindow(now: number): void {
    this.rateWindowStartedAt = now;
    this.updatesInRateWindow = 0;
  }

  private computeActualRate(now: number): number {
    if (this.rateWindowStartedAt === 0) {
      return 0;
    }
    const elapsedMs = Math.max(1, now - this.rateWindowStartedAt);
    return (this.updatesInRateWindow * 1000) / elapsedMs;
  }

  private computeNominalRate(): number {
    if (this.batchIntervalMs <= 0 || this.updatesPerBatch <= 0) {
      return 0;
    }
    return (this.updatesPerBatch * 1000) / this.batchIntervalMs;
  }

  private emitSnapshot(): void {
    if (this.lifecycle === 'disposed') {
      return;
    }
    this.callbacks.onSnapshot({
      type: WorkerMessageType.Snapshot,
      runId: this.runId,
      instruments: this.accumulator.snapshot(),
    });
  }

  private emitStatus(now = this.scheduler.now()): void {
    if (this.lifecycle === 'disposed') {
      return;
    }
    const status = this.toProducerStatus();
    this.callbacks.onStatus({
      type: WorkerMessageType.Status,
      runId: this.runId,
      status,
      nominalRatePerSecond: this.computeNominalRate(),
      actualRatePerSecond:
        status === 'running' ? this.computeActualRate(now) : 0,
    });
  }

  private toProducerStatus(): ProducerLifecycleStatus {
    if (this.lifecycle === 'running') {
      return 'running';
    }
    if (this.lifecycle === 'paused') {
      return 'paused';
    }
    return 'idle';
  }

  private clearBatchTimer(): void {
    if (this.batchTimer !== null && this.batchTimer !== undefined) {
      this.scheduler.clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
  }
}
