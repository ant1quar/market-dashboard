export const FIELDS_PER_UPDATE = 7;

export const UPDATE_FIELD = {
  instrumentIdx: 0,
  priceCents: 1,
  tradeQty: 2,
  bidCents: 3,
  askCents: 4,
  bidQty: 5,
  askQty: 6,
} as const;

export const DEFAULT_SNAPSHOT_INTERVAL_MS = 100;
