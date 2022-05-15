import * as _sm from "../../src/game-state/game-simulation";
import * as _gs from "../../src/game-state/game-state";
import * as _pl from "../../src/character/player";
import teamsJson from "../../src/asset/team-names.json";

const rdmYear = 1990 + Math.floor(Math.random() * 35);
let startD = new Date(rdmYear, _sm.SEASON_START_MONTH, _sm.SEASON_START_DATE);
let endD = new Date(rdmYear + 1, _sm.SEASON_END_MONTH, _sm.SEASON_END_DATE);

beforeEach(() => {
  startD = new Date(rdmYear, _sm.SEASON_START_MONTH, _sm.SEASON_START_DATE);
  endD = new Date(rdmYear + 1, _sm.SEASON_END_MONTH, _sm.SEASON_END_DATE);
});

describe("enqueueSimRoundEvent", () => {
  const gameState: _gs.GameState = new _gs.GameState(startD);

  test("shouldn't enqueue any event when there isn't any schedule", () => {
    _sm.enqueueSimRoundEvent(gameState, 0);
    expect(gameState.eventQueue.length).toBe(0);
  });

  test("shouldn't enqueue any event when the round doesn't exists", () => {
    gameState.schedules.now = [{ date: startD, matchIds: ["..."] }];
    _sm.enqueueSimRoundEvent(gameState, 1);
    expect(gameState.eventQueue.length).toBe(0);
  });

  test("should enqueue an event to simulate the given round", () => {
    gameState.schedules.now.push({ date: startD, matchIds: ["..."] });
    _sm.enqueueSimRoundEvent(gameState, 1);
    const evt = { date: startD, type: "simRound", detail: { round: 1 } };
    expect(gameState.eventQueue).toContainEqual(evt);
  });
});

describe("newSeasonSchedule()", () => {
  const teams = teamsJson.eng.names;
  const gState: _gs.GameState = new _gs.GameState(startD);
  _sm.newSeasonSchedule(gState, teams);

  test("should save a new schedule for the current season", () => {
    expect(gState.schedules.now).toBeDefined();
  });

  test("all scheduled rounds are on sunday", () => {
    Object.keys(gState.schedules).forEach((key) => {
      gState.schedules[key].forEach((round) => {
        expect(round.date.getDay()).toBe(0);
      });
    });
  });

  test("should create teams.length / 2 * 2 * (teams.length - 1) matches", () => {
    const count = (teams.length / 2) * 2 * (teams.length - 1);
    expect(Object.values(gState.matches).length).toBe(count);
  });

  test("the schedule should end before the end of season", () => {
    const schedule = gState.schedules.now;
    const last = schedule[schedule.length - 1].date;
    expect(last.getTime()).toBeLessThan(endD.getTime());
  });

  test("should throw an error when called after september first", () => {
    gState.date.setDate(gState.date.getDate() + 1);
    expect(() => _sm.newSeasonSchedule(gState, teams)).toThrow();
  });
});

describe("simulateRound()", () => {
  const gameState: _gs.GameState = new _gs.GameState(startD);
  const teams = ["Hawks", "Foxes", " Wolfs", "Cats"];
  _sm.newSeasonSchedule(gameState, teams);

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

describe("updateSkills()", () => {
  const gameState: _gs.GameState = new _gs.GameState(startD);

  test("should update the growthState for young players", () => {
    const p1 = new _pl.Player("cf", startD, 18);
    const oldGrowthState = p1.growthState;
    gameState.players[p1.id] = p1;
    _sm.updateSkills(gameState);
    expect(p1.growthState).toBeGreaterThan(oldGrowthState);
  });

  test("should update the growthState for old players", () => {
    const p1 = new _pl.Player("cf", startD, 34);
    const oldGrowthState = p1.growthState;
    gameState.players[p1.id] = p1;
    _sm.updateSkills(gameState);
    expect(p1.growthState).toBeLessThan(oldGrowthState);
  });
});

describe("enqueueSkillUpdateEvent()", () => {
  const gameState: _gs.GameState = new _gs.GameState(startD);

  test("should enqueue a new GameEvent of type skillUpdate on gameState.eventQueue", () => {
    _sm.enqueueSkillUpdateEvent(gameState);
    expect(gameState.eventQueue.some((e) => e.type === "skillUpdate")).toBe(
      true
    );
  });

  test("the skillUpdate should be enqueued for the firts day of next month", () => {
    expect(gameState.eventQueue).toContainEqual({
      date: new Date(startD.getFullYear(), startD.getMonth() + 1, 1),
      type: "skillUpdate",
    });
  });
});

describe("storeEndedSeasonSchedule()", () => {
  test("should save the ended schedule on the gameState.schedules with key the season years", () => {
    const s = [
      { date: startD, matchIds: [] },
      { date: endD, matchIds: [] },
    ];
    const gameState: _gs.GameState = new _gs.GameState(startD);
    gameState.schedules.now = s;
    _sm.storeEndedSeasonSchedule(gameState);
    const seasonYears = `${startD.getFullYear()}-${endD.getFullYear()}`;
    expect(gameState.schedules[seasonYears]).toEqual(s);
  });
});

describe("enqueueSeasonEndEvent()", () => {
  const gameState: _gs.GameState = new _gs.GameState(startD);

  test("should enqueue a new GameEvent of type seasonEnd on gameState.eventQueue", () => {
    _sm.enqueueSeasonEndEvent(gameState);
    expect(gameState.eventQueue.some((e) => e.type === "seasonEnd")).toBe(true);
  });

  test("the seasonEnd should be enqueued for june firts of next year", () => {
    expect(gameState.eventQueue).toContainEqual({
      date: endD,
      type: "seasonEnd",
    });
  });
});

describe("enqueueSeasonStartEvent()", () => {
  const date = new Date(startD.getFullYear(), _sm.SEASON_START_MONTH - 1, 10);
  const gameState: _gs.GameState = new _gs.GameState(date);

  test("should enqueue a new GameEvent of type seasonStart on gameState.eventQueue", () => {
    _sm.enqueueSeasonStartEvent(gameState);
    expect(gameState.eventQueue.some((e) => e.type === "seasonStart")).toBe(
      true
    );
  });

  test("the seasonStart should be enqueued for september firts of this year", () => {
    expect(gameState.eventQueue).toContainEqual({
      date: startD,
      type: "seasonStart",
    });
  });
});

describe("handleGameEvent()", () => {
  describe("handle GameEvent simRound type", () => {
    const gameState: _gs.GameState = new _gs.GameState(startD);
    const teams = ["Hawks", "Foxes", " Wolfs", "Cats"];
    _sm.newSeasonSchedule(gameState, teams);

    test("should return false", () => {
      expect(
        _sm.handleGameEvent(gameState, {
          date: startD,
          type: "simRound",
          detail: { round: 0 },
        })
      ).toBe(false);
    });

    test("should simulate all matches of the given round", () => {
      gameState.schedules.now[0].matchIds.forEach((id) => {
        expect(gameState.matches[id].result).toBeDefined();
      });
    });
  });

  describe("handle GameEvent skillUpdate type", () => {
    const gameState: _gs.GameState = new _gs.GameState(startD);

    test("should return true", () => {
      expect(
        _sm.handleGameEvent(gameState, { date: startD, type: "skillUpdate" })
      ).toBe(true);
    });

    test("should enqueue a new skillUpdate type GameEvent", () => {
      expect(gameState.eventQueue).toContainEqual({
        date: new Date(startD.getFullYear(), startD.getMonth() + 1, 1),
        type: "skillUpdate",
      });
    });

    test("should update the growthState for players", () => {
      const p1 = new _pl.Player("cf", startD, 17);
      const oldGrowthState = p1.growthState;
      gameState.players[p1.id] = p1;
      _sm.handleGameEvent(gameState, { date: startD, type: "skillUpdate" });
      expect(p1.growthState).toBeGreaterThan(oldGrowthState);
    });
  });

  describe("handle GameEvent seasonEnd type", () => {
    test("should return true for a seasonEnd type GameEvent", () => {
      const gameState: _gs.GameState = new _gs.GameState(startD);
      expect(
        _sm.handleGameEvent(gameState, { date: startD, type: "seasonEnd" })
      ).toBe(true);
    });

    test("should enqueue a seasonStart GameEvent", () => {
      const gameState: _gs.GameState = new _gs.GameState(endD);
      startD.setFullYear(endD.getFullYear());
      _sm.handleGameEvent(gameState, { date: endD, type: "seasonEnd" });
      expect(gameState.eventQueue).toContainEqual({
        date: startD,
        type: "seasonStart",
      });
    });
  });

  describe("handle GameEvent seasonStart type", () => {
    const gameState: _gs.GameState = new _gs.GameState(startD);
    const teams = ["dragons", "foxes", "birds", "snakes"];
    _gs.initTeams(gameState, teams);

    test("should return true", () => {
      expect(
        _sm.handleGameEvent(gameState, { date: startD, type: "seasonStart" })
      ).toBe(true);
    });

    test("should enqueue a seasonEnd", () => {
      expect(gameState.eventQueue).toContainEqual({
        date: endD,
        type: "seasonEnd",
      });
    });

    test("should create a new schedule for the season", () => {
      const rounds = 2 * (teams.length - 1);
      expect(gameState.schedules.now.length).toBe(rounds);
    });

    test("should enqueue a simRound 0", () => {
      const date = gameState.schedules.now[0].date;
      const evt = { date, type: "simRound", detail: { round: 0 } };
      expect(gameState.eventQueue).toContainEqual(evt);
    });
  });
});

describe("process()", () => {
  const gameState: _gs.GameState = new _gs.GameState(startD);

  test("when the gamestate.eventQueue is empty doesn't mutate the gameState date", () => {
    gameState.eventQueue = [];
    _sm.process(gameState);
    expect(gameState.date).toEqual(startD);
  });

  test("when the gamestate.eventQueue is empty return true", () => {
    expect(_sm.process(gameState)).toBe(true);
  });

  test("process one event at the time and pop it from the queue", () => {
    const evts: _sm.GameEvent[] = [
      { date: startD, type: "simRound", detail: { round: 0 } },
      { date: startD, type: "simRound", detail: { round: 1 } },
    ];
    gameState.eventQueue.push(...evts);
    _sm.process(gameState);
    expect(gameState.eventQueue).toEqual([evts[1]]);
  });

  test("should return false when processing a event of type simRound", () => {
    expect(_sm.process(gameState)).toBe(false);
  });
});
