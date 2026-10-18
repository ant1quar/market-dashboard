import {
  EnvironmentProviders,
  Provider,
  inject,
  provideAppInitializer,
} from '@angular/core';
import {
  PRODUCER_DEFAULTS,
  PRODUCER_LIMITS,
  PRODUCER_WORKER_FACTORY,
  PRODUCER_DEFAULT_SETTINGS,
  PRODUCER_SETTINGS_LIMITS,
} from './declarations';
import { ProducerService } from './services/producer.service';
import { createDefaultProducerWorker } from './services/workers/producer-worker.factory';
import { ProducerWorkerService } from './services/workers/producer-worker.service';

export const producerProviders: Array<Provider | EnvironmentProviders> = [
  {
    provide: PRODUCER_DEFAULTS,
    useValue: PRODUCER_DEFAULT_SETTINGS,
  },
  {
    provide: PRODUCER_LIMITS,
    useValue: PRODUCER_SETTINGS_LIMITS,
  },
  {
    provide: PRODUCER_WORKER_FACTORY,
    useFactory: createDefaultProducerWorker,
  },
  provideAppInitializer(() => {
    inject(ProducerWorkerService);
    const producer = inject(ProducerService);
    producer.connect();
    producer.apply(inject(PRODUCER_DEFAULTS));
  }),
];
