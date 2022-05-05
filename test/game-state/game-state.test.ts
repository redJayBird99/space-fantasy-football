import * as _gs from "../../src/game-state/game-state";
import * as _pl from "../../src/character/player";
import * as _tm from "../../src/character/team";
import teamsJson from "../../src/asset/team-names.json";

let gameState: _gs.GameState = new _gs.GameState(new Date());
const teamNames = ["Albinos", "rockets", "sharks", "hawks", "bears"];

beforeAll(() => {
  gameState = new _gs.GameState(new Date());
});

describe("GameState handle contracts", () => {
  const team = new _tm.Team("just");
  const plr = new _pl.Player("cf", new Date());
  const c = { teamName: team.name, playerId: plr.id, duration: 12, wage: 5000 };

  describe("GameState.saveContract()", () => {
    test("should save a contract to the gamestate", () => {
      _gs.GameState.saveContract(gameState, c);
      expect(_gs.GameState.getContract(gameState, plr)).toBeDefined();
    });
  });

  describe("GameState.deleteContract()", () => {
    test("should delete a contract to the gamestate", () => {
      _gs.GameState.saveContract(gameState, c);
      _gs.GameState.deleteContract(gameState, c);
      expect(_gs.GameState.getContract(gameState, plr)).not.toBeDefined();
    });
  });

  describe("GameState.getContract()", () => {
    test("should get undefined when the player contract doesn't exists", () => {
      expect(_gs.GameState.getContract(gameState, plr)).not.toBeDefined();
    });

    test("should get the contract of the player when exists", () => {
      _gs.GameState.saveContract(gameState, c);
      expect(_gs.GameState.getContract(gameState, plr)).toBeDefined();
    });
  });
});

describe("GameState.savePlayer()", () => {
  const plr = new _pl.Player("cf", new Date());

  test("should save the player on the gamestate", () => {
    _gs.GameState.savePlayer(gameState, plr);
    expect(gameState.players[plr.id]).toBeDefined();
  });
});

describe("GameState.saveTeam()", () => {
  const team = new _tm.Team("next");

  test("should save the team on the gamestate", () => {
    _gs.GameState.saveTeam(gameState, team);
    expect(gameState.teams[team.name]).toBeDefined();
  });
});

describe("initPlayers()", () => {
  const areas = Object.keys(_pl.positionArea) as _pl.PositionArea[];
  const n = Math.floor(Math.random() * 20);
  const at = areas[Math.floor(Math.random() * areas.length)];

  test("should return n players", () => {
    expect(_gs.initPlayers(gameState, at, n).length).toBe(n);
  });

  test("should return n unique players", () => {
    const plrs = _gs.initPlayers(gameState, at, n);
    expect(plrs.length).toBe(new Set(plrs).size);
  });

  test("all new players created are stored in the gameState", () => {
    _gs.initPlayers(gameState, at, n).forEach((player) => {
      expect(gameState.players[player.id]).toEqual(player);
    });
  });
});

describe("initTeams()", () => {
  const plrInPosArea = (area: _pl.PositionArea) => {
    return (p: _pl.Player) => _pl.positionArea[area]?.includes(p.position);
  };

  test("should return an array with n new teams with the given names", () => {
    const teams = _gs.initTeams(gameState, teamNames);
    expect(teams.map((_tm) => _tm.name)).toEqual(
      expect.arrayContaining(teamNames)
    );
  });

  test("all new teams created are stored in the gameState", () => {
    _gs.initTeams(gameState, teamNames);
    teamNames.forEach((name) => expect(gameState.teams[name]).toBeDefined());
  });

  test("should fill team.playerIds with at least 21 unique player ids", () => {
    _gs.initTeams(gameState, teamNames);
    teamNames.forEach((name) => {
      const ids = gameState.teams[name].playerIds;
      expect(ids.length).toBe(new Set(ids).size);
      expect(ids.length).toBeGreaterThanOrEqual(21);
    });
  });

  test("should have at least 3 goolkeepers for each team", () => {
    _gs.initTeams(gameState, [teamNames[0]]);
    const pls = _gs.GameState.getTeamPlayers(gameState, teamNames[0]);
    expect(pls.filter(plrInPosArea("goolkeeper")).length).toBeGreaterThan(2);
  });

  test("should have at least 7 defender for each team", () => {
    _gs.initTeams(gameState, [teamNames[0]]);
    const pls = _gs.GameState.getTeamPlayers(gameState, teamNames[0]);
    expect(pls.filter(plrInPosArea("defender")).length).toBeGreaterThan(6);
  });

  test("should have at least 7 midfielder for each team", () => {
    _gs.initTeams(gameState, [teamNames[0]]);
    const pls = _gs.GameState.getTeamPlayers(gameState, teamNames[0]);
    expect(pls.filter(plrInPosArea("midfielder")).length).toBeGreaterThan(6);
  });

  test("should have at least 5 forward for each team", () => {
    _gs.initTeams(gameState, [teamNames[0]]);
    const pls = _gs.GameState.getTeamPlayers(gameState, teamNames[0]);
    expect(pls.filter(plrInPosArea("forward")).length).toBeGreaterThan(4);
  });
});

describe("initContracts()", () => {
  const team = new _tm.Team(teamNames[0]);
  const plrs = Array.from(
    { length: 5 },
    () => new _pl.Player("lb", new Date())
  );

  test("should add contracts for every players to the gameState", () => {
    _gs.initContracts(gameState, plrs, team);
    plrs.forEach((p) =>
      expect(_gs.GameState.getContract(gameState, p)).toBeDefined()
    );
  });
});

describe("GameState.getTeamPlayers()", () => {
  test("should return an array of players when the team exist", () => {
    _gs.initTeams(gameState, teamNames);
    teamNames.forEach((name) => {
      const players = _gs.GameState.getTeamPlayers(gameState, name);
      expect(players.length).toBeGreaterThan(0);
      expect(players.some((p) => !(p instanceof _pl.Player))).toBe(false);
    });
  });

  test("should return a empty array when the team doesn't exist", () => {
    expect(_gs.GameState.getTeamPlayers(gameState, "no-name")).toEqual([]);
  });
});

describe("initGameState", () => {
  const game = _gs.initGameState();

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
});

// TODO: jest has some problem with structuredClone...
xdescribe("GameStateHandle", () => {
  // const gameSH = new _gs.GameStateHandle(gameState);
  xtest(".state should return a copy of the GameState", () => {
    // expect(gameSH.state).not.toBe(gameSH.state);
  });
});
