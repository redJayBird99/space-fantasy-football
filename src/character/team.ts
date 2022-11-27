import {
  Player,
  getArea,
  SALARY_CAP,
  MIN_SALARY_CAP,
  MAX_SKILL,
  MIN_WAGE,
  MAX_GROWTH_RATE,
  Position,
} from "./player";
import { GameState } from "../game-state/game-state";
import teamsJson from "../asset/teams.json";
import { hash } from "../util/generator";
import { within } from "../util/math";
import { Formation, Formations, Spot } from "./formation";
import { bestAtPos, bestWithSkill } from "./util";
const teams: { [team: string]: any } = teamsJson;
const MAX_SCOUTING_OFFSET = 0.2;
export const MAX_TEAM_SIZE = 30;
export const MIN_TEAM_SIZE = 18;

type GsTm = { gs: GameState; t: Team }; // eslint-disable-line no-use-before-define
type GsTmPl = { p: Player } & GsTm; // eslint-disable-line no-use-before-define
type Affordable = (wage: number) => boolean;
type fanBase = "huge" | "big" | "medium" | "small" | "very small";
export type LineupSpot = { plID?: string; sp: Spot };

type SetPieces = {
  // the players ids
  penalties?: string;
  shortFreeKicks?: string;
  longFreeKicks?: string;
  corners?: string;
  throwIns?: string;
};

export const fanBaseScore: Readonly<Record<fanBase, number>> = {
  huge: 4,
  big: 3,
  medium: 2,
  small: 1,
  "very small": 0,
};

function initMoneyAmount(fb: fanBase, min: number): number {
  const extra = (0.5 * min) / 5;
  return Math.round(min + fanBaseScore[fb] * extra + Math.random() * extra);
}

function initScoutOffset(t: Team): number {
  const hf = MAX_SCOUTING_OFFSET / 2;
  return within(
    hf * ((fanBaseScore.huge - fanBaseScore[t.fanBase]) / fanBaseScore.huge) +
      Math.random() * hf,
    0,
    MAX_SCOUTING_OFFSET
  );
}

// note instances of this class are saved as JSON on the user machine
class Contract {
  teamName: string;
  playerId: string;
  wage: number;
  duration: number; // in seasons

  constructor(t: Team, p: Player, wage: number, duration: number) {
    this.teamName = t.name;
    this.playerId = p.id;
    this.wage = wage;
    this.duration = duration;
  }
}

interface Finances {
  budget: number;
  revenue: number; // monthly
  // monthly expenses
  health: number;
  scouting: number;
  facilities: number;
}

// note instances of this class are saved as JSON on the user machine
class Team {
  name: string;
  playerIds: string[] = [];
  finances: Finances;
  fanBase: fanBase;
  appeal = 0; // is a relative value respect other teams, should be init apart and change slowly
  scoutOffset: number; // percentage value higher is worse
  formation?: { name: Formations; lineup: LineupSpot[] }; // this will only get saved (in the JSON file) for the userTeam
  captain?: string; // id of the player
  /** only stored for the user team, for all other teams the function findSetPiecesTakers is called on the fly */
  setPieces?: SetPieces;

  constructor(name: string) {
    this.name = name;
    this.fanBase = teams[name] ? teams[name].fanBase : "very small";
    this.scoutOffset = initScoutOffset(this);
    this.finances = {
      budget: initMoneyAmount(this.fanBase, 10 * SALARY_CAP),
      revenue: initMoneyAmount(this.fanBase, SALARY_CAP + SALARY_CAP / 10),
      health: initMoneyAmount(this.fanBase, SALARY_CAP / 20),
      scouting: initMoneyAmount(this.fanBase, SALARY_CAP / 20),
      facilities: initMoneyAmount(this.fanBase, SALARY_CAP / 20),
    };
  }

  /** add the player to the team and the signed contract to the gameState, returns the signed Contract
   * the player will receive a squad number */
  static signPlayer(g: GsTmPl, wage: number, duration?: number): Contract {
    const { gs, t, p } = g;
    duration = duration ?? Math.floor(Math.random() * 4) + 1;
    p.team = t.name;
    t.playerIds.includes(p.id) || t.playerIds.push(p.id);
    const contract = new Contract(t, p, wage, duration);
    GameState.saveContract(gs, contract);
    updateSquadNumber(GameState.getTeamPlayers(gs, t.name));
    return contract;
  }

  /** remove the player from the team and delete the contract from the gameState,
   * and update some player fields like number and team */
  static unSignPlayer(gs: GameState, c: Contract): void {
    const team = gs.teams[c.teamName];
    const player = gs.players[c.playerId];
    player.team = "free agent";
    delete player.number;
    team.playerIds = team.playerIds.filter((id) => id !== player.id);
    GameState.deleteContract(gs, c);

    if (c.playerId === gs.teams[c.teamName].captain) {
      gs.teams[c.teamName].captain = undefined;
    }
  }

  // moves the contracted player to the new team, the contract has the same conditions
  static transferPlayer(gs: GameState, c: Contract, to: Team): void {
    const p = gs.players[c.playerId];
    Team.unSignPlayer(gs, c);
    Team.signPlayer({ gs, p, t: to }, c.wage, c.duration);
  }

  // returns players with contract duration of 0
  static getExpiringPlayers({ gs, t }: GsTm): Player[] {
    return GameState.getTeamPlayers(gs, t.name).filter(
      (p) => GameState.getContract(gs, p)?.duration === 0
    );
  }

  // returns players with contract duration greater than 0
  static getNotExpiringPlayers({ gs, t }: GsTm): Player[] {
    return GameState.getTeamPlayers(gs, t.name).filter(
      (p) => GameState.getContract(gs, p)?.duration !== 0
    );
  }

  // try to resign the expiring players according to the team needs and player scores
  static renewExpiringContracts({ gs, t }: GsTm): Player[] {
    const renewed: Player[] = [];
    const notExpiring = Team.getNotExpiringPlayers({ gs, t });
    let rtgs = new RatingAreaByNeed(notExpiring);
    let affordable = Team.canAfford({ gs, t });
    const expiring = Team.getExpiringPlayers({ gs, t }).sort(
      (a, b) =>
        Team.ratingPlayerByNeed({ p: b, t, gs }, rtgs) -
        Team.ratingPlayerByNeed({ p: a, t, gs }, rtgs)
    );

    // start by trying to sign the best ranking players
    expiring.forEach((p) => {
      if (
        Player.approachable({ gs, t, p }) &&
        affordable(Player.wageRequest({ gs, p, t })) &&
        Team.shouldRenew({ gs, t, p }, rtgs, notExpiring.length)
      ) {
        Team.signPlayer({ gs, t, p }, Player.wageRequest({ gs, p, t }));
        renewed.push(p);
        notExpiring.push(p);
        rtgs = new RatingAreaByNeed(notExpiring);
        affordable = Team.canAfford({ gs, t });
      }
    });

    return renewed;
  }

  /** returns the wages sum of every not expiring team player */
  static getWagesAmount({ gs, t }: GsTm): number {
    return sumWages(gs, Team.getNotExpiringPlayers({ gs, t }));
  }

  /** returns the sum of all the monthly expenses wages and luxuryTax included */
  static getMonthlyExpenses({ gs, t }: GsTm): number {
    const { health: hth, facilities: fts, scouting: sct } = t.finances;
    const ws = Team.getWagesAmount({ gs, t });
    return ws + luxuryTax(ws) + minSalaryTax(ws) + hth + fts + sct;
  }

  // returns true when the team can afford the given wage for one year, min wage
  // is always affordable no matter team expenses
  static canAfford(g: GsTm): Affordable {
    const { health, facilities, scouting, budget, revenue } = g.t.finances;
    const wages = Team.getWagesAmount(g); // prevents calling it for every check

    return (wage) => {
      if (wage <= MIN_WAGE || wages <= MIN_SALARY_CAP) {
        return true;
      }

      const wgs = wages + wage;
      const expenses = wgs + luxuryTax(wgs) + health + facilities + scouting;
      const extra = budget > 0 ? budget / 12 : budget / 48; // 12 months when positive and 4 years otherwise
      return revenue + extra - expenses > 0;
    };
  }

  // return true when the team need a new player
  static needPlayer(g: GsTm): boolean {
    // TODO: take in consideration the quality of the teamPlayers
    const players = Team.getNotExpiringPlayers(g);
    const rgs = new RatingAreaByNeed(players);
    return (
      players.length < MAX_TEAM_SIZE && Object.values(rgs).some((v) => v > 0)
    );
  }

  /**
  if the team more than 29 players and it doesn't need the player position returns always false
  when the player are more than 25 returning true is less probable
  @param players - the number of team players
  */
  static shouldRenew(g: GsTmPl, r: RatingAreaByNeed, players: number): boolean {
    if (players <= 25 || r[getArea(g.p.position)] !== 0) {
      return renewalProbability(g, r) > Math.random();
    } else if (players < MAX_TEAM_SIZE) {
      return renewalProbability(g, r) / 3 > Math.random();
    }

    return false;
  }

  // sign the best (by rating) affordable willing to sign player between the
  // given free agents returns the signed player
  static signFreeAgent({ gs, t }: GsTm, free: Player[]): Player | void {
    const rts = new RatingAreaByNeed(Team.getNotExpiringPlayers({ gs, t }));
    const affordable = Team.canAfford({ gs, t });
    const signables = free.filter(
      (p) =>
        Player.approachable({ gs, t, p }) &&
        affordable(Player.wageRequest({ gs, p, t }))
    );
    const target = findBest(signables, { t, gs }, rts);

    if (target) {
      Team.signPlayer(
        { gs, t, p: target },
        Player.wageRequest({ gs, p: target, t })
      );
      return target;
    }
  }

  /** pick and sign for 4 seasons a player from the given ones, return the signed one
   * the signed player is always the one with the highest predicted score
   * according to the team
   */
  static pickDraftPlayer({ gs, t }: GsTm, pls: Player[]): Player {
    // I think is the most sensible option to pick always the best prospect no matter the team needs
    const getBest = (p1: Player, p2: Player) =>
      Player.predictScore(p2, gs.date, t) > Player.predictScore(p1, gs.date, t)
        ? p2
        : p1;
    const target = pls.reduce((a, p) => getBest(a, p));
    Team.signPlayer({ gs, t, p: target }, Player.wantedWage(gs, target), 4);
    return target;
  }

  // monthly update the budget subtracting expenses and adding revenues
  static updateFinances(g: GsTm): void {
    g.t.finances.budget += g.t.finances.revenue - Team.getMonthlyExpenses(g);
  }

  // returns a team appeal score between 0 and 5
  // 3 points for the position in ranking ( the order of the array is the ranking )
  // 1 point for the fanBase
  // 1 point for the position in facilityRanking ( the order of the array is the ranking )
  static calcAppeal(t: Team, ranking: Team[], facilityRanking: Team[]): number {
    const fanPoints = fanBaseScore[t.fanBase] / fanBaseScore.huge;
    const rankNth = ranking.indexOf(t);
    const facilityNth = facilityRanking.indexOf(t);
    const l = ranking.length - 1;
    return fanPoints + 3 * ((l - rankNth) / l) + (l - facilityNth) / l;
  }

  // returns a weighted score of a player between the current score and the
  // peak predicted score (when young) by the team
  static evaluatePlayer({ gs, t, p }: GsTmPl): number {
    return 0.7 * Player.predictScore(p, gs.date, t) + 0.3 * Player.getScore(p);
  }

  /**
   * a rating of how match a player is needed by a team
   * one point for position needs, 4 on the score of the player
   * @returns a value between 0 and 5
   */
  static ratingPlayerByNeed(g: GsTmPl, r: RatingAreaByNeed): number {
    return 4 * (Team.evaluatePlayer(g) / MAX_SKILL) + r[getArea(g.p.position)];
  }

  /** this method is meant for the user, it returns a prediction of the player
   * growth rate by the team scouting,
   * the max offset from the real growth rate is 2 * MAX_SCOUTING_OFFSET * MAX_GROWTH_RATE,
   * but never less than 0 or greater than MAX_GROWTH_RATE */
  static estimateGrowthRate(t: Team, p: Player): number {
    // the hash it used to get a deterministic value for each player and team without storing anything extra
    const h = (hash(p.id + t.name, 200) - 100) / 100;
    return within(
      h * 2 * t.scoutOffset * MAX_GROWTH_RATE + p.growthRate,
      0,
      MAX_GROWTH_RATE
    );
  }
}

/** remove all players not in the team anymore (retired, traded and ect),
 * and update the user setPieces removing missing player from the lineup */
export function removeLineupDepartures({ gs, t }: GsTm): void {
  t.formation?.lineup.forEach((s) => {
    const id = s.plID;

    if (!id || !gs.players[id] || gs.players[id].team !== t.name) {
      s.plID = undefined;
    }
  });
  updateSetPiecesTakers(t);
}

/** check if the given team formation is complete or not */
export function completeLineup(gs: GameState, t: Team) {
  if (!t.formation) {
    return false;
  }

  // the team could have less the 11 player available in that case filled should be equal to the available player
  const filled = t.formation?.lineup.reduce((a, s) => (s.plID ? ++a : a), 0);
  return (
    filled === 11 ||
    filled === t.playerIds.reduce((a, id) => (gs.injuries[id] ? a : ++a), 0)
  );
}

/** set the team formation property to the given formation,
 * and update the user setPieces removing missing player from the lineup */
export function setFormation(t: Team, fm: Formation): void {
  t.formation = {
    name: fm.name,
    lineup: fm.lineup.map(({ pl, sp }) => ({ sp, plID: pl?.id })),
  };
  updateSetPiecesTakers(t);
}

/** get the formation of the given team if any exist */
export function getFormation(g: GsTm): Formation | void {
  if (g.t.formation) {
    return {
      name: g.t.formation.name,
      lineup:
        g.t.formation?.lineup.map((s) => ({
          pl: s.plID ? g.gs.players[s.plID] : undefined,
          sp: s.sp,
        })) ?? [],
    };
  }
}

/**
 *
 * when a player does't have a contract his wage is 0
 * @returns sum of the players wages
 */
function sumWages(gs: GameState, pls: Player[]): number {
  return pls.reduce((a, p) => a + (GameState.getContract(gs, p)?.wage ?? 0), 0);
}

// a rating of how match the player area is needed by a team with the given
// players the ratings are between 0 (low) 1 (high)
class RatingAreaByNeed {
  goalkeeper = 0;
  defender = 0;
  midfielder = 0;
  forward = 0;

  constructor(teamPlayers: Player[]) {
    const minRt = 0;
    const maxRt = 1;
    // counts the players per area
    teamPlayers.forEach((p) => this[getArea(p.position)]++);
    this.goalkeeper = within((3 - this.goalkeeper) / 3, minRt, maxRt);
    this.defender = within((8 - this.defender) / 8, minRt, maxRt);
    this.midfielder = within((8 - this.midfielder) / 8, minRt, maxRt);
    this.forward = within((6 - this.forward) / 6, minRt, maxRt);
  }
}

// the team probability to sign the player, high score players have higher probability
// RatingAreaByNeed raises a little the probability when a positionArea is needed
// and halves it when there is no need for it
// returns a value between 0 and 1
// for players with score 72 to max return always 1 when the area is needed
// for players with score 54 to 0 return always 0
function renewalProbability(g: GsTmPl, need: RatingAreaByNeed): number {
  const { meanScore: mean, standardDev: stdDev } = g.gs.popStats;

  if (Team.evaluatePlayer(g) <= mean - 1.5 * stdDev) {
    return 0;
  }

  let scoreFct = (Team.evaluatePlayer(g) - (mean - 2 * stdDev)) / (4 * stdDev);
  scoreFct = within(scoreFct, 0, 1);
  const areaFct = Math.min(0.2, 1 - scoreFct) * need[getArea(g.p.position)];
  const probability = scoreFct + areaFct;
  return need[getArea(g.p.position)] === 0 ? probability / 2 : probability;
}

// https://en.wikipedia.org/wiki/NBA_salary_cap#Luxury_tax
function luxuryTax(payroll: number): number {
  const exceed = Math.max(0, payroll - SALARY_CAP);
  return Math.round(exceed ** 2 / (SALARY_CAP / 10) + exceed);
}

// If the payroll is below the MIN_SALARY_CAP limit, pay the difference between
// the payroll and the limit.
function minSalaryTax(payroll: number): number {
  return Math.max(0, MIN_SALARY_CAP - payroll);
}

// returns the best potential new sign between the given players or undefined
function findBest(ps: Player[], { t, gs }: GsTm, r: RatingAreaByNeed) {
  if (ps.length > 1) {
    return ps.reduce((a, b) =>
      Team.ratingPlayerByNeed({ p: b, t, gs }, r) >
      Team.ratingPlayerByNeed({ p: a, t, gs }, r)
        ? b
        : a
    );
  }

  return ps[0];
}

/**
 * returns the best (according to team.evaluatePlayer score) n players
 * @param n amount of player to pick, when n > players.length throw an error
 */
function pickBest(g: GsTm, players: Player[], n: number): Player[] {
  if (players.length < n) {
    throw new Error(`players have less than ${n} players`);
  }

  return players
    .sort(
      (p1, p2) =>
        Team.evaluatePlayer({ ...g, p: p2 }) -
        Team.evaluatePlayer({ ...g, p: p1 })
    )
    .slice(0, n);
}

/**
 * assign a squad number to all player missing one
 * @param squad all team players
 */
export function updateSquadNumber(squad: Player[]) {
  const nTaken = new Set(squad.map((p) => p?.number));
  // every time a new number is assigned remove the number and the player from the available ones
  const plsWithoutN = new Set(squad.filter((p) => p?.number === undefined));
  const update = (n: number, p?: Player) => {
    if (p) {
      p.number = n;
      nTaken.add(n);
      plsWithoutN.delete(p);
    }
  };
  // the squad number paired with the preferred position
  const numberMatch: [number, Position][] = [
    [1, "gk"], // TODO expectation for GK
    [10, "am"],
    [9, "cf"],
    [7, "lw"], // TODO left or ring wing shouldn't matter
    [11, "rw"], // TODO left or ring wing shouldn't matter
    [2, "cb"],
    [3, "cb"],
    [4, "lb"],
    [5, "rb"],
    [6, "cm"],
    [8, "cm"],
  ];
  // find the best fit for the given number
  numberMatch.forEach((m) => {
    if (!nTaken.has(m[0])) {
      update(m[0], bestAtPos(plsWithoutN, m[1]));
    }
  });
  // the rest of the players will get a random number
  for (const p of plsWithoutN) {
    let n: undefined | number;
    // there is a relatively small collision probability but nothing to worry about
    do {
      n = 11 + Math.floor(Math.random() * 89);
    } while (nTaken.has(n));

    update(n!, p);
  }
}

/** set the team captain, only if it doesn't exist  */
export function updateCaptain(gs: GameState, t: Team) {
  t.captain = selectCaptain(gs, GameState.getTeamPlayers(gs, t.name))?.id;
}

/**
 * return the best player fitting the role of captain
 * @param squad the player to choose from
 */
function selectCaptain(gs: GameState, squad: Player[]): Player | undefined {
  // TODO the amount of season played for the same team should be a factor
  // older players are preferred
  const { meanScore: mean, standardDev: std } = gs.popStats;
  // get the quality score between 0 and 1
  const qty = (p: Player) => within((Player.getScore(p) - mean) / std, 0, 1);
  // get the experience score between 0 and 1
  const age = (p: Player) => (Player.age(p, gs.date) - 25) / 7;
  const captainScore = (p: Player) => qty(p) * 0.4 + age(p) * 0.6;
  squad.sort((p1, p2) => captainScore(p2) - captainScore(p1));
  return squad[0];
}

/** this function is used only for the user team, it doesn't apply on any other team
 *
 * remove from the team.setPieces all player in the lineup
 */
function updateSetPiecesTakers(t: Team): void {
  if (!t.setPieces) {
    // only the user team has the setPieces property
    return;
  }

  const starters = new Set(t.formation?.lineup.map((s) => s.plID) ?? []);

  for (const k in t.setPieces) {
    if ((t.setPieces as any)[k] && !starters.has((t.setPieces as any)[k])) {
      (t.setPieces as any)[k] = undefined;
    }
  }
}

/**
 * return the best player fitting all the set pieces takers
 * @param l the team lineup
 */
export function findSetPiecesTakers(gs: GameState, l: LineupSpot[]): SetPieces {
  const squad = l
    .filter((s) => Boolean(s.plID) && s.sp.pos !== "gk")
    .map((s) => gs.players[s.plID!]);
  const passer = bestWithSkill(squad, "passing")?.id;
  return {
    penalties: bestWithSkill(squad, "finishing")?.id,
    shortFreeKicks: bestWithSkill(squad, "shot")?.id,
    longFreeKicks: passer,
    corners: passer,
    throwIns: bestWithSkill(squad, "strength")?.id,
  };
}

// TODO move on exportedForTesting
export {
  GsTm,
  GsTmPl,
  MAX_SCOUTING_OFFSET,
  Contract,
  Finances,
  Team,
  RatingAreaByNeed,
  renewalProbability,
  initMoneyAmount,
  luxuryTax,
  minSalaryTax,
  findBest,
  pickBest,
  initScoutOffset,
  sumWages,
  updateSetPiecesTakers,
};

export const exportedForTesting = {};
