import {
  MainToWorkerMessage,
  MarketGenerator,
  ProducerEngine,
  WorkerMessageType,
} from '@test/market-engine';
import init, { MarketProducer } from '../../../public/wasm/market_producer.js';

const wasmModuleUrl = new URL('wasm/market_producer_bg.wasm', import.meta.url);

class WasmMarketGenerator implements MarketGenerator {
  private producer: MarketProducer | null = null;

  public configure(instrumentCount: number, seed: number): void {
    this.dispose();
    this.producer = new MarketProducer(instrumentCount, BigInt(seed));
  }

  public generateBatch(count: number): Int32Array {
    if (this.producer === null) {
      return new Int32Array(0);
    }
    return this.producer.generate_batch(count);
  }

  public symbol(instrumentIdx: number): string {
    if (this.producer === null) {
      return '';
    }
    return this.producer.symbol(instrumentIdx);
  }

  public dispose(): void {
    if (this.producer !== null) {
      this.producer.free();
      this.producer = null;
    }
  }
}

const generator = new WasmMarketGenerator();
let engine: ProducerEngine | null = null;
let workerReady = false;
const pendingCommands: MainToWorkerMessage[] = [];

function postInitError(message: string): void {
  self.postMessage({
    type: WorkerMessageType.InitError,
    runId: 0,
    message,
  });
}

function handleCommand(message: MainToWorkerMessage): void {
  if (engine === null) {
    return;
  }

  switch (message.type) {
    case WorkerMessageType.Start:
      generator.configure(message.instrumentCount, message.seed);
      engine.start({
        runId: message.runId,
        instrumentCount: message.instrumentCount,
        updatesPerBatch: message.updatesPerBatch,
        batchIntervalMs: message.batchIntervalMs,
      });
      break;
    case WorkerMessageType.Pause:
      engine.pause();
      break;
    case WorkerMessageType.Resume:
      engine.resume();
      break;
    case WorkerMessageType.Dispose:
      engine.dispose();
      generator.dispose();
      break;
  }
}

async function bootstrap(): Promise<void> {
  try {
    await init({ module_or_path: wasmModuleUrl });
    engine = new ProducerEngine(generator, {
      onSnapshot: payload => {
        self.postMessage(payload);
      },
      onStatus: payload => {
        self.postMessage(payload);
      },
    });
    workerReady = true;
    self.postMessage({
      type: WorkerMessageType.Status,
      runId: 0,
      status: 'idle',
      nominalRatePerSecond: 0,
      actualRatePerSecond: 0,
    });
    for (const command of pendingCommands) {
      handleCommand(command);
    }
    pendingCommands.length = 0;
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : 'Failed to initialize producer worker';
    postInitError(message);
  }
}

self.onmessage = (event: MessageEvent<MainToWorkerMessage>) => {
  if (!workerReady) {
    pendingCommands.push(event.data);
    return;
  }
  handleCommand(event.data);
};

void bootstrap();
