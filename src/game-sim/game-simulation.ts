import {
  GameState,
  createPlayers,
  toTradeRecord,
  addMail,
} from "../game-state/game-state";
import { LeagueTable } from "../game-state/league-table";
import { Schedule } from "./tournament-scheduler";
import { Player, MIN_AGE } from "../character/player";
import {
  Team,
  MAX_SCOUTING_OFFSET,
  setFormation,
  MIN_TEAM_SIZE,
  removeLineupDepartures,
  LineupSpot,
  completeLineup,
  updateSquadNumber,
} from "../character/team";
import { shuffle } from "../util/generator";
import { within } from "../util/math";
import { getPopStats } from "../game-state/population-stats";
import { commitTrade, findTrades } from "./trade";
import {
  fetchNewFormations,
  fetchUpdatedFormations,
} from "./sim-worker-interface";
import {
  injury,
  mustDraft,
  teamLineupAlert,
  teamSizeAlert,
  tradeOffer,
} from "../character/mail";
import { updateTradeOffers } from "../character/user";
import { cubicBezierY, toISODateString } from "../util/util";
import { sortByFinances } from "../character/util";

const SIM_TIME_SLICE = 12; // in hours of game time
const MAX_SIM_TIME_PER_TICK = 2 * SIM_TIME_SLICE;
const MAX_SIM_MLS_PER_TICK = MAX_SIM_TIME_PER_TICK * 60 * 60 * 1000; // the above but in milliseconds

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
  | "retiring" // players decide on retirement
  | "retire" // remove retiring players
  | "trade" // sim trading player between teams
  | "openTradeWindow" // start the exchanging of players period
  | "openFreeSigningWindow" // start the signing free players period
  | "closeFreeSigningWindow"
  | "injuriesUpdate"; // update the recovery of player and broke some player;
export type SimRound = { round: number };
/** when done is true when the event was processed, stop is true when the sim should stop on the event */
type EventRst = { stop: boolean; done: boolean };
type PEventRst = Promise<EventRst>;
type PBool = Promise<boolean>;
type DateOffset = { years?: number; months?: number; days?: number };

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
  return gs.flags.userDrafting || !gs.flags.canSimRound;
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
  if (isSimDisabled(gs)) {
    return true;
  }

  let t = 0;

  while (t < MAX_SIM_TIME_PER_TICK && gs.eventQueue.length !== 0) {
    if (gs.date.getTime() >= gs.eventQueue[0]?.date.getTime()) {
      const rst = await handleGameEvent(gs, gs.eventQueue[0]);

      if (rst.done) {
        gs.flags.onGameEvent = gs.eventQueue.shift()!.type;
      }

      onStateUpdate(gs); // only what happens on events is relevant for this function
      return rst.stop;
    } else {
      updateGameDate(gs);
      gs.flags.onGameEvent = undefined;
      gs.flags.signedNewPlayer = false;
    }

    t += SIM_TIME_SLICE;
  }

  if (t > 0 && gs.flags.openFreeSigningWindow && gs.date.getDay() === 0) {
    updateRejections(gs); // periodic update not strictly scheduled
  }

  return gs.eventQueue.length === 0 || Boolean(endSimOnEvent.oneDay);
}

/** update the game date elapsing some time without going beyond the next event date */
function updateGameDate(gs: GameState): void {
  const e = gs.eventQueue[0];
  const mls = SIM_TIME_SLICE * 60 * 60 * 1000;

  if (e && e.date.getTime() - gs.date.getTime() <= mls) {
    gs.date = new Date(e.date);
  } else {
    gs.date.setHours(gs.date.getHours() + SIM_TIME_SLICE);
  }
}

// returns true when a particular event handling require to momentarily stop the simulation
async function handleGameEvent(gs: GameState, evt: GameEvent): PEventRst {
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
  } else if (evt.type === "retire") {
    return handleRetire(gs);
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
  } else if (evt.type === "injuriesUpdate") {
    return handleInjuries(gs);
  }

  return { stop: false, done: false };
}

/** before sim all matches updates all formations */
async function handleSimRound(gs: GameState, r: SimRound): PEventRst {
  if (!updateCanSimRound(gs)) {
    return { stop: true, done: false };
  }

  await updateFormations(gs, !window.$appState.userSettings.autoFormation);
  simulateRound(gs, r.round);
  enqueueSimRoundEvent(gs, r.round + 1);
  return { stop: endSimOnEvent.simRound ?? false, done: true };
}

function handleSkillUpdate(gs: GameState): EventRst {
  updateSkills(gs);
  enqueueSkillUpdateEvent(gs);
  gs.popStats = getPopStats(Object.values(gs.players));
  return { stop: endSimOnEvent.skillUpdate ?? false, done: true };
}

function handleSeasonEnd(gs: GameState): EventRst {
  storeEndedSeason(gs);
  enqueueSeasonStartEvent(gs);
  updateTeamsAppeal(gs);
  updateTeamsScouting(gs);
  return { stop: endSimOnEvent.seasonEnd ?? false, done: true };
}

// TODO: testing the setNewFormation part
/** prepare the season events and the team formations */
async function handleSeasonStart(gs: GameState): PEventRst {
  prepareSeasonStart(gs);
  gs.flags.signLimit = false;
  await setNewFormations(gs, !window.$appState.userSettings.autoFormation);
  return { stop: endSimOnEvent.seasonStart ?? false, done: true };
}

/**
 * start a new season schedule and enqueue close the trade window and
 * new seasons events like closeFreeSigningWindow, retiring, draft, updateContract etc
 */
export function prepareSeasonStart(gs: GameState): void {
  newSeasonSchedule(gs, Object.keys(gs.teams));
  gs.flags.openTradeWindow = false;
  gs.tradeOffers = []; // when the window close the offers disappear
  enqueueSimRoundEvent(gs, 0);
  const endDate = enqueueSeasonEndEvent(gs).date;
  enqueueEventFor(gs, endDate, "closeFreeSigningWindow", { months: -1 });
  enqueueEventFor(gs, endDate, "retiring", { days: 1 });
  enqueueEventFor(gs, endDate, "updateContracts", { days: 2 });
  enqueueEventFor(gs, endDate, "draftStart", { days: 3 });
  enqueueEventFor(gs, endDate, "openTradeWindow", { days: 4 });
  enqueueEventFor(gs, endDate, "openFreeSigningWindow", { days: 4 });
  prepareDraft(gs);
  // remove and resign the squad number every time a season start
  Object.values(gs.players).forEach((p) => delete p.number);
  Object.values(gs.teams).forEach((t) =>
    updateSquadNumber(t.playerIds.map((id) => gs.players[id]))
  );
}

/** update the contracts length and add re-signing requests for the user team */
function handleUpdateContracts(gs: GameState): EventRst {
  updateContracts(gs);
  addRenewalRequests(gs);
  GameState.enqueueGameEvent(gs, { date: new Date(gs.date), type: "renewals" });
  // return endSimOnEvent.updateContracts ?? false;
  // TODO: until auto re-sign flags is done we need always to stop here
  return { stop: true, done: true };
}

/** re-sign some expiring contract, expire all others and remove departures from the lineups */
function handleRenewals(gs: GameState): EventRst {
  // TODO: check the auto re-sign option instead of a bool
  renewExpiringContracts(gs, true);
  removeExpiredContracts(gs);
  Object.values(gs.teams).forEach((t) => removeLineupDepartures({ gs, t }));
  gs.reSigning = undefined;
  return { stop: endSimOnEvent.renewals ?? false, done: true };
}

function handleUpdateFinances(gs: GameState): EventRst {
  Object.values(gs.teams).forEach((t) => Team.updateFinances({ gs, t }));
  enqueueUpdateFinancesEvent(gs);
  return { stop: endSimOnEvent.updateFinances ?? false, done: true };
}

/**
 * if the free signing window is open try to sign some players for each team and
 * enqueue the next signings event weekly if the season already started otherwise daily
 */
function handleSignings(gs: GameState): EventRst {
  if (gs.flags.openFreeSigningWindow) {
    teamsSignFreeAgents(gs, true); // TODO: auto sign option
    // if the season didn't already start try new signings every day
    const days = gs.eventQueue.some((e) => e.type === "seasonStart") ? 1 : 7;
    enqueueEventFor(gs, gs.date, "signings", { days });
  }

  return { stop: endSimOnEvent.signings ?? false, done: true };
}

/** check which players is willing to retire and add them to the gs.retiring */
function handleRetiring(gs: GameState): EventRst {
  gs.retiring = Object.values(gs.players)
    .filter((p) => Player.retire(p, gs.date))
    .map((p) => p.id);
  GameState.enqueueGameEvent(gs, { date: new Date(gs.date), type: "retire" });
  return { stop: endSimOnEvent.retiring ?? false, done: true };
}

/** retires all players in gs.retiring and add them to the retirees,
 * all retired players get removed from the lineups */
function handleRetire(gs: GameState): EventRst {
  gs.retiring.forEach((id) => retirePlayer(gs, gs.players[id]));
  gs.retiring = [];
  Object.values(gs.teams).forEach((t) => removeLineupDepartures({ gs, t }));
  return { stop: endSimOnEvent.retire ?? false, done: true };
}

function retirePlayer(gs: GameState, p: Player): void {
  const c = GameState.getContract(gs, p);
  c && Team.unSignPlayer(gs, c);
  delete gs.players[p.id];
  gs.retirees[p.id] = { name: p.name };
}

function handleDraftStart(gs: GameState): EventRst {
  GameState.enqueueGameEvent(gs, { date: new Date(gs.date), type: "draft" });
  return { stop: endSimOnEvent.draftStart ?? false, done: true };
}

/** differently from the nba only one player get drafted, it stops on the user turn
 * when the draft ends all not picked player become free agents
 */
function handleDraft(gs: GameState): EventRst {
  // a clone because the lottery get mutated by draftPlayer
  for (const team of gs.drafts.now.lottery.slice()) {
    if (team === gs.userTeam) {
      gs.flags.userDrafting = true;
      addMail(gs, mustDraft(gs.date));
      return { stop: true, done: false }; // TODO: when we add the auto draft change with break
    }

    draftPlayer(gs);
  }

  if (gs.drafts.now.lottery.length === 0) {
    gs.drafts.now.picks.forEach(
      (p) => (gs.players[p.plId].team = "free agent")
    );
  }

  return { stop: endSimOnEvent.draft ?? false, done: true };
}

/**  when the trade window is open try to do some trade between teams
 * and remove traded players from the lineups */
function handleTrade(gs: GameState): EventRst {
  const user = gs.teams[gs.userTeam];
  const offers = gs.tradeOffers.length;

  if (gs.flags.openTradeWindow) {
    findTrades(gs).forEach((t) => {
      // TODO add auto trade option for the user team
      if (t.side1.by === user || t.side2.by === user) {
        gs.tradeOffers.push(toTradeRecord(t, gs.date));
        addMail(gs, tradeOffer(gs.date, t, user));
      } else {
        commitTrade(gs, t);
        removeLineupDepartures({ gs, t: t.side1.by });
        removeLineupDepartures({ gs, t: t.side2.by });
      }
    });
    enqueueEventFor(gs, gs.date, "trade", { days: 1 });
  }

  // TODO until auto trade option is added we just stop when an offer for the user team was made
  return {
    stop: offers !== gs.tradeOffers.length || (endSimOnEvent.trade ?? false),
    done: true,
  };
}

/** open the trade window and enqueue a trade event */
function handleOpenTradeWindow(gs: GameState): EventRst {
  gs.flags.openTradeWindow = true;
  enqueueEventFor(gs, gs.date, "trade", { days: 1 });
  return { stop: endSimOnEvent.openTradeWindow ?? false, done: true };
}

/** open the free signing window setting the gameState flag to false and enqueue a signings event */
function handleOpenFreeSigningWindow(gs: GameState): EventRst {
  gs.flags.openFreeSigningWindow = true;
  gs.flags.signLimit = true;
  updateRejections(gs);
  enqueueEventFor(gs, gs.date, "signings", { days: 1 });
  return { stop: endSimOnEvent.openFreeSigningWindow ?? false, done: true };
}

/** close the free signing window setting the gameState flag to false */
function handleCloseFreeSigningWindow(gs: GameState): EventRst {
  gs.flags.openFreeSigningWindow = false;
  return { stop: endSimOnEvent.closeFreeSigningWindow ?? false, done: true };
}

/** handle the injure recovery, injury some others and enqueue the next update */
function handleInjuries(gs: GameState): EventRst {
  enqueueEventFor(gs, gs.date, "injuriesUpdate", { days: 1 });
  recoverInjuredPlayers(gs);
  injurePlayers(gs);
  return { stop: false, done: true };
}

function recoverInjuredPlayers(gs: GameState) {
  for (const [id, injury] of Object.entries(gs.injuries)) {
    // remove the injury a day before for two reason, the user would see time to recovery 0 days
    // and because this handle run once per day (game time) but a player could recover in between
    // so instead of checking for every sim run we just recover the player a day before
    if (
      new Date(injury.when).getTime() <=
      gs.date.getTime() + MAX_SIM_MLS_PER_TICK + 1000
    ) {
      delete gs.injuries[id];
    }
  }
}

/** get some player injured, the time or recovery are affected by the team health expenses */
function injurePlayers(gs: GameState) {
  const teams = sortByFinances(Object.values(gs.teams), "health", false);

  while (Math.random() > 0.45) {
    const nthTeam = Math.floor(Math.random() * teams.length);
    const pls = teams[nthTeam].playerIds;
    const pId = pls[Math.floor(Math.random() * pls.length)];

    if (!gs.injuries[pId]) {
      const minRecoveryDay = 5 + Math.random() * 10;
      let recoveryDays = Math.random() ** 3 * 150 + minRecoveryDay;
      // apply the health facilities penalty on recovery time
      recoveryDays = Math.floor(
        (1 + 0.2 * (nthTeam / teams.length)) * recoveryDays
      );
      const now = new Date(gs.date);
      now.setDate(now.getDate() + recoveryDays);
      gs.injuries[pId] = { when: toISODateString(now) };
      // remove the injured player from the formation
      const spot = teams[nthTeam].formation?.lineup.find((l) => l.plID === pId);
      spot && (spot.plID = undefined);

      if (teams[nthTeam].name === gs.userTeam) {
        // notify the user of the injury
        addMail(gs, injury(gs.date, gs.players[pId].name, gs.injuries[pId]));
      }
    }
  }
}

/**
 * find a new formation for each team asynchronously and make the sim wait until they are setted
 * @param skipUser when true it doesn't touch the user formation
 */
export async function setNewFormations(gs: GameState, skipUser = false) {
  simWait = true;
  const teams = skipUser
    ? Object.keys(gs.teams).filter((t) => t !== gs.userTeam)
    : Object.keys(gs.teams);
  const forms = await fetchNewFormations({ gs, teams });
  forms.forEach((res) => setFormation(gs.teams[res.team], res.f)); // set the given formation to each team in the gs
  simWait = false;
}

/**
 * update (swapping and filling spots) the current formations or set new ones
 * if no one was found for each team
 * @param skipUser when true it doesn't touch the user formation
 */
async function updateFormations(gs: GameState, skipUser = false) {
  const teams = skipUser
    ? Object.keys(gs.teams).filter((t) => t !== gs.userTeam)
    : Object.keys(gs.teams);
  const forms = await fetchUpdatedFormations({ gs, teams });
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
  const when = toISODateString(gs.date);
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

function simulateMatch(gs: GameState, matchId: string): void {
  // TODO: implement a real one
  const match = gs.matches[matchId];
  const getScore = (l?: LineupSpot[]) =>
    l?.reduce(
      (a, s) => a + Player.getScore(gs.players[s.plID!], s.sp.pos),
      0
    ) ?? 0;
  const homeScore =
    within(getScore(gs.teams[match.home]?.formation?.lineup!) - 700, 0, 100) /
      100 +
    0.1;
  const awayScore =
    within(getScore(gs.teams[match.away]?.formation?.lineup!) - 700, 0, 100) /
      100 -
    0.1;
  const goals = Math.round(cubicBezierY(Math.random(), 0, 0.35, -0.2, 1) * 6);
  const winGoals = 1 + goals;
  const homeShare = (1 + homeScore / 2 - awayScore / 2) / 2;
  const awayShare = 1 - homeShare;
  const p = Math.random();

  if (homeShare * 0.8 >= p) {
    match.result = {
      home: winGoals,
      away: Math.floor(Math.random() * winGoals),
    };
  } else if ((homeShare + awayShare) * 0.8 >= p) {
    match.result = {
      home: Math.floor(Math.random() * winGoals),
      away: winGoals,
    };
  } else {
    match.result = {
      home: Math.round(goals / 2),
      away: Math.round(goals / 2),
    };
  }
}

// applies the monthly growth and degrowth for every player stored in gs
function updateSkills(gs: GameState): void {
  for (const id in gs.players) {
    Player.applyMonthlyGrowth(gs.players[id], gs.date);
    Player.applyMonthlyDegrowth(gs.players[id], gs.date);
  }
}

/** simulate the teams signing new players, sign only one player per team and
 * only if the team needs it, when the skipUser is true skip the user */
function teamsSignFreeAgents(gs: GameState, skipUser = false): void {
  const teams = Object.values(gs.teams).filter(
    (t) => (!skipUser || t.name !== gs.userTeam) && Team.needPlayer({ gs, t })
  );
  let free = Object.values(gs.players).filter((p) => p.team === "free agent");

  shuffle(teams).forEach((team) => {
    const signed = Team.signFreeAgent({ gs, t: team }, free);

    if (signed) {
      free = free.filter((p) => p !== signed);
      const when = toISODateString(gs.date);
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
export function enqueueEventFor(
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
      when: toISODateString(date),
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

/** check for each free agent if is willing to sign for the user team if not add to the rejections */
function updateRejections(gs: GameState): void {
  const t = gs.teams[gs.userTeam];

  if (!t) {
    return;
  }

  gs.rejections = {};
  Object.values(gs.players).forEach((p) => {
    if (p.team === "free agent" && !Player.approachable({ gs, t, p })) {
      gs.rejections[p.id] = true;
    }
  });
}

/** update the canSimRound and whyIsSimDisabled flags then return it */
function updateCanSimRound(gs: GameState): boolean {
  return checkUserTeamSize(gs) && checkUserLineup(gs);
}

/** check if the user team has at least the minimum amount of player required,
 * the check is delay until the next event is a match,
 * the canSimRound and whyIsSimDisabled flags can get updated  */
function checkUserTeamSize(gs: GameState): boolean {
  const f = gs.flags;
  const u = gs.teams[gs.userTeam];
  f.canSimRound =
    !u ||
    gs.eventQueue[0]?.type !== "simRound" ||
    u.playerIds.length >= MIN_TEAM_SIZE;

  if (!f.canSimRound && f.whyIsSimDisabled !== "underMinTeamSize") {
    f.whyIsSimDisabled = "underMinTeamSize";
    addMail(gs, teamSizeAlert(gs.date));
  }

  return f.canSimRound;
}

/** check if the user team lineup is complete, the check is delay until the next match,
 * the canSimRound and whyIsSimDisabled flags can get updated  */
function checkUserLineup(gs: GameState): boolean {
  const hour = 3_600_000;
  const u = gs.teams[gs.userTeam];
  const e = gs.eventQueue[0];
  gs.flags.canSimRound =
    !u ||
    !e ||
    e.type !== "simRound" ||
    e.date.getTime() - gs.date.getTime() > hour ||
    window.$appState.userSettings.autoFormation ||
    completeLineup(gs, u);

  if (!gs.flags.canSimRound && gs.flags.whyIsSimDisabled !== "missingLineup") {
    gs.flags.whyIsSimDisabled = "missingLineup";
    addMail(gs, teamLineupAlert(gs.date));
  }

  return gs.flags.canSimRound;
}

/** apply some common check on every update
 * - check fort the user team size requirements and update the canSimRound flag
 * - update the tradeOffers
 * can skip it if the update wasn't related to the above
 */
export function onStateUpdate(gs: GameState): void {
  // this type of operations are duplicated on multiple events (new signings, user trading, other teams trading and etc)
  // doing the check after every state update we are sure to catch them all
  if (gs.teams[gs.userTeam]) {
    updateCanSimRound(gs);
    updateTradeOffers(gs);
  }
}

export const exportedForTesting = {
  MAX_SIM_TIME_PER_TICK,
  SIM_TIME_SLICE,
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
  handleRetire,
  handleInjuries,
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
  storeEndedSeason,
  newSeasonSchedule,
  prepareDraft,
  retirePlayer,
  updateRejections,
  recoverInjuredPlayers,
  injurePlayers,
};
