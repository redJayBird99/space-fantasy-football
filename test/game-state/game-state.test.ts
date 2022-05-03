import * as gs from "../../src/game-state/game-state";
import * as pl from "../../src/character/player";
import teamsJson from "../../src/asset/team-names.json";

let gameState: gs.GameState = { date: new Date(), players: {}, teams: {} };
const teamNames = ["Albinos", "rockets", "sharks", "hawks", "bears"];

beforeAll(() => {
  gameState = { date: new Date(), players: {}, teams: {} };
});

describe("initPlayers()", () => {
  const areas = Object.keys(pl.positionArea) as pl.PositionArea[];
  const n = Math.floor(Math.random() * 20);
  const at = areas[Math.floor(Math.random() * areas.length)];

  test("should return n players", () => {
    expect(gs.initPlayers(gameState, at, n).length).toBe(n);
  });

  test("should return n unique players", () => {
    const plrs = gs.initPlayers(gameState, at, n);
    expect(plrs.length).toBe(new Set(plrs).size);
  });

  test("all new players created are stored in the gameState", () => {
    gs.initPlayers(gameState, at, n).forEach((player) => {
      expect(gameState.players[player.id]).toEqual(player);
    });
  });
});

describe("initTeams()", () => {
  const plrInPosArea = (area: pl.PositionArea) => {
    return (p: pl.Player) => pl.positionArea[area]?.includes(p.position);
  };

  test("should return an array with n new teams with the given names", () => {
    const teams = gs.initTeams(gameState, teamNames);
    expect(teams.map((tm) => tm.name)).toEqual(
      expect.arrayContaining(teamNames)
    );
  });

  test("all new teams created are stored in the gameState", () => {
    gs.initTeams(gameState, teamNames);
    teamNames.forEach((name) => expect(gameState.teams[name]).toBeDefined());
  });

  test("should fill team.playerIds with at least 21 unique player ids", () => {
    gs.initTeams(gameState, teamNames);
    teamNames.forEach((name) => {
      const ids = gameState.teams[name].playerIds;
      expect(ids.length).toBe(new Set(ids).size);
      expect(ids.length).toBeGreaterThanOrEqual(21);
    });
  });

  test("should have at least 3 goolkeepers for each team", () => {
    gs.initTeams(gameState, [teamNames[0]]);
    const pls = gs.GameState.getTeamPlayers(gameState, teamNames[0]);
    expect(pls.filter(plrInPosArea("goolkeeper")).length).toBeGreaterThan(2);
  });

  test("should have at least 7 defender for each team", () => {
    gs.initTeams(gameState, [teamNames[0]]);
    const pls = gs.GameState.getTeamPlayers(gameState, teamNames[0]);
    expect(pls.filter(plrInPosArea("defender")).length).toBeGreaterThan(6);
  });

  test("should have at least 7 midfielder for each team", () => {
    gs.initTeams(gameState, [teamNames[0]]);
    const pls = gs.GameState.getTeamPlayers(gameState, teamNames[0]);
    expect(pls.filter(plrInPosArea("midfielder")).length).toBeGreaterThan(6);
  });

  test("should have at least 5 forward for each team", () => {
    gs.initTeams(gameState, [teamNames[0]]);
    const pls = gs.GameState.getTeamPlayers(gameState, teamNames[0]);
    expect(pls.filter(plrInPosArea("forward")).length).toBeGreaterThan(4);
  });
});

describe("GameState.getTeamPlayers", () => {
  test("should return an array of players when the team exist", () => {
    gs.initTeams(gameState, teamNames);
    teamNames.forEach((name) => {
      const players = gs.GameState.getTeamPlayers(gameState, name);
      expect(players.length).toBeGreaterThan(0);
      expect(players.some((p) => !(p instanceof pl.Player))).toBe(false);
    });
  });

  test("should return a empty array when the team doesn't exist", () => {
    expect(gs.GameState.getTeamPlayers(gameState, "no-name")).toEqual([]);
  });
});

describe("initGameState", () => {
  const game = gs.initGameState();

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
});

// TODO: jest has some problem with structuredClone...
xdescribe("GameStateHandle", () => {
  // const gameSH = new gs.GameStateHandle(gameState);
  xtest(".state should return a copy of the GameState", () => {
    // expect(gameSH.state).not.toBe(gameSH.state);
  });
});
