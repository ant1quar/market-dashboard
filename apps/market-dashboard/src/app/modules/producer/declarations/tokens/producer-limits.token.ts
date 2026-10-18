import { InjectionToken } from '@angular/core';
import { ProducerLimits } from '../models/producer-limits.interface';

export const PRODUCER_LIMITS = new InjectionToken<ProducerLimits>(
  'PRODUCER_LIMITS'
);
