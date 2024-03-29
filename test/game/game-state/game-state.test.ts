import "../../../src/game/game-sim/sim-worker-interface";
import "../../mock/broadcast-channel.mock";
import "../../../src/pages/util/router";
import * as _gs from "../../../src/game/game-state/game-state";
import * as _sm from "../../../src/game/game-sim/game-simulation";
import * as _pl from "../../../src/game/character/player";
import * as _tm from "../../../src/game/character/team";
import { Schedule } from "../../../src/game/game-sim/tournament-scheduler";
import teamsJson from "../../../src/asset/team-names.json";
jest.mock("../../../src/pages/util/router");
jest.mock("../../../src/game/game-sim/sim-worker-interface");

const rdmYear = 1990 + Math.floor(Math.random() * 35);
const startD = new Date(rdmYear, _gs.INIT_MONTH, _gs.INIT_DATE);
let st: _gs.GameState = new _gs.GameState(startD);
const teamNames = ["Albinos", "rockets", "sharks", "hawks"];

beforeEach(() => {
  st = new _gs.GameState(startD);
});

describe("new GameState()", () => {
  test("should have the default popStats", () => {
    expect(new _gs.GameState(startD).popStats).toEqual({
      sampleSize: 0,
      meanScore: 62,
      medianScore: 62,
      lowestScore: 45,
      highestScore: 75,
      standardDev: 5.6,
    });
  });
});

describe("GameState handle contracts", () => {
  const team = new _tm.Team("just");
  const plr = new _pl.Player("cf", startD);
  const c = { teamName: team.name, playerId: plr.id, duration: 12, wage: 5000 };

  describe("saveContract()", () => {
    test("should save a contract to the gameState", () => {
      _gs.saveContract(st, c);
      expect(_gs.getContract(st, plr)).toBeDefined();
    });
  });

  describe("deleteContract()", () => {
    test("should delete a contract to the gameState", () => {
      _gs.saveContract(st, c);
      _gs.deleteContract(st, c);
      expect(_gs.getContract(st, plr)).not.toBeDefined();
    });
  });

  describe("getContract()", () => {
    test("should get undefined when the player contract doesn't exists", () => {
      expect(_gs.getContract(st, plr)).not.toBeDefined();
    });

    test("should get the contract of the player when exists", () => {
      _gs.saveContract(st, c);
      expect(_gs.getContract(st, plr)).toBeDefined();
    });
  });
});

describe("savePlayer()", () => {
  const plr = new _pl.Player("cf", startD);

  test("should save the player on the gameState", () => {
    _gs.savePlayer(st, plr);
    expect(st.players[plr.id]).toBeDefined();
  });
});

describe("saveTeam()", () => {
  const team = new _tm.Team("next");

  test("should save the team on the gameState", () => {
    _gs.saveTeam(st, team);
    expect(st.teams[team.name]).toBeDefined();
  });
});

describe("createPlayers()", () => {
  const areas = Object.keys(_pl.POSITION_AREA) as _pl.PositionArea[];
  const n = Math.floor(Math.random() * 20);
  const at = areas[Math.floor(Math.random() * areas.length)];

  test("should return n players", () => {
    expect(_gs.createPlayers(st, at, n).length).toBe(n);
  });

  test("should return n unique players", () => {
    const pls = _gs.createPlayers(st, at, n);
    expect(pls.length).toBe(new Set(pls).size);
  });

  test("all new players created are stored in the gameState", () => {
    _gs.createPlayers(st, at, n).forEach((player) => {
      expect(st.players[player.id]).toEqual(player);
    });
  });

  test("when a genAge is given should be used to set the players age", () => {
    const gen = () => 20;
    _gs.createPlayers(st, at, n, gen).forEach((player) => {
      expect(_pl.getAge(player, st.date)).toBe(20);
    });
  });
});

describe("initTeams()", () => {
  const plrInPosArea = (area: _pl.PositionArea) => {
    return (p: _pl.Player) => _pl.POSITION_AREA[area]?.includes(p.position);
  };

  test("should return an array with n new teams with the given names", () => {
    const teams = _gs.initTeams(st, teamNames);
    expect(teams.map((t) => t.name)).toEqual(expect.arrayContaining(teamNames));
  });

  test("all new teams created are stored in the gameState", () => {
    _gs.initTeams(st, teamNames);
    teamNames.forEach((name) => expect(st.teams[name]).toBeDefined());
  });

  test("should fill team.playerIds with at least 21 unique player ids", () => {
    _gs.initTeams(st, teamNames);
    teamNames.forEach((name) => {
      const ids = st.teams[name].playerIds;
      expect(ids.length).toBe(new Set(ids).size);
      expect(ids.length).toBeGreaterThanOrEqual(21);
    });
  });

  test("should have at least 3 goalkeepers for each team", () => {
    _gs.initTeams(st, [teamNames[0]]);
    const pls = _gs.getTeamPlayers(st, teamNames[0]);
    expect(pls.filter(plrInPosArea("goalkeeper")).length).toBeGreaterThan(2);
  });

  test("should have at least 7 defender for each team", () => {
    _gs.initTeams(st, [teamNames[0]]);
    const pls = _gs.getTeamPlayers(st, teamNames[0]);
    expect(pls.filter(plrInPosArea("defender")).length).toBeGreaterThan(6);
  });

  test("should have at least 7 midfielder for each team", () => {
    _gs.initTeams(st, [teamNames[0]]);
    const pls = _gs.getTeamPlayers(st, teamNames[0]);
    expect(pls.filter(plrInPosArea("midfielder")).length).toBeGreaterThan(6);
  });

  test("should have at least 5 forward for each team", () => {
    _gs.initTeams(st, [teamNames[0]]);
    const pls = _gs.getTeamPlayers(st, teamNames[0]);
    expect(pls.filter(plrInPosArea("forward")).length).toBeGreaterThan(4);
  });

  test("should add a contract from every team player", () => {
    _gs.initTeams(st, [teamNames[0]]);
    _gs.getTeamPlayers(st, teamNames[0]).forEach((p) => {
      expect(_gs.getContract(st, p)).toBeDefined();
    });
  });
});

describe("initTeamsAppeal()", () => {
  test("should set a new appeal value for every team", () => {
    // sometimes some value doesn't change it is part of the randomness nature
    _gs.initTeams(st, teamNames);
    const old: _tm.Team[] = JSON.parse(JSON.stringify(Object.values(st.teams)));
    _gs.initTeamsAppeal(st);
    old.forEach((t) => expect(t.appeal).not.toBe(st.teams[t.name].appeal));
  });

  test("the team with the highest payroll should have at least 3 points", () => {
    _gs.initTeams(st, teamNames);
    const first = Object.values(st.teams).reduce((a, b) =>
      _tm.getWagesAmount({ gs: st, t: a }) >=
      _tm.getWagesAmount({ gs: st, t: b })
        ? a
        : b
    );
    _gs.initTeamsAppeal(st);
    expect(st.teams[first.name].appeal).toBeGreaterThanOrEqual(3);
  });

  test("the team with the lowest payroll should have at most 2 points", () => {
    _gs.initTeams(st, teamNames);
    const last = Object.values(st.teams).reduce((a, b) =>
      _tm.getWagesAmount({ gs: st, t: a }) <=
      _tm.getWagesAmount({ gs: st, t: b })
        ? a
        : b
    );
    _gs.initTeamsAppeal(st);
    expect(st.teams[last.name].appeal).toBeLessThanOrEqual(2);
  });
});

describe("GameState.saveSchedule()", () => {
  const date = new Date(2010, 8, 1);
  const schedule = new Schedule(teamsJson.eng.names, date);
  const gState: _gs.GameState = new _gs.GameState(date);
  _gs.saveSchedule(gState, schedule, "now");

  test("should save every match of the schedule in gameState.matches", () => {
    schedule.rounds.forEach((round) =>
      round.matches.forEach((mt) => {
        expect(gState.matches[mt.id]).toEqual(mt);
      })
    );
  });

  test("should save a new schedules[schedule.startDate.getFullYear()]", () => {
    expect(gState.schedules.now).toBeDefined();
  });

  test("every saved round has a corresponding match id from the schedule", () => {
    schedule.rounds.forEach((round, i) => {
      const savedRound = gState.schedules.now[i];
      round.matches.forEach((mt) => {
        expect(savedRound.matchIds.some((id) => mt.id)).toBe(true);
      });
    });
  });
});

describe("initGameEvents", () => {
  test("should enqueue 10 GameEvents on gameState.eventQueue", () => {
    st.schedules.now = [{ date: startD, matchIds: ["..."] }];
    _gs.initGameEvents(st);
    expect(st.eventQueue.length).toBe(10);
  });

  test("should enqueue a GameEvent for the first season round", () => {
    _gs.initTeams(st, "abcd".split(""));
    _gs.initGameEvents(st);
    expect(st.eventQueue).toContainEqual(
      expect.objectContaining({ type: "simRound", detail: { round: 0 } })
    );
  });

  test("should enqueue a skillUpdate GameEvent", () => {
    _gs.initGameEvents(st);
    expect(st.eventQueue.some((e) => e.type === "skillUpdate")).toBe(true);
  });

  test("should enqueue a seasonEnd GameEvent", () => {
    _gs.initGameEvents(st);
    expect(st.eventQueue.some((e) => e.type === "seasonEnd")).toBe(true);
  });

  test("should enqueue a closeFreeSigningEvent GameEvent", () => {
    _gs.initGameEvents(st);
    expect(st.eventQueue).toContainEqual(
      expect.objectContaining({ type: "closeFreeSigningWindow" })
    );
  });

  test("should enqueue a updateFinances GameEvent", () => {
    _gs.initGameEvents(st);
    expect(st.eventQueue).toContainEqual({
      date: new Date(st.date.getFullYear(), st.date.getMonth() + 1, 0),
      type: "updateFinances",
    });
  });
});

describe("getTeamPlayers()", () => {
  test("should return an array of players when the team exist", () => {
    _gs.initTeams(st, teamNames);
    teamNames.forEach((name) => {
      const players = _gs.getTeamPlayers(st, name);
      expect(players.length).toBeGreaterThan(0);
      expect(players.some((p) => !(p instanceof _pl.Player))).toBe(false);
    });
  });

  test("should return a empty array when the team doesn't exist", () => {
    expect(_gs.getTeamPlayers(st, "no-name")).toEqual([]);
  });
});

describe("enqueueGameEvent()", () => {
  test("should able to add a event to the queue when empty", () => {
    const evt: _sm.GameEvent = { date: startD, type: "simRound" };
    _gs.enqueueGameEvent(st, evt);
    expect(st.eventQueue[0]).toEqual(evt);
  });

  test("should able to add multiple events and stay sorted by date", () => {
    let evts: _sm.GameEvent[] = [
      { date: new Date(2022, 10, 10), type: "simRound" },
      { date: new Date(2022, 9, 9), type: "simRound" },
      { date: new Date(2021, 1, 1), type: "simRound" },
      { date: new Date(2022, 5, 23), type: "simRound" },
    ];
    evts.forEach((e) => _gs.enqueueGameEvent(st, e));
    evts = evts.sort((e1, e2) => e1.date.getTime() - e2.date.getTime());
    expect(st.eventQueue).toEqual(evts);
  });
});

describe("init()", () => {
  const game = _gs.init();

  test("should create a gameState with all team-names.json names", () => {
    expect(Object.keys(game.teams)).toEqual(
      expect.arrayContaining(teamsJson.eng.names)
    );
  });

  test("should create at least 21 * teams.length players", () => {
    expect(Object.keys(game.players).length).toBeGreaterThan(
      21 * teamsJson.eng.names.length
    );
  });

  test("for every team player there is a contract", () => {
    const teamPlayers = Object.keys(game.teams)
      .map((name) => _gs.getTeamPlayers(game, name))
      .flat();
    teamPlayers.forEach((p) => expect(game.contracts[p.id]).toBeDefined());
  });

  test("should have a schedule for the current season", () => {
    expect(game.schedules.now).toBeDefined();
  });

  test("should not set userTeam when the team doesn't exist", () => {
    const game = _gs.init(["fox", "cats"], "hawks");
    expect(game.userTeam).toBe("");
  });

  describe(".popStats", () => {
    test(".sampleSize should equal to the amount of players", () => {
      expect(game.popStats.sampleSize).toBe(Object.keys(game.players).length);
    });

    test("all properties should be greater than 0", () => {
      expect(game.popStats.meanScore).toBeGreaterThan(0);
      expect(game.popStats.medianScore).toBeGreaterThan(0);
      expect(game.popStats.lowestScore).toBeGreaterThan(0);
      expect(game.popStats.highestScore).toBeGreaterThan(0);
      expect(game.popStats.standardDev).toBeGreaterThan(0);
    });
  });
});

describe("GameState.getSeasonRounds", () => {
  test("should return all rounds of the season when it was scheduled", () => {
    const scd = new Schedule(teamNames, st.date);
    _gs.saveSchedule(st, scd, "now");
    expect(_gs.getSeasonRounds(st, "now")).toHaveLength(6);
  });

  test("should return nothing when there is no season schedule", () => {
    expect(_gs.getSeasonRounds(st, "now")).toBeUndefined();
  });
});

describe("getNextRound", () => {
  test("should return the closest next nth round in schedule", () => {
    const days7 = new Date(st.date);
    days7.setDate(days7.getDate() + 7);
    const rd1 = { type: "simRound", date: st.date, detail: { round: 3 } };
    const rd2 = { type: "simRound", date: days7, detail: { round: 4 } };
    _gs.enqueueGameEvent(st, rd1 as _sm.GameEvent);
    _gs.enqueueGameEvent(st, rd2 as _sm.GameEvent);
    expect(_gs.getNextRound(st)).toBe(rd1.detail.round);
  });

  test("should return nothing when there is no round in schedule", () => {
    expect(_gs.getNextRound(st)).toBeUndefined();
  });
});

describe("getRound", () => {
  test("should return the nth round when exists", () => {
    const scd = new Schedule(teamNames, st.date);
    _gs.saveSchedule(st, scd, "now");
    expect(_gs.getRound(st, 1, "now")).toEqual(scd.rounds[1].matches);
  });

  test("should return nothing when the round doesn't exist", () => {
    expect(_gs.getRound(st, 1, "now")).toBeUndefined();
  });
});
