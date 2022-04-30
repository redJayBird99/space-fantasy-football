import * as player from "../../src/character/player";
import { isMoreFrequent } from "../../src/util/generator";

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

describe("createPotential()", () => {
  const potentials = Array.from({ length: 100 }, () =>
    player.createPotential()
  );

  test("potential C should be return more frequently of A", () => {
    expect(isMoreFrequent("C", "A", potentials)).toBe(true);
  });

  test("potential C should be return more frequently of E", () => {
    expect(isMoreFrequent("C", "E", potentials)).toBe(true);
  });
});

describe("preferredFootChance()", () => {
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
    pos
      .filter((p) => p !== "lb" && p !== "lm" && p !== "lw")
      .forEach((p) => expect(moreOftenLeftFooted(p)).toBe(false));
  });
});

describe("getOutOfPositionMalus()", () => {
  pos.forEach((p) => {
    const plr = new player.Player(p, new Date());
    const at = pos.find((pp) => pp !== p);

    test(`should return 0 when isn't out of position`, () => {
      expect(player.getOutOfPositionMalus(plr)).toBe(0);
    });

    describe(`when ${p} is playing at ${at}`, () => {
      const malus = player.getOutOfPositionMalus(plr, at);

      test(`should return a factor malus greater than 0`, () => {
        expect(malus).toBeGreaterThan(0);
      });

      test(`should return a factor malus less or equal than 1`, () => {
        expect(malus).toBeLessThanOrEqual(1);
      });
    });
  });
});

describe("getSkill()", () => {
  const p = pos[Math.floor(pos.length * Math.random())];
  const plr = new player.Player(p, new Date());
  const at = pos.find((pp) => pp !== p);

  player.skillsApplicableMalus.forEach((sk) => {
    test(`when ${p} is playing out of position the ${sk} value is reduced`, () => {
      expect(plr.skills[sk]).toBeGreaterThan(
        player.Player.getSkill(plr, sk, at)
      );
    });
  });

  Object.keys(plr.skills).forEach((s) => {
    const sk = s as keyof player.Skills;

    if (!player.skillsApplicableMalus.has(sk)) {
      test(`when ${p} is playing at ${p}, ${sk} value have no malus`, () => {
        expect(plr.skills[sk]).toBe(player.Player.getSkill(plr, sk, at));
      });
    }

    test(`${sk} value is greater than or equal ${player.MIN_SKILL}`, () => {
      expect(player.Player.getSkill(plr, sk, at)).toBeGreaterThan(
        player.MIN_SKILL
      );
    });

    test(`${sk} value is less than or equal ${player.MAX_SKILL}`, () => {
      expect(player.Player.getSkill(plr, sk, at)).toBeLessThanOrEqual(
        player.MAX_SKILL
      );
    });
  });
});

describe("getMacroskill()", () => {
  const p = pos[Math.floor(pos.length * Math.random())];
  const plr = new player.Player(p, new Date());
  const at = pos.find((pp) => pp !== p);

  Object.keys(player.macroskills).forEach((s) => {
    test(`${s} value is greater than or equal ${player.MIN_SKILL}`, () => {
      expect(player.Player.getMacroskill(plr, s, at)).toBeGreaterThan(
        player.MIN_SKILL
      );
    });

    test(`${s} value is less than or equal ${player.MAX_SKILL}`, () => {
      expect(player.Player.getMacroskill(plr, s, at)).toBeLessThanOrEqual(
        player.MAX_SKILL
      );
    });
  });
});
