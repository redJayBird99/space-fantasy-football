import "../mock/broadcast-channel.mock";
import {
  exportedForTesting as _u,
  SorterBy,
  sortBySkill,
  sortByAge,
  sortByInfo,
} from "../../src/character/util";
import { Player } from "../../src/character/player";

const sample = _u.createPlayers("forward", 10);

describe("SortBy", () => {
  test("when by is different to lastSortBy should return false", () => {
    expect(new SorterBy().ascendingly("next")).toBe(false);
  });

  test("when by is equal to lastSortBy and ascending was false should return true", () => {
    const s = new SorterBy();
    s.ascendingly("name");
    expect(s.ascending).toBe(false);
    expect(s.ascendingly("name")).toBe(true);
  });

  test("when by is equal to lastSortBy and ascending was true should return false", () => {
    const s = new SorterBy();
    s.ascendingly("name");
    s.ascendingly("name");
    expect(s.ascending).toBe(true);
    expect(s.ascendingly("name")).toBe(false);
  });

  test("when by is different to lastSortBy and ascending was true should return false", () => {
    const s = new SorterBy();
    s.ascendingly("name");
    s.ascendingly("name");
    expect(s.ascending).toBe(true);
    expect(s.ascendingly("next")).toBe(false);
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
    sortByInfo("name", sample, true);
    expect(sample).toEqual(sml);
  });
});
