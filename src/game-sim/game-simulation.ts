import {
  GameStateHandle,
  GameState,
  createPlayers,
} from "../game-state/game-state";
import { LeagueTable } from "../game-state/league-table";
import { Schedule } from "./tournament-scheduler";
import { Player, MIN_AGE } from "../character/player";
import { Team, MAX_SCOUTING_OFFSET } from "../character/team";
import { shuffle } from "../util/generator";
import { within } from "../util/math";
import { getPopStats } from "../game-state/population-stats";
import { makeTrades } from "./trade";

const NEXT_HOURS = 12;
const SEASON_START_MONTH = 8; // september
const SEASON_START_DATE = 1;
const SEASON_END_MONTH = 5; // june, the distance is enough for 38 games every week from the start of the season
const SEASON_END_DATE = 1;

type GameEventTypes =
  | "simRound"
  | "skillUpdate"
  | "seasonEnd"
  | "seasonStart"
  | "updateContract"
  | "updateFinances"
  | "signings"
  | "draft"
  | "retiring"
  | "trade"
  | "openTradeWindow"
  | "openFreeSigningWindow"
  | "closeFreeSigningWindow";
type SimRound = { round: number };
type DateOffset = { years?: number; months?: number; days?: number };

interface GameEvent {
  date: Date;
  type: GameEventTypes;
  detail?: SimRound;
}

// when the simulation is running no other piece of code should mutate the
// gameState set up some modal page to prevent any interaction until it's stopped
class GameSimulation {
  gsh: GameStateHandle;
  stopped = true;

  constructor(gsh: GameStateHandle) {
    this.gsh = gsh;
  }

  // start the game simulation, it can be stopped by the stopped flag or by
  // the occurrence of some particular event
  run(): void {
    this.stopped = false;
    const gState = this.gsh.state;
    const runSim = () => {
      this.stopped = process(gState);
      this.stopped ? (this.gsh.state = gState) : requestAnimationFrame(runSim);
    };

    window.requestAnimationFrame(runSim);
  }
}

/**
 * it is the main function that drives the simulation moving the game clock ahead
 * handling gameEvent and enqueuing new ones, it runs until a signle event is
 * handleed or for a max cycle of 24 hours (game time)
 * it doesn't run if there isn't any event on the event queue
 * @returns true when the simulation should momentarily stop
 */
function process(gs: GameState): boolean {
  for (let t = 0; t < 24 && gs.eventQueue.length !== 0; t += NEXT_HOURS) {
    if (gs.date.getTime() >= gs.eventQueue[0]?.date.getTime()) {
      return handleGameEvent(gs, gs.eventQueue.shift()!);
    } else {
      gs.date.setHours(gs.date.getHours() + NEXT_HOURS);
    }
  }

  return gs.eventQueue.length === 0;
}

// returns true when a particular event handling require to momentarily stop the simulation
function handleGameEvent(gs: GameState, evt: GameEvent): boolean {
  if (evt.type === "simRound") {
    return handleSimRound(gs, evt.detail as SimRound);
  } else if (evt.type === "skillUpdate") {
    return handleSkillUpdate(gs);
  } else if (evt.type === "seasonEnd") {
    return handleSeasonEnd(gs, evt);
  } else if (evt.type === "seasonStart") {
    return handleSeasonStart(gs);
  } else if (evt.type === "updateContract") {
    return handleUpdateContracts(gs, evt);
  } else if (evt.type === "updateFinances") {
    return handleUpdateFinances(gs);
  } else if (evt.type === "signings") {
    return handleSignings(gs);
  } else if (evt.type === "retiring") {
    return handleRetiring(gs);
  } else if (evt.type === "draft") {
    return handleDraft(gs);
  } else if (evt.type === "trade") {
    return handleTrade(gs);
  } else if (evt.type === "openTradeWindow") {
    return handleOpenTradeWindow(gs);
  } else if (evt.type === "openFreeSigningWindow") {
    return handleOpenFreeSigningWindow(gs);
  } else if (evt.type === "closeFreeSigningWindow") {
    return handleCloseFreeSigningWindow(gs);
  }

  return false;
}

function handleSimRound(gs: GameState, r: SimRound): boolean {
  simulateRound(gs, r.round);
  enqueueSimRoundEvent(gs, r.round + 1);
  return false;
}

function handleSkillUpdate(gs: GameState): boolean {
  updateSkills(gs);
  enqueueSkillUpdateEvent(gs);
  gs.popStats = getPopStats(Object.values(gs.players));
  return true;
}

function handleSeasonEnd(gs: GameState, e: GameEvent): boolean {
  storeEndedSeasonSchedule(gs);
  enqueueSeasonStartEvent(gs);
  updateTeamsAppeal(gs);
  updateTeamsScouting(gs);
  return true;
}

/**
 * start a new season schedule and enqueue close the trade window and
 * new seasons events like closeFreeSigningWindow, retiring, draft, updateContract etc
 */
function handleSeasonStart(gs: GameState): boolean {
  newSeasonSchedule(gs, Object.keys(gs.teams));
  gs.flags.openTradeWindow = false;
  enqueueSimRoundEvent(gs, 0);
  const endDate = enqueueSeasonEndEvent(gs).date;
  enqueueEventFor(gs, endDate, "closeFreeSigningWindow", { months: -1 });
  enqueueEventFor(gs, endDate, "retiring", { days: 1 });
  enqueueEventFor(gs, endDate, "updateContract", { days: 2 });
  enqueueEventFor(gs, endDate, "draft", { days: 3 });
  enqueueEventFor(gs, endDate, "openTradeWindow", { days: 4 });
  enqueueEventFor(gs, endDate, "openFreeSigningWindow", { days: 4 });

  return true;
}

function handleUpdateContracts(gs: GameState, e: GameEvent): boolean {
  updateContracts(gs);
  renewExipiringContracts(gs);
  removeExpiredContracts(gs);
  return false;
}

function handleUpdateFinances(gs: GameState): boolean {
  Object.values(gs.teams).forEach((t) => Team.updateFinances({ gs, t }));
  enqueueUpdateFinancesEvent(gs);
  return false;
}

/**
 * if the free signing window is open try to sign some players for each team and
 * enqueue the next signings event weekly if the season already started otherwise daily
 */
function handleSignings(gs: GameState): boolean {
  if (gs.flags.openFreeSigningWindow) {
    teamsSignFreeAgents(gs);
    // if the season didn't already try new signings every day
    const days = gs.eventQueue.some((e) => e.type === "seasonStart") ? 1 : 7;
    enqueueEventFor(gs, gs.date, "signings", { days });
  }

  return false;
}

// retires some old players and remove it from the game
// TODO: save them on the indexedDb
function handleRetiring(gs: GameState): boolean {
  Object.values(gs.players)
    .filter((p) => Player.retire(p, gs.date))
    .forEach((p) => {
      const c = GameState.getContract(gs, p);
      c && Team.unsignPlayer(gs, c);
      delete gs.players[p.id];
    });

  return true;
}

// differently from the nba only one player get drafted
function handleDraft(gs: GameState): boolean {
  let players = createDraftPlayers(gs);

  shuffle(Object.values(gs.teams)).forEach((t) => {
    const plr = Team.pickDraftPlayer({ gs, t }, players);
    players = players.filter((p) => plr !== p);
  });

  return true;
}

/**
 * when the trade window is open try to do some trade between teams
 */
function handleTrade(gs: GameState): boolean {
  if (gs.flags.openTradeWindow) {
    makeTrades(gs);
    enqueueEventFor(gs, gs.date, "trade", { days: 1 });
  }

  return false;
}

/**
 * open the trade window and enqueue a trade event
 */
function handleOpenTradeWindow(gs: GameState): boolean {
  gs.flags.openTradeWindow = true;
  enqueueEventFor(gs, gs.date, "trade", { days: 1 });
  return false;
}

/**
 * open the free signing window setting the gamestate flag to false and enqueue a sigings event
 */
function handleOpenFreeSigningWindow(gs: GameState): boolean {
  gs.flags.openFreeSigningWindow = true;
  enqueueEventFor(gs, gs.date, "signings", { days: 1 });
  return false;
}

/**
 * close the free signing window setting the gamestate flag to false
 */
function handleCloseFreeSigningWindow(gs: GameState): boolean {
  gs.flags.openFreeSigningWindow = false;
  return false;
}

// add 52 new teens Players in every position area to the game and return them
function createDraftPlayers(gs: GameState): Player[] {
  const genTeens = () => MIN_AGE + Math.floor(Math.random() * (20 - MIN_AGE));
  return [
    ...createPlayers(gs, "goolkeeper", 6, genTeens),
    ...createPlayers(gs, "defender", 17, genTeens),
    ...createPlayers(gs, "midfielder", 17, genTeens),
    ...createPlayers(gs, "forward", 12, genTeens),
  ];
}

function updateContracts(gs: GameState): void {
  Object.values(gs.contracts).forEach((c) => c.duration--);
}

// every team try to resign most exipiring players according to their needs
function renewExipiringContracts(gs: GameState): void {
  Object.values(gs.teams).forEach((t) => {
    Team.renewExipiringContracts({ gs, t });
  });
}

function removeExpiredContracts(gs: GameState): void {
  Object.values(gs.contracts).forEach((c) => {
    if (c.duration === 0) {
      Team.unsignPlayer(gs, c);
    }
  });
}

// simulate all the match for the given round of this season schedule
// every results is saved on the gameState
function simulateRound(gs: GameState, round: number): void {
  gs.schedules.now?.[round]?.matchIds.forEach((id) => simulateMatch(gs, id));
}

// change the teams appeal according to the season results (and maybe some facilities change).
// the max magnitude change is of 1 point (the parameter should be stable over time)
function updateTeamsAppeal(gs: GameState): void {
  const ranking = new LeagueTable(GameState.getSeasonMatches(gs, "now"))
    .getSortedTable()
    .map((e) => gs.teams[e.teamName]);
  const facilities = Object.values(gs.teams).sort(
    (a, b) => b.finances.facilities - a.finances.facilities
  );
  ranking.forEach((t) => {
    const newAppeal = Team.calcAppeal(t, ranking, facilities);
    t.appeal += within(newAppeal - t.appeal, -1, 1);
  });
}

// change the teams.scoutOffset according to team scountig expenses ranking and
// randomness the max magnitude change MAX_SCOUTING_OFFSET / 10
function updateTeamsScouting(gs: GameState): void {
  const dif = MAX_SCOUTING_OFFSET / 10;
  const teams = Object.values(gs.teams);
  teams
    .sort((a, b) => b.finances.scouting - a.finances.scouting)
    .forEach((t, i) => {
      const to = (MAX_SCOUTING_OFFSET - dif) * (i / (teams.length - 1)) + dif;
      const mv = within((to - t.scoutOffset) * Math.random(), -dif, dif);
      t.scoutOffset = within(t.scoutOffset + mv, 0, MAX_SCOUTING_OFFSET);
    });
}

// enqueue in the gameState a new gameEvent for the given current season round if it exists
function enqueueSimRoundEvent(gs: GameState, round: number): void {
  if (gs.schedules.now?.[round]) {
    GameState.enqueueGameEvent(gs, {
      date: gs.schedules.now[round].date,
      type: "simRound",
      detail: { round },
    });
  }
}

// TODO: implement a real one
function simulateMatch(gs: GameState, matchId: string): void {
  const match = gs.matches[matchId];
  const goals = () => Math.floor(Math.random() * 6);
  match.result = { home: goals(), away: goals() };
}

// applies the monthly growth and degrowth for every player stored in gs
function updateSkills(gs: GameState): void {
  for (const id in gs.players) {
    Player.applyMonthlyGrowth(gs.players[id], gs.date);
    Player.applyMonthlyDegrowth(gs.players[id], gs.date);
  }
}

// simulate the teams signing new players, sign only one player per team and
// only if the team needs it
function teamsSignFreeAgents(gs: GameState): void {
  const teams = Object.values(gs.teams).filter((t) =>
    Team.needPlayer({ gs, t })
  );
  let free = Object.values(gs.players).filter((p) => p.team === "free agent");

  shuffle(teams).forEach((team) => {
    const signed = Team.signFreeAgent({ gs, t: team }, free);

    if (signed) {
      free = free.filter((p) => p !== signed);
    }
  });
}

// enqueues a skillUpdate type GameEvent on gs.eventQueue for the first day of next month
function enqueueSkillUpdateEvent(gs: GameState): void {
  const d = gs.date;
  const date = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  GameState.enqueueGameEvent(gs, { date, type: "skillUpdate" });
}

/**
 * enqueues a seasonEnd type GameEvent on gs.eventQueue for june first of next year
 * @returns return the enqueued event
 */
function enqueueSeasonEndEvent(gs: GameState): GameEvent {
  const year = gs.date.getFullYear() + 1;
  const date = new Date(year, SEASON_END_MONTH, SEASON_END_DATE);
  const evt: GameEvent = { date, type: "seasonEnd" };
  GameState.enqueueGameEvent(gs, evt);
  return evt;
}

// enqueues a seasonStart type GameEvent on gs.eventQueue for september first of this year
function enqueueSeasonStartEvent(gs: GameState): void {
  const y = gs.date.getFullYear();
  const date = new Date(y, SEASON_START_MONTH, SEASON_START_DATE);
  GameState.enqueueGameEvent(gs, { date, type: "seasonStart" });
}

/**
 * enqueues the given type GameEvent on gs.eventQueue after the given offset
 * from the staring date, if the event date would be previous of
 * the current game date it won't be scheduled
 * @param d the starting date
 * @param off amount of time after or before the given date
 * @returns return true when was possible to schedule the event
 */
function enqueueEventFor(
  gs: GameState,
  d: Date,
  t: GameEventTypes,
  off?: DateOffset
): boolean {
  const date = new Date(
    d.getFullYear() + (off?.years || 0),
    d.getMonth() + (off?.months || 0),
    d.getDate() + (off?.days || 0)
  );

  if (gs.date.getTime() > date.getTime()) {
    return false;
  }

  GameState.enqueueGameEvent(gs, { date, type: t });
  return true;
}

// enqueues a updateFinances type GameEvent on gs.eventQueue for the last day of the next month
function enqueueUpdateFinancesEvent(gs: GameState): void {
  const date = new Date(gs.date.getFullYear(), gs.date.getMonth() + 2, 0);
  GameState.enqueueGameEvent(gs, { date, type: "updateFinances" });
}

// save a new schedule for the current season to the gamestate, should be called
// before SEASON_END_MONTH and SEASON_START_DATE + 1 of the same year
function newSeasonSchedule(gs: GameState, teams: string[]): void {
  const start = new Date(
    gs.date.getFullYear(),
    SEASON_START_MONTH,
    SEASON_START_DATE + 1
  );

  if (start.getTime() <= gs.date.getTime()) {
    throw new Error("should be called before september second");
  }

  const daysToSunday = (7 - start.getDay()) % 7;
  start.setDate(start.getDate() + daysToSunday);
  GameState.saveSchedule(gs, new Schedule(teams, start), "now");
}

// store the current season on the gameState.schedules with key {startYear}-{endYear}
// only if the current season (as gs.schedules.now) exists
function storeEndedSeasonSchedule(gs: GameState): void {
  const schd = gs.schedules.now;

  if (schd) {
    const startY = schd[0].date.getFullYear();
    const endY = schd[schd.length - 1].date.getFullYear();
    gs.schedules[`${startY}-${endY}`] = gs.schedules.now;
  }
}

export {
  SEASON_START_MONTH,
  SEASON_START_DATE,
  SEASON_END_MONTH,
  SEASON_END_DATE,
  SimRound,
  GameEvent,
  GameSimulation,
  process,
  handleGameEvent,
  handleSimRound,
  handleSkillUpdate,
  handleSeasonEnd,
  handleSeasonStart,
  handleUpdateContracts,
  handleUpdateFinances,
  handleSignings,
  handleRetiring,
  handleDraft,
  handleTrade,
  handleOpenTradeWindow,
  handleOpenFreeSigningWindow,
  handleCloseFreeSigningWindow,
  createDraftPlayers,
  simulateRound,
  updateSkills,
  updateContracts,
  teamsSignFreeAgents,
  updateTeamsAppeal,
  updateTeamsScouting,
  renewExipiringContracts,
  removeExpiredContracts,
  enqueueSimRoundEvent,
  enqueueSkillUpdateEvent,
  enqueueSeasonEndEvent,
  enqueueSeasonStartEvent,
  enqueueUpdateFinancesEvent,
  enqueueEventFor,
  storeEndedSeasonSchedule,
  newSeasonSchedule,
};
