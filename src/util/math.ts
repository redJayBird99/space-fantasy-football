// modulo operator https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Remainder
export function mod(v: number, n: number): number {
  return ((v % n) + n) % n;
}

/**
 *
 * @param min the min returnable value
 * @param max the max returnable value
 * @returns v when within min and max
 */
export function within(v: number, min: number, max: number): number {
  if (min > max) {
    throw new Error("the min can be greater than max");
  }

  return Math.max(min, Math.min(max, v));
}

/**
 * @returns the distance between a and b
 */
export function dist(a: number, b: number): number {
  return Math.abs(a - b);
}
