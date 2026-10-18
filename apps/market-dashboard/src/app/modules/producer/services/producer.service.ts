import {
  DestroyRef,
  Injectable,
  OnDestroy,
  inject,
  signal,
} from '@angular/core';
import {
  InitErrorPayload,
  InstrumentMetrics,
  ProducerLifecycleStatus,
  SnapshotPayload,
  StatusPayload,
  WorkerMessageType,
  WorkerToMainMessage,
} from '@test/market-engine';
import { isNil } from '@test/shared-utils';
import { Subscription } from 'rxjs';
import {
  PRODUCER_DEFAULTS,
  ProducerSettings,
  ProducerStatus,
  instrumentSymbolAt,
} from '../declarations';
import { ProducerWorkerService } from './workers/producer-worker.service';

@Injectable({ providedIn: 'root' })
export class ProducerService implements OnDestroy {
  private readonly destroyRef = inject(DestroyRef);
  private readonly workerService = inject(ProducerWorkerService);
  private readonly defaultSettings = inject(PRODUCER_DEFAULTS);

  private runId = 0;
  private connected = false;
  private subscriptions: Subscription[] = [];

  public readonly status = signal<ProducerStatus>(ProducerStatus.Initializing);
  public readonly settings = signal<ProducerSettings>({
    ...this.defaultSettings,
  });
  public readonly rows = signal<InstrumentMetrics[]>(
    this.createEmptyRows(this.defaultSettings.instrumentCount)
  );
  public readonly actualRate = signal(0);
  public readonly error = signal<string | null>(null);

  public connect(): void {
    if (this.connected) {
      return;
    }
    this.connected = true;

    this.subscriptions.push(
      this.workerService.messages$.subscribe({
        next: message => {
          this.handleWorkerMessage(message);
        },
        error: () => {
          this.handleStreamFailure('Producer message stream failed');
        },
      }),
      this.workerService.status$.subscribe({
        next: workerStatus => {
          if (
            workerStatus === ProducerStatus.Error &&
            this.status() !== ProducerStatus.Error
          ) {
            this.status.set(ProducerStatus.Error);
          }
        },
        error: () => {
          this.handleStreamFailure('Producer status stream failed');
        },
      })
    );

    this.destroyRef.onDestroy(() => {
      this.dispose();
    });
  }

  public ngOnDestroy(): void {
    this.dispose();
  }

  public apply(nextSettings: ProducerSettings): void {
    this.runId += 1;
    this.settings.set({ ...nextSettings });
    this.error.set(null);
    this.rows.set(this.createEmptyRows(nextSettings.instrumentCount));
    this.actualRate.set(0);

    this.workerService.send({
      type: WorkerMessageType.Start,
      runId: this.runId,
      instrumentCount: nextSettings.instrumentCount,
      updatesPerBatch: nextSettings.updatesPerBatch,
      batchIntervalMs: nextSettings.batchIntervalMs,
      seed: this.randomSeed(),
    });
  }

  public pause(): void {
    if (this.runId === 0) {
      return;
    }
    this.workerService.send({
      type: WorkerMessageType.Pause,
      runId: this.runId,
    });
  }

  public resume(): void {
    if (this.runId === 0) {
      return;
    }
    this.workerService.send({
      type: WorkerMessageType.Resume,
      runId: this.runId,
    });
  }

  private dispose(): void {
    for (const subscription of this.subscriptions) {
      subscription.unsubscribe();
    }
    this.subscriptions = [];
    this.workerService.dispose();
  }

  private handleWorkerMessage(message: WorkerToMainMessage): void {
    if (message.type === WorkerMessageType.InitError) {
      this.applyInitError(message);
      return;
    }

    if (this.isStaleRun(message.runId)) {
      return;
    }

    switch (message.type) {
      case WorkerMessageType.Snapshot:
        this.applySnapshot(message);
        break;
      case WorkerMessageType.Status:
        this.applyStatus(message);
        break;
    }
  }

  private applyInitError(payload: InitErrorPayload): void {
    this.error.set(payload.message);
    this.status.set(ProducerStatus.Error);
    this.actualRate.set(0);
  }

  private applySnapshot(payload: SnapshotPayload): void {
    this.rows.set(payload.instruments);
  }

  private applyStatus(payload: StatusPayload): void {
    this.status.set(this.mapLifecycleStatus(payload.status));
    this.actualRate.set(payload.actualRatePerSecond);
  }

  private isStaleRun(messageRunId: number): boolean {
    return messageRunId !== this.runId;
  }

  private mapLifecycleStatus(
    lifecycle: ProducerLifecycleStatus
  ): ProducerStatus {
    switch (lifecycle) {
      case 'running':
        return ProducerStatus.Running;
      case 'paused':
        return ProducerStatus.Paused;
      default:
        return ProducerStatus.Idle;
    }
  }

  private createEmptyRows(instrumentCount: number): InstrumentMetrics[] {
    return Array.from({ length: instrumentCount }, (_, instrumentIdx) => ({
      instrumentIdx,
      symbol: instrumentSymbolAt(instrumentIdx),
      lastPriceCents: null,
      spreadCents: null,
      volume: 0,
      vwapCents: null,
      imbalance: null,
    }));
  }

  private randomSeed(): number {
    const values = new Uint32Array(2);
    crypto.getRandomValues(values);
    const high = values[0] ?? 0;
    const low = values[1] ?? 0;
    return high * 0x1_0000_0000 + low;
  }

  private handleStreamFailure(message: string): void {
    if (isNil(this.error())) {
      this.error.set(message);
    }
    this.status.set(ProducerStatus.Error);
    this.actualRate.set(0);
  }
}
