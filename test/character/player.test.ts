import * as player from "../../src/character/player";
import { isMoreFrequent } from "../../src/util/generator";

const poss: player.Position[] = [
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
const samplePos = poss[Math.floor(poss.length * Math.random())];
const samplePlayer = new player.Player(samplePos, new Date());
const atPos = poss.find((pp) => pp !== samplePos);

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
  const potentials = Array.from({ length: 250 }, () =>
    player.createPotential()
  );

  test("all potentials should able to created", () => {
    expect(potentials.includes("A")).toBe(true);
    expect(potentials.includes("B")).toBe(true);
    expect(potentials.includes("C")).toBe(true);
    expect(potentials.includes("D")).toBe(true);
    expect(potentials.includes("E")).toBe(true);
  });

  test("potential C should be return more frequently of A", () => {
    expect(isMoreFrequent("C", "A", potentials)).toBe(true);
  });

  test("potential C should be return more frequently of E", () => {
    expect(isMoreFrequent("C", "E", potentials)).toBe(true);
  });
});

describe("preferredFootChance()", () => {
  poss.forEach((p) => {
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
      Array.from({ length: 250 }, () => player.createPreferredFoot(p))
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
    poss
      .filter((p) => p !== "lb" && p !== "lm" && p !== "lw")
      .forEach((p) => expect(moreOftenLeftFooted(p)).toBe(false));
  });

  test("should be able to create all preferred foots", () => {
    const p = poss[Math.floor(poss.length * Math.random())];
    const ft = Array.from({ length: 200 }, () => player.createPreferredFoot(p));
    expect(ft.includes("ambidextrous")).toBe(true);
    expect(ft.includes("left")).toBe(true);
    expect(ft.includes("right")).toBe(true);
  });
});

describe("getOutOfPositionMalus()", () => {
  poss.forEach((p) => {
    const plr = new player.Player(p, new Date());
    const at = poss.find((pp) => pp !== p);

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
  player.skillsApplicableMalus.forEach((sk) => {
    test(`when is playing out of position the skill value is reduced`, () => {
      expect(samplePlayer.skills[sk]).toBeGreaterThan(
        player.Player.getSkill(samplePlayer, sk, atPos)
      );
    });
  });

  Object.keys(samplePlayer.skills).forEach((s) => {
    const sk = s as keyof player.Skills;

    if (!player.skillsApplicableMalus.has(sk)) {
      test(`when is playing at its natural position, the skill value have no malus`, () => {
        expect(samplePlayer.skills[sk]).toBe(
          player.Player.getSkill(samplePlayer, sk, atPos)
        );
      });
    }

    test(`${sk} value is greater than or equal ${player.MIN_SKILL}`, () => {
      expect(player.Player.getSkill(samplePlayer, sk, atPos)).toBeGreaterThan(
        player.MIN_SKILL
      );
    });

    test(`${sk} value is less than or equal ${player.MAX_SKILL}`, () => {
      expect(
        player.Player.getSkill(samplePlayer, sk, atPos)
      ).toBeLessThanOrEqual(player.MAX_SKILL);
    });
  });
});

describe("getMacroskill()", () => {
  Object.keys(player.macroskills).forEach((m) => {
    const s = m as player.Macroskill;

    test(`${s} value is greater than or equal ${player.MIN_SKILL}`, () => {
      expect(
        player.Player.getMacroskill(samplePlayer, s, atPos)
      ).toBeGreaterThan(player.MIN_SKILL);
    });

    test(`${s} value is less than or equal ${player.MAX_SKILL}`, () => {
      expect(
        player.Player.getMacroskill(samplePlayer, s, atPos)
      ).toBeLessThanOrEqual(player.MAX_SKILL);
    });
  });
});

describe("createPlayerAt()", () => {
  Object.keys(player.positionArea).forEach((area) => {
    const pArea = area as player.PositionArea;
    const plrs = Array.from({ length: 100 }, () =>
      player.Player.createPlayerAt(new Date(), pArea)
    );

    describe(`when at is ${pArea}`, () => {
      player.positionArea[pArea].forEach((p) => {
        const pp = p as player.Position;

        test(`should be able to return a player at ${pp}`, () => {
          expect(plrs.some((pr) => pr.position === pp)).toBe(true);
        });
      });
    });
  });

  xtest("cm is more frequent", () => {});
});

describe("positionScoreFactors", () => {
  Object.keys(player.positionScoreFactors).forEach((p) => {
    const pp = p as player.Position;

    describe(`the sum of factor of ${pp} score is 1`, () => {
      expect(
        Object.values(player.positionScoreFactors[pp]).reduce((a, v) => a + v)
      ).toBeCloseTo(1);
    });
  });
});

describe("getScore()", () => {
  test(`when is playing out of position the score is reduced`, () => {
    expect(player.Player.getScore(samplePlayer)).toBeGreaterThan(
      player.Player.getScore(samplePlayer, atPos)
    );
  });

  test(`should return a value greater than or equal ${player.MIN_SKILL}`, () => {
    expect(player.Player.getScore(samplePlayer)).toBeGreaterThan(
      player.MIN_SKILL
    );
  });

  test(`should return a value less than or equal ${player.MAX_SKILL}`, () => {
    expect(player.Player.getScore(samplePlayer)).toBeLessThanOrEqual(
      player.MAX_SKILL
    );
  });
});
