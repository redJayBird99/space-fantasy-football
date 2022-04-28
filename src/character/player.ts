import {
  createId,
  createName,
  randomGauss,
  createBirthday,
} from "../util/generator";

export const MAX_AGE = 45;
export const MIN_AGE = 16;

export type Talent =
  | "A" // the improvability rate is very high
  | "B" // the improvability rate is high
  | "C" // the improvability rate is medium
  | "D" // the improvability rate is low
  | "E"; // don't improve
export type Foot = "ambidextrous" | "left" | "right";
type FootChance = { left: number; right: number };
export type Position =
  | "gk"
  | "cb"
  | "lb"
  | "rb"
  | "cm"
  | "dm"
  | "lm"
  | "rm"
  | "am"
  | "rw"
  | "lw"
  | "cf";

// returns a random number between MIN_AGE and MAX_AGE with end points less frequent
export function createAge(): number {
  // TOFIX: older an younger player shoul be less frequent
  return Math.floor(Math.random() * (MAX_AGE - MIN_AGE + 1)) + MIN_AGE;
}

// returns a talent randomly with end points talents less frequent
export function createTalent(): Talent {
  const talents: Talent[] = ["A", "B", "C", "D", "E"];
  const point = (randomGauss() + 2 * Math.random()) / 3; // loosen up a bit
  return talents[Math.floor(point * talents.length)];
}

// returns the probability for the preferred foot between left and right
export function preferredFootChance(pos: Position): FootChance {
  if (pos === "lb" || pos === "lm" || pos === "lw") {
    return { left: 0.5, right: 0.25 };
  } else if (pos === "rb" || pos === "rm" || pos === "rw") {
    return { left: 0.05, right: 0.7 };
  }

  return { left: 0.25, right: 0.5 };
}

// returns the preferred foot with depending on position and randomness
export function createPreferredFoot(pos: Position): Foot {
  const chance = preferredFootChance(pos);
  const rdmPoint = Math.random();

  if (chance.left >= rdmPoint) {
    return "left";
  } else if (chance.left + chance.right >= rdmPoint) {
    return "right";
  }

  return "ambidextrous";
}

export class Player {
  id: string;
  name: string;
  team: string;
  position: Position;
  age: number;
  birthday: string;
  foot: Foot;
  talent: Talent;

  constructor(pos: Position, now: Date) {
    this.age = createAge();
    this.id = createId();
    this.name = createName();
    this.team = "free agent";
    this.position = pos;
    this.birthday = createBirthday(this.age, now);
    this.talent = createTalent();
    this.foot = createPreferredFoot(pos);
  }
}
