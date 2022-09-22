import {
  // GameStateHandle,
  GameState,
  createPlayers,
} from "../game-state/game-state";
import { LeagueTable } from "../game-state/league-table";
import { Schedule } from "./tournament-scheduler";
import { Player, MIN_AGE } from "../character/player";
import { Team, MAX_SCOUTING_OFFSET, setFormation } from "../character/team";
import { shuffle } from "../util/generator";
import { within } from "../util/math";
import { getPopStats } from "../game-state/population-stats";
import { makeTrades } from "./trade";
import {
  fetchNewFormations,
  fetchUpdatedFormations,
} from "./sim-worker-interface";

const SIM_TIME_SLICE = 12; // in hours of game time
const MAX_SIM_TIME_PER_TICK = 2 * SIM_TIME_SLICE;
export const DEFAULT_TICK_INTERVAL = 500; // two ticks per second
export let tickInterval = DEFAULT_TICK_INTERVAL; // TODO: the user should be able to customize it

const SEASON_START_MONTH = 8; // september
const SEASON_START_DATE = 1;
const SEASON_END_MONTH = 5; // june, the distance is enough for 38 games every week from the start of the season
const SEASON_END_DATE = 1;

type GameEventTypes =
  | "simRound" // sim all the round matches
  | "skillUpdate" // increase or decrease the ability of a player
  | "seasonEnd" // end the current season, enqueue the next one and update results
  | "seasonStart" // prepare the new season and enqueue most of the seasons events (like draft etc.)
  | "updateContract" // update the duration, renewal and expiring of players contracts
  | "updateFinances" // update the team finances
  | "signings" // sim signing free players
  | "draft" // sim the drafting of young players
  | "retiring" // remove retiring players
  | "trade" // sim trading player between teams
  | "openTradeWindow" // start the exchanging of players period
  | "openFreeSigningWindow" // start the signing free players period
  | "closeFreeSigningWindow"; //
export type SimRound = { round: number };
type DateOffset = { years?: number; months?: number; days?: number };
type PBool = Promise<boolean>;

export interface GameEvent {
  date: Date;
  type: GameEventTypes;
  detail?: SimRound;
}

/** the state of the sim, only one single simulation at the time */
let simOn = false;
/** make a running sim wait before proceeding beyond. (like waiting for the worker to finish) */
let simWait = false;
/** when true stop the current simulation */
let simCtrl = { stop: false };

export function setTickInterval(v: number) {
  tickInterval = v;
}

/** check if the previous called simulate() function is still simulating */
export function isSimulating(): boolean {
  return simOn;
}

/**
 * @param start the starting time
 * @param duration when not given the returned function returns always false
 * @returns a function that when given the current time check if the duration was exceeded
 */
function timeout(start: number, duration?: number): (now: number) => boolean {
  return (now: number) => Boolean(duration && start + duration <= now);
}

// make sure to prevent any external mutation to the gs until the simulation end
/**
 * it runs a single simulation asynchronously at time until some event happens,
 * the duration is reached or is ended by calling the returned function.
 * when a simulation is already running a new one is not created
 * @param onTick get called when the simulation handled an event or every MAX_SIM_TIME_PER_TICK
 * @param onEnd get called when the simulation end
 * @param duration game time threshold in milliseconds, it could be exceeded a little (MAX_SIM_TIME_PER_TICK amount)
 * @returns a function that when called end the created simulation,
 * if the simulation was already ended or is a new one has no effect
 */
export function simulate(
  gs: GameState,
  onTick: (gs: Readonly<GameState>) => unknown,
  onEnd: (gs: Readonly<GameState>) => unknown,
  duration?: number
): () => void {
  const thisSimCtrl = simCtrl; // bind a new reference to the lexical environment
  const stop = () => (thisSimCtrl.stop = true);

  if (isSimulating()) {
    return stop;
  }

  const timeUp = timeout(gs.date.getTime(), duration);
  simOn = true;

  setTimeout(async function run() {
    if (simWait) {
      setTimeout(run, tickInterval);
    } else if (
      simCtrl.stop ||
      timeUp(gs.date.getTime()) ||
      (await process(gs))
    ) {
      simOn = false;
      simCtrl = { stop: false }; // now thisSimCtrl can't stop the next sim
      onEnd(gs);
    } else {
      onTick(gs);
      setTimeout(run, tickInterval);
    }
  });

  return stop;
}

/**
 * it is the main function that drives the simulation moving the game clock ahead
 * handling gameEvent and enqueuing new ones, it runs until a single event is
 * handled or for a max cycle of MAX_SIM_TIME_PER_TICK (game time)
 * it doesn't run if there isn't any event on the event queue
 * @returns true when the simulation should momentarily stop
 */
async function process(gs: GameState): PBool {
  let t = 0;

  while (t < MAX_SIM_TIME_PER_TICK && gs.eventQueue.length !== 0) {
    if (gs.date.getTime() >= gs.eventQueue[0]?.date.getTime()) {
      return await handleGameEvent(gs, gs.eventQueue.shift()!);
    } else {
      gs.date.setHours(gs.date.getHours() + SIM_TIME_SLICE);
    }

    t += SIM_TIME_SLICE;
  }

  return gs.eventQueue.length === 0;
}

// returns true when a particular event handling require to momentarily stop the simulation
async function handleGameEvent(gs: GameState, evt: GameEvent): PBool {
  if (evt.type === "simRound") {
    return await handleSimRound(gs, evt.detail as SimRound);
  } else if (evt.type === "skillUpdate") {
    return handleSkillUpdate(gs);
  } else if (evt.type === "seasonEnd") {
    return handleSeasonEnd(gs, evt);
  } else if (evt.type === "seasonStart") {
    return await handleSeasonStart(gs);
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

/** before sim all matches updates all formations */
async function handleSimRound(gs: GameState, r: SimRound): PBool {
  await updateFormations(gs);
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

// TODO: testing the setNewFormation part
/** prepare the season events and the team formations */
async function handleSeasonStart(gs: GameState): PBool {
  prepareSeasonStart(gs);
  return await setNewFormations(gs);
}

/**
 * start a new season schedule and enqueue close the trade window and
 * new seasons events like closeFreeSigningWindow, retiring, draft, updateContract etc
 */
export function prepareSeasonStart(gs: GameState): void {
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
}

function handleUpdateContracts(gs: GameState, e: GameEvent): boolean {
  updateContracts(gs);
  renewExpiringContracts(gs);
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
    // if the season didn't already start try new signings every day
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
      c && Team.unSignPlayer(gs, c);
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
 * open the free signing window setting the gameState flag to false and enqueue a signings event
 */
function handleOpenFreeSigningWindow(gs: GameState): boolean {
  gs.flags.openFreeSigningWindow = true;
  enqueueEventFor(gs, gs.date, "signings", { days: 1 });
  return false;
}

/**
 * close the free signing window setting the gameState flag to false
 */
function handleCloseFreeSigningWindow(gs: GameState): boolean {
  gs.flags.openFreeSigningWindow = false;
  return false;
}

/**
 * find a new formation for each team asynchronously and make the sim wait until they are setted,
 */
export async function setNewFormations(gs: GameState): PBool {
  simWait = true;
  const forms = await fetchNewFormations({ gs, teams: Object.keys(gs.teams) });
  forms.forEach((res) => setFormation(gs.teams[res.team], res.f)); // set the given formation to each team in the gs
  simWait = false;
  return true;
}

/** update (swapping and filling spots) the current formations or set new ones
 * if no one was found for each team */
async function updateFormations(gs: GameState): Promise<void> {
  const forms = await fetchUpdatedFormations({
    gs,
    teams: Object.keys(gs.teams),
  });
  forms.forEach((res) => setFormation(gs.teams[res.team], res.f)); // set the given formation to each team in the gs
}

// add 52 new teens Players in every position area to the game and return them
function createDraftPlayers(gs: GameState): Player[] {
  const genTeens = () => MIN_AGE + Math.floor(Math.random() * (20 - MIN_AGE));
  return [
    ...createPlayers(gs, "goalkeeper", 6, genTeens),
    ...createPlayers(gs, "defender", 17, genTeens),
    ...createPlayers(gs, "midfielder", 17, genTeens),
    ...createPlayers(gs, "forward", 12, genTeens),
  ];
}

function updateContracts(gs: GameState): void {
  Object.values(gs.contracts).forEach((c) => c.duration--);
}

// every team try to resign most expiring players according to their needs
function renewExpiringContracts(gs: GameState): void {
  Object.values(gs.teams).forEach((t) => {
    Team.renewExpiringContracts({ gs, t });
  });
}

function removeExpiredContracts(gs: GameState): void {
  Object.values(gs.contracts).forEach((c) => {
    if (c.duration === 0) {
      Team.unSignPlayer(gs, c);
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

// change the teams.scoutOffset according to team scouting expenses ranking and
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
export function enqueueSkillUpdateEvent(gs: GameState): void {
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

// save a new schedule for the current season to the gameState, should be called
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
  const scd = gs.schedules.now;

  if (scd) {
    const startY = scd[0].date.getFullYear();
    const endY = scd[scd.length - 1].date.getFullYear();
    gs.schedules[`${startY}-${endY}`] = gs.schedules.now;
  }
}

export const exportedForTesting = {
  MAX_SIM_TIME_PER_TICK,
  SEASON_START_MONTH,
  SEASON_START_DATE,
  SEASON_END_MONTH,
  SEASON_END_DATE,
  timeout,
  setTickInterval,
  isSimulating,
  simulate,
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
  renewExpiringContracts,
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
