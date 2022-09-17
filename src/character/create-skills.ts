import { Position, Skills, MAX_SKILL, MIN_SKILL } from "./player";
import { customGaussian } from "../util/generator";

const SKILL_NOISE = 20;
const SKILL_EXTRA_NOISE = SKILL_NOISE + 10;

// return a skill value between mean - maxOffset and mean + maxOffset seemingly
// taken from a normal distribution with hint as mean
export function createSkill(hint: number, maxOffset?: number) {
  const defaultOffset = Math.min(MAX_SKILL - hint, hint - MIN_SKILL);
  maxOffset = maxOffset ? Math.min(maxOffset, defaultOffset) : defaultOffset;
  return Math.round(customGaussian(hint, maxOffset));
}

// returns the set of skills that best fit the position
export function createSkills(pos: Position): Skills {
  switch (pos) {
    case "gk":
      return createGkSkills();
    case "cb":
      return createCbSkills();
    case "lb":
    case "rb":
      return createFbSkills();
    case "dm":
      return createDmSkills();
    case "lm":
    case "rm":
      return createEmSkills();
    case "cm":
      return createCmSkills();
    case "am":
      return createAmSkills();
    case "lw":
    case "rw":
      return createWgSkills();
    case "cf":
      return createCfSkills();
  }

  throw new Error(`${pos} isn't a valid position`);
}

function createBasicSkills(): Skills {
  const physic = createSkill(50);
  const ability = createSkill(50);
  const offensive = createSkill(50);
  const defensive = createSkill(50);
  const gk = createSkill(20);

  return {
    height: createSkill(physic, SKILL_NOISE),
    strength: createSkill(physic, SKILL_NOISE),
    reflexes: createSkill(gk, SKILL_NOISE),
    handling: createSkill(gk, SKILL_NOISE),
    diving: createSkill(gk, SKILL_NOISE),
    speed: createSkill(50),
    agility: createSkill(50),
    stamina: createSkill(60),
    defensivePositioning: createSkill(defensive, SKILL_NOISE),
    interception: createSkill(defensive, SKILL_NOISE),
    marking: createSkill(defensive, SKILL_NOISE),
    passing: createSkill(ability, SKILL_NOISE),
    vision: createSkill(ability, SKILL_NOISE),
    technique: createSkill(ability, SKILL_NOISE),
    offensivePositioning: createSkill(offensive, SKILL_NOISE),
    shot: createSkill(offensive, SKILL_NOISE),
    finishing: createSkill(offensive, SKILL_NOISE),
  };
}

function createGkSkills(): Skills {
  const physic = createSkill(70);
  const ability = createSkill(25);
  const offensive = createSkill(25);
  const defensive = createSkill(25);
  const gk = createSkill(75);

  return {
    height: createSkill(physic, SKILL_NOISE),
    strength: createSkill(physic, SKILL_NOISE),
    reflexes: createSkill(gk, SKILL_NOISE),
    handling: createSkill(gk, SKILL_NOISE),
    diving: createSkill(gk, SKILL_NOISE),
    speed: createSkill(35),
    agility: createSkill(40),
    stamina: createSkill(50),
    defensivePositioning: createSkill(defensive, SKILL_NOISE),
    interception: createSkill(defensive, SKILL_NOISE),
    marking: createSkill(defensive, SKILL_NOISE),
    passing: createSkill(ability, SKILL_NOISE),
    vision: createSkill(ability, SKILL_NOISE),
    technique: createSkill(ability, SKILL_NOISE),
    offensivePositioning: createSkill(offensive, SKILL_NOISE),
    shot: createSkill(offensive, SKILL_NOISE),
    finishing: createSkill(offensive, SKILL_NOISE),
  };
}

function createCbSkills(): Skills {
  const defensive = createSkill(75);
  const physic = createSkill(65);
  const offensive = createSkill(30);
  const ability = createSkill(50, SKILL_EXTRA_NOISE);
  const technique = ability - 10 < MIN_SKILL ? ability : ability - 10;

  return {
    ...createBasicSkills(),
    height: createSkill(physic, SKILL_NOISE),
    strength: createSkill(physic, SKILL_NOISE),
    defensivePositioning: createSkill(defensive, SKILL_NOISE),
    interception: createSkill(defensive, SKILL_NOISE),
    marking: createSkill(defensive, SKILL_NOISE),
    agility: createSkill(30),
    passing: createSkill(ability, SKILL_NOISE),
    vision: createSkill(ability, SKILL_NOISE),
    technique: createSkill(technique, SKILL_NOISE),
    offensivePositioning: createSkill(offensive, SKILL_NOISE),
    shot: createSkill(offensive, SKILL_NOISE),
    finishing: createSkill(offensive, SKILL_NOISE),
  };
}

function createFbSkills(): Skills {
  const defensive = createSkill(70);
  const offensive = createSkill(30);
  const ability = createSkill(60, SKILL_EXTRA_NOISE);
  const vision = ability - 10 < MIN_SKILL ? ability : ability - 10;

  return {
    ...createBasicSkills(),
    defensivePositioning: createSkill(defensive, SKILL_NOISE),
    interception: createSkill(defensive, SKILL_NOISE),
    marking: createSkill(defensive, SKILL_NOISE),
    stamina: createSkill(70),
    speed: createSkill(70),
    passing: createSkill(ability, SKILL_NOISE),
    vision: createSkill(vision, SKILL_NOISE),
    technique: createSkill(ability, SKILL_NOISE),
    offensivePositioning: createSkill(offensive, SKILL_NOISE),
    shot: createSkill(offensive, SKILL_NOISE),
    finishing: createSkill(offensive, SKILL_NOISE),
  };
}

function createDmSkills(): Skills {
  const ability = createSkill(70);
  const defensive = createSkill(65);
  const offensive = createSkill(30);

  return {
    ...createBasicSkills(),
    defensivePositioning: createSkill(defensive, SKILL_NOISE),
    interception: createSkill(defensive, SKILL_NOISE),
    marking: createSkill(defensive, SKILL_NOISE),
    passing: createSkill(ability, SKILL_NOISE),
    vision: createSkill(ability, SKILL_NOISE),
    technique: createSkill(ability, SKILL_NOISE),
    stamina: createSkill(65),
    offensivePositioning: createSkill(offensive, SKILL_NOISE),
    shot: createSkill(offensive, SKILL_NOISE),
    finishing: createSkill(offensive, SKILL_NOISE),
  };
}

function createCmSkills(): Skills {
  const ability = createSkill(75);
  const defensive = createSkill(50, SKILL_EXTRA_NOISE);
  const offensive = createSkill(50, SKILL_EXTRA_NOISE);
  const shot = offensive + 10 > MAX_SKILL ? offensive : offensive + 10;

  return {
    ...createBasicSkills(),
    defensivePositioning: createSkill(defensive, SKILL_NOISE),
    interception: createSkill(defensive, SKILL_NOISE),
    marking: createSkill(defensive, SKILL_NOISE),
    passing: createSkill(ability, SKILL_NOISE),
    vision: createSkill(ability, SKILL_NOISE),
    technique: createSkill(ability, SKILL_NOISE),
    offensivePositioning: createSkill(offensive, SKILL_NOISE),
    shot: createSkill(shot, SKILL_NOISE),
    finishing: createSkill(offensive, SKILL_NOISE),
  };
}

function createEmSkills(): Skills {
  const ability = createSkill(75);
  const vision = ability - 10 < MIN_SKILL ? ability : ability - 10;

  return {
    ...createCmSkills(),
    passing: createSkill(ability, SKILL_NOISE),
    vision: createSkill(vision, SKILL_NOISE),
    technique: createSkill(ability, SKILL_NOISE),
    stamina: createSkill(70),
    speed: createSkill(70),
  };
}

function createAmSkills(): Skills {
  const ability = createSkill(75);
  const defensive = createSkill(30);
  const offensive = createSkill(60);
  const shot = offensive + 10 > MAX_SKILL ? offensive : offensive + 10;
  const offPos = offensive - 5 < MIN_SKILL ? offensive : offensive - 5;

  return {
    ...createBasicSkills(),
    defensivePositioning: createSkill(defensive, SKILL_NOISE),
    interception: createSkill(defensive, SKILL_NOISE),
    marking: createSkill(defensive, SKILL_NOISE),
    passing: createSkill(ability, SKILL_NOISE),
    vision: createSkill(ability, SKILL_NOISE),
    technique: createSkill(ability, SKILL_NOISE),
    offensivePositioning: createSkill(offPos, SKILL_NOISE),
    shot: createSkill(shot, SKILL_NOISE),
    finishing: createSkill(offensive, SKILL_NOISE),
  };
}

function createWgSkills(): Skills {
  const defensive = createSkill(30);
  const offensive = createSkill(70);
  const ability = createSkill(70);
  const technique = ability + 10 > MAX_SKILL ? ability : ability + 10;
  const vision = ability - 5 < MIN_SKILL ? ability : ability - 5;

  return {
    ...createBasicSkills(),
    defensivePositioning: createSkill(defensive, SKILL_NOISE),
    interception: createSkill(defensive, SKILL_NOISE),
    marking: createSkill(defensive, SKILL_NOISE),
    speed: createSkill(70),
    agility: createSkill(60),
    passing: createSkill(ability, SKILL_NOISE),
    vision: createSkill(vision, SKILL_NOISE),
    technique: createSkill(technique, SKILL_NOISE),
    offensivePositioning: createSkill(offensive, SKILL_NOISE),
    finishing: createSkill(offensive, SKILL_NOISE),
  };
}

function createCfSkills(): Skills {
  const offensive = createSkill(75);
  const defensive = createSkill(30);

  return {
    ...createBasicSkills(),
    defensivePositioning: createSkill(defensive, SKILL_NOISE),
    interception: createSkill(defensive, SKILL_NOISE),
    marking: createSkill(defensive, SKILL_NOISE),
    offensivePositioning: createSkill(offensive, SKILL_NOISE),
    shot: createSkill(offensive, SKILL_NOISE),
    finishing: createSkill(offensive, SKILL_NOISE),
  };
}
