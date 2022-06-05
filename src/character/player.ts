import {
  createId,
  createName,
  randomGauss,
  createBirthday,
  randomSign,
  getAgeAt,
} from "../util/generator";
import { mod } from "../util/math";
import { createSkills } from "./create-skills";
import { Team } from "./team";

const MAX_AGE = 45;
const MIN_AGE = 16;
const MAX_SKILL = 99; // included
const MIN_SKILL = 0;
const END_GROWTH_AGE = 27;
const MAX_GROWTH_RATE = 0.0025; // monthly
const START_DEGROWTH_AGE = 32;
const SALARY_CAP = 320_000;
const MIN_SALARY_CAP = 200_000;
const MIN_WAGE = Math.round(SALARY_CAP / 100);
const MAX_WAGE = Math.round(SALARY_CAP / 5);

type Foot = "ambidextrous" | "left" | "right";
type FootChance = { left: number; right: number };

type Improvability =
  | "A" // the growth rate is very high
  | "B" // the growth rate is high
  | "C" // the growth rate is medium
  | "D" // the growth rate is low
  | "E"; // the growth rate is very low or none

type Position =
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

type PositionArea = "goolkeeper" | "defender" | "midfielder" | "forward";
const positionArea: Readonly<Record<PositionArea, readonly Position[]>> = {
  goolkeeper: ["gk"],
  defender: ["cb", "cb", "lb", "rb"],
  midfielder: ["cm", "cm", "lm", "rm", "dm", "am"],
  forward: ["cf", "cf", "lw", "rw"],
};

function getArea(p: Position): PositionArea {
  if (positionArea.goolkeeper.includes(p)) {
    return "goolkeeper";
  }
  if (positionArea.defender.includes(p)) {
    return "defender";
  }
  if (positionArea.midfielder.includes(p)) {
    return "midfielder";
  }

  return "forward";
}

// returns a random number between MIN_AGE and MAX_AGE with end points less frequent
function createAge(): number {
  const p = randomGauss();

  if (p < 0.34) {
    const to19 = 19 - MIN_AGE + 1;
    return MIN_AGE - 1 + Math.ceil(to19 * Math.sqrt(Math.random()));
  } else if (p > 0.62) {
    return 30 + Math.floor(((p - 0.62) / 0.38) * (MAX_AGE - 30));
  }

  return 20 + Math.floor(10 * Math.random());
}

// return a value between 0 and 1 depending on the age of the player
// for players younger than 27 usually the value is less than 1, fro players
// older than 32 the valueis less than 1
function createGrowthState(p: Player, now: Date): number {
  const age = Player.age(p, now);

  if (age < END_GROWTH_AGE) {
    const annualGrowthRate = 12 * p.growthRate;
    // one year less than END_GROWTH_AGE as buffer
    return 1 - Math.max(0, annualGrowthRate * (END_GROWTH_AGE - 1 - age));
  }

  const annualDegrowthRate = (MAX_GROWTH_RATE / 2) * 12;
  return 1 - annualDegrowthRate * Math.max(0, age - START_DEGROWTH_AGE);
}

// convert the growth rate to improvability rating
function getImprovability(growthRate: number): Improvability {
  const ratings: Improvability[] = ["E", "D", "C", "B", "A"];
  const step = MAX_GROWTH_RATE / ratings.length;
  return ratings[Math.floor(growthRate / step)];
}

// deceiving the improvability rating (for user)
// TODO: use it
// TODO: depending on the scountig
function addGrowthRateNoise(gRate: number): number {
  const noise = randomSign((MAX_GROWTH_RATE / 3) * Math.random());
  return mod(gRate + noise, MAX_GROWTH_RATE);
}

// returns the probability for the preferred foot between left and right
function preferredFootChance(pos: Position): FootChance {
  if (pos === "lb" || pos === "lm" || pos === "lw") {
    return { left: 0.5, right: 0.25 };
  } else if (pos === "rb" || pos === "rm" || pos === "rw") {
    return { left: 0.05, right: 0.7 };
  }

  return { left: 0.25, right: 0.5 };
}

// returns the preferred foot with depending on position and randomness
function createPreferredFoot(pos: Position): Foot {
  const chance = preferredFootChance(pos);
  const rdmPoint = Math.random();

  if (chance.left >= rdmPoint) {
    return "left";
  } else if (chance.left + chance.right >= rdmPoint) {
    return "right";
  }

  return "ambidextrous";
}

interface Skills {
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
type Macroskill =
  | "mobility"
  | "physic"
  | "goolkeeper"
  | "defense"
  | "ability"
  | "offense";

// macroskills are combination of skills
const macroskills: Readonly<Record<Macroskill, readonly Skill[]>> = {
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
function getOutOfPositionMalus(p: Player, at = p.position): number {
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
const skillsApplicableMalus = new Set<Skill>([
  "defensivePositioning",
  "interception",
  "marking",
  "offensivePositioning",
  "finisnishing",
  "vision",
]);

// TODO: readonly
const noGrowthSkill = new Set<Skill>(["height"]);

// Player creates semi-random player that best fit the position characteristics
// note instances of this class are saved as JSON on the user machine
class Player {
  id: string;
  name: string;
  team: string;
  position: Position;
  birthday: string;
  foot: Foot;
  growthRate: number; // monthly growth rate of growthState
  growthState: number; // (percentage 0-1) applying it: skillValue * growthState
  improvability: Improvability; // the user see this value instead of the growthRate
  skills: Skills; // to get the skill values with all modifiers (growth, malus and etc) applied use getSkill

  constructor(pos: Position, now: Date, age?: number) {
    this.name = createName();
    this.team = "free agent";
    this.position = pos;
    this.birthday = createBirthday(age ?? createAge(), now);
    this.id = createId() + this.birthday.split(" ").join(""); // you never know...
    this.foot = createPreferredFoot(pos);
    this.skills = createSkills(pos);
    this.growthRate =
      ((randomGauss() + 2 * Math.random()) / 3) * MAX_GROWTH_RATE; // loosen up a bit the randomGauss;
    this.growthState = createGrowthState(this, now);
    this.improvability = getImprovability(this.growthRate);
  }

  static age(p: Player, now: Date): number {
    return getAgeAt(p.birthday, now);
  }

  // get the skill player value taking in cosideration all modifiers like
  // out of position malus and growthState
  static getSkill(p: Player, s: Skill, at = p.position): number {
    const v = noGrowthSkill.has(s) ? p.skills[s] : p.skills[s] * p.growthState;
    return Math.round(
      skillsApplicableMalus.has(s) ? v - v * getOutOfPositionMalus(p, at) : v
    );
  }

  // get the macroskill player value taking in cosideration all modifiers
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
  static createPlayerAt(now: Date, at: PositionArea, age?: number): Player {
    const picks = JSON.parse(JSON.stringify(positionArea)); // in case of performance extract this object
    // raise up the probability to pick the position
    picks.defender.push("cb");
    picks.midfielder.push("cm");
    picks.forward.push("cf");

    const pick = Math.floor(Math.random() * picks[at].length);
    return new Player(picks[at][pick], now, age ?? undefined);
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

    return score;
  }

  // update the growthState if the player can still grow, it is meant to be used
  // every end of the month
  static applyMonthlyGrowth(p: Player, now: Date): void {
    const age = Player.age(p, now);
    const growth = age < END_GROWTH_AGE ? p.growthRate : 0;
    p.growthState = Math.min(1, p.growthState + growth);
  }

  // update the growthState shrinking its value (min 0.5) when the player is old Enough,
  // it is meant to be used every end of the month
  static applyMonthlyDegrowth(p: Player, now: Date): void {
    if (Player.age(p, now) >= START_DEGROWTH_AGE) {
      const degrowth = randomGauss() * MAX_GROWTH_RATE;
      p.growthState = Math.max(0.5, p.growthState - degrowth);
    }
  }

  // returns a value between 150 and 205
  static getHeightInCm(p: Player): number {
    return Math.round(150 + 55 * (p.skills.height / MAX_SKILL));
  }

  // use wageRequest when a team is trying to sign a player (except for the draft and init)
  // return a wage between 2000 and 64000 per month wanted by the player it is
  // depended on the score of the player, defenders and goolkeepers usually ask for less
  static wantedWage(p: Player): number {
    const posFactor =
      positionArea.goolkeeper.includes(p.position) ||
      positionArea.defender.includes(p.position)
        ? 0.8
        : 1;
    const wage = 2 ** ((Player.getScore(p) - 55) / 5) * MIN_WAGE * posFactor;

    return Math.round(Math.max(MIN_WAGE, Math.min(MAX_WAGE, wage)));
  }

  // returns true when the player is willing to sign for the team, depending on
  // the team appeal and the player score
  static approachable(p: Player, t: Team): boolean {
    return (
      t.appeal > 1.5 ||
      Math.max(0.2, (76 - Player.getScore(p)) / 10) >= Math.random()
    );
  }

  // returns the wage requested by the player to the team, could ask to be overPaid
  // the team has a low appeal the max overpay is of 20% extra
  static wageRequest(p: Player, t: Team): number {
    const appeal = Math.max(0, (2.5 - t.appeal) / 12.5);
    const wg = Player.wantedWage(p);
    return Math.round(
      Player.getScore(p) > 66 ? Math.min((appeal + 1) * wg, MAX_WAGE) : wg
    );
  }

  // returns true when the player wants to retire, a MAX_AGE player return always true
  // probability is higher for older players
  static retire(p: Player, now: Date): boolean {
    const a = Player.age(p, now);
    return a > 29 && (a >= MAX_AGE || (a - 30) / 25 + 0.2 >= Math.random());
  }
}

/**
 * returns the best (according to player score) n players
 * @param n amount of player to pick, when n > players.length throw an error
 */
function pickBest(players: Player[], n: number): Player[] {
  if (players.length < n) {
    throw new Error(`players have less than ${n} players`);
  }

  return players
    .sort((p1, p2) => Player.getScore(p2) - Player.getScore(p1))
    .slice(0, n);
}

// the sum of scoreFactors should always be 1 (expect for rounding error)
type ScoreFactors = Readonly<Record<Macroskill, number>>;
const fbScoreFactors: ScoreFactors = {
  // higher is the value more important the macroskill is for the player position score
  goolkeeper: 0,
  mobility: 0.25,
  physic: 0.05,
  defense: 0.5,
  offense: 0,
  ability: 0.2,
};

const emScoreFactors: ScoreFactors = {
  goolkeeper: 0,
  mobility: 0.25,
  physic: 0.05,
  defense: 0.09,
  ability: 0.52,
  offense: 0.09,
};

const wgScoreFactors: ScoreFactors = {
  goolkeeper: 0,
  mobility: 0.19,
  physic: 0.11,
  ability: 0.35,
  offense: 0.35,
  defense: 0,
};

const positionScoreFactors: Readonly<Record<Position, ScoreFactors>> = {
  gk: {
    goolkeeper: 0.49,
    mobility: 0.12,
    physic: 0.28,
    ability: 0.11,
    offense: 0,
    defense: 0,
  },
  cb: {
    goolkeeper: 0,
    mobility: 0.1,
    physic: 0.2,
    defense: 0.5,
    offense: 0,
    ability: 0.2,
  },
  lb: fbScoreFactors,
  rb: fbScoreFactors,
  dm: {
    goolkeeper: 0,
    mobility: 0.15,
    physic: 0.1,
    defense: 0.35,
    offense: 0,
    ability: 0.4,
  },
  cm: {
    goolkeeper: 0,
    mobility: 0.13,
    physic: 0.1,
    defense: 0.11,
    ability: 0.55,
    offense: 0.11,
  },
  am: {
    goolkeeper: 0,
    mobility: 0.13,
    physic: 0.1,
    ability: 0.47,
    offense: 0.25,
    defense: 0.05,
  },
  lm: emScoreFactors,
  rm: emScoreFactors,
  lw: wgScoreFactors,
  rw: wgScoreFactors,
  cf: {
    goolkeeper: 0,
    mobility: 0.125,
    physic: 0.125,
    ability: 0.2,
    offense: 0.55,
    defense: 0,
  },
};

export {
  MAX_AGE,
  MIN_AGE,
  MAX_SKILL,
  MIN_SKILL,
  END_GROWTH_AGE,
  MAX_GROWTH_RATE,
  START_DEGROWTH_AGE,
  SALARY_CAP,
  MIN_SALARY_CAP,
  MIN_WAGE,
  MAX_WAGE,
  Foot,
  Improvability,
  Position,
  PositionArea,
  Skills,
  Skill,
  Macroskill,
  Player,
  positionArea,
  getArea,
  createAge,
  createGrowthState,
  getImprovability,
  preferredFootChance,
  createPreferredFoot,
  macroskills,
  getOutOfPositionMalus,
  positionScoreFactors,
  noGrowthSkill,
  pickBest,
  skillsApplicableMalus,
};
