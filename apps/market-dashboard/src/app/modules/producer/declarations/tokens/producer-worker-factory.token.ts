import { InjectionToken } from '@angular/core';

export type ProducerWorkerFactory = () => Worker;

export const PRODUCER_WORKER_FACTORY =
  new InjectionToken<ProducerWorkerFactory>('PRODUCER_WORKER_FACTORY');
