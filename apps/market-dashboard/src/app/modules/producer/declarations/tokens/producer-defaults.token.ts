import { InjectionToken } from '@angular/core';
import { ProducerSettings } from '../models/producer-settings.interface';

export const PRODUCER_DEFAULTS = new InjectionToken<ProducerSettings>(
  'PRODUCER_DEFAULTS'
);
