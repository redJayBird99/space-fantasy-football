import { GameStateHandle, GameState, createPlayers } from "./game-state";
import { Schedule } from "./tournament-scheduler";
import { LeagueTable } from "./league-table";
import { Player, MIN_AGE } from "../character/player";
import { Team } from "../character/team";
import { shuffle } from "../util/generator";

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
  | "newPlayers"
  | "retiring";
type SimRound = { round: number };
type Signings = { days: number }; // how many consecutive days should dispatch signings events

interface GameEvent {
  date: Date;
  type: GameEventTypes;
  detail?: SimRound | Signings;
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
    return handleSignings(gs, evt);
  } else if (evt.type === "retiring") {
    return handleRetiring(gs);
  } else if (evt.type === "newPlayers") {
    return handleNewPlayers(gs);
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
  return true;
}

function handleSeasonEnd(gs: GameState, e: GameEvent): boolean {
  storeEndedSeasonSchedule(gs);
  enqueueSeasonStartEvent(gs);
  updateTeamsAppeal(gs);
  enqueueNextDayEvent(gs, e.date, "retiring");
  enqueueNextDayEvent(gs, e.date, "newPlayers");
  enqueueNextDayEvent(gs, e.date, "updateContract");
  return true;
}

function handleSeasonStart(gs: GameState): boolean {
  newSeasonSchedule(gs, Object.keys(gs.teams));
  enqueueSimRoundEvent(gs, 0);
  enqueueSeasonEndEvent(gs);
  return true;
}

function handleUpdateContracts(gs: GameState, e: GameEvent): boolean {
  updateContracts(gs);
  renewExipiringContracts(gs);
  removeExpiredContracts(gs);
  enqueueSigningsEvent(gs, e.date, 30);
  return false;
}

function handleUpdateFinances(gs: GameState): boolean {
  Object.values(gs.teams).forEach((t) => Team.updateFinances(gs, t));
  enqueueUpdateFinancesEvent(gs);
  return false;
}

function handleSignings(gs: GameState, e: GameEvent): boolean {
  teamsSignFreeAgents(gs);
  enqueueSigningsEvent(gs, e.date, (e.detail as Signings).days - 1);
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

// add 52 new teens Players in every position area to the game
function handleNewPlayers(gs: GameState): boolean {
  const genTeens = () => MIN_AGE + Math.floor(Math.random() * (20 - MIN_AGE));
  createPlayers(gs, "goolkeeper", 6, genTeens);
  createPlayers(gs, "defender", 17, genTeens);
  createPlayers(gs, "midfielder", 17, genTeens);
  createPlayers(gs, "forward", 12, genTeens);
  return true;
}

function updateContracts(gs: GameState): void {
  Object.values(gs.contracts).forEach((c) => c.duration--);
}

// every team try to resign most exipiring players according to their needs
function renewExipiringContracts(gs: GameState): void {
  Object.values(gs.teams).forEach((team) => {
    Team.renewExipiringContracts(gs, team);
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
    t.appeal += Math.max(-1, Math.min(1, newAppeal - t.appeal));
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
  const teams = Object.values(gs.teams).filter((t) => Team.needPlayer(gs, t));
  let free = Object.values(gs.players).filter((p) => p.team === "free agent");

  shuffle(teams).forEach((team) => {
    const signed = Team.signFreeAgent(gs, team, free);

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

// enqueues a seasonEnd type GameEvent on gs.eventQueue for june first of next year
function enqueueSeasonEndEvent(gs: GameState): void {
  const year = gs.date.getFullYear() + 1;
  const date = new Date(year, SEASON_END_MONTH, SEASON_END_DATE);
  GameState.enqueueGameEvent(gs, { date, type: "seasonEnd" });
}

// enqueues a seasonStart type GameEvent on gs.eventQueue for september first of this year
function enqueueSeasonStartEvent(gs: GameState): void {
  const y = gs.date.getFullYear();
  const date = new Date(y, SEASON_START_MONTH, SEASON_START_DATE);
  GameState.enqueueGameEvent(gs, { date, type: "seasonStart" });
}

// enqueues given type GameEvent on gs.eventQueue for the next day of the given date
function enqueueNextDayEvent(gs: GameState, d: Date, t: GameEventTypes): void {
  const date = new Date(d);
  date.setDate(date.getDate() + 1);
  GameState.enqueueGameEvent(gs, { date, type: t });
}

// enqueues a signings type GameEvent on gs.eventQueue for the next day of the given date
// if days is less than or equal 0 doesn't enqueue
function enqueueSigningsEvent(gs: GameState, d: Date, days: number): void {
  if (days <= 0) {
    return;
  }

  const date = new Date(d);
  date.setDate(date.getDate() + 1);
  GameState.enqueueGameEvent(gs, { date, type: "signings", detail: { days } });
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
  handleNewPlayers,
  simulateRound,
  updateSkills,
  updateContracts,
  teamsSignFreeAgents,
  updateTeamsAppeal,
  renewExipiringContracts,
  removeExpiredContracts,
  enqueueSimRoundEvent,
  enqueueSkillUpdateEvent,
  enqueueSeasonEndEvent,
  enqueueSeasonStartEvent,
  enqueueUpdateFinancesEvent,
  enqueueSigningsEvent,
  enqueueNextDayEvent,
  storeEndedSeasonSchedule,
  newSeasonSchedule,
};
