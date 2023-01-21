import {
  createId,
  createName,
  randomGauss,
  createBirthday,
  getAgeAt,
  hash,
} from "../../util/generator";
import { within } from "../../util/math";
import { createSkills } from "./create-skills";
import { Team, GsTmPl } from "./team";
import { GameState } from "../game-state/game-state";

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
export const POSITIONS = [
  "gk",
  "cb",
  "lb",
  "rb",
  "cm",
  "dm",
  "lm",
  "rm",
  "am",
  "rw",
  "lw",
  "cf",
] as const;
type Position = typeof POSITIONS[number];

type PositionArea = "goalkeeper" | "defender" | "midfielder" | "forward";
const POSITION_AREA: Readonly<Record<PositionArea, readonly Position[]>> = {
  goalkeeper: ["gk"],
  defender: ["cb", "cb", "lb", "rb"],
  midfielder: ["cm", "cm", "lm", "rm", "dm", "am"],
  forward: ["cf", "cf", "lw", "rw"],
};

function getArea(p: Position): PositionArea {
  if (POSITION_AREA.goalkeeper.includes(p)) {
    return "goalkeeper";
  }
  if (POSITION_AREA.defender.includes(p)) {
    return "defender";
  }
  if (POSITION_AREA.midfielder.includes(p)) {
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
// older than 32 the values less than 1
function createGrowthState(p: Player, now: Date): number {
  const age = getAge(p, now);

  if (age < END_GROWTH_AGE) {
    const annualGrowthRate = 12 * p.growthRate;
    // one year less than END_GROWTH_AGE as buffer
    return 1 - Math.max(0, annualGrowthRate * (END_GROWTH_AGE - 1 - age));
  }

  const annualDegrowthRate = (MAX_GROWTH_RATE / 2) * 12;
  return 1 - annualDegrowthRate * Math.max(0, age - START_DEGROWTH_AGE);
}

// returns the probability for the preferred foot between left and right
function preferredFootChance(pos: Position): { left: number; right: number } {
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

export const SKILLS = [
  "strength",
  "height",
  "reflexes",
  "handling",
  "diving",
  "speed",
  "agility",
  "stamina",
  "defensivePositioning",
  "interception",
  "marking",
  "passing",
  "vision",
  "technique",
  "offensivePositioning",
  "shot",
  "finishing",
] as const;
type Skill = typeof SKILLS[number];
type Skills = Record<Skill, number>;
type SkillList = readonly Skill[];

/** macroSkills are combination of skills */
const MACRO_SKILLS = {
  mobility: ["speed", "agility", "stamina"] as SkillList,
  physic: ["strength", "height"] as SkillList,
  goalkeeper: ["reflexes", "handling", "diving"] as SkillList,
  defense: ["defensivePositioning", "interception", "marking"] as SkillList,
  ability: ["passing", "vision", "technique"] as SkillList,
  offense: ["offensivePositioning", "shot", "finishing"] as SkillList,
} as const;
type MacroSkill = keyof typeof MACRO_SKILLS;
export const macroSkills = Object.keys(MACRO_SKILLS) as MacroSkill[];

type Penalty = "smallPenalty" | "midPenalty"; // bigPenalty default
type PosPenalty = Readonly<
  Record<Position, Record<Penalty, readonly Position[]>>
>;
/** list for every position the amount of penalty applied to the player when playing out of its natural position */
const OUT_OF_POSITION_PENALTY: PosPenalty = {
  gk: {
    smallPenalty: [],
    midPenalty: [],
    // bigPenalty is the default for all other position left out (expect this position itself)
  },
  lb: {
    smallPenalty: ["rb"],
    midPenalty: ["cb", "lm"],
    // bigPenalty is the default
  },
  rb: {
    smallPenalty: ["lb"],
    midPenalty: ["cb", "rm"],
  },
  cb: {
    smallPenalty: [],
    midPenalty: ["lb", "rb"],
  },
  dm: {
    smallPenalty: ["cm"],
    midPenalty: ["cb", "lb", "rb", "rm", "lm"],
  },
  lm: {
    smallPenalty: ["rm"],
    midPenalty: ["lb", "lw", "rw", "cm", "am"],
  },
  rm: {
    smallPenalty: ["lm"],
    midPenalty: ["rb", "lw", "rw", "cm", "am"],
  },
  cm: {
    smallPenalty: ["dm", "am"],
    midPenalty: ["lm", "rm"],
  },
  am: {
    smallPenalty: ["cm"],
    midPenalty: ["lm", "rm", "lw", "rw", "cf"],
  },
  lw: {
    smallPenalty: ["lm", "am", "rw"],
    midPenalty: ["rm", "cf"],
  },
  rw: {
    smallPenalty: ["rm", "am", "lw"],
    midPenalty: ["lm", "cf"],
  },
  cf: {
    smallPenalty: [],
    midPenalty: ["lw", "rw"],
  },
};

/**
 * get a Penalty factor applying to the player skills when the player is out of position
 * @param at the playing position
 * @returns 0 isn't out of pos, 0.05 small, 0.1 middle and 0.2 major
 */
function getOutOfPositionPenalty(p: Player, at = p.position): number {
  if (p.position === at) {
    return 0;
  }
  if (OUT_OF_POSITION_PENALTY[p.position].smallPenalty.includes(at)) {
    return 0.05;
  }
  if (OUT_OF_POSITION_PENALTY[p.position].midPenalty.includes(at)) {
    return 0.1;
  }

  return 0.2;
}

/** readonly, the only skills where the out of position penalty is applicable */
const SKILLS_APPLICABLE_PENALTY = new Set<Skill>([
  "defensivePositioning",
  "interception",
  "marking",
  "offensivePositioning",
  "finishing",
  "vision",
]);

const NO_GROWTH_SKILL = new Set<Skill>(["height"]);

// TODO: add a type field with an id of what type of injury
// this is store on the gameState.injuries not on the player object
export type Injury = { when: string };

// Player creates semi-random player that best fit the position characteristics
// note instances of this class are saved as JSON on the user machine
class Player {
  id: string;
  name: string;
  team: string;
  position: Position;
  birthday: string; // a iso date string
  foot: Foot;
  growthRate: number; // monthly growth rate of growthState
  growthState: number; // (percentage 0-1) applying it: skillValue * growthState
  skills: Skills; // to get the skill values with all modifiers (growth, penalty and etc) applied use getSkill
  number?: number;

  constructor(pos: Position, now: Date, age?: number) {
    this.name = createName();
    /** can be a "team name" | "free agent" | "draft" */
    this.team = "free agent";
    this.position = pos;
    this.birthday = createBirthday(age ?? createAge(), now);
    this.id = createId();
    this.foot = createPreferredFoot(pos);
    this.skills = createSkills(pos);
    this.growthRate =
      ((randomGauss() + 2 * Math.random()) / 3) * MAX_GROWTH_RATE; // loosen up a bit the randomGauss;
    this.growthState = createGrowthState(this, now);
  }
}

export function getAge(p: Player, now: Date): number {
  return getAgeAt(p.birthday, now);
}

/** get a player at the given PositionArea randomly, some position is more
   frequent than other cm for midfielder, cf for forward and cb for defender */
export function createPlayerAt(
  now: Date,
  at: PositionArea,
  age?: number
): Player {
  const picks = JSON.parse(JSON.stringify(POSITION_AREA)); // in case of performance extract this object
  // raise up the probability to pick the position
  picks.defender.push("cb");
  picks.midfielder.push("cm");
  picks.forward.push("cf");

  const pick = Math.floor(Math.random() * picks[at].length);
  return new Player(picks[at][pick], now, age ?? undefined);
}

/**
 * get the skill player value taking in consideration all modifiers
 * @param at if is is of the player natural position a penalty could be applied
 * @param growth if false the growthState modifier isn't applied
 */
export function getSkill(
  p: Player,
  s: Skill,
  at = p.position,
  growth = true
): number {
  const v =
    NO_GROWTH_SKILL.has(s) || !growth
      ? p.skills[s]
      : p.skills[s] * p.growthState;
  return SKILLS_APPLICABLE_PENALTY.has(s)
    ? v - v * getOutOfPositionPenalty(p, at)
    : v;
}

/**
 * get the macroSkill player value taking in consideration all modifiers
 * @param at if is is of the player natural position a penalty could be applied
 * @param growth if false the growthState modifier isn't applied
 * @return the value is between MIN_SKILL and MAX_SKILL
 */
export function getMacroSkill(
  p: Player,
  m: MacroSkill,
  at = p.position,
  growth = true
): number {
  return (
    MACRO_SKILLS[m].reduce((sum, sk) => getSkill(p, sk, at, growth) + sum, 0) /
    MACRO_SKILLS[m].length
  );
}

/**
 *  a player score is like an overall but this game doesn't use it explicitly
 *  an overall is a tricky concept but a way to compare two player is necessary
 *  which skills are more important for a position is subjective, the most
 *  important thing is to have a good balance between positions score so every
 *  position have equal opportunities to be picked by a team when compared
 *  TODO: some statistical analysis
 *
 *  @param at take in consideration out of position penalty
 *  @param growth if false the growthState modifier isn't applied
 *  @Returns a value between MIN_SKILL and MAX_SKILL
 */
export function getScore(p: Player, at = p.position, growth = true): number {
  let score = 0;

  for (const macro in POSITION_SCORE_FACTORS[at]) {
    const mk = macro as MacroSkill;
    score += getMacroSkill(p, mk, at, growth) * POSITION_SCORE_FACTORS[at][mk];
  }

  return score;
}

/**  returns a player peak score prediction by the team when the player is
 younger than END_GROWTH_AGE, otherwise the current score,
 the prediction accuracy is depended on team scouting and luck
 the max prediction offset is team.scoutOffset percentage */
export function predictScore(p: Player, now: Date, t: Team): number {
  if (getAge(p, now) >= END_GROWTH_AGE) {
    return getScore(p);
  }

  // the hash it used to get a deterministic value for each player and team without storing anything extra
  const h = (hash(p.id + t.name, 200) - 100) / 100;
  const maxOffset =
    ((END_GROWTH_AGE - getAge(p, now)) / (END_GROWTH_AGE - MIN_AGE)) *
    t.scoutOffset;
  const rst = (1 + maxOffset * h) * getScore(p, undefined, false);
  const scoreNow = getScore(p);
  return rst <= scoreNow ? scoreNow : rst;
}

/** update the growthState if the player can still grow, it is meant to be used
  every end of the month */
export function applyMonthlyGrowth(p: Player, now: Date): void {
  const age = getAge(p, now);
  const growth = age < END_GROWTH_AGE ? p.growthRate : 0;
  p.growthState = Math.min(1, p.growthState + growth);
}

/** update the growthState shrinking its value (min 0.5) when the player is old Enough,
it is meant to be used every end of the month */
export function applyMonthlyDegrowth(p: Player, now: Date): void {
  if (getAge(p, now) >= START_DEGROWTH_AGE) {
    const degrowth = randomGauss() * MAX_GROWTH_RATE;
    p.growthState = Math.max(0.5, p.growthState - degrowth);
  }
}

/** returns a value between 150 and 205 */
export function getHeightInCm(p: Player): number {
  return Math.round(150 + 55 * (p.skills.height / MAX_SKILL));
}

/**
 * use wageRequest when a team is trying to sign a player (except for the draft and init)
 * return a wage between 2000 and 64000 per month wanted by the player it is
 * depended on the score of the player, defenders and goalkeepers usually ask for less
 */
export function wantedWage(gs: GameState, p: Player): number {
  const lowS = gs.popStats.meanScore - 1.24 * gs.popStats.standardDev;
  const step = gs.popStats.standardDev * 0.9;
  const posFtr =
    POSITION_AREA.goalkeeper.includes(p.position) ||
    POSITION_AREA.defender.includes(p.position)
      ? 0.8
      : 1;
  const wage = 2 ** ((getScore(p) - lowS) / step) * MIN_WAGE * posFtr;

  return Math.round(within(wage, MIN_WAGE, MAX_WAGE));
}

/**
 * returns true when the player is willing to sign for the team, depending on
 * the team appeal and the player score
 */
export function approachable({ gs, t, p }: GsTmPl): boolean {
  const goodAppeal = 3;
  const midAppeal = goodAppeal / 2;
  const minChance = 0.3 + ((t.appeal - midAppeal) / midAppeal) * 0.2;
  const step = 0.9 * gs.popStats.standardDev;
  const highScore = gs.popStats.meanScore + 1.25 * gs.popStats.standardDev;
  // we use a deterministic random under the same condition (the output vary only when the time change),
  // the mod is small enough to loop back often when the time change
  const rdm = hash(p.id + t.name + gs.date.getTime().toString(36), 100) / 100;

  if (rdm > 0.95) {
    // TODO  this is fake player mood
    return false;
  }

  return (
    t.appeal > goodAppeal ||
    Math.max(minChance, (highScore - getScore(p)) / step) >= rdm
  );
}

/**
 * returns the wage requested by the player to the team, could ask to be overPaid
 * the team has a low appeal the max overpay is of 20% extra
 */
export function wageRequest({ gs, t, p }: GsTmPl): number {
  const appeal = Math.max(0, (2.5 - t.appeal) / 12.5);
  const thrshld = gs.popStats.meanScore + 0.73 * gs.popStats.standardDev;
  const wg = wantedWage(gs, p);
  return Math.round(
    getScore(p) > thrshld ? Math.min((appeal + 1) * wg, MAX_WAGE) : wg
  );
}

/** returns true when the player wants to retire, a MAX_AGE player return always true
probability is higher for older players */
export function retire(p: Player, now: Date): boolean {
  const a = getAge(p, now);
  return a > 29 && (a >= MAX_AGE || (a - 30) / 25 + 0.2 >= Math.random());
}

// the sum of scoreFactors should always be 1 (expect for rounding error)
type ScoreFactors = Readonly<Record<MacroSkill, number>>;
const FB_SCORE_FACTORS: ScoreFactors = {
  // higher is the value more important the macroSkill is for the player position score
  goalkeeper: 0,
  mobility: 0.25,
  physic: 0.05,
  defense: 0.5,
  offense: 0,
  ability: 0.2,
};

const EM_SCORE_FACTORS: ScoreFactors = {
  goalkeeper: 0,
  mobility: 0.25,
  physic: 0.05,
  defense: 0.09,
  ability: 0.52,
  offense: 0.09,
};

const WG_SCORE_FACTORS: ScoreFactors = {
  goalkeeper: 0,
  mobility: 0.19,
  physic: 0.11,
  ability: 0.35,
  offense: 0.35,
  defense: 0,
};

const POSITION_SCORE_FACTORS: Readonly<Record<Position, ScoreFactors>> = {
  gk: {
    goalkeeper: 0.49,
    mobility: 0.12,
    physic: 0.28,
    ability: 0.11,
    offense: 0,
    defense: 0,
  },
  cb: {
    goalkeeper: 0,
    mobility: 0.1,
    physic: 0.2,
    defense: 0.5,
    offense: 0,
    ability: 0.2,
  },
  lb: FB_SCORE_FACTORS,
  rb: FB_SCORE_FACTORS,
  dm: {
    goalkeeper: 0,
    mobility: 0.15,
    physic: 0.1,
    defense: 0.35,
    offense: 0,
    ability: 0.4,
  },
  cm: {
    goalkeeper: 0,
    mobility: 0.13,
    physic: 0.1,
    defense: 0.11,
    ability: 0.55,
    offense: 0.11,
  },
  am: {
    goalkeeper: 0,
    mobility: 0.13,
    physic: 0.1,
    ability: 0.47,
    offense: 0.25,
    defense: 0.05,
  },
  lm: EM_SCORE_FACTORS,
  rm: EM_SCORE_FACTORS,
  lw: WG_SCORE_FACTORS,
  rw: WG_SCORE_FACTORS,
  cf: {
    goalkeeper: 0,
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
  Position,
  PositionArea,
  Skills,
  Skill,
  MacroSkill,
  Player,
  POSITION_AREA,
  getArea,
  createAge,
  createGrowthState,
  preferredFootChance,
  createPreferredFoot,
  MACRO_SKILLS,
  getOutOfPositionPenalty,
  POSITION_SCORE_FACTORS,
  NO_GROWTH_SKILL,
  SKILLS_APPLICABLE_PENALTY,
};
