import { getAgeAt } from "./generator";

function mean(sample: number[]): number {
  return sample.reduce((a, v) => a + v, 0) / sample.length;
}

// https://en.wikipedia.org/wiki/Variance
function variance(sample: number[], m = mean(sample)): number {
  return sample.reduce((a, v) => a + (v - m) ** 2, 0) / (sample.length - 1);
}

// returns the given number with a random random sign
function randomSign(n: number): number {
  return Math.random() > 0.5 ? -n : n;
}

// modulo operator https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Remainder
function mod(v: number, n: number): number {
  return ((v % n) + n) % n;
}

/**
 *
 * @param min the min returnable value
 * @param max the max returnable value
 * @returns v when within min and max
 */
function within(v: number, min: number, max: number): number {
  if (min > max) {
    throw new Error("the min can be greater than max");
  }

  return Math.max(min, Math.min(max, v));
}

/**
 * @returns the distance between a and b
 */
function dist(a: number, b: number): number {
  return Math.abs(a - b);
}

/** get how many days of distance between the two days */
function daysBetween(a: Date, b: Date): number {
  const day = 24 * 60 * 60 * 1000;
  return Math.round(Math.abs((a.getTime() - b.getTime()) / day));
}

export function dayFromLastBirthday(birthDate: string, now: Date): number {
  const age = getAgeAt(birthDate, now);
  const birth = new Date(birthDate);
  birth.setFullYear(birth.getFullYear() + age);
  return Math.round((now.getTime() - birth.getTime()) / 1000 / 60 / 60 / 24);
}

export { mean, variance, randomSign, mod, within, dist, daysBetween };
