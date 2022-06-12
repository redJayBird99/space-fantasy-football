// modulo operator https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Remainder
export function mod(v: number, n: number): number {
  return ((v % n) + n) % n;
}

// returns min when v is less than min
// returns max when v is greater than max
// returns v otherwise
export function within(v: number, min: number, max: number): number {
  if (min > max) {
    throw new Error("the min can be greater than max");
  }

  return Math.max(min, Math.min(max, v));
}
