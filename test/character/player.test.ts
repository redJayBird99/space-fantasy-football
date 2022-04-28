import * as player from "../../src/character/player";
import { isMoreFrequent } from "../../src/util/generator";

describe("createAge()", () => {
  const ages = Array.from({ length: 100 }, () => player.createAge());

  test("should return numbers greater or equal than MIN_AGE", () => {
    ages.forEach((age) => expect(age).toBeGreaterThanOrEqual(player.MIN_AGE));
  });

  test("should return numbers smaller or equal than MAX_AGE", () => {
    ages.forEach((age) => expect(age).toBeLessThanOrEqual(player.MAX_AGE));
  });

  xtest("teens should be less frequent of any 20s", () => {});

  xtest("30s should be less frequent of any 20s", () => {});
});

describe("createTalent()", () => {
  const talents = Array.from({ length: 100 }, () => player.createTalent());

  test("talent C should be return more frequently of A", () => {
    expect(isMoreFrequent("C", "A", talents)).toBe(true);
  });

  test("talent C should be return more frequently of E", () => {
    expect(isMoreFrequent("C", "E", talents)).toBe(true);
  });
});

describe("preferredFootChance()", () => {
  const pos: player.Position[] = [
    "cb",
    "rb",
    "lb",
    "lm",
    "cm",
    "dm",
    "rm",
    "am",
    "lw",
    "rw",
    "cf",
  ];
  pos.forEach((p) => {
    const rst = player.preferredFootChance(p);

    test(`the summed probability for ${p} shouldn't be greater than 1`, () => {
      expect(rst.left + rst.right).toBeLessThanOrEqual(1);
    });

    test(`the summed probability for ${p} shouldn't be less than 0`, () => {
      expect(rst.left + rst.right).toBeGreaterThanOrEqual(0);
    });
  });
});

describe("createPreferredFoot()", () => {
  const moreOftenLeftFooted = (p: player.Position) => {
    return isMoreFrequent(
      "left",
      "right",
      Array.from({ length: 100 }, () => player.createPreferredFoot(p))
    );
  };

  test("should return a left footed more ofter for lb", () => {
    expect(moreOftenLeftFooted("lb")).toBe(true);
  });

  test("should return a left footed more ofter for lm", () => {
    expect(moreOftenLeftFooted("lm")).toBe(true);
  });

  test("should return a left footed more ofter for lw", () => {
    expect(moreOftenLeftFooted("lw")).toBe(true);
  });

  test("should return a right footed more often for any other position", () => {
    (
      ["cb", "rb", "cm", "dm", "rm", "am", "rw", "cf"] as player.Position[]
    ).forEach((p) => expect(moreOftenLeftFooted(p)).toBe(false));
  });
});
