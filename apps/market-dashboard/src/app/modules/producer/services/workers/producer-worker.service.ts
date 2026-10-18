import { DestroyRef, Injectable, OnDestroy, inject } from '@angular/core';
import {
  InitErrorPayload,
  MainToWorkerMessage,
  WorkerMessageType,
  WorkerToMainMessage,
} from '@test/market-engine';
import { isNil } from '@test/shared-utils';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { PRODUCER_WORKER_FACTORY, ProducerStatus } from '../../declarations';

export function createDefaultProducerWorker(): Worker {
  return new Worker(
    new URL('../../../../workers/producer.worker', import.meta.url),
    { type: 'module' }
  );
}

@Injectable({ providedIn: 'root' })
export class ProducerWorkerService implements OnDestroy {
  private readonly destroyRef = inject(DestroyRef);

  private worker: Worker | null = null;
  private workerReady = false;
  private pendingCommands: MainToWorkerMessage[] = [];
  private disposed = false;

  private readonly messagesSubject = new Subject<WorkerToMainMessage>();
  private readonly statusSubject = new BehaviorSubject<ProducerStatus>(
    ProducerStatus.Initializing
  );

  public readonly messages$: Observable<WorkerToMainMessage> =
    this.messagesSubject.asObservable();
  public readonly status$: Observable<ProducerStatus> =
    this.statusSubject.asObservable();

  private readonly workerFactory = inject(PRODUCER_WORKER_FACTORY);

  public constructor() {
    this.spawnWorker();
    this.destroyRef.onDestroy(() => {
      this.dispose();
    });
  }

  public ngOnDestroy(): void {
    this.dispose();
  }

  public send(message: MainToWorkerMessage): void {
    if (this.disposed || isNil(this.worker)) {
      return;
    }

    if (!this.workerReady) {
      this.pendingCommands.push(message);
      return;
    }

    this.worker.postMessage(message);
  }

  public dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;

    if (!isNil(this.worker) && this.workerReady) {
      this.worker.postMessage({
        type: WorkerMessageType.Dispose,
        runId: 0,
      });
    }

    this.pendingCommands = [];
    this.workerReady = false;

    if (!isNil(this.worker)) {
      this.worker.onmessage = null;
      this.worker.onmessageerror = null;
      this.worker.onerror = null;
      this.worker.terminate();
      this.worker = null;
    }

    this.messagesSubject.complete();
    this.statusSubject.complete();
  }

  private spawnWorker(): void {
    this.worker = this.workerFactory();
    this.worker.onmessage = (event: MessageEvent<WorkerToMainMessage>) => {
      this.handleWorkerMessage(event.data);
    };
    this.worker.onmessageerror = () => {
      this.handleWorkerFailure('Worker failed to deserialize a message');
    };
    this.worker.onerror = (event: ErrorEvent) => {
      const detail = event.message?.trim();
      this.handleWorkerFailure(
        detail.length > 0 ? detail : 'Worker script error'
      );
    };
  }

  private handleWorkerMessage(message: WorkerToMainMessage): void {
    if (message.type === WorkerMessageType.InitError) {
      this.applyInitError(message);
      return;
    }

    if (!this.workerReady && message.type === WorkerMessageType.Status) {
      this.workerReady = true;
      if (this.statusSubject.value !== ProducerStatus.Error) {
        this.statusSubject.next(ProducerStatus.Idle);
      }
      this.flushPendingCommands();
    }

    this.messagesSubject.next(message);
  }

  private applyInitError(payload: InitErrorPayload): void {
    this.workerReady = false;
    this.pendingCommands = [];
    this.statusSubject.next(ProducerStatus.Error);
    this.messagesSubject.next(payload);
  }

  private handleWorkerFailure(message: string): void {
    this.workerReady = false;
    this.pendingCommands = [];
    this.statusSubject.next(ProducerStatus.Error);
    this.messagesSubject.next({
      type: WorkerMessageType.InitError,
      runId: 0,
      message,
    });
  }

  private flushPendingCommands(): void {
    if (isNil(this.worker)) {
      return;
    }

    const commands = this.pendingCommands;
    this.pendingCommands = [];
    for (const command of commands) {
      this.worker.postMessage(command);
    }
  }
}
