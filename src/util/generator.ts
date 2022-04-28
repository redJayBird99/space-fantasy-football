import names from "../asset/names.json";

// return true when more is more frequent in smaple than less
export function isMoreFrequent<T>(more: T, less: T, sample: T[]): boolean {
  const check = (to: T) => (v: T) => v === to;
  return sample.filter(check(more)).length > sample.filter(check(less)).length;
}

// returns a random number between 0 and 1 (non inclusive) seemingly taken from
// a normal distribution with standard deviation around loosely 0.144
export function randomGauss(): number {
  const samples = Array.from({ length: 4 }, () => Math.random());
  return samples.reduce((a, s) => a + s) / samples.length;
}

// returns an randomly generated id (with a very low collision probability)
export function createId(): string {
  return Math.random().toString(36).slice(2);
}

// returns a randomly generated string with both name and surname
// FIXME: should depend on nationality
export function createName(): string {
  const { names: nNams, surnames: sSurnames } = names.eng;
  const name = nNams[Math.floor(Math.random() * nNams.length)];
  const surname = sSurnames[Math.floor(Math.random() * sSurnames.length)];
  return `${name} ${surname}`;
}

// returns a random date for birthday for the given age
export function createBirthdayDate(age: number, now: Date): Date {
  if (age < 0) {
    throw new Error("age argument can't be negatite");
  }

  const days = 365;
  const day = Math.floor(Math.random() * days);
  return new Date(now.getFullYear() - age, now.getMonth(), now.getDate() - day);
}

// returns a random dateString (can construct a new Date) for birthday for the given age
export function createBirthday(age: number, now: Date): string {
  const d = createBirthdayDate(age, now);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

// returns the age at now for the given birthday
// code reference: https://stackoverflow.com/questions/4060004/calculate-age-given-the-birth-date-in-the-format-yyyymmdd
export function getAgeAt(birthdayDateString: string, now: Date) {
  const birthDate = new Date(birthdayDateString);
  const mth = now.getMonth() - birthDate.getMonth();
  let age = now.getFullYear() - birthDate.getFullYear();

  if (mth < 0 || (mth === 0 && now.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
}
