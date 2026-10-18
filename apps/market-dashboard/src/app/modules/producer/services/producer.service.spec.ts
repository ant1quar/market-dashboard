import { TestBed } from '@angular/core/testing';
import { InstrumentMetrics, WorkerMessageType } from '@test/market-engine';
import {
  PRODUCER_DEFAULTS,
  PRODUCER_WORKER_FACTORY,
  ProducerSettings,
  ProducerStatus,
} from '../declarations';
import { FakeProducerWorker } from '../testing/fake-producer.worker';
import { ProducerService } from './producer.service';
import { ProducerWorkerService } from './workers/producer-worker.service';

describe('ProducerService', () => {
  let fakeWorker: FakeProducerWorker;
  let service: ProducerService;

  const defaultSettings: ProducerSettings = {
    instrumentCount: 3,
    updatesPerBatch: 10,
    batchIntervalMs: 100,
  };

  beforeEach(() => {
    fakeWorker = new FakeProducerWorker();

    TestBed.configureTestingModule({
      providers: [
        ProducerWorkerService,
        ProducerService,
        { provide: PRODUCER_DEFAULTS, useValue: defaultSettings },
        {
          provide: PRODUCER_WORKER_FACTORY,
          useValue: () => fakeWorker as unknown as Worker,
        },
      ],
    });

    service = TestBed.inject(ProducerService);
    service.connect();
    fakeWorker.emitReady();
  });

  afterEach(() => {
    service.ngOnDestroy();
  });

  function snapshotRows(runId: number, instruments: InstrumentMetrics[]): void {
    fakeWorker.emit({
      type: WorkerMessageType.Snapshot,
      runId,
      instruments,
    });
  }

  it('apply resets rows and sends Start with an incremented runId', () => {
    snapshotRows(0, [
      {
        instrumentIdx: 0,
        symbol: 'ALFA',
        lastPriceCents: 10_000,
        spreadCents: 2,
        volume: 5,
        vwapCents: 10_000,
        imbalance: 0,
      },
    ]);

    const nextSettings: ProducerSettings = {
      instrumentCount: 2,
      updatesPerBatch: 20,
      batchIntervalMs: 200,
    };

    jest
      .spyOn(globalThis.crypto, 'getRandomValues')
      .mockImplementation((array: ArrayBufferView) => {
        const view = array as Uint32Array;
        view[0] = 1;
        view[1] = 2;
        return view;
      });

    service.apply(nextSettings);

    expect(service.settings()).toEqual(nextSettings);
    expect(service.rows().length).toBe(2);
    expect(service.rows().every(row => row.volume === 0)).toBe(true);
    expect(service.actualRate()).toBe(0);

    const start = fakeWorker.posted.find(
      msg => msg.type === WorkerMessageType.Start
    );
    expect(start).toMatchObject({
      type: WorkerMessageType.Start,
      runId: 1,
      instrumentCount: 2,
      updatesPerBatch: 20,
      batchIntervalMs: 200,
      seed: 1 * 0x1_0000_0000 + 2,
    });
  });

  it('ignores snapshots from a stale runId', () => {
    service.apply({
      instrumentCount: 1,
      updatesPerBatch: 1,
      batchIntervalMs: 100,
    });

    const currentRows = service.rows();
    snapshotRows(0, [
      {
        instrumentIdx: 0,
        symbol: 'ALFA',
        lastPriceCents: 99,
        spreadCents: 1,
        volume: 999,
        vwapCents: 99,
        imbalance: null,
      },
    ]);

    expect(service.rows()).toEqual(currentRows);
  });

  it('sends Pause and Resume with the active runId', () => {
    service.apply(defaultSettings);
    const activeRunId = 1;

    service.pause();
    expect(fakeWorker.posted.at(-1)).toEqual({
      type: WorkerMessageType.Pause,
      runId: activeRunId,
    });

    service.resume();
    expect(fakeWorker.posted.at(-1)).toEqual({
      type: WorkerMessageType.Resume,
      runId: activeRunId,
    });
  });

  it('sets Error status when init error arrives', () => {
    fakeWorker.emit({
      type: WorkerMessageType.InitError,
      runId: 0,
      message: 'wasm init failed',
    });

    expect(service.status()).toBe(ProducerStatus.Error);
    expect(service.error()).toBe('wasm init failed');
    expect(service.actualRate()).toBe(0);
  });

  it('terminates the worker on destroy', () => {
    service.ngOnDestroy();
    expect(fakeWorker.terminate).toHaveBeenCalled();
  });
});
