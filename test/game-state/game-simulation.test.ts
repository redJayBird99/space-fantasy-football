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
  const st = new _gs.GameState(startD);

  test("shouldn't enqueue any event when there isn't any schedule", () => {
    _sm.enqueueSimRoundEvent(st, 0);
    expect(st.eventQueue.length).toBe(0);
  });

  test("shouldn't enqueue any event when the round doesn't exists", () => {
    st.schedules.now = [{ date: startD, matchIds: ["..."] }];
    _sm.enqueueSimRoundEvent(st, 1);
    expect(st.eventQueue.length).toBe(0);
  });

  test("should enqueue an event to simulate the given round", () => {
    st.schedules.now.push({ date: startD, matchIds: ["..."] });
    _sm.enqueueSimRoundEvent(st, 1);
    const evt = { date: startD, type: "simRound", detail: { round: 1 } };
    expect(st.eventQueue).toContainEqual(evt);
  });
});

describe("newSeasonSchedule()", () => {
  const teams = teamsJson.eng.names;
  const st = new _gs.GameState(startD);
  _sm.newSeasonSchedule(st, teams);

  test("should save a new schedule for the current season", () => {
    expect(st.schedules.now).toBeDefined();
  });

  test("all scheduled rounds are on sunday", () => {
    Object.keys(st.schedules).forEach((key) => {
      st.schedules[key].forEach((round) => {
        expect(round.date.getDay()).toBe(0);
      });
    });
  });

  test("should create teams.length / 2 * 2 * (teams.length - 1) matches", () => {
    const count = (teams.length / 2) * 2 * (teams.length - 1);
    expect(Object.values(st.matches).length).toBe(count);
  });

  test("the schedule should end before the end of season", () => {
    const schedule = st.schedules.now;
    const last = schedule[schedule.length - 1].date;
    expect(last.getTime()).toBeLessThan(endD.getTime());
  });

  test("should throw an error when called after september first", () => {
    st.date.setDate(st.date.getDate() + 1);
    expect(() => _sm.newSeasonSchedule(st, teams)).toThrow();
  });
});

describe("simulateRound()", () => {
  const st = new _gs.GameState(startD);
  const teams = ["Hawks", "Foxes", " Wolfs", "Cats"];
  _sm.newSeasonSchedule(st, teams);

  test("shouldn't simulate any match if the given round doesn't exist", () => {
    _sm.simulateRound(st, st.schedules.now.length);
    st.schedules.now.forEach((r) => {
      r.matchIds.forEach((id) => {
        expect(st.matches[id].result).not.toBeDefined();
      });
    });
  });

  test("should simulate all matches of the given round", () => {
    _sm.simulateRound(st, 0);
    st.schedules.now[0].matchIds.forEach((id) => {
      expect(st.matches[id].result).toBeDefined();
    });
  });
});

describe("updateSkills()", () => {
  const st = new _gs.GameState(startD);

  test("should update the growthState for young players", () => {
    const p1 = new _pl.Player("cf", startD, 18);
    const oldGrowthState = p1.growthState;
    st.players[p1.id] = p1;
    _sm.updateSkills(st);
    expect(p1.growthState).toBeGreaterThan(oldGrowthState);
  });

  test("should update the growthState for old players", () => {
    const p1 = new _pl.Player("cf", startD, 34);
    const oldGrowthState = p1.growthState;
    st.players[p1.id] = p1;
    _sm.updateSkills(st);
    expect(p1.growthState).toBeLessThan(oldGrowthState);
  });
});

describe("updateContracts()", () => {
  const gState = new _gs.GameState(startD);
  _gs.initTeams(gState, ["Martians", "insert name"]);
  const cts = Object.values(gState.contracts);

  test("should subtract one season from contracts", () => {
    const oldCts = cts.map((c) => JSON.parse(JSON.stringify(c)));
    _sm.updateContracts(gState);
    oldCts.forEach((c, i) => expect(c.duration - cts[i].duration).toBe(1));
  });
});

describe("renewExipiringContracts()", () => {
  const gState = new _gs.GameState(startD);
  _gs.initTeams(gState, ["Martians", "insert name"]);
  const cts = Object.values(gState.contracts);
  cts.forEach((c) => (c.duration = 0));

  test("should renew most contracts", () => {
    _sm.renewExipiringContracts(gState);
    const renewed = cts.filter((c) => c.duration > 0);
    const expiring = cts.filter((c) => c.duration === 0);
    expect(renewed.length).toBeLessThan(expiring.length);
  });
});

describe("removeExpiredContracts()", () => {
  const st = new _gs.GameState(startD);
  _gs.initTeams(st, ["a", "b"]);
  Object.values(st.contracts).forEach(
    (c) => Math.random() > 0.5 && (c.duration = 0)
  );
  _sm.removeExpiredContracts(st);

  test("should remove all expired contracts", () => {
    const expred = Object.values(st.contracts).filter((c) => c.duration === 0);
    expect(expred.length).toBe(0);
  });

  test("team shoulden't have expired player", () => {
    const pls = [
      ..._gs.GameState.getTeamPlayers(st, "a"),
      ..._gs.GameState.getTeamPlayers(st, "b"),
    ];
    pls.forEach((p) => expect(_gs.GameState.getContract(st, p)).toBeDefined());
  });

  test("should set player.team to free agent for expired contract", () => {
    Object.values(st.players)
      .filter((p) => p.team !== "free agent")
      .forEach((p) => {
        expect(_gs.GameState.getContract(st, p)).toBeDefined();
      });
  });
});

describe("enqueueSkillUpdateEvent()", () => {
  const st = new _gs.GameState(startD);

  test("should enqueue a new skillUpdate GameEvent for the firts day of next month", () => {
    _sm.enqueueSkillUpdateEvent(st);
    expect(st.eventQueue).toContainEqual({
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
    const st = new _gs.GameState(startD);
    st.schedules.now = s;
    _sm.storeEndedSeasonSchedule(st);
    const seasonYears = `${startD.getFullYear()}-${endD.getFullYear()}`;
    expect(st.schedules[seasonYears]).toEqual(s);
  });
});

describe("enqueueSeasonEndEvent()", () => {
  const st = new _gs.GameState(startD);

  test("should enqueue a new seasonEnd GameEvent for june firts of next year", () => {
    _sm.enqueueSeasonEndEvent(st);
    expect(st.eventQueue).toContainEqual({ date: endD, type: "seasonEnd" });
  });
});

describe("enqueueSeasonStartEvent()", () => {
  const date = new Date(startD.getFullYear(), _sm.SEASON_START_MONTH - 1, 10);
  const st = new _gs.GameState(date);

  test("should enqueue a new seasonStart GameEvent for september firts of this year", () => {
    _sm.enqueueSeasonStartEvent(st);
    expect(st.eventQueue).toContainEqual({ date: startD, type: "seasonStart" });
  });
});

describe("enqueueUpdateContractsEvent()", () => {
  const st = new _gs.GameState(endD);
  _sm.enqueueUpdateContractEvent(st, endD);

  test("should enqueue a updateContract gameEvent on the gameState for next day", () => {
    const date = new Date(endD);
    date.setDate(date.getDate() + 1);
    expect(st.eventQueue).toContainEqual({ date, type: "updateContract" });
  });
});

describe("handleSimRound()", () => {
  const gameState = new _gs.GameState(startD);
  const teams = ["Hawks", "Foxes", " Wolfs", "Cats"];
  _sm.newSeasonSchedule(gameState, teams);
  _sm.handleSimRound(gameState, { round: 0 });

  test("should simulate all matches of the given round", () => {
    gameState.schedules.now[0].matchIds.forEach((id) => {
      expect(gameState.matches[id].result).toBeDefined();
    });
  });

  test("should enqueue the next round for the next week", () => {
    const date = gameState.schedules.now[1].date;
    const evt = { date, type: "simRound", detail: { round: 1 } };
    expect(gameState.eventQueue).toContainEqual(evt);
  });
});

describe("handleSkillUpdate()", () => {
  const gameState = new _gs.GameState(startD);

  test("should enqueue a new skillUpdate type GameEvent", () => {
    _sm.handleSkillUpdate(gameState);
    expect(gameState.eventQueue).toContainEqual({
      date: new Date(startD.getFullYear(), startD.getMonth() + 1, 1),
      type: "skillUpdate",
    });
  });

  test("should update the growthState for players", () => {
    const p1 = new _pl.Player("cf", startD, 17);
    const oldGrowthState = p1.growthState;
    gameState.players[p1.id] = p1;
    _sm.handleSkillUpdate(gameState);
    expect(p1.growthState).toBeGreaterThan(oldGrowthState);
  });
});

describe("handleSeasonEnd()", () => {
  const gState = new _gs.GameState(endD);
  const shd = [
    { date: startD, matchIds: [] },
    { date: endD, matchIds: [] },
  ];
  gState.schedules.now = shd;

  test("should enqueue a seasonStart GameEvent", () => {
    const date = new Date(startD);
    date.setFullYear(endD.getFullYear());
    _sm.handleSeasonEnd(gState, { date: endD, type: "updateContract" });
    expect(gState.eventQueue).toContainEqual({ date, type: "seasonStart" });
  });

  test("should enqueue a updateContract GameEvent", () => {
    const date = new Date(endD);
    date.setDate(endD.getDate() + 1);
    _sm.handleSeasonEnd(gState, { date: endD, type: "updateContract" });
    expect(gState.eventQueue).toContainEqual({ date, type: "updateContract" });
  });

  test("should save the ended schedule on the gState.schedules", () => {
    const seasonYears = `${startD.getFullYear()}-${endD.getFullYear()}`;
    expect(gState.schedules[seasonYears]).toEqual(shd);
  });
});

describe("handleSeasonStart()", () => {
  const gameState = new _gs.GameState(startD);
  const teams = ["dragons", "foxes", "birds", "snakes"];
  _gs.initTeams(gameState, teams);
  _sm.handleSeasonStart(gameState);

  test("should enqueue a seasonEnd", () => {
    const e = { date: endD, type: "seasonEnd" };
    expect(gameState.eventQueue).toContainEqual(e);
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

describe("handleUpdateContracts()", () => {
  const st = new _gs.GameState(startD);
  _gs.initTeams(st, ["a", "b", "c", "d"]);
  Object.values(st.contracts).forEach((c) => (c.duration = 1));
  const expiring = Object.values(st.contracts).filter((c) => c.duration === 1);
  _sm.handleUpdateContracts(st);
  const renewed = Object.values(st.contracts);

  test("should renew some contracts", () => {
    expect(renewed.length).toBeGreaterThan(0);
  });

  test("should remove some contracts", () => {
    expect(expiring.length).toBeGreaterThan(renewed.length);
  });
});

describe("handleGameEvent()", () => {
  describe("handle GameEvent simRound type", () => {
    test("should return false", () => {
      const gameState = new _gs.GameState(startD);
      const e = { date: startD, type: "simRound", detail: { round: 0 } };
      expect(_sm.handleGameEvent(gameState, e as _sm.GameEvent)).toBe(false);
    });
  });

  describe("handle GameEvent skillUpdate type", () => {
    test("should return true", () => {
      const e: _sm.GameEvent = { date: startD, type: "skillUpdate" };
      expect(_sm.handleGameEvent(new _gs.GameState(startD), e)).toBe(true);
    });
  });

  describe("handle GameEvent seasonEnd type", () => {
    test("should return true for a seasonEnd type GameEvent", () => {
      const e: _sm.GameEvent = { date: startD, type: "seasonEnd" };
      expect(_sm.handleGameEvent(new _gs.GameState(startD), e)).toBe(true);
    });
  });

  describe("handle GameEvent seasonStart type", () => {
    test("should return true", () => {
      const e: _sm.GameEvent = { date: startD, type: "seasonStart" };
      expect(_sm.handleGameEvent(new _gs.GameState(startD), e)).toBe(true);
    });
  });

  describe("handle GameEvent updateContract type", () => {
    test("should return false", () => {
      const e: _sm.GameEvent = { date: startD, type: "updateContract" };
      expect(_sm.handleGameEvent(new _gs.GameState(startD), e)).toBe(false);
    });
  });
});

describe("process()", () => {
  const gameState = new _gs.GameState(startD);

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
