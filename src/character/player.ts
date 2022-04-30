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

// list for every position the amount of malus applied to the player when
// playing out of its natural postion
// TODO: should it be part of the game save state so can be customisable as a JSON??
const outOfPositionMalus: { [k: string]: { [k: string]: Position[] } } = {
  gk: {
    smallMalus: [],
    midMalus: [],
    // bigMalus is the default for all other position left out (expect this position itself)
  },
  lb: {
    smallMalus: ["rb"],
    midMalus: ["cb", "lm"],
    // bigMalus is the default
  },
  rb: {
    smallMalus: ["lb"],
    midMalus: ["cb", "rm"],
  },
  cb: {
    smallMalus: [],
    midMalus: ["lb", "rb"],
  },
  dm: {
    smallMalus: ["cm"],
    midMalus: ["cb", "lb", "rb", "rm", "lm"],
  },
  lm: {
    smallMalus: ["rm"],
    midMalus: ["lb", "lw", "rw", "cm", "am"],
  },
  rm: {
    smallMalus: ["lm"],
    midMalus: ["rb", "lw", "rw", "cm", "am"],
  },
  cm: {
    smallMalus: ["dm", "am"],
    midMalus: ["lm", "rm"],
  },
  am: {
    smallMalus: ["cm"],
    midMalus: ["lm", "rm", "lw", "rw", "cf"],
  },
  lw: {
    smallMalus: ["lm", "am"],
    midMalus: ["rm", "cf"],
  },
  rw: {
    smallMalus: ["rm", "am"],
    midMalus: ["lm", "cf"],
  },
  cf: {
    smallMalus: [],
    midMalus: ["lw", "rw"],
  },
};

// get a malus factor between 0 and 1 to applied to the player skills when is
// playing out of position, the amount of malus is depending at which position
// it is playing
export function getOutOfPositionMalus(p: Player, at = p.position): number {
  if (p.position === at) {
    return 0;
  }
  if (outOfPositionMalus[p.position]?.smallMalus.includes(at)) {
    return 0.05;
  }
  if (outOfPositionMalus[p.position]?.midMalus.includes(at)) {
    return 0.1;
  }

  return 0.2;
}

// the only skills where the out of position malus is applicable
export const skillsApplicableMalus = new Set<keyof Skills>([
  "defensivePositioning",
  "interception",
  "marking",
  "offensivePositioning",
  "finisnishing",
  "vision",
]);

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

  // get the skill player value taking in cosideration out of position malus
  static getSkill(p: Player, s: keyof Skills, at = p.position): number {
    return skillsApplicableMalus.has(s)
      ? Math.floor(p.skills[s] - p.skills[s] * getOutOfPositionMalus(p, at)) // with floor we always apply a malus
      : p.skills[s];
  }

  // get the macroskill player value taking in cosideration out of position malus
  // the value is between MIN_SKILL and MAX_SKILL
  static getMacroskill(p: Player, macroskill: string, at = p.position): number {
    if (macroskills[macroskill]) {
      return Math.round(
        macroskills[macroskill].reduce(
          (sum, sk) => Player.getSkill(p, sk, at) + sum,
          0
        ) / macroskills[macroskill].length
      );
    }

    throw new Error(`macroSkill: ${macroskill} doesn't exist`);
  }
}
