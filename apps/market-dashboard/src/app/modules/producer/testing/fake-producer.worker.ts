import {
  MainToWorkerMessage,
  WorkerMessageType,
  WorkerToMainMessage,
} from '@test/market-engine';

export class FakeProducerWorker {
  public onmessage:
    | ((event: MessageEvent<WorkerToMainMessage>) => void)
    | null = null;
  public onerror: ((event: ErrorEvent) => void) | null = null;
  public onmessageerror: ((event: MessageEvent) => void) | null = null;

  public readonly posted: MainToWorkerMessage[] = [];
  public readonly terminate = jest.fn();

  public postMessage(message: MainToWorkerMessage): void {
    this.posted.push(message);
  }

  public emit(message: WorkerToMainMessage): void {
    this.onmessage?.({ data: message } as MessageEvent<WorkerToMainMessage>);
  }

  public emitReady(): void {
    this.emit({
      type: WorkerMessageType.Status,
      runId: 0,
      status: 'idle',
      nominalRatePerSecond: 0,
      actualRatePerSecond: 0,
    });
  }
}
