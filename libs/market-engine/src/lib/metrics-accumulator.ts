import { isNil } from '@test/shared-utils';

import { FIELDS_PER_UPDATE, UPDATE_FIELD } from './constants';
import { InstrumentMetrics } from './models/instrument-metrics';

interface InstrumentAccumulatorState {
  lastPriceCents: number | null;
  bidCents: number | null;
  askCents: number | null;
  bidQty: number | null;
  askQty: number | null;
  volume: number;
  notionalCents: number;
}

function createEmptyState(): InstrumentAccumulatorState {
  return {
    lastPriceCents: null,
    bidCents: null,
    askCents: null,
    bidQty: null,
    askQty: null,
    volume: 0,
    notionalCents: 0,
  };
}

export class MetricsAccumulator {
  private states: InstrumentAccumulatorState[] = [];

  public constructor(
    instrumentCount: number,
    private readonly symbolAt: (instrumentIdx: number) => string
  ) {
    this.reset(instrumentCount);
  }

  public reset(instrumentCount: number): void {
    this.states = Array.from({ length: instrumentCount }, createEmptyState);
  }

  public applyBatch(batch: Int32Array): void {
    for (let offset = 0; offset < batch.length; offset += FIELDS_PER_UPDATE) {
      const instrumentIdx = batch[offset + UPDATE_FIELD.instrumentIdx];
      if (instrumentIdx < 0 || instrumentIdx >= this.states.length) {
        continue;
      }
      const priceCents = batch[offset + UPDATE_FIELD.priceCents];
      const tradeQty = batch[offset + UPDATE_FIELD.tradeQty];
      const bidCents = batch[offset + UPDATE_FIELD.bidCents];
      const askCents = batch[offset + UPDATE_FIELD.askCents];
      const bidQty = batch[offset + UPDATE_FIELD.bidQty];
      const askQty = batch[offset + UPDATE_FIELD.askQty];

      const state = this.states[instrumentIdx];
      state.lastPriceCents = priceCents;
      state.bidCents = bidCents;
      state.askCents = askCents;
      state.bidQty = bidQty;
      state.askQty = askQty;
      state.volume += tradeQty;
      state.notionalCents += priceCents * tradeQty;
    }
  }

  public snapshot(): InstrumentMetrics[] {
    return this.states.map((state, instrumentIdx) =>
      this.toMetrics(instrumentIdx, state)
    );
  }

  private toMetrics(
    instrumentIdx: number,
    state: InstrumentAccumulatorState
  ): InstrumentMetrics {
    const spreadCents =
      isNil(state.bidCents) || isNil(state.askCents)
        ? null
        : state.askCents - state.bidCents;

    const vwapCents =
      state.volume > 0 ? state.notionalCents / state.volume : null;

    const imbalance = this.computeImbalance(state.bidQty, state.askQty);

    return {
      instrumentIdx,
      symbol: this.symbolAt(instrumentIdx),
      lastPriceCents: state.lastPriceCents,
      spreadCents,
      volume: state.volume,
      vwapCents,
      imbalance,
    };
  }

  private computeImbalance(
    bidQty: number | null,
    askQty: number | null
  ): number | null {
    if (isNil(bidQty) || isNil(askQty)) {
      return null;
    }
    const denominator = bidQty + askQty;
    if (denominator === 0) {
      return null;
    }
    return (bidQty - askQty) / denominator;
  }
}
