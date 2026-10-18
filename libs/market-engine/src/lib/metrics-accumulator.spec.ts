import { MetricsAccumulator } from './metrics-accumulator';
import { FIELDS_PER_UPDATE } from './constants';

const SYMBOLS = ['ALFA', 'BETA'];

function symbolAt(idx: number): string {
  return SYMBOLS[idx] ?? `INST${idx}`;
}

function batchRow(
  instrumentIdx: number,
  priceCents: number,
  tradeQty: number,
  bidCents: number,
  askCents: number,
  bidQty: number,
  askQty: number
): number[] {
  return [
    instrumentIdx,
    priceCents,
    tradeQty,
    bidCents,
    askCents,
    bidQty,
    askQty,
  ];
}

function toBatch(rows: number[][]): Int32Array {
  return Int32Array.from(rows.flat());
}

describe('MetricsAccumulator', () => {
  it('matches the worked example (102, 40 units, 101.50 VWAP, 4 cent spread, 0.20 imbalance)', () => {
    const acc = new MetricsAccumulator(1, symbolAt);
    acc.applyBatch(
      toBatch([
        batchRow(0, 10_000, 10, 9_990, 10_010, 100, 100),
        batchRow(0, 10_200, 30, 10_196, 10_200, 600, 400),
      ])
    );

    const [row] = acc.snapshot();
    expect(row.lastPriceCents).toBe(10_200);
    expect(row.volume).toBe(40);
    expect(row.vwapCents).toBe(10_150);
    expect(row.spreadCents).toBe(4);
    expect(row.imbalance).toBeCloseTo(0.2);
  });

  it('starts with zero volume and null metrics when denominators are unavailable', () => {
    const acc = new MetricsAccumulator(1, symbolAt);
    const [row] = acc.snapshot();
    expect(row.volume).toBe(0);
    expect(row.lastPriceCents).toBeNull();
    expect(row.spreadCents).toBeNull();
    expect(row.vwapCents).toBeNull();
    expect(row.imbalance).toBeNull();
  });

  it('returns null VWAP and imbalance when denominators are zero', () => {
    const acc = new MetricsAccumulator(1, symbolAt);
    acc.applyBatch(toBatch([batchRow(0, 10_000, 0, 10_000, 10_001, 0, 0)]));

    const [row] = acc.snapshot();
    expect(row.volume).toBe(0);
    expect(row.vwapCents).toBeNull();
    expect(row.imbalance).toBeNull();
    expect(row.spreadCents).toBe(1);
  });

  it('isolates metrics between instruments', () => {
    const acc = new MetricsAccumulator(2, symbolAt);
    acc.applyBatch(toBatch([batchRow(0, 10_500, 5, 10_490, 10_510, 10, 20)]));

    const snap = acc.snapshot();
    expect(snap[0].volume).toBe(5);
    expect(snap[0].lastPriceCents).toBe(10_500);
    expect(snap[1].volume).toBe(0);
    expect(snap[1].lastPriceCents).toBeNull();
    expect(snap[1].symbol).toBe('BETA');
  });

  it('does not include pre-reset trades in volume or VWAP', () => {
    const acc = new MetricsAccumulator(1, symbolAt);
    acc.applyBatch(toBatch([batchRow(0, 10_000, 10, 9_990, 10_010, 1, 1)]));
    acc.reset(1);
    acc.applyBatch(toBatch([batchRow(0, 10_200, 2, 10_196, 10_200, 600, 400)]));

    const [row] = acc.snapshot();
    expect(row.volume).toBe(2);
    expect(row.vwapCents).toBe(10_200);
  });

  it('ignores rows with out-of-range instrument indices', () => {
    const acc = new MetricsAccumulator(1, symbolAt);
    const bad = toBatch([batchRow(3, 10_000, 1, 9_990, 10_010, 1, 1)]);
    expect(bad.length).toBe(FIELDS_PER_UPDATE);
    acc.applyBatch(bad);
    expect(acc.snapshot()[0].volume).toBe(0);
  });
});
