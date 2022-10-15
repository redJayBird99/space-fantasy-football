import "../mock/broadcast-channel.mock";
import "../../src/game-sim/sim-worker-interface";
import {
  exportedForTesting as _u,
  updateSort,
  sortBySkill,
  sortByAge,
  sortByInfo,
  bestAtPos,
} from "../../src/character/util";
import { Player } from "../../src/character/player";
import { GameState } from "../../src/game-state/game-state";
jest.mock("../../src/game-sim/sim-worker-interface");

Player.getScore = jest.fn();
const mockPlrGetScore = Player.getScore as jest.Mock;
const sample = _u.createPlayers("forward", 10);

describe("bestAtPos()", () => {
  test("should select the best player", () => {
    const d = new Date();
    const pls = [new Player("am", d), new Player("cb", d), new Player("rb", d)];
    mockPlrGetScore.mockImplementation((p) => (pls[0] === p ? 90 : 0));
    expect(bestAtPos(pls, "am")).toBe(pls[0]);
  });
});

describe("SortBy", () => {
  test("when by is different to last Sort by should return false", () => {
    expect(updateSort({ ascending: true, by: "sort" }, "next")).toBe(false);
  });

  test("when by is equal to last Sort.by and ascending was false should return true", () => {
    expect(updateSort({ ascending: false, by: "name" }, "name")).toBe(true);
  });

  test("when by is equal to last Sort.by and ascending was true should return false", () => {
    expect(updateSort({ ascending: true, by: "name" }, "name")).toBe(false);
  });

  test("when by is different to last Sort.by and ascending was true should return false", () => {
    expect(updateSort({ ascending: true, by: "name" }, "next")).toBe(false);
  });
});

describe("sortBySkill()", () => {
  test("should sort by the given skill", () => {
    const sml = sample
      .slice()
      .sort(
        (p1, p2) =>
          Player.getSkill(p1, "agility") - Player.getSkill(p2, "agility")
      );
    sortBySkill("agility", sample, true);
    expect(sample).toEqual(sml);
  });
});

describe("sortBySkill()", () => {
  test("should sort by the given skill", () => {
    const sml = sample
      .slice()
      .sort(
        (p1, p2) =>
          Player.getSkill(p1, "agility") - Player.getSkill(p2, "agility")
      );
    sortBySkill("agility", sample, true);
    expect(sample).toEqual(sml);
  });
});

describe("sortByAge()", () => {
  test("should sort by the birthday", () => {
    const sml = sample
      .slice()
      .sort(
        (p1, p2) =>
          new Date(p1.birthday).getTime() - new Date(p2.birthday).getTime()
      );
    sortByAge(sample, false);
    expect(sample).toEqual(sml);
  });
});

describe("sortByInfo()", () => {
  test("should sort by the given player key", () => {
    const sml = sample.slice().sort((p1, p2) => p1.name.localeCompare(p2.name));
    sortByInfo("name", sample, true, {} as GameState);
    expect(sample).toEqual(sml);
  });
});
