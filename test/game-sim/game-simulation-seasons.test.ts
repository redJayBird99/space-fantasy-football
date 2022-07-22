import * as _pl from "../../src/character/player";
import * as _sm from "../../src/game-sim/game-simulation";
import * as _gs from "../../src/game-state/game-state";

// TODO: speed up this one will take a while...
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
        expect(players.some((p) => _pl.Player.age(p, cp.date) < 20)).toBe(true);
      });

      test(`should have under age 30 players`, () => {
        expect(players.some((p) => _pl.Player.age(p, cp.date) < 30)).toBe(true);
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
