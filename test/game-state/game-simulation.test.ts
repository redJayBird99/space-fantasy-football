import * as _sm from "../../src/game-state/game-simulation";
import * as _gs from "../../src/game-state/game-state";

describe("enqueueSimRoundEvent", () => {
  const gameState: _gs.GameState = new _gs.GameState(new Date());

  test("shouldn't enqueue any event when there isn't any schedule", () => {
    _sm.enqueueSimRoundEvent(gameState, 0);
    expect(gameState.eventQueue.length).toBe(0);
  });

  test("shouldn't enqueue any event when the round doesn't exists", () => {
    gameState.schedules.now = [{ date: new Date(), matchIds: ["..."] }];
    _sm.enqueueSimRoundEvent(gameState, 1);
    expect(gameState.eventQueue.length).toBe(0);
  });

  test("should enqueue an event to simulate the given round", () => {
    const date = new Date();
    gameState.schedules.now.push({ date, matchIds: ["..."] });
    _sm.enqueueSimRoundEvent(gameState, 1);
    const evt = { date, type: "simRound", detail: { round: 1 } };
    expect(gameState.eventQueue).toContainEqual(evt);
  });
});

describe("simulateRound()", () => {
  const gameState: _gs.GameState = new _gs.GameState(new Date());
  const teams = ["Hawks", "Foxes", " Wolfs", "Cats"];
  _gs.initSchedule(gameState, teams);

  test("shouldn't simulate any match if the given round doesn't exist", () => {
    _sm.simulateRound(gameState, { round: gameState.schedules.now.length });
    gameState.schedules.now.forEach((r) => {
      r.matchIds.forEach((id) => {
        expect(gameState.matches[id].result).not.toBeDefined();
      });
    });
  });

  test("should simulate all matches of the given round", () => {
    _sm.simulateRound(gameState, { round: 0 });
    gameState.schedules.now[0].matchIds.forEach((id) => {
      expect(gameState.matches[id].result).toBeDefined();
    });
  });
});

describe("handleGameEvent()", () => {
  test("should return false for a simRound type event", () => {
    const date = new Date();
    const gameState: _gs.GameState = new _gs.GameState(date);
    const e: _sm.GameEvent = { date, type: "simRound", detail: { round: 1 } };
    expect(_sm.handleGameEvent(gameState, e)).toBe(false);
  });
});

describe("process()", () => {
  const date = new Date(2020, 1, 1);
  const gameState: _gs.GameState = new _gs.GameState(date);

  test("when the gamestate.eventQueue is empty doesn't mutate the gameState date", () => {
    _sm.process(gameState);
    expect(date).toEqual(gameState.date);
  });

  test("when the gamestate.eventQueue is empty return true", () => {
    expect(_sm.process(gameState)).toBe(true);
  });

  test("process one event at the time and pop it from the queue", () => {
    const evts: _sm.GameEvent[] = [
      { date, type: "simRound", detail: { round: 0 } },
      { date, type: "simRound", detail: { round: 1 } },
    ];
    gameState.eventQueue.push(...evts);
    _sm.process(gameState);
    expect(gameState.eventQueue).toEqual([evts[1]]);
  });

  test("should return false when processing a event of type simRound", () => {
    expect(_sm.process(gameState)).toBe(false);
  });
});
