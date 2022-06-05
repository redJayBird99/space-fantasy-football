import {
  Player,
  getArea,
  SALARY_CAP,
  MIN_SALARY_CAP,
  MAX_SKILL,
  MIN_WAGE,
} from "./player";
import { GameState } from "../game-state/game-state";
import teamsJson from "../asset/teams.json";
const teams: { [team: string]: any } = teamsJson;

type Affordable = (wage: number) => boolean;
type Fanbase = "huge" | "big" | "medium" | "small" | "verySmall";

const fanbaseScore: Readonly<Record<Fanbase, number>> = {
  huge: 4,
  big: 3,
  medium: 2,
  small: 1,
  verySmall: 0,
};

function initMoneyAmount(fb: Fanbase, min: number): number {
  const extra = (0.5 * min) / 5;
  return Math.round(min + fanbaseScore[fb] * extra + Math.random() * extra);
}

// note instances of this class are saved as JSON on the user machine
interface Contract {
  teamName: string;
  playerId: string;
  wage: number;
  duration: number; // in seasons
}

interface Finances {
  budget: number;
  revenue: number;
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
  fanbase: Fanbase;
  appeal = 0; // is a relative value respect other teams, should be init apart and change slowly

  constructor(name: string) {
    this.name = name;
    this.fanbase = teams[name] ? teams[name].fanbase : "verySmall";
    this.finances = {
      budget: initMoneyAmount(this.fanbase, 10 * SALARY_CAP),
      revenue: initMoneyAmount(this.fanbase, SALARY_CAP + SALARY_CAP / 10),
      health: initMoneyAmount(this.fanbase, SALARY_CAP / 20),
      scouting: initMoneyAmount(this.fanbase, SALARY_CAP / 20),
      facilities: initMoneyAmount(this.fanbase, SALARY_CAP / 20),
    };
  }

  // add the player to the team and the signed contract to the gameState
  // returns the signed Contract
  static signPlayer(gs: GameState, t: Team, p: Player): Contract {
    p.team = t.name;
    t.playerIds.includes(p.id) || t.playerIds.push(p.id);
    return signContract(gs, t, p);
  }

  // remove the player from the team and delete the contract from the gameState
  static unsignPlayer(gs: GameState, c: Contract): void {
    const team = gs.teams[c.teamName];
    const player = gs.players[c.playerId];
    player.team = "free agent";
    team.playerIds = team.playerIds.filter((id) => id !== player.id);
    GameState.deleteContract(gs, c);
  }

  // returns players with contract duration of 0
  static getExipiringPlayers(gs: GameState, t: Team): Player[] {
    return GameState.getTeamPlayers(gs, t.name).filter(
      (p) => GameState.getContract(gs, p)?.duration === 0
    );
  }

  // returns players with contract duration greater than 0
  static getNotExipiringPlayers(gs: GameState, t: Team): Player[] {
    return GameState.getTeamPlayers(gs, t.name).filter(
      (p) => GameState.getContract(gs, p)?.duration !== 0
    );
  }

  // try to resign the exipiring players according to the team needs and player scores
  static renewExipiringContracts(gs: GameState, t: Team): void {
    const notExpiring = Team.getNotExipiringPlayers(gs, t);
    let rtgs = new RatingAreaByNeed(notExpiring);
    let affordable = Team.canAfford(gs, t);
    const expiring = Team.getExipiringPlayers(gs, t).sort(
      (a, b) => ratingPlayerByNeed(b, rtgs) - ratingPlayerByNeed(a, rtgs)
    );

    // start by trying to sign the best ranking players
    expiring.forEach((p) => {
      if (
        Player.approachable(p, t) &&
        affordable(Player.wageRequest(p, t)) &&
        Team.shouldRenew(p, rtgs, notExpiring.length)
      ) {
        Team.signPlayer(gs, t, p);
        notExpiring.push(p);
        rtgs = new RatingAreaByNeed(notExpiring);
        affordable = Team.canAfford(gs, t);
      }
    });
  }

  // returns the wages sum of every not exipiring team player
  static getWagesAmount(gs: GameState, t: Team): number {
    return Team.getNotExipiringPlayers(gs, t).reduce(
      (a, p) => (GameState.getContract(gs, p)?.wage || 0) + a,
      0
    );
  }

  // returns the sum of all the monthly expenses wages and luxuryTax included
  static getMonthlyExpenses(gs: GameState, t: Team): number {
    const { health: hth, facilities: fts, scouting: sct } = t.finances;
    const ws = Team.getWagesAmount(gs, t);
    return ws + luxuryTax(ws) + minSalaryTax(ws) + hth + fts + sct;
  }

  // returns true when the team can afford the given wage for one year, min wage
  // is always affordable no matter team expenses
  static canAfford(gs: GameState, t: Team): Affordable {
    const { health, facilities, scouting, budget, revenue } = t.finances;
    const wages = Team.getWagesAmount(gs, t); // prevents calling it for every check

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
  static needPlayer(gs: GameState, t: Team): boolean {
    // TODO: take in cosideration the quality of the teamPlayers
    const players = Team.getNotExipiringPlayers(gs, t);
    const rgs = new RatingAreaByNeed(players);
    return players.length < 30 && Object.values(rgs).some((v) => v > 0);
  }

  /**
  if the team more than 29 players and it doesn't need the player position returns always false
  when the player are more than 25 returning true is less probable
  @param players - the number of team players
  */
  static shouldRenew(p: Player, r: RatingAreaByNeed, players: number): boolean {
    if (players <= 25 || r[getArea(p.position)] !== 0) {
      return renewalProbability(p, r) > Math.random();
    } else if (players < 30) {
      return renewalProbability(p, r) / 3 > Math.random();
    }

    return false;
  }

  // sign the best (by rating) affordable willing to sign player between the
  // given free agents returns the signed player
  static signFreeAgent(gs: GameState, t: Team, free: Player[]): Player | void {
    const affordable = Team.canAfford(gs, t);
    const signables = free.filter(
      (p) => Player.approachable(p, t) && affordable(Player.wageRequest(p, t))
    );
    const target = findBest(
      signables,
      new RatingAreaByNeed(Team.getNotExipiringPlayers(gs, t))
    );

    if (target) {
      Team.signPlayer(gs, t, target);
      return target;
    }
  }

  // monthly update the budget subtracting expenses and adding revenues
  static updateFinances(gs: GameState, t: Team): void {
    t.finances.budget += t.finances.revenue - Team.getMonthlyExpenses(gs, t);
  }

  // returns a team appeal score between 0 and 5
  // 3 points for the position in ranking ( the order of the array is the ranking )
  // 1 point for the fanbase size
  // 1 point for the position in facilityRanking ( the order of the array is the ranking )
  static calcAppeal(t: Team, ranking: Team[], facilityRanking: Team[]): number {
    const fanPoints = fanbaseScore[t.fanbase] / fanbaseScore.huge;
    const rankNth = ranking.indexOf(t);
    const facilityNth = facilityRanking.indexOf(t);
    const l = ranking.length - 1;
    return fanPoints + 3 * ((l - rankNth) / l) + (l - facilityNth) / l;
  }
}

// creates new contracts for the given player and save it to the gameState,
// the min contrat duration is 1 max 5
function signContract(s: GameState, t: Team, p: Player): Contract {
  const c = {
    teamName: t.name,
    playerId: p.id,
    wage: Player.wageRequest(p, t),
    duration: Math.floor(Math.random() * 4) + 1,
  };
  GameState.saveContract(s, c);

  return c;
}

// a rating of how mutch the player area is needed by a team with the given
// players the ratings are between 0 (low) 1 (high)
class RatingAreaByNeed {
  goolkeeper = 0;
  defender = 0;
  midfielder = 0;
  forward = 0;

  constructor(teamPlayers: Player[]) {
    const bound = (r: number) => Math.min(1, Math.max(0, r));
    // counts the players per area
    teamPlayers.forEach((p) => this[getArea(p.position)]++);
    this.goolkeeper = bound((3 - this.goolkeeper) / 3);
    this.defender = bound((8 - this.defender) / 8);
    this.midfielder = bound((8 - this.midfielder) / 8);
    this.forward = bound((6 - this.forward) / 6);
  }
}

// a rating of how mutch a player is needed by a team
// returns a value between 0 and 5 of one point is depended on the position needs
// and 4 on the score of the player
function ratingPlayerByNeed(p: Player, need: RatingAreaByNeed): number {
  return 4 * (Player.getScore(p) / MAX_SKILL) + need[getArea(p.position)];
}

// the team probability to sign the player, high score players have higher probability
// RatingAreaByNeed raises a little the probability when a positionArea is needed
// and halves it when there is no need for it
// returns a value between 0 and 1
// for players with score 72 to max return always 1 when the area is needed
// for players with score 54 to 0 return always 0
function renewalProbability(p: Player, need: RatingAreaByNeed): number {
  if (Player.getScore(p) <= 54) {
    return 0;
  }

  const scoreFct = Math.min(1, Math.max(0, (Player.getScore(p) - 48) / 24));
  const areaFct = Math.min(0.2, 1 - scoreFct) * need[getArea(p.position)];
  const probability = scoreFct + areaFct;
  return need[getArea(p.position)] === 0 ? probability / 2 : probability;
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
function findBest(ps: Player[], r: RatingAreaByNeed) {
  if (ps.length > 1) {
    return ps.reduce((a, b) =>
      ratingPlayerByNeed(b, r) > ratingPlayerByNeed(a, r) ? b : a
    );
  }

  return ps[0];
}

export {
  Contract,
  Team,
  RatingAreaByNeed,
  signContract,
  renewalProbability,
  ratingPlayerByNeed,
  initMoneyAmount,
  luxuryTax,
  minSalaryTax,
  findBest,
};
