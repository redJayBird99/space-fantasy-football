import { GameStateHandle, GameState } from "./game-state";
import { Player } from "../character/player";

const NEXT_HOURS = 12;
type GameEventTypes = "simRound" | "skillUpdate";
type SimRound = { round: number };

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
    simulateRound(gs, evt.detail as SimRound);
    enqueueSimRoundEvent(gs, evt.detail!.round + 1);
  } else if (evt.type === "skillUpdate") {
    updateSkills(gs);
    enqueueNextSkillUpdateEvent(gs);
    return true;
  }

  return false;
}

// simulate all the match for the given round of this season schedule
// every results is saved on the gameState
function simulateRound(gs: GameState, r: SimRound): void {
  gs.schedules.now?.[r.round]?.matchIds.forEach((id) => simulateMatch(gs, id));
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

// enqueues a skillUpdate type GameEvent on gs.eventQueue for the first day of next month
function enqueueNextSkillUpdateEvent(gs: GameState): void {
  const d = gs.date;
  const date = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  GameState.enqueueGameEvent(gs, { date, type: "skillUpdate" });
}

export {
  SimRound,
  GameEvent,
  GameSimulation,
  process,
  handleGameEvent,
  simulateRound,
  updateSkills,
  enqueueSimRoundEvent,
  enqueueNextSkillUpdateEvent,
};
