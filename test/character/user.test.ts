import "../mock/broadcast-channel.mock";
import { getImprovability } from "../../src/character/user";
import * as _gs from "../../src/game-state/game-state";

describe("getImprovability(", () => {
  const st = _gs.GameState.init(["hacks", "cats", "dogs", "birds"], "hacks");
  const players = Object.values(st.players);

  test("should return a value greater than or equal to 0", () => {
    expect(getImprovability(players[0], st)).toBeGreaterThanOrEqual(0);
  });

  test("should return a value less than or equal to 10", () => {
    expect(getImprovability(players[0], st)).toBeLessThanOrEqual(10);
  });

  test("two different teams should sometimes disagree", () => {
    const aRst = Array.from(
      { length: Math.floor(players.length * 0.5) },
      (_, i) => getImprovability(players[i], st)
    );
    st.userTeam = "birds";
    const bRst = Array.from(
      { length: Math.floor(players.length * 0.15) },
      (_, i) => getImprovability(players[i], st)
    );

    expect(aRst).not.toEqual(bRst);
  });
});
