export function createDefaultProducerWorker(): Worker {
  return new Worker(
    new URL('../../../../workers/producer.worker', import.meta.url),
    { type: 'module' }
  );
}
