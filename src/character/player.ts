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

export type PositionArea = "goolkeeper" | "defender" | "midfielder" | "forward";
export const positionArea: Readonly<Record<PositionArea, readonly Position[]>> =
  {
    goolkeeper: ["gk"],
    defender: ["cb", "cb", "lb", "rb"],
    midfielder: ["cm", "cm", "lm", "rm", "dm", "am"],
    forward: ["cf", "cf", "lw", "rw"],
  };

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

type Skill = keyof Skills;
export type Macroskill =
  | "mobility"
  | "physic"
  | "goolkeeper"
  | "defense"
  | "ability"
  | "offense";

// macroskills are combination of skills
export const macroskills: Readonly<Record<Macroskill, readonly Skill[]>> = {
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
type PosMalus = Readonly<Record<Position, Record<string, readonly Position[]>>>;
const outOfPositionMalus: PosMalus = {
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
  if (outOfPositionMalus[p.position].smallMalus.includes(at)) {
    return 0.05;
  }
  if (outOfPositionMalus[p.position].midMalus.includes(at)) {
    return 0.1;
  }

  return 0.2;
}

// the only skills where the out of position malus is applicable
// TODO: readonly
export const skillsApplicableMalus = new Set<Skill>([
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
  static getSkill(p: Player, s: Skill, at = p.position): number {
    return skillsApplicableMalus.has(s)
      ? Math.floor(p.skills[s] - p.skills[s] * getOutOfPositionMalus(p, at)) // with floor we always apply a malus
      : p.skills[s];
  }

  // get the macroskill player value taking in cosideration out of position malus
  // the value is between MIN_SKILL and MAX_SKILL
  // check macroskills for all possible macroskills
  static getMacroskill(p: Player, m: Macroskill, at = p.position): number {
    return Math.round(
      macroskills[m].reduce((sum, sk) => Player.getSkill(p, sk, at) + sum, 0) /
        macroskills[m].length
    );
  }

  // get a player at the given PositionArea randomly, some position is more
  // frequent than other cm for midfielder, cf for forward and cb for defender
  static createPlayerAt(now: Date, at: PositionArea): Player {
    const picks = JSON.parse(JSON.stringify(positionArea)); // in case of performance extract this object
    // raise up the probability to pick the position
    picks.defender.push("cb");
    picks.midfielder.push("cm");
    picks.forward.push("cf");

    const pick = Math.floor(Math.random() * picks[at].length);
    return new Player(picks[at][pick], now);
  }

  /**
    a player score is like an overall but this game doesn't use it explicitly
    an overall is a tricky concept but a way to compare two player is necessary
    which skills are more important for a position is subjective, the most
    important thing is to have a good balance between postions score so every
    position have equal opportunities to be picked by a team when compared
    TODO: some statistical analysis

    @param at take in cosideration out of position malus
    @Returns a value between MIN_SKILL and MAX_SKILL
  */
  static getScore(p: Player, at = p.position): number {
    let score = 0;

    for (const macro in positionScoreFactors[at]) {
      const mk = macro as Macroskill;
      score += Player.getMacroskill(p, mk, at) * positionScoreFactors[at][mk];
    }

    return Math.floor(score); // floor better to underestimate
  }
}

// the sum of scoreFactors should always be 1 (expect for rounding error)
type ScoreFactors = Readonly<Record<Macroskill, number>>;
const fbScoreFactors: ScoreFactors = {
  // higher is the value more important the macroskill is for the player position score
  goolkeeper: 0,
  mobility: 0.15,
  physic: 0.1,
  defense: 0.45,
  offense: 0.05,
  ability: 0.25,
};

const emScoreFactors: ScoreFactors = {
  goolkeeper: 0,
  mobility: 0.15,
  physic: 0.1,
  defense: 0.175,
  ability: 0.4,
  offense: 0.175,
};

const wgScoreFactors: ScoreFactors = {
  goolkeeper: 0,
  mobility: 0.15,
  physic: 0.1,
  ability: 0.35,
  offense: 0.35,
  defense: 0.05,
};

export const positionScoreFactors: Readonly<Record<Position, ScoreFactors>> = {
  gk: {
    goolkeeper: 0.65,
    mobility: 0,
    physic: 0.35,
    ability: 0,
    offense: 0,
    defense: 0,
  },
  cb: {
    goolkeeper: 0,
    mobility: 0.1,
    physic: 0.15,
    defense: 0.45,
    offense: 0.05,
    ability: 0.25,
  },
  lb: fbScoreFactors,
  rb: fbScoreFactors,
  dm: {
    goolkeeper: 0,
    mobility: 0.1,
    physic: 0.1,
    defense: 0.3,
    offense: 0.1,
    ability: 0.4,
  },
  cm: {
    goolkeeper: 0,
    mobility: 0.1,
    physic: 0.1,
    defense: 0.2,
    ability: 0.4,
    offense: 0.2,
  },
  am: {
    goolkeeper: 0,
    mobility: 0.125,
    physic: 0.125,
    ability: 0.4,
    offense: 0.25,
    defense: 0.1,
  },
  lm: emScoreFactors,
  rm: emScoreFactors,
  lw: wgScoreFactors,
  rw: wgScoreFactors,
  cf: {
    goolkeeper: 0,
    mobility: 0.125,
    physic: 0.125,
    ability: 0.25,
    offense: 0.45,
    defense: 0.05,
  },
};
