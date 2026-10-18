import { InstrumentMetrics } from './models/instrument-metrics';

export enum WorkerMessageType {
  Start = 'start',
  Pause = 'pause',
  Resume = 'resume',
  Dispose = 'dispose',
  Snapshot = 'snapshot',
  Status = 'status',
  InitError = 'init-error',
}

export type ProducerLifecycleStatus = 'idle' | 'running' | 'paused';

export interface StartCommand {
  type: WorkerMessageType.Start;
  runId: number;
  instrumentCount: number;
  updatesPerBatch: number;
  batchIntervalMs: number;
  seed: number;
}

export interface PauseCommand {
  type: WorkerMessageType.Pause;
  runId: number;
}

export interface ResumeCommand {
  type: WorkerMessageType.Resume;
  runId: number;
}

export interface DisposeCommand {
  type: WorkerMessageType.Dispose;
  runId: number;
}

export type MainToWorkerMessage =
  | StartCommand
  | PauseCommand
  | ResumeCommand
  | DisposeCommand;

export interface SnapshotPayload {
  type: WorkerMessageType.Snapshot;
  runId: number;
  instruments: InstrumentMetrics[];
}

export interface StatusPayload {
  type: WorkerMessageType.Status;
  runId: number;
  status: ProducerLifecycleStatus;
  nominalRatePerSecond: number;
  actualRatePerSecond: number;
}

export interface InitErrorPayload {
  type: WorkerMessageType.InitError;
  runId: number;
  message: string;
}

export type WorkerToMainMessage =
  | SnapshotPayload
  | StatusPayload
  | InitErrorPayload;
