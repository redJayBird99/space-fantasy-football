import {
  createId,
  createName,
  randomGauss,
  createBirthday,
} from "../util/generator";
import { createSkills } from "./create-skills";

export const MAX_AGE = 45;
export const MIN_AGE = 16;
export const MAX_SKILL = 99; // included
export const MIN_SKILL = 0;

export type Foot = "ambidextrous" | "left" | "right";
type FootChance = { left: number; right: number };

export type Potential =
  | "A" // the improvability rate is very high
  | "B" // the improvability rate is high
  | "C" // the improvability rate is medium
  | "D" // the improvability rate is low
  | "E"; // don't improve

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

// returns a potential randomly with end points potentials less frequent
export function createPotential(): Potential {
  const potentials: Potential[] = ["A", "B", "C", "D", "E"];
  const point = (randomGauss() + 2 * Math.random()) / 3; // loosen up a bit
  return potentials[Math.floor(point * potentials.length)];
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

export interface Skills {
  strength: number;
  height: number;
  reflexes: number;
  handling: number;
  diving: number;
  speed: number;
  agility: number;
  stamina: number;
  defensivePositioning: number;
  interception: number;
  marking: number;
  passing: number;
  vision: number;
  technique: number;
  offensivePositioning: number;
  shot: number;
  finisnishing: number;
}

// a macroskills is a combination of skills
export const macroskills: { [macroskill: string]: (keyof Skills)[] } = {
  mobility: ["speed", "agility", "stamina"],
  physic: ["strength", "height"],
  goolkeeper: ["reflexes", "handling", "diving"],
  defense: ["defensivePositioning", "interception", "marking"],
  ability: ["passing", "vision", "technique"],
  offense: ["offensivePositioning", "shot", "finisnishing"],
};

// Player creates semi-random player that best fit the position characteristics
// note instances of this class are saved as JSON
export class Player {
  id: string;
  name: string;
  team: string;
  position: Position;
  age: number;
  birthday: string;
  foot: Foot;
  potential: Potential;
  skills: Skills;

  constructor(pos: Position, now: Date) {
    this.age = createAge();
    this.id = createId();
    this.name = createName();
    this.team = "free agent";
    this.position = pos;
    this.birthday = createBirthday(this.age, now);
    this.potential = createPotential();
    this.foot = createPreferredFoot(pos);
    this.skills = createSkills(pos);
  }
}
