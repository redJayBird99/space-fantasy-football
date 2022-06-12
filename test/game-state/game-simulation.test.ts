import * as _sm from "../../src/game-state/game-simulation";
import * as _gs from "../../src/game-state/game-state";
import { LeagueTable } from "../../src/game-state/league-table";
import * as _pl from "../../src/character/player";
import * as _t from "../../src/character/team";
import teamsJson from "../../src/asset/team-names.json";

const rdmYear = 1990 + Math.floor(Math.random() * 35);
let startD = new Date(rdmYear, _sm.SEASON_START_MONTH, _sm.SEASON_START_DATE);
let endD = new Date(rdmYear + 1, _sm.SEASON_END_MONTH, _sm.SEASON_END_DATE);
let st = new _gs.GameState(startD);

beforeEach(() => {
  startD = new Date(rdmYear, _sm.SEASON_START_MONTH, _sm.SEASON_START_DATE);
  endD = new Date(rdmYear + 1, _sm.SEASON_END_MONTH, _sm.SEASON_END_DATE);
  st = new _gs.GameState(startD);
});

const getFreeAgents = (st: _gs.GameState) =>
  Object.values(st.players).filter((p) => p.team === "free agent");

describe("enqueueSimRoundEvent", () => {
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
    st.schedules.now = [{ date: startD, matchIds: ["..."] }];
    _sm.enqueueSimRoundEvent(st, 0);
    const evt = { date: startD, type: "simRound", detail: { round: 0 } };
    expect(st.eventQueue).toContainEqual(evt);
  });
});

describe("newSeasonSchedule()", () => {
  const teams = teamsJson.eng.names;

  test("should save a new schedule for the current season", () => {
    _sm.newSeasonSchedule(st, teams);
    expect(st.schedules.now).toBeDefined();
  });

  test("all scheduled rounds are on sunday", () => {
    _sm.newSeasonSchedule(st, teams);
    Object.keys(st.schedules).forEach((key) => {
      st.schedules[key].forEach((round) => {
        expect(round.date.getDay()).toBe(0);
      });
    });
  });

  test("should create teams.length / 2 * 2 * (teams.length - 1) matches", () => {
    _sm.newSeasonSchedule(st, teams);
    const count = (teams.length / 2) * 2 * (teams.length - 1);
    expect(Object.values(st.matches).length).toBe(count);
  });

  test("the schedule should end before the end of season", () => {
    _sm.newSeasonSchedule(st, teams);
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
  test("shouldn't simulate any match if the given round doesn't exist", () => {
    _sm.newSeasonSchedule(st, ["Hawks", "Foxes", " Wolfs", "Cats"]);
    _sm.simulateRound(st, st.schedules.now.length);
    st.schedules.now.forEach((r) => {
      r.matchIds.forEach((id) => {
        expect(st.matches[id].result).not.toBeDefined();
      });
    });
  });

  test("should simulate all matches of the given round", () => {
    _sm.newSeasonSchedule(st, ["Hawks", "Foxes", " Wolfs", "Cats"]);
    _sm.simulateRound(st, 0);
    st.schedules.now[0].matchIds.forEach((id) => {
      expect(st.matches[id].result).toBeDefined();
    });
  });
});

describe("updateSkills()", () => {
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
  test("should subtract one season from contracts", () => {
    _gs.initTeams(st, ["Martians", "insert name"]);
    const cts = Object.values(st.contracts);
    const oldCts = cts.map((c) => JSON.parse(JSON.stringify(c)));
    _sm.updateContracts(st);
    oldCts.forEach((c, i) => expect(c.duration - cts[i].duration).toBe(1));
  });
});

describe("renewExipiringContracts()", () => {
  test("should renew most contracts", () => {
    _gs.initTeams(st, ["Martians", "insert name"]);
    const cts = Object.values(st.contracts);
    cts.forEach((c) => (c.duration = 0));
    _sm.renewExipiringContracts(st);
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

describe("teamsSignFreeAgents()", () => {
  test("shouldn't sign new players when not needed", () => {
    _gs.initTeams(st, ["a", "b"]);
    const oldFree = getFreeAgents(st);
    _sm.teamsSignFreeAgents(st);
    expect(getFreeAgents(st).length).toBe(oldFree.length);
  });

  test("should only sign one player per team", () => {
    _gs.initTeams(st, ["a", "b"]);
    Object.values(st.contracts).forEach((c) => _t.Team.unsignPlayer(st, c));
    _sm.teamsSignFreeAgents(st);
    expect(st.teams.a.playerIds.length).toBe(1);
    expect(st.teams.b.playerIds.length).toBe(1);
  });

  test("should only sign free agents", () => {
    _gs.initTeams(st, ["a", "b"]);
    Object.values(st.contracts).forEach(
      (c) => Math.random() > 0.6 && _t.Team.unsignPlayer(st, c)
    );
    const oldFree = getFreeAgents(st);
    _sm.teamsSignFreeAgents(st);
    expect(getFreeAgents(st).length).toBe(oldFree.length - 2);
  });
});

describe("updateTeamsAppeal()", () => {
  const st = _gs.GameState.init();
  const old: _t.Team[] = JSON.parse(JSON.stringify(Object.values(st.teams)));
  const table = new LeagueTable(_gs.GameState.getSeasonMatches(st, "now"))
    .getSortedTable()
    .map((e) => e.teamName);
  _sm.updateTeamsAppeal(st);

  test("should update most teams appeal", () => {
    // it is possible that some team appeal didn't change
    const changed = old.reduce(
      (a, t) => (t.appeal !== st.teams[t.name].appeal ? a + 1 : a),
      0
    );
    expect(changed).toBeGreaterThan(old.length / 2);
  });

  test("the change magnitude should be less than or equal 1", () => {
    old.forEach((t) =>
      expect(Math.abs(t.appeal - st.teams[t.name].appeal)).toBeLessThan(1.001)
    );
  });

  test("the last in the league should worsen its appeal", () => {
    // note when the position don't change the appeal don't change
    const last = table[table.length - 1];
    const oldAppeal = old.find((t) => t.name === last)?.appeal;
    expect(oldAppeal).toBeGreaterThanOrEqual(st.teams[last].appeal);
  });

  test("the first in the league should increase its appeal", () => {
    // note when the position don't change the appeal don't change
    const oldAppeal = old.find((t) => t.name === table[0])?.appeal;
    expect(oldAppeal).toBeLessThanOrEqual(st.teams[table[0]].appeal);
  });
});

describe("updateTeamsScouting()", () => {
  const st = _gs.GameState.init();
  const old: _t.Team[] = JSON.parse(JSON.stringify(Object.values(st.teams)));
  _sm.updateTeamsScouting(st);

  test("should update some team.scoutOffset", () => {
    expect(
      old.some((t) => t.scoutOffset !== st.teams[t.name].scoutOffset)
    ).toBe(true);
  });

  test("the change magnitude should be less than or equal MAX_SCOUTING_OFFSET / 10", () => {
    old.forEach(
      (t) =>
        expect(
          Math.abs(t.scoutOffset - st.teams[t.name].scoutOffset)
        ).toBeLessThan(_t.MAX_SCOUTING_OFFSET / 10 + 0.0001) // rounding
    );
  });

  test("scoutOffset should decrease or stay the same for high spending teams", () => {
    const rank = old.sort((a, b) => b.finances.scouting - a.finances.scouting);
    expect(rank[0].scoutOffset).toBeGreaterThanOrEqual(
      st.teams[rank[0].name].scoutOffset
    );
  });

  test("scoutOffset should increase or stay the same for low spending teams", () => {
    const rank = old.sort((a, b) => a.finances.scouting - b.finances.scouting);
    expect(rank[0].scoutOffset).toBeLessThanOrEqual(
      st.teams[rank[0].name].scoutOffset
    );
  });
});

describe("enqueueSkillUpdateEvent()", () => {
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
    st.schedules.now = s;
    _sm.storeEndedSeasonSchedule(st);
    const seasonYears = `${startD.getFullYear()}-${endD.getFullYear()}`;
    expect(st.schedules[seasonYears]).toEqual(s);
  });
});

describe("createDraftPlayers()", () => {
  test("should add 52 new Players to the game", () => {
    _sm.createDraftPlayers(st);
    expect(Object.values(st.players).length).toBe(52);
  });

  test("all players generated should be teens", () => {
    _sm.createDraftPlayers(st);
    Object.values(st.players).forEach((p) => {
      expect(_pl.Player.age(p, st.date)).toBeGreaterThanOrEqual(_pl.MIN_AGE);
      expect(_pl.Player.age(p, st.date)).toBeLessThan(20);
    });
  });
});

describe("enqueueSeasonEndEvent()", () => {
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

describe("enqueueNextDayEvent()", () => {
  const st = new _gs.GameState(endD);

  test("should enqueue a gameEvent on the gameState for next day", () => {
    _sm.enqueueNextDayEvent(st, endD, "updateContract");
    const date = new Date(endD);
    date.setDate(date.getDate() + 1);
    expect(st.eventQueue).toContainEqual({ date, type: "updateContract" });
  });
});

describe("enqueueUpdateFinancesEvent()", () => {
  test("should enqueue a updateFinances gameEvent on the gameState for last day of the month", () => {
    _sm.enqueueUpdateFinancesEvent(st);
    const date = new Date(st.date.getFullYear(), st.date.getMonth() + 2, 0);
    expect(st.eventQueue).toContainEqual({ date, type: "updateFinances" });
  });
});

describe("enqueueSigningsEvent()", () => {
  test("shouldn't enqueue a signings gameEvent when days is less than 1", () => {
    _sm.enqueueSigningsEvent(st, startD, 0);
    expect(st.eventQueue.some((e) => e.type === "signings")).toBe(false);
  });

  test("should enqueue a signings gameEvent on the gameState for next day", () => {
    _sm.enqueueSigningsEvent(st, startD, 1);
    const date = new Date(startD);
    date.setDate(startD.getDate() + 1);
    const e = { date, type: "signings", detail: { days: 1 } };
    expect(st.eventQueue).toContainEqual(e);
  });
});

describe("handleSimRound()", () => {
  test("should simulate all matches of the given round", () => {
    _sm.newSeasonSchedule(st, ["Hawks", "Foxes", " Wolfs", "Cats"]);
    _sm.handleSimRound(st, { round: 0 });
    st.schedules.now[0].matchIds.forEach((id) => {
      expect(st.matches[id].result).toBeDefined();
    });
  });

  test("should enqueue the next round for the next week", () => {
    _sm.newSeasonSchedule(st, ["Hawks", "Foxes", " Wolfs", "Cats"]);
    _sm.handleSimRound(st, { round: 0 });
    const date = st.schedules.now[1].date;
    const evt = { date, type: "simRound", detail: { round: 1 } };
    expect(st.eventQueue).toContainEqual(evt);
  });
});

describe("handleSkillUpdate()", () => {
  test("should enqueue a new skillUpdate type GameEvent", () => {
    _sm.handleSkillUpdate(st);
    expect(st.eventQueue).toContainEqual({
      date: new Date(startD.getFullYear(), startD.getMonth() + 1, 1),
      type: "skillUpdate",
    });
  });

  test("should update the growthState for players", () => {
    const p1 = new _pl.Player("cf", startD, 17);
    const oldGrowthState = p1.growthState;
    st.players[p1.id] = p1;
    _sm.handleSkillUpdate(st);
    expect(p1.growthState).toBeGreaterThan(oldGrowthState);
  });
});

describe("handleSeasonEnd()", () => {
  const st = new _gs.GameState(endD);
  const shd = [
    { date: startD, matchIds: [] },
    { date: endD, matchIds: [] },
  ];
  st.schedules.now = shd;

  test("should enqueue a seasonStart GameEvent", () => {
    const date = new Date(startD);
    date.setFullYear(endD.getFullYear());
    _sm.handleSeasonEnd(st, { date: endD, type: "seasonEnd" });
    expect(st.eventQueue).toContainEqual({ date, type: "seasonStart" });
  });

  const date = new Date(endD);
  date.setDate(endD.getDate() + 1);

  test("should enqueue a updateContract GameEvent", () => {
    _sm.handleSeasonEnd(st, { date: endD, type: "seasonEnd" });
    expect(st.eventQueue).toContainEqual({ date, type: "updateContract" });
  });

  test("should enqueue a retiring GameEvent", () => {
    _sm.handleSeasonEnd(st, { date: endD, type: "seasonEnd" });
    expect(st.eventQueue).toContainEqual({ date, type: "retiring" });
  });

  test("should enqueue a draft GameEvent", () => {
    _sm.handleSeasonEnd(st, { date: endD, type: "seasonEnd" });
    expect(st.eventQueue).toContainEqual({ date, type: "draft" });
  });

  test("should save the ended schedule on the st.schedules", () => {
    const seasonYears = `${startD.getFullYear()}-${endD.getFullYear()}`;
    expect(st.schedules[seasonYears]).toEqual(shd);
  });
});

describe("handleSeasonStart()", () => {
  const teams = ["dragons", "foxes", "birds", "snakes"];

  test("should enqueue a seasonEnd", () => {
    _gs.initTeams(st, teams);
    _sm.handleSeasonStart(st);
    const e = { date: endD, type: "seasonEnd" };
    expect(st.eventQueue).toContainEqual(e);
  });

  test("should create a new schedule for the season", () => {
    _gs.initTeams(st, teams);
    _sm.handleSeasonStart(st);
    const rounds = 2 * (teams.length - 1);
    expect(st.schedules.now.length).toBe(rounds);
  });

  test("should enqueue a simRound 0", () => {
    _gs.initTeams(st, teams);
    _sm.handleSeasonStart(st);
    const date = st.schedules.now[0].date;
    const evt = { date, type: "simRound", detail: { round: 0 } };
    expect(st.eventQueue).toContainEqual(evt);
  });
});

describe("handleRetiring()", () => {
  _gs.initTeams(st, ["a", "b", "c", "d"]);
  const allPlrs = Object.values(st.players);
  _sm.handleRetiring(st);
  const retirees = allPlrs.filter((p) => !st.players[p.id]);

  test("should remove some players from the game", () => {
    expect(retirees.length).toBeGreaterThan(0);
  });

  test("should remove all retirees contracs", () => {
    retirees.forEach((p) =>
      expect(_gs.GameState.getContract(st, p)).not.toBeDefined()
    );
  });
});

describe("handleDraft()", () => {
  test("every team should sign one players", () => {
    _gs.initTeams(st, ["a", "b", "c", "d"]);
    const teams = Object.values(st.teams);
    const cp = JSON.parse(JSON.stringify(teams));
    _sm.handleDraft(st);
    teams.forEach((t, i) =>
      expect(t.playerIds.length).toBe(cp[i].playerIds.length + 1)
    );
  });
});

describe("handleUpdateContracts()", () => {
  _gs.initTeams(st, ["a", "b", "c", "d"]);
  Object.values(st.contracts).forEach((c) => (c.duration = 1));
  const expiring = Object.values(st.contracts).filter((c) => c.duration === 1);
  _sm.handleUpdateContracts(st, { date: endD, type: "updateContract" });
  const renewed = Object.values(st.contracts);

  test("should renew some contracts", () => {
    expect(renewed.length).toBeGreaterThan(0);
  });

  test("should remove some contracts", () => {
    expect(expiring.length).toBeGreaterThan(renewed.length);
  });

  test("should enqueue a 30 days signings GameEvent for next day", () => {
    _sm.handleUpdateContracts(st, { date: endD, type: "updateContract" });
    const date = new Date(endD);
    date.setDate(date.getDate() + 1);
    const e: _sm.GameEvent = { date, type: "signings", detail: { days: 30 } };
    expect(st.eventQueue).toContainEqual(e);
  });
});

describe("handleUpdateFinances()", () => {
  test("should update the team budget of every team", () => {
    _gs.initTeams(st, ["a", "b", "c", "d"]);
    const budgets = Object.values(st.teams).map((t) => t.finances.budget);
    _sm.handleUpdateFinances(st);
    Object.values(st.teams).forEach((t, i) =>
      expect(t.finances.budget).not.toBe(budgets[i])
    );
  });

  test("should enqueue next updateFinances GameEvent", () => {
    _sm.handleUpdateFinances(st);
    const date = new Date(st.date.getFullYear(), st.date.getMonth() + 2, 0);
    expect(st.eventQueue).toContainEqual({ date, type: "updateFinances" });
  });
});

describe("handleSignings()", () => {
  const e = { date: endD, type: "signings", detail: { days: 20 } };

  test("should enqueue a the next signings GameEvent with a day less", () => {
    const date = new Date(endD);
    date.setDate(date.getDate() + 1);
    const nextE = { date, type: "signings", detail: { days: 19 } };
    _sm.handleSignings(st, e as _sm.GameEvent);
    expect(st.eventQueue).toContainEqual(nextE as _sm.GameEvent);
  });

  test("should sign one new players per team when players are needed", () => {
    _gs.initTeams(st, ["a", "b"]);
    Object.values(st.contracts).forEach((c) => _t.Team.unsignPlayer(st, c));
    _sm.handleSignings(st, e as _sm.GameEvent);
    expect(st.teams.a.playerIds.length).toBe(1);
    expect(st.teams.b.playerIds.length).toBe(1);
  });
});

describe("handleGameEvent()", () => {
  describe("handle simRound GameEvent", () => {
    test("should return false", () => {
      const e = { date: startD, type: "simRound", detail: { round: 0 } };
      expect(_sm.handleGameEvent(st, e as _sm.GameEvent)).toBe(false);
    });
  });

  describe("handle skillUpdate GameEvent", () => {
    test("should return true", () => {
      const e: _sm.GameEvent = { date: startD, type: "skillUpdate" };
      expect(_sm.handleGameEvent(st, e)).toBe(true);
    });
  });

  describe("handle seasonEnd GameEvent", () => {
    test("should return true for a seasonEnd type GameEvent", () => {
      const e: _sm.GameEvent = { date: startD, type: "seasonEnd" };
      expect(_sm.handleGameEvent(st, e)).toBe(true);
    });
  });

  describe("handle seasonStart GameEvent", () => {
    test("should return true", () => {
      const e: _sm.GameEvent = { date: startD, type: "seasonStart" };
      expect(_sm.handleGameEvent(st, e)).toBe(true);
    });
  });

  describe("handle updateContract GameEvent", () => {
    test("should return false", () => {
      const e: _sm.GameEvent = { date: startD, type: "updateContract" };
      expect(_sm.handleGameEvent(st, e)).toBe(false);
    });
  });

  describe("handle updateFinances GameEvent", () => {
    test("should return false", () => {
      const e: _sm.GameEvent = { date: startD, type: "updateFinances" };
      expect(_sm.handleGameEvent(st, e)).toBe(false);
    });
  });

  describe("handle signings GameEvent", () => {
    test("should return false", () => {
      const e = { date: startD, type: "signings", detail: { days: 1 } };
      expect(_sm.handleGameEvent(st, e as _sm.GameEvent)).toBe(false);
    });
  });
});

describe("process()", () => {
  test("when the gamestate.eventQueue is empty doesn't mutate the gameState date", () => {
    st.eventQueue = [];
    _sm.process(st);
    expect(st.date).toEqual(startD);
  });

  test("when the gamestate.eventQueue is empty return true", () => {
    expect(_sm.process(st)).toBe(true);
  });

  test("process one event at the time and pop it from the queue", () => {
    const evts: _sm.GameEvent[] = [
      { date: startD, type: "simRound", detail: { round: 0 } },
      { date: startD, type: "simRound", detail: { round: 1 } },
    ];
    st.eventQueue.push(...evts);
    _sm.process(st);
    expect(st.eventQueue).toEqual([evts[1]]);
  });

  // TODO: speed up
  describe("simulate 10 seasons", () => {
    const st = _gs.GameState.init();

    for (let i = 0; i < 10; i++) {
      const end = new Date(
        st.date.getFullYear() + 1,
        _sm.SEASON_START_MONTH,
        _sm.SEASON_START_DATE
      );

      while (st.date.getTime() <= end.getTime()) {
        _sm.process(st);
      }

      describe(`at season ${i} the gameState`, () => {
        // we need to clone every seasons game state so tests can capture it,
        // otherwise the tests whould only run with last season gameState mutation
        const cp = _gs.GameState.parse(JSON.stringify(st));
        const players = Object.values(cp.players);
        const teams = Object.values(cp.teams);

        test(`should have at least teams * 30 Players`, () => {
          expect(players.length).toBeGreaterThan(teams.length * 30);
        });

        test(`should have at most teams * 50 Players`, () => {
          expect(players.length).toBeLessThan(teams.length * 50);
        });

        test(`should have under age 20 players`, () => {
          expect(players.some((p) => _pl.Player.age(p, cp.date) < 20)).toBe(
            true
          );
        });

        test(`should have under age 30 players`, () => {
          expect(players.some((p) => _pl.Player.age(p, cp.date) < 30)).toBe(
            true
          );
        });

        test("every team should have at least 21 players", () => {
          teams.forEach((t) => expect(t.playerIds.length).toBeGreaterThan(20));
        });

        test("teams should never have a budget less than -SALARY_CAP * 50", () => {
          teams.forEach((t) =>
            expect(t.finances.budget).toBeGreaterThan(-_pl.SALARY_CAP * 50)
          );
        });
      });
    }
  });
});
