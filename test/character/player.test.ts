import * as _pl from "../../src/character/player";
import {
  isMoreFrequent,
  getAgeAt,
  mean,
  variance,
} from "../../src/util/generator";

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
const smpPlr = new _pl.Player(samplePos, new Date());
const atPos = poss.find((pp) => pp !== samplePos);

describe("getArea()", () => {
  test("should map every position to the area", () => {
    poss.forEach((p) => {
      const area = _pl.getArea(p);
      expect(_pl.positionArea[area]).toContainEqual(p);
    });
  });
});

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

describe("getImprovability()", () => {
  const step = _pl.MAX_GROWTH_RATE / 5; // 5 improvability ratings

  test("should return E", () => {
    expect(_pl.getImprovability(step / 2)).toBe("E");
  });

  test("should return D", () => {
    expect(_pl.getImprovability(step / 2 + step)).toBe("D");
  });

  test("should return C", () => {
    expect(_pl.getImprovability(step / 2 + 2 * step)).toBe("C");
  });

  test("should return B", () => {
    expect(_pl.getImprovability(step / 2 + 3 * step)).toBe("B");
  });

  test("should return A", () => {
    expect(_pl.getImprovability(step / 2 + 4 * step)).toBe("A");
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
      expect(_pl.Player.getSkill(smpPlr, sk)).toBeGreaterThan(
        _pl.Player.getSkill(smpPlr, sk, atPos)
      );
    });
  });

  _pl.noGrowthSkill.forEach((sk) => {
    const plr = new _pl.Player("am", new Date(), 18);
    plr.growthState = 0.8;

    test(`growthState shouldn't be applied to noGrowthSkill skills`, () => {
      expect(plr.skills[sk]).toBe(_pl.Player.getSkill(plr, sk));
    });
  });

  Object.keys(smpPlr.skills).forEach((s) => {
    const sk = s as keyof _pl.Skills;

    if (!_pl.noGrowthSkill.has(sk)) {
      test(`should take in account the growthState`, () => {
        const skl = Math.round(smpPlr.skills[sk] * smpPlr.growthState);
        expect(skl).toBe(_pl.Player.getSkill(smpPlr, sk));
      });
    }

    test(`${sk} value is greater than or equal ${_pl.MIN_SKILL}`, () => {
      expect(_pl.Player.getSkill(smpPlr, sk, atPos)).toBeGreaterThan(
        _pl.MIN_SKILL
      );
    });

    test(`${sk} value is less than or equal ${_pl.MAX_SKILL}`, () => {
      expect(_pl.Player.getSkill(smpPlr, sk, atPos)).toBeLessThanOrEqual(
        _pl.MAX_SKILL
      );
    });
  });
});

describe("Player.getMacroskill()", () => {
  Object.keys(_pl.macroskills).forEach((m) => {
    const s = m as _pl.Macroskill;

    test(`${s} value is greater than or equal ${_pl.MIN_SKILL}`, () => {
      expect(_pl.Player.getMacroskill(smpPlr, s, atPos)).toBeGreaterThan(
        _pl.MIN_SKILL
      );
    });

    test(`${s} value is less than or equal ${_pl.MAX_SKILL}`, () => {
      expect(_pl.Player.getMacroskill(smpPlr, s, atPos)).toBeLessThanOrEqual(
        _pl.MAX_SKILL
      );
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
    expect(_pl.Player.getScore(smpPlr)).toBeGreaterThan(
      _pl.Player.getScore(smpPlr, atPos)
    );
  });

  test(`should return a value greater than or equal ${_pl.MIN_SKILL}`, () => {
    expect(_pl.Player.getScore(smpPlr)).toBeGreaterThan(_pl.MIN_SKILL);
  });

  test(`should return a value less than or equal ${_pl.MAX_SKILL}`, () => {
    expect(_pl.Player.getScore(smpPlr)).toBeLessThanOrEqual(_pl.MAX_SKILL);
  });

  describe.each(poss.map((p) => [p]))("for position %s", (pos) => {
    const sample = Array.from({ length: 500 }, () =>
      _pl.Player.getScore(new _pl.Player(pos, new Date()))
    );

    test("should return a mean score around 60", () => {
      const m = mean(sample);
      expect(m).toBeGreaterThan(59);
      expect(m).toBeLessThan(61);
    });

    test("should return a standard deviation around 6", () => {
      const m = Math.sqrt(variance(sample));
      expect(m).toBeGreaterThan(5);
      expect(m).toBeLessThan(7);
    });
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
  const p = poss[Math.floor(Math.random() * poss.length)];
  const plr = new _pl.Player(p, new Date(), 28);

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

describe("createGrowthState()", () => {
  const now = new Date();

  test("should return 1 when the player is older than END_GROWTH_AGE - 1", () => {
    const plr = new _pl.Player("lw", now, _pl.END_GROWTH_AGE - 1);
    expect(_pl.createGrowthState(plr, now)).toBe(1);
  });

  test("should return less than 1 when player is younger than _END_GROWTH_AGE - 1", () => {
    const plr = new _pl.Player("lw", now, _pl.END_GROWTH_AGE - 2);
    expect(_pl.createGrowthState(plr, now)).toBeLessThan(1);
  });

  test("should return less than 1 when player is older than START_DEGROWTH_AGE", () => {
    const plr = new _pl.Player("cm", now, _pl.START_DEGROWTH_AGE + 1);
    expect(_pl.createGrowthState(plr, now)).toBeLessThan(1);
  });

  test("should return 1 when player is younger than START_DEGROWTH_AGE", () => {
    const plr = new _pl.Player("cm", now, _pl.START_DEGROWTH_AGE - 1);
    expect(_pl.createGrowthState(plr, now)).toBe(1);
  });

  test("younger and younger than END_GROWTH_AGE, should return progressively a smaller value", () => {
    const now = new Date();
    const plr = new _pl.Player("lw", now, 16);

    for (let age = 17; age < _pl.END_GROWTH_AGE; age++) {
      const prev = _pl.createGrowthState(plr, now);
      now.setFullYear(now.getFullYear() + 1);
      expect(prev).toBeLessThan(_pl.createGrowthState(plr, now));
    }
  });

  test("older and older than START_DEGROWTH_AGE, should return progressively a smaller value", () => {
    const now = new Date();
    const startAge = _pl.START_DEGROWTH_AGE;
    const plr = new _pl.Player("lw", now, startAge);

    for (let age = startAge + 1; age < startAge + 10; age++) {
      const prev = _pl.createGrowthState(plr, now);
      now.setFullYear(now.getFullYear() + 1);
      expect(_pl.createGrowthState(plr, now)).toBeLessThan(prev);
    }
  });
});

describe("Player.applyMonthlyGrowth()", () => {
  const now = new Date();

  test("shouldn't change player.growthState after END_GROWTH_AGE", () => {
    const plr = new _pl.Player("rw", now, _pl.END_GROWTH_AGE);
    const oldGrowthState = plr.growthState;
    _pl.Player.applyMonthlyGrowth(plr, now);
    expect(plr.growthState).toBe(oldGrowthState);
  });

  test("should add plr.growthRate to player.growthState before END_GROWTH_AGE", () => {
    const plr = new _pl.Player("rw", now, _pl.END_GROWTH_AGE - 1);
    const oldGrowthState = (plr.growthState -= 10); // make sure the ceil is not reached
    _pl.Player.applyMonthlyGrowth(plr, now);
    expect(plr.growthState).toBeCloseTo(oldGrowthState + plr.growthRate);
  });

  test("shouldn't change player.growthState when the growthState is 1", () => {
    const plr = new _pl.Player("rw", now, 20);
    plr.growthState = 1;
    _pl.Player.applyMonthlyGrowth(plr, now);
    expect(plr.growthState).toBe(1);
  });

  test("calling it every month should make growthState reach 1 before END_GROWTH_AGE", () => {
    const now = new Date("2010-10-10");
    const plr = new _pl.Player("lm", now, 16);

    while (getAgeAt(plr.birthday, now) < _pl.END_GROWTH_AGE) {
      _pl.Player.applyMonthlyGrowth(plr, now);
      now.setMonth(now.getMonth() + 1);
    }

    expect(plr.growthState).toBe(1);
  });
});

describe("Player.applyMonthlyDegrowth()", () => {
  const now = new Date();

  test("shouldn't change player.growthState before START_DEGROWTH_AGE", () => {
    const plr = new _pl.Player("rb", now, _pl.START_DEGROWTH_AGE - 1);
    const oldGrowthState = plr.growthState;
    _pl.Player.applyMonthlyDegrowth(plr, now);
    expect(plr.growthState).toBe(oldGrowthState);
  });

  test("should shrink player.growthState after START_DEGROWTH_AGE", () => {
    const plr = new _pl.Player("lb", now, _pl.START_DEGROWTH_AGE + 1);
    const oldGrowthState = plr.growthState; // make sure the ceil is not reached
    _pl.Player.applyMonthlyDegrowth(plr, now);
    expect(plr.growthState).toBeLessThan(oldGrowthState);
  });

  test("player.growthState shouldn't shrink more than 0.5", () => {
    const plr = new _pl.Player("rb", now, _pl.START_DEGROWTH_AGE - 1);
    plr.growthState = 0.5;
    _pl.Player.applyMonthlyDegrowth(plr, now);
    expect(plr.growthState).toBe(0.5);
  });
});

describe("pickBest()", () => {
  const pls = Array.from({ length: 9 }, () => new _pl.Player("am", new Date()));
  const n = 5;

  test("should return n players", () => {
    expect(_pl.pickBest(pls, n).length).toBe(n);
  });

  test("should return the best n players", () => {
    const best = pls
      .sort((p1, p2) => _pl.Player.getScore(p2) - _pl.Player.getScore(p1))
      .slice(0, n);
    expect(_pl.pickBest(pls, n)).toEqual(expect.arrayContaining(best));
  });

  test("throw an error when n is larger than player.length", () => {
    expect(() => _pl.pickBest(pls, 10)).toThrow();
  });
});
