export function createDefaultProducerWorker(): Worker {
  return {
    postMessage: () => undefined,
    terminate: () => undefined,
    onmessage: null,
    onerror: null,
    onmessageerror: null,
  } as unknown as Worker;
}
