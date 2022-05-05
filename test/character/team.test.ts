import { Team } from "../../src/character/team";
import { Player } from "../../src/character/player";

describe("Team.addPlayer()", () => {
  const team = new Team("History");
  const plr = new Player("am", new Date());
  Team.addPlayer(team, plr);

  test("should add the player id to the team.playerIds", () => {
    expect(team.playerIds.includes(plr.id)).toBe(true);
  });

  test("should add the team name to player.team", () => {
    expect(plr.team).toBe(team.name);
  });
});

describe("Team.pickPlayers()", () => {
  const team = new Team("History");
  const plrs = Array.from({ length: 10 }, () => new Player("cm", new Date()));
  const picked = Team.pickPlayers(team, plrs, 5);

  test("should pick n best players and store their ids in team.playerIds", () => {
    const best = plrs
      .sort((p1, p2) => Player.getScore(p2) - Player.getScore(p2))
      .slice(0, 5);
    expect(team.playerIds).toEqual(best.map((p) => p.id));
  });

  test("should return the picked players", () => {
    expect(picked.map((p) => p.id)).toEqual(team.playerIds);
  });

  test("throw an error when n is more than player.length", () => {
    expect(() => Team.pickPlayers(team, plrs, 15)).toThrow();
  });
});
