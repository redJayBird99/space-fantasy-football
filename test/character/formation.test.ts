import * as _p from "../../src/character/player";
import {
  exportedForTesting as _etL,
  exportedTypesForTesting as _ettL,
  Spot,
} from "../../src/character/formation";

jest.mock("../../src/character/player");
/* eslint-disable no-import-assign */
// @ts-ignore
_p.Player = jest.fn((p) => ({ position: p, name: Math.random().toString(36) }));
_p.Player.getScore = jest.fn();
const mockPlrGetScore = _p.Player.getScore as jest.Mock;
/* eslint-enable no-import-assign */

afterEach(() => {
  mockPlrGetScore.mockReset();
});

describe("PlayerPicker", () => {
  const pls = Array.from({ length: 10 }, () => new _p.Player("cb", new Date()));
  pls.push(new _p.Player("am", new Date()), new _p.Player("am", new Date()));

  test(".pickBest() should return the player with the highest score when strict is false", () => {
    const pkr = new _etL.PlayersPicker(pls);
    mockPlrGetScore.mockImplementation((p) => (p === pls[0] ? 50 : 10));
    expect(pkr.pickBest(new Set(), "cb", false)).toEqual(pls[0]);
  });

  test(".pickBest() should return a not picked player with the highest score when strict is false", () => {
    const pkr = new _etL.PlayersPicker(pls);
    mockPlrGetScore.mockImplementation((p) =>
      p === pls[0] ? 50 : pls[1] ? 30 : 10
    );
    expect(pkr.pickBest(new Set([pls[0]]), "cb", false)).toEqual(pls[1]);
  });

  test(".pickBest() should return the player with the highest score, but only when at its natural position", () => {
    const pkr = new _etL.PlayersPicker(pls);
    mockPlrGetScore.mockImplementation((p, pos) =>
      pos === p.pos ? 50 : pls[pls.length - 2] ? 30 : 10
    );
    expect(pkr.pickBest(new Set([pls[0]]), "am")).toEqual(pls[pls.length - 2]);
  });

  test(".getScore() should cache the player scores for the given pos", () => {
    const pkr = new _etL.PlayersPicker(pls);
    /* eslint-disable dot-notation */
    expect(pkr["cacheScores"].get(pls[0])?.size).toBe(0);
    mockPlrGetScore.mockImplementation(() => 10);
    pkr["getScore"](pls[0], "am");
    expect(pkr["cacheScores"].get(pls[0])?.get("am")).toBe(10);
    /* eslint-enable dot-notation */
  });
});

describe("strictFill()", () => {
  const pls = Array.from({ length: 10 }, () => new _p.Player("cb", new Date()));
  pls.push(new _p.Player("am", new Date()), new _p.Player("gk", new Date()));

  test("should pick only only the best players at their natural position", () => {
    mockPlrGetScore.mockImplementation((p) =>
      pls[0] === p || pls[1] === p ? 20 : 10
    );
    const picks = [pls[0], pls[1], pls[pls.length - 1], pls[pls.length - 2]];
    const st = _etL.strictFill("4-5-1(2)", new _etL.PlayersPicker(pls));
    expect([...st.picked]).toEqual(expect.arrayContaining(picks));
  });

  test("should fill the lineup only with players at their natural position", () => {
    mockPlrGetScore.mockImplementation(() => 10);
    const st = _etL.strictFill("4-5-1(2)", new _etL.PlayersPicker(pls));
    expect(st.lineup.size).toBe(4);
    st.lineup.forEach((p, s) => p.position === s.pos);
  });
});

describe("fillLineup()", () => {
  const pls = Array.from({ length: 15 }, () => new _p.Player("cb", new Date()));
  pls.push(new _p.Player("am", new Date()));

  test("should fill the lineup with the best player available", () => {
    const st: _ettL.TLineupState = {
      key: "4-5-1(2)",
      picked: new Set(),
      lineup: new Map<Spot, _p.Player>(),
      score: 0,
    };
    const best = pls.slice(11);
    mockPlrGetScore.mockImplementation((p) => (best.includes(p) ? 20 : 10));
    _etL.fillLineup(st, new _etL.PlayersPicker(pls));
    expect(st.lineup.size).toBe(11);
    expect([...st.lineup.values()]).toEqual(expect.arrayContaining(best));
  });

  test("should not remove already present good fit in the lineup", () => {
    const goodFit = pls[pls.length - 1];
    const spot = _etL.FORMATIONS["4-5-1(2)"][0];
    mockPlrGetScore.mockImplementation((p) => (p === goodFit ? 20 : 10));
    const st: _ettL.TLineupState = {
      key: "4-5-1(2)",
      picked: new Set(),
      lineup: new Map<Spot, _p.Player>([[spot, goodFit]]),
      score: 0,
    };
    _etL.fillLineup(st, new _etL.PlayersPicker(pls));
    expect(st.lineup.get(spot)).toEqual(goodFit);
  });

  test("should remove already present bad fit in the lineup", () => {
    const badFit = pls[pls.length - 1];
    const spot = _etL.FORMATIONS["5-4-1(3)"][0];
    mockPlrGetScore.mockImplementation((p) => (p === badFit ? 10 : 20));
    const st: _ettL.TLineupState = {
      key: "5-4-1(3)",
      picked: new Set(),
      lineup: new Map<Spot, _p.Player>([[spot, badFit]]),
      score: 0,
    };
    _etL.fillLineup(st, new _etL.PlayersPicker(pls));
    expect(st.lineup.get(spot)).not.toEqual(badFit);
  });
});

describe("findBestLineup()", () => {
  const pls = Array.from({ length: 15 }, () => new _p.Player("cm", new Date()));

  test("should return a single complete lineup", () => {
    mockPlrGetScore.mockImplementation(() => 10);
    const st = _etL.findFormation(pls);
    expect(st.picked.size).toBe(11);
    expect([...st.lineup.keys()]).toEqual(
      expect.arrayContaining(_etL.FORMATIONS[st.key].slice())
    );
  });

  test("should be able to find the optimum lineup when nudged", () => {
    const pls2 = [
      "gk",
      "cb",
      "cb",
      "cb",
      "cm",
      "cm",
      "rm",
      "lm",
      "rw",
      "lw",
      "cf",
    ].map((p) => new _p.Player(p as _p.Position, new Date()));
    pls2.push(
      ...Array.from({ length: 10 }, () => new _p.Player("am", new Date()))
    );

    mockPlrGetScore.mockImplementation((pl, pos) =>
      pl.position === pos && pos !== "am" ? 50 : 10
    );
    expect(_etL.findFormation(pls2).key).toBe("3-4-3");
  });
});
