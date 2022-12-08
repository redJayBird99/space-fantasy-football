import "../mock/app-state.mock";
import "../../src/game-sim/sim-worker-interface";
import "../mock/broadcast-channel.mock";
import "../../src/pages/util/router";
import {
  draftPlayer,
  exportedForTesting as _sm,
  GameEvent,
  prepareSeasonStart,
  enqueueEventFor,
} from "../../src/game-sim/game-simulation";
import * as _gs from "../../src/game-state/game-state";
import { LeagueTable } from "../../src/game-state/league-table";
import * as _pl from "../../src/character/player";
import * as _t from "../../src/character/team";
import teamsJson from "../../src/asset/team-names.json";
import { getPopStats } from "../../src/game-state/population-stats";
jest.mock("../../src/pages/util/router");
jest.mock("../../src/game-sim/sim-worker-interface");

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

describe("renewExpiringContracts()", () => {
  test("should renew most contracts", () => {
    _gs.initTeams(st, ["Martians", "insert name"]);
    const cts = Object.values(st.contracts);
    cts.forEach((c) => (c.duration = 0));
    _sm.renewExpiringContracts(st);
    const renewed = cts.filter((c) => c.duration > 0);
    const expiring = cts.filter((c) => c.duration === 0);
    expect(renewed.length).toBeLessThan(expiring.length);
  });

  test("should should skip the userTeam when skip is true", () => {
    _gs.initTeams(st, ["Martians", "insert name"]);
    st.userTeam = "insert name";
    const cts = Object.values(st.contracts);
    cts.forEach((c) => (c.duration = 0));
    _sm.renewExpiringContracts(st, true);
    const userContracts = Object.values(st.contracts).filter(
      (c) => c.teamName === st.userTeam
    );
    expect(userContracts.some((c) => c.duration > 0)).toBe(false);
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
    const expired = Object.values(st.contracts).filter((c) => c.duration === 0);
    expect(expired.length).toBe(0);
  });

  test("team shouldn't have expired player", () => {
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
    const st = _gs.GameState.init("ab".split(""));
    const oldFree = getFreeAgents(st);
    _sm.teamsSignFreeAgents(st);
    expect(getFreeAgents(st).length).toBe(oldFree.length);
  });

  test("should only sign one player per team", () => {
    const st = _gs.GameState.init("ab".split(""));
    Object.values(st.contracts).forEach((c) => _t.Team.unSignPlayer(st, c));
    _sm.teamsSignFreeAgents(st);
    expect(st.teams.a.playerIds.length).toBe(1);
    expect(st.teams.b.playerIds.length).toBe(1);
  });

  test("should only sign free agents", () => {
    const st = _gs.GameState.init("ab".split(""));
    Object.values(st.contracts).forEach(
      (c) => Math.random() > 0.6 && _t.Team.unSignPlayer(st, c)
    );
    const oldFree = getFreeAgents(st);
    _sm.teamsSignFreeAgents(st);
    expect(getFreeAgents(st).length).toBe(oldFree.length - 2);
  });

  test("when skipUser is true the user team shouldn't sign any player", () => {
    const st = _gs.GameState.init(["a", "b"]);
    st.userTeam = "a";
    Object.values(st.contracts).forEach((c) => _t.Team.unSignPlayer(st, c));
    _sm.teamsSignFreeAgents(st, true);
    expect(st.teams[st.userTeam].playerIds.length).toBe(0);
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
  test("should enqueue a new skillUpdate GameEvent for the first day of next month", () => {
    _sm.enqueueSkillUpdateEvent(st);
    expect(st.eventQueue).toContainEqual({
      date: new Date(startD.getFullYear(), startD.getMonth() + 1, 1),
      type: "skillUpdate",
    });
  });
});

describe("storeEndedSeasonSchedule()", () => {
  const s = [
    { date: startD, matchIds: [] },
    { date: endD, matchIds: [] },
  ];

  test("should save gameState.schedules.now as gameState.schedules.now[ended season years]", () => {
    st.schedules.now = s;
    _sm.storeEndedSeason(st);
    const seasonYears = `${startD.getFullYear()}-${endD.getFullYear()}`;
    expect(st.schedules[seasonYears]).toEqual(s);
  });

  test("should save gameState.transactions.now as gameState.transactions[ended season years]", () => {
    st.schedules.now = s;
    st.transactions.now = { trades: [], signings: [], renewals: [] };
    const ts = st.transactions.now;
    _sm.storeEndedSeason(st);
    const seasonYears = `${startD.getFullYear()}-${endD.getFullYear()}`;
    expect(st.transactions[seasonYears]).toBe(ts);
    expect(st.transactions.now).not.toBe(ts);
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
  test("should enqueue a new seasonEnd GameEvent for june first of next year", () => {
    _sm.enqueueSeasonEndEvent(st);
    expect(st.eventQueue).toContainEqual({ date: endD, type: "seasonEnd" });
  });
});

describe("enqueueSeasonStartEvent()", () => {
  const date = new Date(startD.getFullYear(), _sm.SEASON_START_MONTH - 1, 10);
  const st = new _gs.GameState(date);

  test("should enqueue a new seasonStart GameEvent for september first of this year", () => {
    _sm.enqueueSeasonStartEvent(st);
    expect(st.eventQueue).toContainEqual({ date: startD, type: "seasonStart" });
  });
});

describe("enqueueEventFor()", () => {
  test("should enqueue a gameEvent on the gameState for next day", () => {
    const st = new _gs.GameState(startD);
    enqueueEventFor(st, endD, "updateContracts", { days: 1 });
    const date = new Date(endD);
    date.setDate(date.getDate() + 1);
    expect(st.eventQueue).toContainEqual({ date, type: "updateContracts" });
  });

  test("should enqueue a gameEvent on the gameState for next month", () => {
    const st = new _gs.GameState(startD);
    enqueueEventFor(st, endD, "updateContracts", { months: 1 });
    const date = new Date(endD);
    date.setMonth(date.getMonth() + 1);
    expect(st.eventQueue).toContainEqual({ date, type: "updateContracts" });
  });

  test("should enqueue an event on the gameState for the previous day", () => {
    const st = new _gs.GameState(startD);
    enqueueEventFor(st, endD, "updateContracts", { days: -1 });
    const date = new Date(endD);
    date.setDate(date.getDate() - 1);
    expect(st.eventQueue).toContainEqual({ date, type: "updateContracts" });
  });

  test("should not enqueue an event for the previous day when the date is passed", () => {
    const st = new _gs.GameState(startD);
    enqueueEventFor(st, startD, "updateContracts", { days: -1 });
    const date = new Date(startD);
    date.setDate(date.getDate() - 1);
    expect(st.eventQueue).not.toContainEqual({ date, type: "updateContracts" });
  });
});

describe("enqueueUpdateFinancesEvent()", () => {
  test("should enqueue a updateFinances gameEvent on the gameState for last day of the month", () => {
    _sm.enqueueUpdateFinancesEvent(st);
    const date = new Date(st.date.getFullYear(), st.date.getMonth() + 2, 0);
    expect(st.eventQueue).toContainEqual({ date, type: "updateFinances" });
  });
});

describe("handleSimRound()", () => {
  test("should simulate all matches of the given round", async () => {
    _sm.newSeasonSchedule(st, ["Hawks", "Foxes", " Wolfs", "Cats"]);
    await _sm.handleSimRound(st, { round: 0 });
    st.schedules.now[0].matchIds.forEach((id) => {
      expect(st.matches[id].result).toBeDefined();
    });
  });

  test("should enqueue the next round for the next week", async () => {
    _sm.newSeasonSchedule(st, ["Hawks", "Foxes", " Wolfs", "Cats"]);
    await _sm.handleSimRound(st, { round: 0 });
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

  test("should update the population stats", () => {
    _gs.GameState.savePlayer(st, new _pl.Player("am", new Date(), 18));
    const old = getPopStats(Object.values(st.players));
    st.popStats = old;
    _sm.handleSkillUpdate(st);
    expect(st.popStats).not.toEqual(old);
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
    _sm.handleSeasonEnd(st);
    expect(st.eventQueue).toContainEqual({ date, type: "seasonStart" });
  });

  const date = new Date(endD);
  date.setDate(endD.getDate() + 1);

  test("should save the ended schedule on the st.schedules", () => {
    const seasonYears = `${startD.getFullYear()}-${endD.getFullYear()}`;
    expect(st.schedules[seasonYears]).toEqual(shd);
  });
});

describe("prepareSeasonStart()", () => {
  const teams = ["dragons", "foxes", "birds", "snakes"];

  test("should enqueue a seasonEnd", () => {
    _gs.initTeams(st, teams);
    prepareSeasonStart(st);
    const e = { date: endD, type: "seasonEnd" };
    expect(st.eventQueue).toContainEqual(e);
  });

  test("should create a new schedule for the season", () => {
    _gs.initTeams(st, teams);
    prepareSeasonStart(st);
    const rounds = 2 * (teams.length - 1);
    expect(st.schedules.now.length).toBe(rounds);
  });

  test("should enqueue a simRound 0", () => {
    _gs.initTeams(st, teams);
    prepareSeasonStart(st);
    const date = st.schedules.now[0].date;
    const evt = { date, type: "simRound", detail: { round: 0 } };
    expect(st.eventQueue).toContainEqual(evt);
  });

  test("should enqueue a closeFreeSigningWindow gameEvent one month before the season end date", () => {
    const st = new _gs.GameState(startD);
    prepareSeasonStart(st);
    const y = st.date.getFullYear() + 1;
    const date = new Date(y, _sm.SEASON_END_MONTH - 1, _sm.SEASON_END_DATE);
    expect(st.eventQueue).toContainEqual({
      date,
      type: "closeFreeSigningWindow",
    });
  });

  test("should set the game state flag openTradeWindow to false", () => {
    expect(st.flags.openTradeWindow).toBe(false);
  });

  test("should enqueue a retiring GameEvent one day after the end of the season", () => {
    prepareSeasonStart(st);
    const date = new Date(endD);
    date.setDate(date.getDate() + 1);
    expect(st.eventQueue).toContainEqual({ date, type: "retiring" });
  });

  test("should enqueue a updateContracts GameEvent two day after the end of the season", () => {
    prepareSeasonStart(st);
    const date = new Date(endD);
    date.setDate(date.getDate() + 2);
    expect(st.eventQueue).toContainEqual({ date, type: "updateContracts" });
  });

  test("should enqueue a draftStart GameEvent three day after the end of the season", () => {
    prepareSeasonStart(st);
    const date = new Date(endD);
    date.setDate(date.getDate() + 3);
    expect(st.eventQueue).toContainEqual({ date, type: "draftStart" });
  });

  test("should enqueue a openTradeWindow GameEvent four day after the end of the season", () => {
    prepareSeasonStart(st);
    const date = new Date(endD);
    date.setDate(date.getDate() + 4);
    expect(st.eventQueue).toContainEqual({ date, type: "openTradeWindow" });
  });

  test("should enqueue a openFreeSigningWindow GameEvent four day after the end of the season", () => {
    prepareSeasonStart(st);
    const date = new Date(endD);
    date.setDate(date.getDate() + 4);
    expect(st.eventQueue).toContainEqual({
      date,
      type: "openFreeSigningWindow",
    });
  });
});

describe("handleRetiring()", () => {
  test("should add some player to the retiring list", () => {
    _gs.initTeams(st, ["a", "b", "c", "d"]);
    _sm.handleRetiring(st);
    expect(st.retiring.length).toBeGreaterThan(0);
  });
});

describe("handleRetiring()", () => {
  _gs.initTeams(st, ["a", "b", "c", "d"]);
  const retiring = Object.values(st.players)
    .filter((_, i) => i % 3 === 0)
    .map((p) => p.id);
  st.retiring = retiring;
  const gs = _gs.GameState.parse(JSON.stringify(st));
  _sm.handleRetire(gs);

  test("should remove all retiring players from the game.players", () => {
    expect(retiring.some((id) => gs.players[id])).toBe(false);
  });

  test("should remove all retiring players contracts", () => {
    expect(retiring.some((id) => gs.contracts[id])).toBe(false);
  });

  test("should add all retiring players to gs.retirees", () => {
    expect(!retiring.some((id) => !gs.retirees[id])).toBe(true);
  });
});

describe("handleDraft()", () => {
  const mockSt = _gs.GameState.parse(JSON.stringify(st));
  _gs.initTeams(mockSt, ["a", "b", "c", "d"]);
  mockSt.eventQueue = [{ date: endD, type: "draftStart" }];

  test("every team should sign one players", () => {
    const gs = _gs.GameState.parse(JSON.stringify(mockSt));
    const teams = Object.values(gs.teams);
    const cp = JSON.parse(JSON.stringify(teams));
    _sm.prepareDraft(gs); // we need to create the players
    _sm.handleDraft(gs);
    teams.forEach((t, i) =>
      expect(t.playerIds.length).toBe(cp[i].playerIds.length + 1)
    );
  });

  test("should stop on the user team when one exists", () => {
    const gs = _gs.GameState.parse(JSON.stringify(mockSt));
    _sm.prepareDraft(gs); // we need to create the players
    const user = (gs.userTeam = gs.drafts.now.lottery[2]);
    _sm.handleDraft(gs);
    expect(gs.drafts.now.lottery[0]).toBe(user);
  });

  test("after the draft no picks should draftable anymore", () => {
    const gs = _gs.GameState.parse(JSON.stringify(mockSt));
    _sm.prepareDraft(gs); // we need to create the players
    const picks = gs.drafts.now.picks.map((p) => gs.players[p.plId]);
    _sm.handleDraft(gs);
    expect(picks.some((p) => p.team === "draft")).toBe(false);
  });
});

describe("handleUpdateContracts()", () => {
  const st = _gs.GameState.init("ab".split(""));
  const cts = JSON.parse(JSON.stringify(st.contracts));
  st.userTeam = "a";
  _sm.handleUpdateContracts(st);
  const ctsKeys = Object.keys(cts);

  test("should update the contract length", () => {
    ctsKeys.forEach((k) =>
      expect(cts[k].duration).toBe(st.contracts[k].duration + 1)
    );
  });
});

describe("handleRenewals()", () => {
  const st = _gs.GameState.init("abcd".split(""));
  const cts = Object.values(st.contracts);
  cts.forEach((c) => (c.duration = 0));
  _sm.handleRenewals(st);
  const renewed = Object.values(st.contracts);

  test("should renew some expiring contracts", () => {
    expect(renewed.length).toBeGreaterThan(0);
  });

  test("should remove some expiring contracts", () => {
    expect(cts.length).toBeGreaterThan(renewed.length);
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
  describe("enqueuing signings GameEvent", () => {
    const dayAfter = new Date(endD);
    dayAfter.setDate(dayAfter.getDate() + 1);

    test("when the free signing window is open should enqueue", () => {
      const st = new _gs.GameState(endD);
      st.flags.openFreeSigningWindow = true;
      expect(st.eventQueue).not.toContainEqual(
        expect.objectContaining({ type: "signings" })
      );
      _sm.handleSignings(st);
      expect(st.eventQueue).toContainEqual(
        expect.objectContaining({ type: "signings" })
      );
    });

    test("when the free signing window is close should not enqueue", () => {
      const st = new _gs.GameState(endD);
      st.flags.openFreeSigningWindow = false;
      _sm.handleSignings(st);
      expect(st.eventQueue).not.toContainEqual(
        expect.objectContaining({ type: "signings" })
      );
    });

    test("when the season start is imminent it should enqueue daily", () => {
      const st = new _gs.GameState(endD);
      st.flags.openFreeSigningWindow = true;
      const start = new Date(endD);
      start.setMonth(start.getMonth() + 1);
      _gs.GameState.enqueueGameEvent(st, { date: start, type: "seasonStart" });
      _sm.handleSignings(st);
      expect(
        st.eventQueue.find((e) => e.type === "signings")?.date.getTime()
      ).toBeLessThanOrEqual(dayAfter.getTime());
    });

    test("when the season start isn't imminent it should not enqueue daily", () => {
      const st = new _gs.GameState(endD);
      st.flags.openFreeSigningWindow = true;
      _sm.handleSignings(st);
      expect(
        st.eventQueue.find((e) => e.type === "signings")?.date.getTime()
      ).toBeGreaterThan(dayAfter.getTime());
    });
  });

  test("should sign one new players per team when players are needed and the free signing window is open", () => {
    const st = _gs.GameState.init("abcd".split(""));
    st.flags.openFreeSigningWindow = true;
    Object.values(st.contracts).forEach((c) => _t.Team.unSignPlayer(st, c));
    _sm.handleSignings(st);
    expect(st.teams.a.playerIds.length).toBe(1);
    expect(st.teams.b.playerIds.length).toBe(1);
  });

  test("should not sign any players when the free signing window is closed", () => {
    const st = _gs.GameState.init("abcd".split(""));
    st.flags.openFreeSigningWindow = false;
    Object.values(st.contracts).forEach((c) => _t.Team.unSignPlayer(st, c));
    _sm.handleSignings(st);
    expect(st.teams.a.playerIds.length).toBe(0);
    expect(st.teams.b.playerIds.length).toBe(0);
  });
});

describe("handleInjuries", () => {
  test("should enqueue the next InjuryUpdate", () => {
    _gs.initTeams(st, ["a", "b"]);
    expect(st.eventQueue.some((e) => e.type === "injuriesUpdate")).toBe(false);
    _sm.handleInjuries(st);
    expect(st.eventQueue.some((e) => e.type === "injuriesUpdate")).toBe(true);
  });
});

describe("handleOpenTradeWindow", () => {
  test("should set the gameState flag openTradeWindow to true", () => {
    _sm.handleOpenTradeWindow(st);
    expect(st.flags.openTradeWindow).toBe(true);
  });

  test("should enqueue a trade event", () => {
    expect(st.eventQueue).not.toContainEqual(
      expect.objectContaining({ type: "trade" })
    );
    _sm.handleOpenTradeWindow(st);
    expect(st.eventQueue).toContainEqual(
      expect.objectContaining({ type: "trade" })
    );
  });
});

describe("handleOpenFreeSigningWindow", () => {
  test("should set the gameState flag openFreeSigningWindow and signLimit to true", () => {
    _sm.handleOpenFreeSigningWindow(st);
    expect(st.flags.openFreeSigningWindow).toBe(true);
    expect(st.flags.signLimit).toBe(true);
  });

  test("should enqueue a signings game event", () => {
    _sm.handleOpenFreeSigningWindow(st);
    expect(st.eventQueue).toContainEqual(
      expect.objectContaining({ type: "signings" })
    );
  });
});

describe("handleCloseFreeSigningWindow", () => {
  test("should set the gameState flag openFreeSigningWindow to false", () => {
    _sm.handleCloseFreeSigningWindow(st);
    expect(st.flags.openFreeSigningWindow).toBe(false);
  });
});

describe("handleTrade", () => {
  describe("when the flag openTradeWindow is false", () => {
    test("should not enqueue any new trade event", () => {
      st.flags.openTradeWindow = false;
      _sm.handleTrade(st);
      expect(st.eventQueue).not.toContainEqual(
        expect.objectContaining({ type: "trade" })
      );
    });

    test("should not trade players", () => {
      // cSpell:ignore abcdefghijklmnopqrst
      const st = _gs.GameState.init("abcdefghijklmnopqrst".split(""));
      st.flags.openTradeWindow = false;
      const old = Object.values(st.teams).map((t) => t.playerIds);
      _sm.handleTrade(st);
      expect(Object.values(st.teams).map((t) => t.playerIds)).toEqual(old);
    });
  });

  describe("when the flag openTradeWindow is true", () => {
    test("should enqueue a new trade event", () => {
      st.flags.openTradeWindow = true;
      _sm.handleTrade(st);
      expect(st.eventQueue).toContainEqual(
        expect.objectContaining({ type: "trade" })
      );
    });

    test("should be able to trade players", () => {
      const st = _gs.GameState.init("abcdefghijklmnopqrst".split(""));
      st.flags.openTradeWindow = true;
      const old = Object.values(st.teams).map((t) => t.playerIds);

      for (let i = 0; i < 10; i++) {
        // to be sure that some trade was made
        _sm.handleTrade(st);
      }

      expect(Object.values(st.teams).map((t) => t.playerIds)).not.toEqual(old);
    });
  });
});

describe("handleGameEvent()", () => {
  describe("for every true event in endSimOnEvent", () => {
    test("should return true", async () => {
      for (const type in _sm.endSimOnEvent) {
        const e = {
          date: startD,
          type,
          detail: type === "simRound" ? { round: 0 } : undefined,
        };
        expect((await _sm.handleGameEvent(st, e as GameEvent)).stop).toBe(true);
      }
    });
  });

  describe("for events not defined in endSimOnEvent", () => {
    test("should return false", async () => {
      const e = { date: startD, type: "updateContract" };
      const rst = await _sm.handleGameEvent(st, e as GameEvent);
      expect(rst.stop).toBe(false);
    });
  });
});

describe("process()", () => {
  test("when the gameState.eventQueue is empty doesn't mutate the gameState date", async () => {
    st.eventQueue = [];
    await _sm.process(st);
    expect(st.date).toEqual(startD);
  });

  test("when the gameState.eventQueue is empty return true", async () => {
    expect(await _sm.process(st)).toBe(true);
  });

  test("process one event at the time and pop it from the queue", async () => {
    const evts: GameEvent[] = [
      { date: startD, type: "simRound", detail: { round: 0 } },
      { date: startD, type: "simRound", detail: { round: 1 } },
    ];
    st.eventQueue.push(...evts);
    await _sm.process(st);
    expect(st.eventQueue).toEqual([evts[1]]);
  });

  test("should unset the flags onGameEvent and signedNewPlayer after some time elapsed", async () => {
    st.eventQueue.push({ date: endD, type: "simRound", detail: { round: 0 } });
    st.flags.onGameEvent = "draft";
    st.flags.signedNewPlayer = true;
    await _sm.process(st);
    expect(st.flags.signedNewPlayer).toBe(false);
    expect(st.flags.onGameEvent).toBeUndefined();
  });

  test("should able to update the Rejections", async () => {
    st.eventQueue.push({ date: endD, type: "simRound", detail: { round: 0 } });
    st.date = new Date("2000-12-16");
    st.flags.openFreeSigningWindow = true;
    const rjs = JSON.parse(JSON.stringify(st.rejections));
    await _sm.process(st);
    expect(st.rejections).toEqual(rjs);
  });

  test("when the next event closer than SIM_TIME_SLICE only the missing amount of time should be added", async () => {
    const evtD = new Date(st.date);
    evtD.setHours(evtD.getHours() + _sm.SIM_TIME_SLICE / 2);
    st.eventQueue.push({ date: evtD, type: "simRound", detail: { round: 0 } });
    await _sm.process(st);
    expect(st.date).toEqual(evtD);
  });
});

describe("timeout()()", () => {
  test("should return false when the duration wasn't given", () => {
    expect(_sm.timeout(10)(10)).toBe(false);
  });

  test("should return false when the duration wasn't exceeded", () => {
    expect(_sm.timeout(10, 10)(15)).toBe(false);
  });

  test("should return true when the duration was exceeded", () => {
    expect(_sm.timeout(10, 10)(21)).toBe(true);
  });
});

describe("simulate()", () => {
  const teams = ["a", "b", "c", "d"];

  test("should run until an event stop it", () => {
    const st = _gs.GameState.init(teams);
    const start = st.date.getTime();
    return new Promise<_gs.GameState>((resolve) => {
      _sm.simulate(
        st,
        () => {},
        (gs) => resolve(gs)
      );
    }).then((gs) => expect(gs.date.getTime()).toBeGreaterThan(start));
  });

  test("the onEnd callback should be called after the simulation was ended", () => {
    const st = _gs.GameState.init(teams);
    return new Promise<_gs.GameState>((resolve) => {
      _sm.simulate(
        st,
        () => {},
        (gs) => resolve(gs)
      );
      expect(_sm.isSimulating()).toBe(true);
    }).then(() => expect(_sm.isSimulating()).toBe(false));
  });

  test("should not elapse more than the given until", () => {
    const st = _gs.GameState.init(teams);
    const start = st.date.getTime();

    return new Promise<_gs.GameState>((resolve) => {
      _sm.simulate(
        st,
        () => {},
        (gs) => resolve(gs),
        "oneDay"
      );
    }).then((gs) => {
      const oneDayMargin = 24 * 60 * 60 * 1000 + 1000;
      expect(gs.date.getTime()).toBeGreaterThan(start);
      expect(gs.date.getTime()).toBeLessThan(start + oneDayMargin);
    });
  });

  test("when the returned function is called should stop the simulation", () => {
    const st = _gs.GameState.init(teams);
    const start = st.date.getTime();

    return new Promise<_gs.GameState>((resolve) => {
      const stop = _sm.simulate(
        st,
        () => {},
        (gs) => resolve(gs)
      );
      stop();
    }).then((gs) => {
      // the simulation was stopped right away
      expect(gs.date.getTime()).toBe(start);
    });
  });

  test("an ended simulation returned function should not be able to stop a new simulation", async () => {
    const st = _gs.GameState.init(teams);
    let stop: ReturnType<typeof _sm.simulate> | undefined;

    let gs = await new Promise<_gs.GameState>((resolve) => {
      stop = _sm.simulate(
        st,
        () => {},
        (s) => resolve(s),
        "seasonEnd"
      );
    });

    const start = gs.date.getTime(); // after

    gs = await new Promise<_gs.GameState>((resolve) => {
      _sm.simulate(
        gs,
        () => {},
        (s) => resolve(s),
        "seasonStart"
      );
      stop?.(); // try to stop it with an old controller
    });

    // the simulation wasn't stopped
    expect(gs.date.getTime()).toBeGreaterThan(start);
  });
});

describe("prepareDraft()", () => {
  const mocksSt = _gs.GameState.parse(JSON.stringify(st));
  mocksSt.drafts = { now: { when: "", picks: [], picked: [], lottery: [] } };
  _gs.initTeams(mocksSt, ["a", "b", "c", "d"]);

  test("should fill the draft properties when a draft event is enqueued", () => {
    const gs = _gs.GameState.parse(JSON.stringify(mocksSt));
    gs.eventQueue.push({ date: endD, type: "draftStart" });
    _sm.prepareDraft(gs);
    expect(gs.drafts.now.picks.length).toBeGreaterThan(0);
    expect(gs.drafts.now.when).not.toBe("");
    expect(gs.drafts.now.lottery).toHaveLength(Object.values(gs.teams).length);
  });

  test("should not modify the draft property if a draft event isn't enqueued", () => {
    const gs = _gs.GameState.parse(JSON.stringify(mocksSt));
    delete gs.drafts.now;
    _sm.prepareDraft(gs);
    expect(gs.drafts.now).toBeUndefined();
  });
});

describe("draftPlayer()", () => {
  const mocksSt = _gs.GameState.parse(JSON.stringify(st));
  mocksSt.drafts = { now: { when: "", picks: [], picked: [], lottery: [] } };
  mocksSt.eventQueue.push({ date: endD, type: "draftStart" });
  _gs.initTeams(mocksSt, ["a", "b", "c", "d"]);

  test("the first of the lottery should pick one draftable player and be removed", () => {
    const gs = _gs.GameState.parse(JSON.stringify(mocksSt));
    _sm.prepareDraft(gs);
    const first = gs.drafts.now.lottery[0];
    draftPlayer(gs);
    expect(gs.drafts.now.picked).toHaveLength(1);
    expect(gs.drafts.now.lottery).toEqual(expect.not.arrayContaining([first]));
    expect(gs.drafts.now.picked[0].team).toBe(first);
  });

  test("when a pick is given that one should be drafted and removed from the picks", () => {
    const gs = _gs.GameState.parse(JSON.stringify(mocksSt));
    _sm.prepareDraft(gs);
    const p = gs.players[gs.drafts.now.picks[0].plId];
    draftPlayer(gs, p);
    expect(gs.drafts.now.picked[0].plId).toBe(p.id);
    expect(gs.drafts.now.picks.find((r) => r.plId === p.id)).toBeUndefined();
  });
});

describe("updateRejections", () => {
  const st = _gs.GameState.init(["a", "b", "c", "d"], "a");
  const fn = _pl.Player.approachable;

  test("some players should be added to the rejections list", () => {
    // @ts-ignore
    _pl.Player.approachable = jest.fn((_, i) => i % 2 === 0);
    _sm.updateRejections(st);
    expect(Object.keys(st.rejections).length).toBeGreaterThan(0);
  });

  test("all players in rejections should be free agents", () => {
    expect(
      Object.keys(st.rejections).some(
        (id) => st.players[id].team !== "free agent"
      )
    ).toBe(false);
    _pl.Player.approachable = fn;
  });
});

describe("recoverInjuredPlayers", () => {
  const mockGs = {
    date: new Date("2000-1-6"),
    injuries: {
      a: { severe: false, when: "2000-1-6" },
      b: { severe: false, when: "2000-1-8" },
    },
  };
  _sm.recoverInjuredPlayers(mockGs as unknown as _gs.GameState);

  test("should delete the injury of player a", () => {
    expect(mockGs.injuries.a).toBeUndefined();
  });

  test("should preserve the injury of player b", () => {
    expect(mockGs.injuries.b).toBeDefined();
  });
});

describe("InjurePlayers", () => {
  _gs.initTeams(st, ["a", "b"]);
  const mockGs = _gs.GameState.parse(JSON.stringify(st));

  for (let i = 0; i < 4; i++) {
    _sm.injurePlayers(mockGs);
  }

  const injuries = Object.entries(mockGs.injuries);

  test("after some calls some players should be injured", () => {
    expect(injuries.length).toBeGreaterThan(0);
  });

  test("the recovery should greater than 0 days for all injured players", () => {
    injuries.forEach(([, i]) =>
      expect(new Date(i.when).getTime() > st.date.getTime()).toBe(true)
    );
  });
});
