import {
  GameState,
  createPlayers,
  toTradeRecord,
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
import { mustDraft } from "../character/mail";

const SIM_TIME_SLICE = 12; // in hours of game time
const MAX_SIM_TIME_PER_TICK = 2 * SIM_TIME_SLICE;

const SEASON_START_MONTH = 8; // september
const SEASON_START_DATE = 1;
const SEASON_END_MONTH = 5; // june, the distance is enough for 38 games every week from the start of the season
const SEASON_END_DATE = 1;

export type GameEventTypes =
  | "simRound" // sim all the round matches
  | "skillUpdate" // increase or decrease the ability of a player
  | "seasonEnd" // end the current season, enqueue the next one and update results
  | "seasonStart" // prepare the new season and enqueue most of the seasons events (like draft etc.)
  | "updateContracts" // update the contract duration, the user start to re-sign players
  | "renewals" // players contracts get re-signed and expired
  | "updateFinances" // update the team finances
  | "signings" // sim signing free players
  | "draftStart" // enqueue the draft event
  | "draft" // sim the drafting of young players
  | "retiring" // remove retiring players
  | "trade" // sim trading player between teams
  | "openTradeWindow" // start the exchanging of players period
  | "openFreeSigningWindow" // start the signing free players period
  | "closeFreeSigningWindow"; //
export type SimRound = { round: number };
type DateOffset = { years?: number; months?: number; days?: number };
type PBool = Promise<boolean>;
export type SimEndEvent = "oneDay" | GameEventTypes;

/** the default events where the simulation end */
const DEFAULT_END_SIM_ON_EVENT: Readonly<
  Partial<Record<SimEndEvent, boolean>>
> = {
  seasonEnd: true,
  seasonStart: true,
  retiring: true,
  draftStart: true,
  draft: true,
  openFreeSigningWindow: true,
  openTradeWindow: true,
  simRound: true,
  updateContracts: true,
};

/** customizable list of which events end the simulation */
export let endSimOnEvent: Partial<Record<SimEndEvent, boolean>> =
  DEFAULT_END_SIM_ON_EVENT;

/** set the endSimOnEvent ending event:
 * - when until in undefined reset to the default
 * - when until is oneDay add it to the default
 * - any other event overrides the default with the given one  */
function setEndSimOnEvent(until?: SimEndEvent): void {
  if (until && until === "oneDay") {
    endSimOnEvent = { ...DEFAULT_END_SIM_ON_EVENT, oneDay: true };
  } else if (until) {
    endSimOnEvent = { [until]: true };
  } else {
    endSimOnEvent = DEFAULT_END_SIM_ON_EVENT;
  }
}

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

/** check if the gs has flags that prevent the simulation from running,
 * usually used when waiting for some user action */
export function isSimDisabled(gs: GameState) {
  return gs.flags.userDrafting;
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
 * it runs a single simulation asynchronously at time, until some endSimOnEvent happens,
 * or it is ended by calling the returned function.
 * when a simulation is already running a new one is not created
 * @param onTick get called when the simulation handled an event or every MAX_SIM_TIME_PER_TICK
 * @param onEnd get called when the simulation end
 * @param until run the sim until the given event is reached (with some
 * exceptions like oneDay, it doesn't prevent the default from stopping the sim)
 * @returns a function that when called end the created simulation,
 * if the simulation was already ended or it is a new one it hasn't any effect
 */
export function simulate(
  gs: GameState,
  onTick: (gs: Readonly<GameState>) => unknown,
  onEnd: (gs: Readonly<GameState>) => unknown,
  until?: SimEndEvent
): () => void {
  if (isSimDisabled(gs)) {
    return () => {};
  }

  const thisSimCtrl = simCtrl; // bind a new reference to the lexical environment
  const stop = () => (thisSimCtrl.stop = true);

  if (isSimulating()) {
    return stop;
  }

  setEndSimOnEvent(until);
  simOn = true;

  setTimeout(async function run() {
    if (simWait) {
      setTimeout(run, window.$appState.simOptions.tickInterval ?? 0);
    } else if (simCtrl.stop || (await process(gs))) {
      simOn = false;
      simCtrl = { stop: false }; // now thisSimCtrl can't stop the next sim
      onEnd(gs);
    } else {
      onTick(gs);
      setTimeout(run, window.$appState.simOptions.tickInterval ?? 0);
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
      const gEvt = gs.eventQueue.shift()!;
      gs.flags.onGameEvent = gEvt.type;
      return await handleGameEvent(gs, gEvt);
    } else {
      gs.date.setHours(gs.date.getHours() + SIM_TIME_SLICE);
      gs.flags.onGameEvent = undefined;
    }

    t += SIM_TIME_SLICE;
  }

  return gs.eventQueue.length === 0 || Boolean(endSimOnEvent.oneDay);
}

// returns true when a particular event handling require to momentarily stop the simulation
async function handleGameEvent(gs: GameState, evt: GameEvent): PBool {
  if (evt.type === "simRound") {
    return await handleSimRound(gs, evt.detail as SimRound);
  } else if (evt.type === "skillUpdate") {
    return handleSkillUpdate(gs);
  } else if (evt.type === "seasonEnd") {
    return handleSeasonEnd(gs);
  } else if (evt.type === "seasonStart") {
    return await handleSeasonStart(gs);
  } else if (evt.type === "updateContracts") {
    return handleUpdateContracts(gs);
  } else if (evt.type === "renewals") {
    return handleRenewals(gs);
  } else if (evt.type === "updateFinances") {
    return handleUpdateFinances(gs);
  } else if (evt.type === "signings") {
    return handleSignings(gs);
  } else if (evt.type === "retiring") {
    return handleRetiring(gs);
  } else if (evt.type === "draftStart") {
    return handleDraftStart(gs);
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
  return endSimOnEvent.simRound ?? false;
}

function handleSkillUpdate(gs: GameState): boolean {
  updateSkills(gs);
  enqueueSkillUpdateEvent(gs);
  gs.popStats = getPopStats(Object.values(gs.players));
  return endSimOnEvent.skillUpdate ?? false;
}

function handleSeasonEnd(gs: GameState): boolean {
  storeEndedSeason(gs);
  enqueueSeasonStartEvent(gs);
  updateTeamsAppeal(gs);
  updateTeamsScouting(gs);
  return endSimOnEvent.seasonEnd ?? false;
}

// TODO: testing the setNewFormation part
/** prepare the season events and the team formations */
async function handleSeasonStart(gs: GameState): PBool {
  prepareSeasonStart(gs);
  await setNewFormations(gs);
  return endSimOnEvent.seasonStart ?? false;
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
  enqueueEventFor(gs, endDate, "updateContracts", { days: 2 });
  enqueueEventFor(gs, endDate, "draftStart", { days: 3 });
  enqueueEventFor(gs, endDate, "openTradeWindow", { days: 4 });
  enqueueEventFor(gs, endDate, "openFreeSigningWindow", { days: 4 });
  prepareDraft(gs);
}

/** update the contracts length and add re-signing requests for the user team */
function handleUpdateContracts(gs: GameState): boolean {
  updateContracts(gs);
  addRenewalRequests(gs);
  GameState.enqueueGameEvent(gs, { date: new Date(gs.date), type: "renewals" });
  // return endSimOnEvent.updateContracts ?? false;
  return true; // TODO: until auto re-sign flags is done we need always to stop here
}

/** re-sign some expiring contract and expire all others */
function handleRenewals(gs: GameState): boolean {
  // TODO: check the auto re-sign option instead of a bool
  renewExpiringContracts(gs, true);
  removeExpiredContracts(gs);
  gs.reSigning = undefined;
  return endSimOnEvent.renewals ?? false;
}

function handleUpdateFinances(gs: GameState): boolean {
  Object.values(gs.teams).forEach((t) => Team.updateFinances({ gs, t }));
  enqueueUpdateFinancesEvent(gs);
  return endSimOnEvent.updateFinances ?? false;
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

  return endSimOnEvent.signings ?? false;
}

// retires some old players and remove it from the game
// TODO: save them on the indexedDb
function handleRetiring(gs: GameState): boolean {
  Object.values(gs.players)
    .filter((p) => Player.retire(p, gs.date))
    .forEach((p) => retirePlayer(gs, p));

  return endSimOnEvent.retiring ?? false;
}

function retirePlayer(gs: GameState, p: Player): void {
  // TODO: save only the name somewhere
  const c = GameState.getContract(gs, p);
  c && Team.unSignPlayer(gs, c);
  delete gs.players[p.id];
}

function handleDraftStart(gs: GameState): boolean {
  GameState.enqueueGameEvent(gs, { date: new Date(gs.date), type: "draft" });
  return endSimOnEvent.draftStart ?? false;
}

/** differently from the nba only one player get drafted, it stops on the user turn
 * when the draft ends all not picked player become free agents
 */
function handleDraft(gs: GameState): boolean {
  // a clone because the lottery get mutated by draftPlayer
  for (const team of gs.drafts.now.lottery.slice()) {
    if (team === gs.userTeam) {
      gs.flags.userDrafting = true;
      gs.mails.unshift(mustDraft(gs.date));
      GameState.enqueueGameEvent(gs, {
        date: new Date(gs.date),
        type: "draft",
      });
      return true; // TODO: when we add the auto draft change with break
    }

    draftPlayer(gs);
  }

  if (gs.drafts.now.lottery.length === 0) {
    gs.drafts.now.picks.forEach(
      (p) => (gs.players[p.plId].team = "free agent")
    );
  }

  return endSimOnEvent.draft ?? false;
}

/**  when the trade window is open try to do some trade between teams */
function handleTrade(gs: GameState): boolean {
  if (gs.flags.openTradeWindow) {
    makeTrades(gs).forEach((t) => {
      gs.transactions.now.trades.push(toTradeRecord(gs, t, gs.date));
    });
    enqueueEventFor(gs, gs.date, "trade", { days: 1 });
  }

  return endSimOnEvent.trade ?? false;
}

/** open the trade window and enqueue a trade event */
function handleOpenTradeWindow(gs: GameState): boolean {
  gs.flags.openTradeWindow = true;
  enqueueEventFor(gs, gs.date, "trade", { days: 1 });
  return endSimOnEvent.openTradeWindow ?? false;
}

/** open the free signing window setting the gameState flag to false and enqueue a signings event */
function handleOpenFreeSigningWindow(gs: GameState): boolean {
  gs.flags.openFreeSigningWindow = true;
  enqueueEventFor(gs, gs.date, "signings", { days: 1 });
  return endSimOnEvent.openFreeSigningWindow ?? false;
}

/** close the free signing window setting the gameState flag to false */
function handleCloseFreeSigningWindow(gs: GameState): boolean {
  gs.flags.openFreeSigningWindow = false;
  return endSimOnEvent.closeFreeSigningWindow ?? false;
}

/** find a new formation for each team asynchronously and make the sim wait until they are setted */
export async function setNewFormations(gs: GameState) {
  simWait = true;
  const forms = await fetchNewFormations({ gs, teams: Object.keys(gs.teams) });
  forms.forEach((res) => setFormation(gs.teams[res.team], res.f)); // set the given formation to each team in the gs
  simWait = false;
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
  const rst = [
    ...createPlayers(gs, "goalkeeper", 6, genTeens),
    ...createPlayers(gs, "defender", 17, genTeens),
    ...createPlayers(gs, "midfielder", 17, genTeens),
    ...createPlayers(gs, "forward", 12, genTeens),
  ];
  rst.forEach((p) => (p.team = "draft"));
  return rst;
}

function updateContracts(gs: GameState): void {
  Object.values(gs.contracts).forEach((c) => c.duration--);
}

/**
 * every team try to re-sign expiring players according to their needs
 * @param skipUser when true the user team is skipped
 */
function renewExpiringContracts(gs: GameState, skipUser = false): void {
  const when = gs.date.toDateString();
  Object.values(gs.teams).forEach((t) => {
    if (!skipUser || t.name !== gs.userTeam) {
      Team.renewExpiringContracts({ gs, t }).forEach((p) =>
        gs.transactions.now.renewals.push({ team: t.name, plId: p.id, when })
      );
    }
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
      const when = gs.date.toDateString();
      const record = { when, plId: signed.id, team: team.name };
      gs.transactions.now.signings.push(record);
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

/**
 * store season history, both the current season schedule, transactions
 * are moved to key {startYear}-{endYear}, a new entry for transactions are inited
 */
function storeEndedSeason(gs: GameState): void {
  const scd = gs.schedules.now;

  if (scd) {
    const startY = scd[0].date.getFullYear();
    const endY = scd[scd.length - 1].date.getFullYear();
    gs.schedules[`${startY}-${endY}`] = gs.schedules.now;
    gs.transactions[`${startY}-${endY}`] = gs.transactions.now;
    gs.transactions.now = { trades: [], signings: [], renewals: [] };
  }
}

/** creates a new draft and draftable players and store the old one when it exists,
 * only if a draft event was enqueued on the game state */
function prepareDraft(gs: GameState): void {
  if (gs.drafts.now) {
    gs.drafts[`${new Date(gs.drafts.now.when).getFullYear()}`] = gs.drafts.now;
  }

  const date = gs.eventQueue.find((e) => e.type === "draftStart")?.date;

  if (date) {
    gs.drafts.now = {
      when: date?.toDateString(),
      lottery: shuffle(Object.keys(gs.teams)), // show the lottery only before the draft day
      picks: createDraftPlayers(gs).map((p) => ({
        team: "",
        plId: p.id,
        n: NaN,
      })),
      picked: [],
    };
  }
}

/**
 * the next team in lottery pick one available player and update the game state draft,
 * the picked player get moved to the picked list and the team removed from the lottery
 * @param pick specify the player to pick for the next team in the lottery, it is assumed to be in draftable
 */
export function draftPlayer(gs: GameState, pick?: Player): void {
  if (gs.drafts.now.lottery.length === 0) {
    return;
  }

  const players = pick
    ? [pick]
    : gs.drafts.now.picks.map((p) => gs.players[p.plId]);
  const n = gs.drafts.now.picked.length + 1;
  const tName = gs.drafts.now.lottery.shift()!;
  const plr = Team.pickDraftPlayer({ gs, t: gs.teams[tName] }, players);
  const iPick = gs.drafts.now.picks.findIndex((p) => p.plId === plr.id);
  gs.drafts.now.picks.splice(iPick, 1);
  gs.drafts.now.picked.push({ team: tName, n, plId: plr.id });
}

/** add to the game state the renewal requests for all expiring contracts of the user team */
function addRenewalRequests(gs: GameState): void {
  const t = gs.teams[gs.userTeam];

  if (t) {
    gs.reSigning = Team.getExpiringPlayers({ gs, t }).map((p) => {
      const abl = Player.approachable({ gs, t, p });
      return {
        plId: p.id,
        wage: abl ? Player.wageRequest({ gs, t, p }) : 0,
        seasons: abl ? Math.floor(Math.random() * 4) + 1 : 0,
      };
    });
  }
}

export const exportedForTesting = {
  MAX_SIM_TIME_PER_TICK,
  SEASON_START_MONTH,
  SEASON_START_DATE,
  SEASON_END_MONTH,
  SEASON_END_DATE,
  endSimOnEvent,
  timeout,
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
  handleRenewals,
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
  storeEndedSeason,
  newSeasonSchedule,
  prepareDraft,
  retirePlayer,
};
