// modulo operator https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Remainder
export function mod(v: number, n: number): number {
  return ((v % n) + n) % n;
}
