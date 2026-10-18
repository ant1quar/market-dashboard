const BASE_SYMBOLS: readonly string[] = [
  'ALFA',
  'BETA',
  'GAMMA',
  'DELTA',
  'EPSLN',
  'ZETA',
  'THETA',
  'IOTA',
  'KAPPA',
  'LAMBD',
  'MU',
  'NU',
  'XI',
  'OMIC',
  'PI',
  'RHO',
  'SIGMA',
  'TAU',
  'UPSIL',
  'PHI',
  'CHI',
  'PSI',
  'OMEGA',
  'SIGMA2',
  'TAU2',
  'PHI2',
];

const MAX_INSTRUMENTS = 50;

export function instrumentSymbolAt(index: number): string {
  if (index < 0 || index >= MAX_INSTRUMENTS) {
    return '';
  }
  if (index < BASE_SYMBOLS.length) {
    return BASE_SYMBOLS[index] ?? '';
  }
  const base = BASE_SYMBOLS[index % BASE_SYMBOLS.length] ?? '';
  const suffix = Math.floor(index / BASE_SYMBOLS.length);
  return `${base}${suffix}`;
}
