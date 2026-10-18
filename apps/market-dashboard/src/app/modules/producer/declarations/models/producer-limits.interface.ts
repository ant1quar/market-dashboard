export interface ProducerSettingBounds {
  readonly min: number;
  readonly max: number;
}

export interface ProducerLimits {
  readonly instrumentCount: ProducerSettingBounds;
  readonly updatesPerBatch: ProducerSettingBounds;
  readonly batchIntervalMs: ProducerSettingBounds;
}
