import { Provider } from '@angular/core';
import { PRODUCER_WORKER_FACTORY } from './declarations';
import { createDefaultProducerWorker } from './services/workers/producer-worker.service';

export const producerProviders: Provider[] = [
  {
    provide: PRODUCER_WORKER_FACTORY,
    useFactory: createDefaultProducerWorker,
  },
];
