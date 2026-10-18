export interface MarketGenerator {
  generateBatch(count: number): Int32Array;
  symbol(instrumentIdx: number): string;
  dispose(): void;
}
