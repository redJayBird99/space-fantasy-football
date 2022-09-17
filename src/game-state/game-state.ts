import { Player, PositionArea } from "../character/player";
import { Team, Contract, pickBest } from "../character/team";
import { Schedule, Match } from "../game-sim/tournament-scheduler";
import {
  GameEvent,
  handleSeasonStart,
  enqueueSkillUpdateEvent,
} from "../game-sim/game-simulation";
import { Mail, welcome } from "../character/mail";
import teamsJson from "../asset/teams.json";
import { getPopStats, PopStats } from "./population-stats";
import * as db from "./game-db";

const INIT_MONTH = 7; // august
const INIT_DATE = 1;
const INIT_HOUR = 10;
type ScheduleRound = { date: Date; matchIds: string[] };

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
  schedules: { [year: string]: ScheduleRound[] } = {};
  matches: { [id: string]: Match } = {};
  mails: Mail[] = [];
  userTeam: string;
  flags = { openTradeWindow: false, openFreeSigningWindow: true };
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

  constructor(date: Date, userTeam = "", name = "") {
    this.userTeam = userTeam;
    this.name = name;
    this.date = new Date(date.getTime());
  }

  // init a new game state filling it with players, team and all the necessary for a new game

  /**
   * @param teams part of the game
   * @param team user team
   * @param name of the game
   * @returns a new game state with the given teams, user team and name
   */
  static init(teams = Object.keys(teamsJson), team = "", name = ""): GameState {
    const s = new GameState(
      new Date(new Date().getFullYear(), INIT_MONTH, INIT_DATE, INIT_HOUR),
      teams.find((t) => t === team) ? team : "",
      name
    );
    initTeams(s, teams);
    initGameEvents(s);
    initTeamsAppeal(s);
    s.mails = [welcome(team, s.date)];
    s.popStats = getPopStats(Object.values(s.players));

    return s;
  }

  // rehydrate the given gameState JSON
  static parse(gameState: string): GameState {
    return JSON.parse(gameState, (k, v) => (k === "date" ? new Date(v) : v));
  }

  // add a new game event preserving the order by date of the queue
  static enqueueGameEvent(s: GameState, e: GameEvent): void {
    // TODO: use binary search or a priority queue...
    const findOlder = (evt: GameEvent) => evt.date.getTime() > e.date.getTime();
    const i = s.eventQueue.findIndex(findOlder);
    i !== -1 ? s.eventQueue.splice(i, 0, e) : s.eventQueue.push(e);
  }

  // get all team players or an empty array when the then doesn't exist
  static getTeamPlayers(s: GameState, team: string): Player[] {
    return s.teams[team]?.playerIds.map((id) => s.players[id]) ?? [];
  }

  static saveContract(s: GameState, c: Contract): void {
    s.contracts[c.playerId] = c;
  }

  static deleteContract(s: GameState, c: Contract): void {
    delete s.contracts[c.playerId];
  }

  static getContract(s: GameState, p: Player): Contract | void {
    return s.contracts[p.id];
  }

  // overrides the old player contract
  static savePlayer(s: GameState, p: Player): void {
    s.players[p.id] = p;
  }

  static saveTeam(s: GameState, t: Team): void {
    s.teams[t.name] = t;
  }

  /**
   * the saved schedule is flatten in two object schedules and matches
   * key is used as index for the schedule, for the current season use the "now" as key
   */
  static saveSchedule(s: GameState, scd: Schedule, key: string): void {
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
  static getSeasonRounds(s: GameState, season: string): Match[][] | void {
    return s.schedules[season]?.map((rnd) =>
      rnd.matchIds.map((id) => s.matches[id])
    );
  }

  /** get the next round (0 included) of the current season */
  static getNextRound(s: GameState): number | void {
    return s.eventQueue.find((e: GameEvent) => e.type === "simRound")?.detail
      ?.round;
  }

  /**
   * @param season key for the current seasons: "now" any other season key: {startYear}-{endYear}
   * @returns the n round of the the current season
   */
  static getRound(s: GameState, n: number, season: string): Match[] | void {
    return s.schedules?.[season]?.[n].matchIds.map((id) => s.matches[id]);
  }

  /**
   * @param season key for the current seasons: "now" any other season key: {startYear}-{endYear}
   * @returns all the matches of the given season (in order) or an empty array otherwise
   */
  static getSeasonMatches(s: GameState, season: string): Match[] {
    return GameState.getSeasonRounds(s, season)?.flat() ?? [];
  }
}

/** sync the tabs games when the gameState is updated */
let BChannel: BroadcastChannel | null;
try {
  BChannel = new BroadcastChannel("sync-game");
  BChannel.onmessage = (e) => window.$game.onSyncGameUpdate(e.data);
} catch (e: any) {
  // just to make jest shut up
}

interface GameStateObserver {
  gameStateUpdated: (gs: Readonly<GameState> | undefined) => void;
}

class GameStateHandle {
  private observers: Set<GameStateObserver> = new Set();
  private _state?: GameState;
  private updateScheduled = false;

  get state(): Readonly<GameState> | undefined {
    return this._state;
  }

  /** it will notify every observer of the change */
  set state(updated: GameState | undefined) {
    const init = !this._state;
    this._state = updated;
    this.onUpdate();

    if (!init) {
      this.sendState();
    }
  }

  /** send the state to the other open tabs */
  private sendState(): void {
    try {
      BChannel?.postMessage(this.state);
    } catch (e: any) {
      // only to make jest shut up
    }
  }

  /**
   * every time the gs get modified call this method to notify every observer,
   * it batches multiple calls during the same cycle triggers only one call,
   * performed asynchronously at microtask timing.
   */
  private onUpdate(): void {
    if (!this.updateScheduled) {
      this.updateScheduled = true;
      queueMicrotask(() => {
        this.notifyObservers();
        this.updateScheduled = false;
      });
    }
  }

  // if an object depended on the GameState should add itself as an observer
  // every GameStateObserver will be notified when the gameState change
  addObserver(ob: GameStateObserver): void {
    this.observers.add(ob);
  }

  removeObserver(ob: GameStateObserver): void {
    this.observers.delete(ob);
  }

  private notifyObservers(): void {
    this.observers.forEach((ob) => ob.gameStateUpdated(this._state));
  }

  /** get the gameState as a json url, the resource must be revoked when not used */
  getStateAsJsonUrl(): string {
    return URL.createObjectURL(
      new Blob([JSON.stringify(this._state)], { type: "application/json" })
    );
  }

  /** init a new gameSate and try to save it on the db */
  newGame(userTeam?: string, gameName?: string): void {
    this.state = GameState.init(undefined, userTeam, gameName);
    this.saveNewGSOnDB();
  }

  /** load the given the gameState, any similar named game on the db will be overridden */
  loadGameFrom(gs: GameState): void {
    this._state = gs;
    this.saveNewGSOnDB();
  }

  /** try to save the current gameState as a new entry on the db, if a game name is provided */
  private saveNewGSOnDB(): void {
    if (this._state?.name) {
      db.openNewGame(this._state);
    }
  }

  /** try to save the current gameState on the current db, if a game name is provided */
  saveGsOnDB(onSaved?: () => unknown): void {
    if (this._state?.name) {
      db.saveGame(this._state, onSaved);
    } else {
      onSaved?.();
    }
  }

  /**
   * try to load a saved game from the local machine database
   * @param name of the saved game
   * @param onLoad called after the save was successfully loaded
   * @param onErr called after an unsuccessful attempt
   */
  loadGameFromDB(name: string, onLoad: () => unknown, onErr: () => unknown) {
    db.openGame(
      name,
      (s: GameState) => {
        this.state = s;
        onLoad();
      },
      onErr
    );
  }

  /**
   * delete the game with the given name (from the db too)
   * @param onDel called after the deletion
   */
  deleteGame(name: string, onDel: () => unknown): void {
    if (this._state?.name === name) {
      delete this._state;
    }

    if (db.getSavesNames().includes(name)) {
      db.deleteGame(name, onDel);
    } else {
      // in case the user is not using the db
      onDel();
    }
  }

  /** when a game in another tab get updated, this will handles the synchronization when needed */
  onSyncGameUpdate(gs: GameState): void {
    if (gs.name === this._state?.name) {
      this._state = gs; // set _state directly otherwise would call BChannel.postMessage again
      this.notifyObservers();
    }
  }
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
    const p = Player.createPlayerAt(s.date, at, genAge ? genAge() : undefined);
    GameState.savePlayer(s, p);
    return p;
  });
}

// create new teams with the given names fill them with some new created players
// add everything to the given gameState and returns created teams
function initTeams(gs: GameState, names: string[]): Team[] {
  return names.map((name) => {
    const team = new Team(name);
    GameState.saveTeam(gs, team);
    const signPlayers = (pls: Player[]) =>
      pls.forEach((p) =>
        Team.signPlayer({ gs, t: team, p }, Player.wantedWage(gs, p))
      );

    const arg = { gs, t: team };
    signPlayers(pickBest(arg, createPlayers(gs, "goalkeeper", 4), 3));
    signPlayers(pickBest(arg, createPlayers(gs, "defender", 10), 8));
    signPlayers(pickBest(arg, createPlayers(gs, "midfielder", 10), 8));
    signPlayers(pickBest(arg, createPlayers(gs, "forward", 8), 6));
    return team;
  });
}

// save the starting events for the game in te gameState.eventQueue as
// skillUpdate and simRound for the first round (when the current season schedule exists)
function initGameEvents(gs: GameState): void {
  handleSeasonStart(gs);
  enqueueSkillUpdateEvent(gs);
  GameState.enqueueGameEvent(gs, {
    date: new Date(gs.date.getFullYear(), gs.date.getMonth() + 1, 0),
    type: "updateFinances",
  });
}

// set the teams appeal according wages ranking (large payroll == good team)
// and facilities expenses etc
function initTeamsAppeal(gs: GameState): void {
  const ranking = Object.values(gs.teams).sort(
    (a, b) =>
      Team.getWagesAmount({ gs, t: b }) - Team.getWagesAmount({ gs, t: a })
  );
  const facilities = Object.values(gs.teams).sort(
    (a, b) => b.finances.facilities - a.finances.facilities
  );
  ranking.forEach((t) => (t.appeal = Team.calcAppeal(t, ranking, facilities)));
}

export {
  INIT_MONTH,
  INIT_DATE,
  GameState,
  GameStateObserver,
  GameStateHandle,
  createPlayers,
  initTeams,
  initGameEvents,
  initTeamsAppeal,
};
