use wasm_bindgen::prelude::*;

const FIELDS_PER_UPDATE: usize = 7;
const MAX_INSTRUMENTS: usize = 50;
const MIN_SPREAD_CENTS: i32 = 1;
const MIN_TRADE_QTY: i32 = 1;
const MAX_TRADE_QTY: i32 = 250;
const MIN_BOOK_QTY: i32 = 500;
const BOOK_QTY_FLOOR: i32 = MIN_BOOK_QTY + MAX_TRADE_QTY;
const MAX_BOOK_QTY: i32 = 1_000_000;
const BOOK_QTY_WALK: i32 = 400;
const PRICE_WALK_MAX_DELTA: i32 = 5;
const INITIAL_MID_CENTS: i32 = 10_000;

const BASE_SYMBOLS: [&str; 26] = [
    "ALFA", "BETA", "GAMMA", "DELTA", "EPSLN", "ZETA", "THETA", "IOTA", "KAPPA", "LAMBD",
    "MU", "NU", "XI", "OMIC", "PI", "RHO", "SIGMA", "TAU", "UPSIL", "PHI", "CHI", "PSI",
    "OMEGA", "SIGMA2", "TAU2", "PHI2",
];

pub struct Rng {
    state: u64,
}

impl Rng {
    pub fn new(seed: u64) -> Self {
        let state = if seed == 0 {
            0xdeadbeef_cafe_babe
        } else {
            seed
        };
        Self { state }
    }

    pub fn next_u64(&mut self) -> u64 {
        let mut x = self.state;
        x ^= x >> 12;
        x ^= x << 25;
        x ^= x >> 27;
        self.state = x;
        x.wrapping_mul(0x2545_F491_4F6D_D35D)
    }

    pub fn next_u32_bounded(&mut self, upper_exclusive: u32) -> u32 {
        if upper_exclusive <= 1 {
            return 0;
        }
        (self.next_u64() % upper_exclusive as u64) as u32
    }

    pub fn next_bool(&mut self) -> bool {
        self.next_u64() & 1 == 0
    }

    pub fn next_i32_range(&mut self, min: i32, max_inclusive: i32) -> i32 {
        let span = (max_inclusive - min + 1) as u32;
        min + self.next_u32_bounded(span) as i32
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct InstrumentState {
    mid_cents: i32,
    half_spread_cents: i32,
    bid_qty: i32,
    ask_qty: i32,
}

impl InstrumentState {
    fn new(rng: &mut Rng) -> Self {
        let mid_cents = INITIAL_MID_CENTS + rng.next_i32_range(-500, 500);
        let half_spread_cents = rng.next_i32_range(1, 10);
        Self {
            mid_cents: mid_cents.max(half_spread_cents + 1),
            half_spread_cents,
            bid_qty: rng.next_i32_range(2_000, 20_000),
            ask_qty: rng.next_i32_range(2_000, 20_000),
        }
    }

    fn bid_cents(&self) -> i32 {
        self.mid_cents - self.half_spread_cents
    }

    fn ask_cents(&self) -> i32 {
        self.mid_cents + self.half_spread_cents
    }

    fn apply_random_walk(&mut self, rng: &mut Rng) {
        let delta = rng.next_i32_range(-PRICE_WALK_MAX_DELTA, PRICE_WALK_MAX_DELTA);
        self.mid_cents = (self.mid_cents + delta).max(self.half_spread_cents + 1);
        self.bid_qty = (self.bid_qty + rng.next_i32_range(-BOOK_QTY_WALK, BOOK_QTY_WALK))
            .clamp(BOOK_QTY_FLOOR, MAX_BOOK_QTY);
        self.ask_qty = (self.ask_qty + rng.next_i32_range(-BOOK_QTY_WALK, BOOK_QTY_WALK))
            .clamp(BOOK_QTY_FLOOR, MAX_BOOK_QTY);
    }

    fn generate_update(&mut self, rng: &mut Rng) -> [i32; FIELDS_PER_UPDATE] {
        self.apply_random_walk(rng);
        let bid = self.bid_cents();
        let ask = self.ask_cents();
        let trade_on_bid = rng.next_bool();
        let price_cents = if trade_on_bid { bid } else { ask };
        let trade_qty = rng.next_i32_range(MIN_TRADE_QTY, MAX_TRADE_QTY);
        if trade_on_bid {
            self.bid_qty = (self.bid_qty - trade_qty).max(0);
        } else {
            self.ask_qty = (self.ask_qty - trade_qty).max(0);
        }
        [
            0,
            price_cents,
            trade_qty,
            bid,
            ask,
            self.bid_qty,
            self.ask_qty,
        ]
    }
}

pub fn symbol_name(index: usize) -> String {
    if index >= MAX_INSTRUMENTS {
        return String::new();
    }
    if index < BASE_SYMBOLS.len() {
        BASE_SYMBOLS[index].to_string()
    } else {
        let base = BASE_SYMBOLS[index % BASE_SYMBOLS.len()];
        let suffix = index / BASE_SYMBOLS.len();
        format!("{base}{suffix}")
    }
}

pub struct MarketProducerCore {
    instruments: Vec<InstrumentState>,
    rng: Rng,
    instrument_count: u32,
}

impl MarketProducerCore {
    pub fn new(count: u32, seed: u64) -> Self {
        let instrument_count = count.clamp(1, MAX_INSTRUMENTS as u32);
        let mut rng = Rng::new(seed);
        let instruments = (0..instrument_count)
            .map(|_| InstrumentState::new(&mut rng))
            .collect();
        Self {
            instruments,
            rng,
            instrument_count,
        }
    }

    pub fn instrument_count(&self) -> u32 {
        self.instrument_count
    }

    pub fn symbol(&self, index: u32) -> String {
        if index >= self.instrument_count {
            return String::new();
        }
        symbol_name(index as usize)
    }

    pub fn generate_batch(&mut self, n: u32) -> Vec<i32> {
        let n = n as usize;
        let mut out = Vec::with_capacity(n * FIELDS_PER_UPDATE);
        for _ in 0..n {
            let idx = self
                .rng
                .next_u32_bounded(self.instrument_count) as usize;
            let mut row = self.instruments[idx].generate_update(&mut self.rng);
            row[0] = idx as i32;
            out.extend_from_slice(&row);
        }
        out
    }
}

#[wasm_bindgen]
pub struct MarketProducer {
    inner: MarketProducerCore,
}

#[wasm_bindgen]
impl MarketProducer {
    #[wasm_bindgen(constructor)]
    pub fn new(count: u32, seed: u64) -> MarketProducer {
        MarketProducer {
            inner: MarketProducerCore::new(count, seed),
        }
    }

    pub fn generate_batch(&mut self, n: u32) -> Vec<i32> {
        self.inner.generate_batch(n)
    }

    pub fn symbol(&self, i: u32) -> String {
        self.inner.symbol(i)
    }
}

pub fn check_batch_invariants(batch: &[i32], instrument_count: u32) -> bool {
    if batch.len() % FIELDS_PER_UPDATE != 0 {
        return false;
    }
    for chunk in batch.chunks_exact(FIELDS_PER_UPDATE) {
        let instrument_idx = chunk[0];
        let price_cents = chunk[1];
        let trade_qty = chunk[2];
        let bid_cents = chunk[3];
        let ask_cents = chunk[4];
        let bid_qty = chunk[5];
        let ask_qty = chunk[6];

        if instrument_idx < 0 || instrument_idx as u32 >= instrument_count {
            return false;
        }
        if price_cents <= 0 || bid_cents <= 0 || ask_cents <= 0 {
            return false;
        }
        if ask_cents - bid_cents < MIN_SPREAD_CENTS {
            return false;
        }
        if trade_qty <= 0 {
            return false;
        }
        if bid_qty < MIN_BOOK_QTY || ask_qty < MIN_BOOK_QTY {
            return false;
        }
        if (bid_qty - ask_qty).abs() >= bid_qty + ask_qty {
            return false;
        }
        if price_cents != bid_cents && price_cents != ask_cents {
            return false;
        }
    }
    true
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn batch_size_matches_n_for_various_counts() {
        for n in [1_u32, 100, 1000] {
            let mut producer = MarketProducerCore::new(10, 42);
            let batch = producer.generate_batch(n);
            assert_eq!(batch.len(), n as usize * FIELDS_PER_UPDATE);
        }
    }

    #[test]
    fn invariants_hold_over_large_batch() {
        let count = 50;
        let mut producer = MarketProducerCore::new(count, 0x1234_5678);
        let batch = producer.generate_batch(100_000);
        assert!(check_batch_invariants(&batch, count));
    }

    #[test]
    fn deterministic_for_same_seed() {
        let a = MarketProducerCore::new(5, 99).generate_batch(500);
        let b = MarketProducerCore::new(5, 99).generate_batch(500);
        assert_eq!(a, b);
    }

    #[test]
    fn symbol_names_for_fifty_instruments() {
        let producer = MarketProducerCore::new(50, 1);
        assert_eq!(producer.symbol(0), "ALFA");
        assert_eq!(producer.symbol(1), "BETA");
        assert_eq!(producer.symbol(26), "ALFA1");
        for i in 0..50 {
            let name = producer.symbol(i);
            assert!(!name.is_empty());
        }
        assert!(producer.symbol(50).is_empty());
    }

    #[test]
    fn price_walk_step_bounded_per_update() {
        let mut producer = MarketProducerCore::new(1, 777);
        let first = producer.generate_batch(1);
        let mut prev_mid = (first[3] + first[4]) / 2;
        for _ in 0..4999 {
            let batch = producer.generate_batch(1);
            let bid = batch[3];
            let ask = batch[4];
            let mid = (bid + ask) / 2;
            assert!((mid - prev_mid).abs() <= PRICE_WALK_MAX_DELTA);
            prev_mid = mid;
        }
    }

    #[test]
    fn book_stays_two_sided_over_large_batch() {
        let count = 8;
        let mut producer = MarketProducerCore::new(count, 42);
        let batch = producer.generate_batch(50_000);
        assert!(check_batch_invariants(&batch, count));
    }

    #[test]
    fn instrument_indices_in_range() {
        let count = 12;
        let mut producer = MarketProducerCore::new(count, 5);
        let batch = producer.generate_batch(5000);
        for chunk in batch.chunks_exact(FIELDS_PER_UPDATE) {
            let idx = chunk[0];
            assert!(idx >= 0 && idx < count as i32);
        }
    }
}
