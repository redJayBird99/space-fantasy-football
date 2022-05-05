import * as _pl from "../../src/character/player";
import { isMoreFrequent } from "../../src/util/generator";

const poss: _pl.Position[] = [
  "gk",
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
const samplePlayer = new _pl.Player(samplePos, new Date());
const atPos = poss.find((pp) => pp !== samplePos);

describe("createAge()", () => {
  const ages = Array.from({ length: 100 }, () => _pl.createAge());

  test("should return numbers greater or equal than MIN_AGE", () => {
    ages.forEach((age) => expect(age).toBeGreaterThanOrEqual(_pl.MIN_AGE));
  });

  test("should return numbers smaller or equal than MAX_AGE", () => {
    ages.forEach((age) => expect(age).toBeLessThanOrEqual(_pl.MAX_AGE));
  });

  xtest("teens should be less frequent of any 20s", () => {});

  xtest("30s should be less frequent of any 20s", () => {});
});

describe("createPotential()", () => {
  const potentials = Array.from({ length: 250 }, () => _pl.createPotential());

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
    const rst = _pl.preferredFootChance(p);

    test(`the summed probability for ${p} shouldn't be greater than 1`, () => {
      expect(rst.left + rst.right).toBeLessThanOrEqual(1);
    });

    test(`the summed probability for ${p} shouldn't be less than 0`, () => {
      expect(rst.left + rst.right).toBeGreaterThanOrEqual(0);
    });
  });
});

describe("createPreferredFoot()", () => {
  const moreOftenLeftFooted = (p: _pl.Position) => {
    return isMoreFrequent(
      "left",
      "right",
      Array.from({ length: 250 }, () => _pl.createPreferredFoot(p))
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
    const ft = Array.from({ length: 200 }, () => _pl.createPreferredFoot(p));
    expect(ft.includes("ambidextrous")).toBe(true);
    expect(ft.includes("left")).toBe(true);
    expect(ft.includes("right")).toBe(true);
  });
});

describe("getOutOfPositionMalus()", () => {
  poss.forEach((p) => {
    const plr = new _pl.Player(p, new Date());
    const at = poss.find((pp) => pp !== p);

    test(`should return 0 when isn't out of position`, () => {
      expect(_pl.getOutOfPositionMalus(plr)).toBe(0);
    });

    describe(`when ${p} is playing at ${at}`, () => {
      const malus = _pl.getOutOfPositionMalus(plr, at);

      test(`should return a factor malus greater than 0`, () => {
        expect(malus).toBeGreaterThan(0);
      });

      test(`should return a factor malus less or equal than 1`, () => {
        expect(malus).toBeLessThanOrEqual(1);
      });
    });
  });
});

describe("Player.getSkill()", () => {
  _pl.skillsApplicableMalus.forEach((sk) => {
    test(`when is playing out of position the skill value is reduced`, () => {
      expect(samplePlayer.skills[sk]).toBeGreaterThan(
        _pl.Player.getSkill(samplePlayer, sk, atPos)
      );
    });
  });

  Object.keys(samplePlayer.skills).forEach((s) => {
    const sk = s as keyof _pl.Skills;

    if (!_pl.skillsApplicableMalus.has(sk)) {
      test(`when is playing at its natural position, the skill value have no malus`, () => {
        expect(samplePlayer.skills[sk]).toBe(
          _pl.Player.getSkill(samplePlayer, sk, atPos)
        );
      });
    }

    test(`${sk} value is greater than or equal ${_pl.MIN_SKILL}`, () => {
      expect(_pl.Player.getSkill(samplePlayer, sk, atPos)).toBeGreaterThan(
        _pl.MIN_SKILL
      );
    });

    test(`${sk} value is less than or equal ${_pl.MAX_SKILL}`, () => {
      expect(_pl.Player.getSkill(samplePlayer, sk, atPos)).toBeLessThanOrEqual(
        _pl.MAX_SKILL
      );
    });
  });
});

describe("Player.getMacroskill()", () => {
  Object.keys(_pl.macroskills).forEach((m) => {
    const s = m as _pl.Macroskill;

    test(`${s} value is greater than or equal ${_pl.MIN_SKILL}`, () => {
      expect(_pl.Player.getMacroskill(samplePlayer, s, atPos)).toBeGreaterThan(
        _pl.MIN_SKILL
      );
    });

    test(`${s} value is less than or equal ${_pl.MAX_SKILL}`, () => {
      expect(
        _pl.Player.getMacroskill(samplePlayer, s, atPos)
      ).toBeLessThanOrEqual(_pl.MAX_SKILL);
    });
  });
});

describe("Player.createPlayerAt()", () => {
  Object.keys(_pl.positionArea).forEach((area) => {
    const pArea = area as _pl.PositionArea;
    const plrs = Array.from({ length: 100 }, () =>
      _pl.Player.createPlayerAt(new Date(), pArea)
    );

    describe(`when at is ${pArea}`, () => {
      _pl.positionArea[pArea].forEach((p) => {
        const pp = p as _pl.Position;

        test(`should be able to return a player at ${pp}`, () => {
          expect(plrs.some((pr) => pr.position === pp)).toBe(true);
        });
      });
    });
  });

  xtest("cm is more frequent", () => {});
});

describe("positionScoreFactors", () => {
  Object.keys(_pl.positionScoreFactors).forEach((p) => {
    const pp = p as _pl.Position;

    describe(`the sum of factor of ${pp} score is 1`, () => {
      expect(
        Object.values(_pl.positionScoreFactors[pp]).reduce((a, v) => a + v)
      ).toBeCloseTo(1);
    });
  });
});

describe("Player.getScore()", () => {
  test(`when is playing out of position the score is reduced`, () => {
    expect(_pl.Player.getScore(samplePlayer)).toBeGreaterThan(
      _pl.Player.getScore(samplePlayer, atPos)
    );
  });

  test(`should return a value greater than or equal ${_pl.MIN_SKILL}`, () => {
    expect(_pl.Player.getScore(samplePlayer)).toBeGreaterThan(_pl.MIN_SKILL);
  });

  test(`should return a value less than or equal ${_pl.MAX_SKILL}`, () => {
    expect(_pl.Player.getScore(samplePlayer)).toBeLessThanOrEqual(
      _pl.MAX_SKILL
    );
  });
});

describe("Player.getHeightInCm()", () => {
  const plr = new _pl.Player("am", new Date());

  test("should return 150 when height is 0", () => {
    plr.skills.height = 0;
    expect(_pl.Player.getHeightInCm(plr)).toBe(150);
  });

  test("should return 205 when height is 99", () => {
    plr.skills.height = 99;
    expect(_pl.Player.getHeightInCm(plr)).toBe(205);
  });
});

describe("Player.wantedWage()", () => {
  const plr = new _pl.Player(
    poss[Math.floor(Math.random() * poss.length)],
    new Date()
  );

  test("a very good player should ask for 64000", () => {
    Object.keys(plr.skills).forEach((s) => (plr.skills[s as _pl.Skill] = 90));
    expect(_pl.Player.wantedWage(plr)).toBe(64_000);
  });

  test("a bad player should ask for 2000", () => {
    Object.keys(plr.skills).forEach((s) => (plr.skills[s as _pl.Skill] = 20));
    expect(_pl.Player.wantedWage(plr)).toBe(2_000);
  });

  test("a mid player should ask for between 2000 and 64000", () => {
    Object.keys(plr.skills).forEach((s) => (plr.skills[s as _pl.Skill] = 60));
    expect(_pl.Player.wantedWage(plr)).toBeGreaterThan(2_000);
    expect(_pl.Player.wantedWage(plr)).toBeLessThan(64_000);
  });
});
