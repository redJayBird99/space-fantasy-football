import names from "../asset/names.json";
import { toISODateString } from "./util";

// return true when more is more frequent in sample than less
function isMoreFrequent<T>(more: T, less: T, sample: T[]): boolean {
  const check = (to: T) => (v: T) => v === to;
  return sample.filter(check(more)).length > sample.filter(check(less)).length;
}

// returns a random number between 0 and 1 (non inclusive) seemingly taken from
// a normal distribution with standard deviation loosely around 0.144
function randomGauss(): number {
  const samples = Array.from({ length: 4 }, () => Math.random());
  return samples.reduce((a, s) => a + s) / samples.length;
}

// return a random number between mean - maxOffeset and mean + maxOffeset
// (non inclusive) seemingly taken from a normal distribution
// the standard deviation is loosely around 14.4 when max maxOffeset is 50
function customGaussian(mean: number, maxOffeset: number): number {
  return mean + (randomGauss() - 0.5) * 2 * maxOffeset;
}

// returns an randomly generated id (with a very low collision probability)
function createId(): string {
  return Math.random().toString(36).slice(2);
}

// returns a randomly generated string with both name and surname
// FIXME: should depend on nationality
function createName(): string {
  const { names: nNams, surnames: sSurnames } = names.eng;
  const name = nNams[Math.floor(Math.random() * nNams.length)];
  const surname = sSurnames[Math.floor(Math.random() * sSurnames.length)];
  return `${name} ${surname}`;
}

// returns a random birthday date for the given age
function createBirthdayDate(age: number, now: Date): Date {
  if (age < 0) {
    throw new Error("age argument can't be negative");
  }

  const days = 365;
  const day = Math.floor(Math.random() * days);
  return new Date(now.getFullYear() - age, now.getMonth(), now.getDate() - day);
}

// returns a random birthday iso date string (can construct a new Date) for the given age
function createBirthday(age: number, now: Date): string {
  return toISODateString(createBirthdayDate(age, now));
}

// returns the age at now for the given birthday
// code reference: https://stackoverflow.com/questions/4060004/calculate-age-given-the-birth-date-in-the-format-yyyymmdd
function getAgeAt(birthday: string, now: Date) {
  const birthDate = new Date(birthday);
  const mth = now.getMonth() - birthDate.getMonth();
  let age = now.getFullYear() - birthDate.getFullYear();

  if (mth < 0 || (mth === 0 && now.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
}

function swap<T>(arr: T[], i: number, j: number): void {
  const t = arr[i];
  arr[i] = arr[j];
  arr[j] = t;
}

// Fisher-Yates (aka Knuth) Shuffle.
// shuffle the array in place
function shuffle<T>(arr: T[]): T[] {
  for (let i = 0; i < arr.length; i++) {
    swap(arr, i, Math.floor(Math.random() * (i + 1)));
  }

  return arr;
}

// https://en.wikipedia.org/wiki/Universal_hashing#Hashing_strings
function hash(s: string, mod: number): number {
  let h = 0;

  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.codePointAt(i)!) % mod;
  }

  return h;
}

export {
  hash,
  shuffle,
  swap,
  getAgeAt,
  createBirthday,
  createBirthdayDate,
  createId,
  createName,
  randomGauss,
  isMoreFrequent,
  customGaussian,
};
