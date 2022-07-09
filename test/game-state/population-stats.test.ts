import * as _p from "../../src/character/player";
import { getPopStats } from "../../src/game-state/population-stats";

function setSkillsTo(p: _p.Player, v: number): void {
  Object.keys(p.skills).forEach((k) => (p.skills[k as _p.Skill] = v));
}

describe("getPopStats()", () => {
  const sample = [
    new _p.Player("lw", new Date(), 28),
    new _p.Player("dm", new Date(), 28),
    new _p.Player("am", new Date(), 28),
  ];
  setSkillsTo(sample[0], 52);
  setSkillsTo(sample[1], 60);
  setSkillsTo(sample[2], 71);

  test("should have a mean of 61", () => {
    expect(getPopStats(sample).meanScore).toBeCloseTo(61);
  });

  test("should have a meadian of 60", () => {
    expect(getPopStats(sample).medianScore).toBe(60);
  });

  test("should have a lowest score of 50", () => {
    expect(getPopStats(sample).lowestScore).toBe(52);
  });

  test("should have a highest score of 71", () => {
    expect(getPopStats(sample).highestScore).toBe(71);
  });
});
