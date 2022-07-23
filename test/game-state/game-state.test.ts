import * as _gs from "../../src/game-state/game-state";
import * as _sm from "../../src/game-sim/game-simulation";
import * as _pl from "../../src/character/player";
import * as _tm from "../../src/character/team";
import { Schedule } from "../../src/game-sim/tournament-scheduler";
import teamsJson from "../../src/asset/team-names.json";

let st: _gs.GameState = new _gs.GameState(new Date());
const teamNames = ["Albinos", "rockets", "sharks", "hawks", "bears"];

beforeEach(() => {
  st = new _gs.GameState(new Date());
});

describe("GameState handle contracts", () => {
  const team = new _tm.Team("just");
  const plr = new _pl.Player("cf", new Date());
  const c = { teamName: team.name, playerId: plr.id, duration: 12, wage: 5000 };

  describe("GameState.saveContract()", () => {
    test("should save a contract to the gamestate", () => {
      _gs.GameState.saveContract(st, c);
      expect(_gs.GameState.getContract(st, plr)).toBeDefined();
    });
  });

  describe("GameState.deleteContract()", () => {
    test("should delete a contract to the gamestate", () => {
      _gs.GameState.saveContract(st, c);
      _gs.GameState.deleteContract(st, c);
      expect(_gs.GameState.getContract(st, plr)).not.toBeDefined();
    });
  });

  describe("GameState.getContract()", () => {
    test("should get undefined when the player contract doesn't exists", () => {
      expect(_gs.GameState.getContract(st, plr)).not.toBeDefined();
    });

    test("should get the contract of the player when exists", () => {
      _gs.GameState.saveContract(st, c);
      expect(_gs.GameState.getContract(st, plr)).toBeDefined();
    });
  });
});

describe("GameState.savePlayer()", () => {
  const plr = new _pl.Player("cf", new Date());

  test("should save the player on the gamestate", () => {
    _gs.GameState.savePlayer(st, plr);
    expect(st.players[plr.id]).toBeDefined();
  });
});

describe("GameState.saveTeam()", () => {
  const team = new _tm.Team("next");

  test("should save the team on the gamestate", () => {
    _gs.GameState.saveTeam(st, team);
    expect(st.teams[team.name]).toBeDefined();
  });
});

describe("createPlayers()", () => {
  const areas = Object.keys(_pl.positionArea) as _pl.PositionArea[];
  const n = Math.floor(Math.random() * 20);
  const at = areas[Math.floor(Math.random() * areas.length)];

  test("should return n players", () => {
    expect(_gs.createPlayers(st, at, n).length).toBe(n);
  });

  test("should return n unique players", () => {
    const plrs = _gs.createPlayers(st, at, n);
    expect(plrs.length).toBe(new Set(plrs).size);
  });

  test("all new players created are stored in the gameState", () => {
    _gs.createPlayers(st, at, n).forEach((player) => {
      expect(st.players[player.id]).toEqual(player);
    });
  });

  test("when a genAge is given should be used to set the players age", () => {
    const gen = () => 20;
    _gs.createPlayers(st, at, n, gen).forEach((player) => {
      expect(_pl.Player.age(player, st.date)).toBe(20);
    });
  });
});

describe("initTeams()", () => {
  const plrInPosArea = (area: _pl.PositionArea) => {
    return (p: _pl.Player) => _pl.positionArea[area]?.includes(p.position);
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

  test("should have at least 3 goolkeepers for each team", () => {
    _gs.initTeams(st, [teamNames[0]]);
    const pls = _gs.GameState.getTeamPlayers(st, teamNames[0]);
    expect(pls.filter(plrInPosArea("goolkeeper")).length).toBeGreaterThan(2);
  });

  test("should have at least 7 defender for each team", () => {
    _gs.initTeams(st, [teamNames[0]]);
    const pls = _gs.GameState.getTeamPlayers(st, teamNames[0]);
    expect(pls.filter(plrInPosArea("defender")).length).toBeGreaterThan(6);
  });

  test("should have at least 7 midfielder for each team", () => {
    _gs.initTeams(st, [teamNames[0]]);
    const pls = _gs.GameState.getTeamPlayers(st, teamNames[0]);
    expect(pls.filter(plrInPosArea("midfielder")).length).toBeGreaterThan(6);
  });

  test("should have at least 5 forward for each team", () => {
    _gs.initTeams(st, [teamNames[0]]);
    const pls = _gs.GameState.getTeamPlayers(st, teamNames[0]);
    expect(pls.filter(plrInPosArea("forward")).length).toBeGreaterThan(4);
  });

  test("should add a contract from every team player", () => {
    _gs.initTeams(st, [teamNames[0]]);
    _gs.GameState.getTeamPlayers(st, teamNames[0]).forEach((p) => {
      expect(_gs.GameState.getContract(st, p)).toBeDefined();
    });
  });
});

describe("initTeamsAppeal()", () => {
  test("should set a new appeal value for every team", () => {
    // rarel some value don't change it is part of the randomness nature
    _gs.initTeams(st, teamNames);
    const old: _tm.Team[] = JSON.parse(JSON.stringify(Object.values(st.teams)));
    _gs.initTeamsAppeal(st);
    old.forEach((t) => expect(t.appeal).not.toBe(st.teams[t.name].appeal));
  });

  test("the team with the highest payroll should have at least 3 points", () => {
    _gs.initTeams(st, teamNames);
    const first = Object.values(st.teams).reduce((a, b) =>
      _tm.Team.getWagesAmount({ gs: st, t: a }) >=
      _tm.Team.getWagesAmount({ gs: st, t: b })
        ? a
        : b
    );
    _gs.initTeamsAppeal(st);
    expect(st.teams[first.name].appeal).toBeGreaterThanOrEqual(3);
  });

  test("the team with the lowest payroll should have at most 2 points", () => {
    _gs.initTeams(st, teamNames);
    const last = Object.values(st.teams).reduce((a, b) =>
      _tm.Team.getWagesAmount({ gs: st, t: a }) <=
      _tm.Team.getWagesAmount({ gs: st, t: b })
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
  _gs.GameState.saveSchedule(gState, schedule, "now");

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
  test("should enqueue 9 GameEvents on gameState.eventQueue", () => {
    st.schedules.now = [{ date: new Date(), matchIds: ["..."] }];
    _gs.initGameEvents(st);
    expect(st.eventQueue.length).toBe(9);
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

describe("GameState.getTeamPlayers()", () => {
  test("should return an array of players when the team exist", () => {
    _gs.initTeams(st, teamNames);
    teamNames.forEach((name) => {
      const players = _gs.GameState.getTeamPlayers(st, name);
      expect(players.length).toBeGreaterThan(0);
      expect(players.some((p) => !(p instanceof _pl.Player))).toBe(false);
    });
  });

  test("should return a empty array when the team doesn't exist", () => {
    expect(_gs.GameState.getTeamPlayers(st, "no-name")).toEqual([]);
  });
});

describe("GameState.enqueueGameEvent()", () => {
  test("should able to add a event to the queue when empty", () => {
    const evt: _sm.GameEvent = { date: new Date(), type: "simRound" };
    _gs.GameState.enqueueGameEvent(st, evt);
    expect(st.eventQueue[0]).toEqual(evt);
  });

  test("should able to add multiple events and stay sorted by date", () => {
    let evts: _sm.GameEvent[] = [
      { date: new Date(2022, 10, 10), type: "simRound" },
      { date: new Date(2022, 9, 9), type: "simRound" },
      { date: new Date(2021, 1, 1), type: "simRound" },
      { date: new Date(2022, 5, 23), type: "simRound" },
    ];
    evts.forEach((e) => _gs.GameState.enqueueGameEvent(st, e));
    evts = evts.sort((e1, e2) => e1.date.getTime() - e2.date.getTime());
    expect(st.eventQueue).toEqual(evts);
  });
});

describe("GameState.init()", () => {
  const game = _gs.GameState.init();

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
      .map((name) => _gs.GameState.getTeamPlayers(game, name))
      .flat();
    teamPlayers.forEach((p) => expect(game.contracts[p.id]).toBeDefined());
  });

  test("should have a schedule for the current season", () => {
    expect(game.schedules.now).toBeDefined();
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

// TODO: jest has some problem with structuredClone...
xdescribe("GameStateHandle", () => {
  // const gameSH = new _gs.GameStateHandle(gameState);
  xtest(".state should return a copy of the GameState", () => {
    // expect(gameSH.state).not.toBe(gameSH.state);
  });
});
