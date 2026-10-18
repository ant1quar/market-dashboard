import { ProducerLimits } from '../models/producer-limits.interface';
import { ProducerSettings } from '../models/producer-settings.interface';

export const PRODUCER_DEFAULT_SETTINGS: ProducerSettings = {
  instrumentCount: 5,
  updatesPerBatch: 100,
  batchIntervalMs: 500,
};

export const PRODUCER_SETTINGS_LIMITS: ProducerLimits = {
  instrumentCount: { min: 1, max: 50 },
  updatesPerBatch: { min: 1, max: 1000 },
  batchIntervalMs: { min: 50, max: 2000 },
};
