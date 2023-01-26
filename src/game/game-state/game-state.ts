import {
  createPlayerAt,
  Injury,
  Player,
  PositionArea,
  wantedWage,
} from "../character/player";
import {
  Team,
  Contract,
  pickBest,
  calcAppeal,
  getWagesAmount,
  signPlayer,
} from "../character/team";
import { Schedule, Match } from "../game-sim/tournament-scheduler";
import {
  GameEvent,
  enqueueSkillUpdateEvent,
  setNewFormations,
  prepareSeasonStart,
  GameEventTypes,
  enqueueEventFor,
} from "../game-sim/game-simulation";
import { Mail, welcome } from "../character/mail";
import teamsJson from "../../asset/teams.json";
import { getPopStats, PopStats } from "./population-stats";
import { Trade } from "../game-sim/trade";
import { toISODateString } from "../../util/util";

const INIT_MONTH = 7; // august
const INIT_DATE = 1;
const INIT_HOUR = 10;
const MAX_MAILS = 30;

type ScheduleRound = { date: Date; matchIds: string[] };
/** team is an empty string when not picked and n NaN */
export type DraftPickRecord = { team: string; plId: string; n: number };
/** lottery is the teams' picking order  */
export type DraftRecord = {
  when: string;
  picks: DraftPickRecord[]; // the available players
  picked: DraftPickRecord[]; // the picked players removed from the picks
  lottery: string[];
};
/** the plIds is what the team is giving */
type TradeSideRecord = { team: string; plIds: string[] };
/** when is the a dateString */
export type TradeRecord = { when: string; sides: TradeSideRecord[] };
export type SigningRecord = { when: string; plId: string; team: string };
export type TransRecord = {
  // are all sorted from the least recent to most recent
  trades: TradeRecord[];
  signings: SigningRecord[];
  renewals: SigningRecord[];
};
/** the current season key is "now", for any other season key: {startYear}-{endYear} */
type Transactions = {
  [season: string]: TransRecord;
};

// instances of this interface are saved as JSON on the user machine, this is
// the game save
class GameState {
  name: string;
  date: Date;
  // sorted by dates, use enqueueGameEvents when adding events to preserve the order
  eventQueue: GameEvent[] = [];
  players: { [id: string]: Player } = {};
  teams: { [name: string]: Team } = {};
  contracts: { [playerId: string]: Contract } = {};
  /** the current season key is "now", for any other season key: {startYear}-{endYear} */
  schedules: { [season: string]: ScheduleRound[] } = {};
  matches: { [id: string]: Match } = {};
  mails: Mail[] = [];
  userTeam: string;
  /** player' ids that are going to retire */
  retiring: string[] = [];
  retirees: { [id: string]: { name: string } } = {};
  /** rejections by players to sign for the user team (cleared after some time) */
  rejections: { [id: string]: boolean } = {};
  /** the trade offers received by the user */
  tradeOffers: TradeRecord[] = [];
  /** all the current player injuries, indexed by the player id  */
  injuries: { [id: string]: Injury } = {};
  flags = {
    openTradeWindow: false,
    openFreeSigningWindow: true,
    userDrafting: false, // true when it is the user turn to pick
    canSimRound: true, // true when the user team has more than MIN_PLAYERS (check before a match)
    onGameEvent: undefined as GameEventTypes | undefined, // on which event the game is currently at (only for the user relevant events)
    signLimit: false, // when true the user should be able to sign only one new player per some amount of time
    signedNewPlayer: false, // when true means that the used signed a new player recently
    whyIsSimDisabled: "" as "missingLineup" | "underMinTeamSize" | "",
  };

  popStats: PopStats = {
    // it uses default stats (manual testing) until they don't get inited
    // when the skills get modified this default should change too
    sampleSize: 0,
    meanScore: 62,
    medianScore: 62,
    lowestScore: 45,
    highestScore: 75,
    standardDev: 5.6,
  };

  /** current season key is "now", any other season key: {draft-year},
   *the draft is created at the season start */
  drafts: { [season: string]: DraftRecord } = {};
  transactions: Transactions = {
    now: { trades: [], signings: [], renewals: [] },
  };

  constructor(date: Date, userTeam = "", name = "") {
    this.userTeam = userTeam;
    this.name = name;
    this.date = new Date(date.getTime());
  }
}

/**
 * init a new game state filling it with players, team and all the necessary,
 * the returned state is not complete right away, some not essential data is
 * added asynchronously (formations)
 * not essential data don't get saved in the JSON file
 * @param teams part of the game
 * @param uTeam the user team name
 * @param gName the game name
 * @param onComplete called when the game state is fully complete
 * @returns a new not complete game state util onComplete is called
 */
export function init(
  teams = Object.keys(teamsJson),
  uTeam = "",
  gName = "",
  onComplete?: () => unknown
): GameState {
  const s = new GameState(
    new Date(new Date().getFullYear(), INIT_MONTH, INIT_DATE, INIT_HOUR),
    teams.find((t) => t === uTeam) ? uTeam : "",
    gName
  );
  initTeams(s, teams);
  initGameEvents(s);
  initTeamsAppeal(s);
  s.mails = [welcome(uTeam, s.date)];
  s.popStats = getPopStats(Object.values(s.players));
  setNewFormations(s).then(() => onComplete); // no need to wait for not essential data
  // NOTE: rejections isn't inited because most of the starting free agent aren't great...
  return s;
}

// rehydrate the given gameState JSON
export function parse(gameState: string): GameState {
  return JSON.parse(gameState, (k, v) => (k === "date" ? new Date(v) : v));
}

// add a new game event preserving the order by date of the queue
export function enqueueGameEvent(s: GameState, e: GameEvent): void {
  // TODO: use binary search or a priority queue...
  const findOlder = (evt: GameEvent) => evt.date.getTime() > e.date.getTime();
  const i = s.eventQueue.findIndex(findOlder);
  i !== -1 ? s.eventQueue.splice(i, 0, e) : s.eventQueue.push(e);
}

// get all team players or an empty array when the then doesn't exist
export function getTeamPlayers(s: GameState, team: string): Player[] {
  return s.teams[team]?.playerIds.map((id) => s.players[id]) ?? [];
}

export function saveContract(s: GameState, c: Contract): void {
  s.contracts[c.playerId] = c;
}

export function deleteContract(s: GameState, c: Contract): void {
  delete s.contracts[c.playerId];
}

export function getContract(s: GameState, p: Player): Contract | void {
  return s.contracts[p.id];
}

// overrides the old player contract
export function savePlayer(s: GameState, p: Player): void {
  s.players[p.id] = p;
}

export function saveTeam(s: GameState, t: Team): void {
  s.teams[t.name] = t;
}

/**
 * the saved schedule is flatten in two object schedules and matches
 * key is used as index for the schedule, for the current season use the "now" as key
 */
export function saveSchedule(s: GameState, scd: Schedule, key: string): void {
  s.schedules[key] = [];

  scd.rounds.forEach((round) => {
    s.schedules[key].push({
      date: round.date,
      matchIds: round.matches.map((m) => m.id),
    });

    round.matches.forEach((m) => {
      s.matches[m.id] = m;
    });
  });
}

/**
 * @param season key for the current seasons: "now" any other season key: {startYear}-{endYear}
 * @returns all the round of the given season
 */
export function getSeasonRounds(
  s: GameState,
  season: string
): Match[][] | void {
  return s.schedules[season]?.map((rnd) =>
    rnd.matchIds.map((id) => s.matches[id])
  );
}

/** get the next round (0 included) of the current season */
export function getNextRound(s: GameState): number | void {
  return s.eventQueue.find((e: GameEvent) => e.type === "simRound")?.detail
    ?.round;
}

/**
 * @param season key for the current seasons: "now" any other season key: {startYear}-{endYear}
 * @returns the n round of the the current season
 */
export function getRound(
  s: GameState,
  n: number,
  season: string
): Match[] | void {
  return s.schedules?.[season]?.[n].matchIds.map((id) => s.matches[id]);
}

/**
 * @param season key for the current seasons: "now" any other season key: {startYear}-{endYear}
 * @returns all the matches of the given season (in order) or an empty array otherwise
 */
export function getSeasonMatches(s: GameState, season: string): Match[] {
  return getSeasonRounds(s, season)?.flat() ?? [];
}

/** convert the given trade to a tradeRecord */
export function toTradeRecord(t: Trade, when: Date): TradeRecord {
  return {
    when: toISODateString(when),
    sides: [
      { team: t.side1.by.name, plIds: t.side1.content.map((p) => p.id) },
      { team: t.side2.by.name, plIds: t.side2.content.map((p) => p.id) },
    ],
  };
}

/** add the given mail to game state, the oldest mail get removed if there are more than MAX_MAILS */
export function addMail(gs: GameState, m: Mail): void {
  if (gs.mails.length >= MAX_MAILS) {
    gs.mails.pop();
  }

  gs.mails.unshift(m);
}

/**
  create n new players at the given position area and add them to the given gameState
  @param genAge age generator if not given use the default
  @returns the players created
*/
function createPlayers(
  s: GameState,
  at: PositionArea,
  n: number,
  genAge?: () => number
): Player[] {
  return Array.from({ length: n }, () => {
    const p = createPlayerAt(s.date, at, genAge ? genAge() : undefined);
    savePlayer(s, p);
    return p;
  });
}

// create new teams with the given names fill them with some new created players
// add everything to the given gameState and returns created teams
function initTeams(gs: GameState, names: string[]): Team[] {
  return names.map((name) => {
    const team = new Team(name);
    saveTeam(gs, team);
    const signPlayers = (pls: Player[]) =>
      pls.forEach((p) => signPlayer({ gs, t: team, p }, wantedWage(gs, p)));

    const arg = { gs, t: team };
    signPlayers(pickBest(arg, createPlayers(gs, "goalkeeper", 4), 3));
    signPlayers(pickBest(arg, createPlayers(gs, "defender", 10), 8));
    signPlayers(pickBest(arg, createPlayers(gs, "midfielder", 10), 8));
    signPlayers(pickBest(arg, createPlayers(gs, "forward", 8), 6));
    // squad number are resigned in the iniGameEvents with the prepareSeasonStart function
    // so it doesn't matter if for now they are not great
    return team;
  });
}

// save the starting events for the game in te gameState.eventQueue as
// skillUpdate and simRound for the first round (when the current season schedule exists)
function initGameEvents(gs: GameState): void {
  prepareSeasonStart(gs);
  enqueueSkillUpdateEvent(gs);
  enqueueEventFor(gs, gs.date, "injuriesUpdate", { days: 1 });
  enqueueGameEvent(gs, {
    date: new Date(gs.date.getFullYear(), gs.date.getMonth() + 1, 0),
    type: "updateFinances",
  });
}

// set the teams appeal according wages ranking (large payroll == good team)
// and facilities expenses etc
function initTeamsAppeal(gs: GameState): void {
  const ranking = Object.values(gs.teams).sort(
    (a, b) => getWagesAmount({ gs, t: b }) - getWagesAmount({ gs, t: a })
  );
  const facilities = Object.values(gs.teams).sort(
    (a, b) => b.finances.facilities - a.finances.facilities
  );
  ranking.forEach((t) => (t.appeal = calcAppeal(t, ranking, facilities)));
}

export {
  INIT_MONTH,
  INIT_DATE,
  GameState,
  createPlayers,
  initTeams,
  initGameEvents,
  initTeamsAppeal,
};
