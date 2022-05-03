import { Team } from "../../src/character/team";
import { Player } from "../../src/character/player";

describe("Team.pickPlayers()", () => {
  const team = new Team("History");
  const plrs = Array.from({ length: 10 }, () => new Player("cm", new Date()));
  Team.pickPlayers(team, plrs, 5);

  test("should pick n best players and store their ids in team.playerIds", () => {
    const best = plrs
      .sort((p1, p2) => Player.getScore(p2) - Player.getScore(p2))
      .slice(0, 5);
    expect(team.playerIds).toEqual(
      expect.arrayContaining(best.map((p) => p.id))
    );
  });

  test("throw an error when n is more than player.length", () => {
    expect(() => Team.pickPlayers(team, plrs, 15)).toThrow();
  });
});
