import * as _t from "../../src/character/team";
import { Player } from "../../src/character/player";
import * as _gs from "../../src/game-state/game-state";

describe("signContract()", () => {
  const gState = new _gs.GameState(new Date());
  const team = new _t.Team("Smokers");
  const pl = new Player("am", new Date());
  const c = _t.signContract(gState, team, pl);

  test("save a new contract to the gameState", () => {
    expect(_gs.GameState.getContract(gState, pl)).toEqual(c);
  });

  test("the contract duration should be greater than or equal 1", () => {
    expect(c.duration).toBeGreaterThanOrEqual(1);
  });

  test("the contract duration should be less than or equal 5", () => {
    expect(c.duration).toBeLessThanOrEqual(5);
  });

  test("should have the id of the player", () => {
    expect(c.playerId).toBe(pl.id);
  });

  test("should have the name of the team", () => {
    expect(c.teamName).toBe(team.name);
  });
});

describe("Team.signPlayer()", () => {
  const gState = new _gs.GameState(new Date());
  const team = new _t.Team("Smokers");
  const pl = new Player("cm", new Date());
  const c = _t.Team.signPlayer(gState, team, pl);

  test("should add the player id to the team", () => {
    expect(team.playerIds).toContainEqual(pl.id);
  });

  test("should set player.team to the team name", () => {
    expect(pl.team).toBe("Smokers");
  });

  test("should add the contract to the gameState", () => {
    expect(_gs.GameState.getContract(gState, pl)).toEqual(c);
  });

  test("when called twice shouldn't duplicate the player id stored", () => {
    _t.Team.signPlayer(gState, team, pl);
    expect(team.playerIds).toEqual([pl.id]);
  });
});

describe("Team.unsignPlayer()", () => {
  const gState = new _gs.GameState(new Date());
  const pl = new Player("lm", new Date());
  const team = new _t.Team("Smokers");
  gState.teams.Smokers = team;
  gState.players[pl.id] = pl;
  _t.Team.unsignPlayer(gState, _t.Team.signPlayer(gState, team, pl));

  test("should remove the player id from the team", () => {
    expect(team.playerIds).not.toContainEqual(pl.id);
  });

  test("should set the player.team to free agent", () => {
    expect(pl.team).toBe("free agent");
  });

  test("should remove the contract from the gameState", () => {
    expect(_gs.GameState.getContract(gState, pl)).not.toBeDefined();
  });
});
