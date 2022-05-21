import { Player, getArea, MAX_SKILL } from "./player";
import { GameState } from "../game-state/game-state";
import teamsJson from "../asset/teams.json";
const teams: { [team: string]: any } = teamsJson;

type Fanbase = "huge" | "big" | "medium" | "small" | "verySmall";
const fanbaseScore: Readonly<Record<Fanbase, number>> = {
  huge: 4,
  big: 3,
  medium: 2,
  small: 1,
  verySmall: 0,
};

function initMoneyAmount(fb: Fanbase, min: number): number {
  const extra = (1.3 * min) / 5;
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

  constructor(name: string) {
    this.name = name;
    this.fanbase = teams[name] ? teams[name].fanbase : "verySmall";
    this.finances = {
      budget: initMoneyAmount(this.fanbase, 2_000_000),
      revenue: initMoneyAmount(this.fanbase, 300_000),
      health: initMoneyAmount(this.fanbase, 20_000),
      scouting: initMoneyAmount(this.fanbase, 20_000),
      facilities: initMoneyAmount(this.fanbase, 20_000),
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
    const expiring = Team.getExipiringPlayers(gs, t).sort(
      (a, b) => ratingPlayerByNeed(b, rtgs) - ratingPlayerByNeed(a, rtgs)
    );

    // start by trying to sign the best ranking players
    expiring.forEach((p) => {
      if (teamSignPlayerProbability(p, rtgs) >= Math.random()) {
        Team.signPlayer(gs, gs.teams[t.name], p);
        notExpiring.push(p);
        rtgs = new RatingAreaByNeed(notExpiring);
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

  // returns the sum of all the monthly expenses
  static getMonthlyExpenses(gs: GameState, t: Team): number {
    const { health, facilities, scouting } = t.finances;
    return Team.getWagesAmount(gs, t) + health + facilities + scouting;
  }

  // monthly update the budget subtracting expenses and adding revenues
  static updateFinances(gs: GameState, t: Team): void {
    t.finances.budget +=
      t.finances.revenue -
      Team.getMonthlyExpenses(gs, t) -
      Team.getWagesAmount(gs, t);
  }
}

// creates new contracts for the given player and save it to the gameState,
// the min contrat duration is 1 max 5
function signContract(s: GameState, t: Team, p: Player): Contract {
  const c = {
    teamName: t.name,
    playerId: p.id,
    wage: Player.wantedWage(p),
    duration: Math.floor(Math.random() * 5) + 1,
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

// the team probability to sign the player, high score player have higher probability
// RatingAreaByNeed raises a little the probability when a positionArea is needed
// returns a value between 0 and 1
// for players with score 70 to max return always 1
function teamSignPlayerProbability(p: Player, need: RatingAreaByNeed): number {
  const scoreFct = Math.min(1, Math.max(0, (Player.getScore(p) - 40) / 30));
  const areaFct = Math.min(0.2, 1 - scoreFct) * need[getArea(p.position)];
  return scoreFct + areaFct;
}

export {
  Contract,
  Team,
  RatingAreaByNeed,
  signContract,
  teamSignPlayerProbability,
  ratingPlayerByNeed,
  initMoneyAmount,
};
