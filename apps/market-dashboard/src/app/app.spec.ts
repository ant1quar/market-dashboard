import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { WorkerMessageType } from '@test/market-engine';
import { App } from './app';
import { appRoutes } from './app.routes';
import {
  PRODUCER_DEFAULTS,
  PRODUCER_WORKER_FACTORY,
  PRODUCER_DEFAULT_SETTINGS,
} from './modules/producer/declarations';
import { producerProviders } from './modules/producer/producer.providers';
import { FakeProducerWorker } from './modules/producer/testing/fake-producer.worker';

describe('App', () => {
  let fakeWorker: FakeProducerWorker;

  beforeEach(async () => {
    fakeWorker = new FakeProducerWorker();

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter(appRoutes),
        ...producerProviders,
        { provide: PRODUCER_DEFAULTS, useValue: PRODUCER_DEFAULT_SETTINGS },
        {
          provide: PRODUCER_WORKER_FACTORY,
          useValue: () => fakeWorker as unknown as Worker,
        },
      ],
    }).compileComponents();
  });

  it('should create and bootstrap the producer with default settings', async () => {
    const fixture = TestBed.createComponent(App);
    fakeWorker.emitReady();
    await fixture.whenStable();

    expect(fixture.componentInstance).toBeTruthy();

    const start = fakeWorker.posted.find(
      msg => msg.type === WorkerMessageType.Start
    );
    expect(start).toMatchObject({
      type: WorkerMessageType.Start,
      runId: 1,
      instrumentCount: PRODUCER_DEFAULT_SETTINGS.instrumentCount,
      updatesPerBatch: PRODUCER_DEFAULT_SETTINGS.updatesPerBatch,
      batchIntervalMs: PRODUCER_DEFAULT_SETTINGS.batchIntervalMs,
    });
  });
});
