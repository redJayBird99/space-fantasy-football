import "../../mock/app-state.mock";
import "../../../src/game/game-sim/sim-worker-interface";
import "../../mock/broadcast-channel.mock";
import "../../../src/pages/util/router";
import * as _pl from "../../../src/game/character/player";
import { Team } from "../../../src/game/character/team";
import { exportedForTesting as _sm } from "../../../src/game/game-sim/game-simulation";
import * as _gs from "../../../src/game/game-state/game-state";
jest.mock("../../../src/pages/util/router");
jest.mock("../../../src/game/game-sim/sim-worker-interface");

async function sim10Years(st: _gs.GameState): Promise<_gs.GameState> {
  const end = new Date(
    st.date.getFullYear() + 10,
    _sm.SEASON_START_MONTH,
    _sm.SEASON_START_DATE
  );

  while (st.date.getTime() <= end.getTime()) {
    await _sm.process(st);
  }

  return _gs.parse(JSON.stringify(st));
}

// TODO: speed up this one will take a while...
describe("simulate 10 seasons", () => {
  const st = _gs.init();
  jest.setTimeout(20000);
  let cp = st;
  let pls: _pl.Player[] | undefined;
  let teams: Team[] | undefined;

  test(`should have at least teams * 30 Players`, async () => {
    // unfortunately this is a major hack jest doesn't allow describe to be async,
    // so to prepare the state for the season we await on the first
    cp = await sim10Years(cp);
    pls = Object.values(cp.players);
    teams = Object.values(cp.teams);
    expect(pls.length).toBeGreaterThan(teams.length * 30);
  });

  test(`should have at most teams * 50 Players`, () => {
    expect(pls!.length).toBeLessThan(teams!.length * 50);
  });

  test(`should have under age 20 players`, () => {
    expect(pls!.some((p) => _pl.getAge(p, cp.date) < 20)).toBe(true);
  });

  test(`should have under age 30 players`, () => {
    expect(pls!.some((p) => _pl.getAge(p, cp.date) < 30)).toBe(true);
  });

  test("every team should have at least 21 players", () => {
    teams!.forEach((t) => expect(t.playerIds.length).toBeGreaterThan(20));
  });

  test("teams should never have a budget less than -SALARY_CAP * 50", () => {
    teams!.forEach((t) =>
      expect(t.finances.budget).toBeGreaterThan(-_pl.SALARY_CAP * 50)
    );
  });
});
