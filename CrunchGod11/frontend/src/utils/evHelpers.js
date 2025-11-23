
// EV Helper functions extracted for clarity
export function americanToDecimal(odds) {
  if (odds > 0) return 1 + odds / 100;
  return 1 - 100 / odds;
}

export function impliedProbability(odds) {
  if (odds > 0) return 100 / (odds + 100);
  return -odds / (-odds + 100);
}

export function decimalToAmerican(dec) {
  if (!isFinite(dec) || dec <= 1) return 0;
  if (dec >= 2) return Math.round((dec - 1) * 100);
  return Math.round(-100 / (dec - 1));
}
