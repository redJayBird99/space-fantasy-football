import * as _pl from "../../src/character/player";
import {
  isMoreFrequent,
  getAgeAt,
  mean,
  variance,
} from "../../src/util/generator";
import { Team } from "../../src/character/team";

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
  test.each(poss)("position: %s should returns the corresponding area", (p) => {
    expect(_pl.positionArea[_pl.getArea(p)]).toContainEqual(p);
  });
});

describe("createAge()", () => {
  const ages = Array.from({ length: 1_000 }, () => _pl.createAge());
  const teens = ages.filter((a) => a >= _pl.MIN_AGE && a < 20);
  const age20s = ages.filter((a) => a >= 20 && a < 29);
  const age30s = ages.filter((a) => a >= 30 && a < 40);
  const dif = 0.5;

  test("should return numbers greater or equal than MIN_AGE", () => {
    ages.forEach((age) => expect(age).toBeGreaterThanOrEqual(_pl.MIN_AGE));
  });

  test("should return numbers smaller or equal than MAX_AGE", () => {
    ages.forEach((age) => expect(age).toBeLessThanOrEqual(_pl.MAX_AGE));
  });

  test("loosely around 13% sould be teens", () => {
    expect(teens.length / ages.length).toBeGreaterThan(0.13 - dif);
    expect(teens.length / ages.length).toBeLessThan(0.13 + dif);
  });

  test("loosely around 58% sould be 20s", () => {
    expect(age20s.length / ages.length).toBeGreaterThan(0.58 - dif);
    expect(age20s.length / ages.length).toBeLessThan(0.58 + dif);
  });

  test("loosely around 22% sould be 30s", () => {
    expect(age30s.length / ages.length).toBeGreaterThan(0.22 - dif);
    expect(age30s.length / ages.length).toBeLessThan(0.22 + dif);
  });
});

describe("Player.retire()", () => {
  const date = new Date();

  test("under 30 shouldn't return true", () => {
    const rdmAge = () =>
      _pl.MIN_AGE - Math.floor((30 - _pl.MIN_AGE) * Math.random());
    Array.from(
      { length: 25 },
      () => new _pl.Player("cm", date, rdmAge())
    ).forEach((p) => expect(_pl.Player.retire(p, date)).toBe(false));
  });

  test("over 30 should sometimes return true", () => {
    const rdmAge = () => 30 + Math.floor(10 * Math.random());
    const retired = Array.from(
      { length: 25 },
      () => new _pl.Player("cm", date, rdmAge())
    ).filter((p) => _pl.Player.retire(p, date));
    expect(retired.length).toBeGreaterThan(0);
  });

  test("should return true when player is MAX_AGE", () => {
    const p = new _pl.Player("cm", date, _pl.MAX_AGE);
    expect(_pl.Player.retire(p, date)).toBe(true);
  });
});

describe("getImprovabilityRating()", () => {
  test("should return 0 when given 0", () => {
    expect(_pl.getImprovabilityRating(0)).toBe(0);
  });

  test("should return 10 when given MAX_GROWTH_RATE", () => {
    expect(_pl.getImprovabilityRating(_pl.MAX_GROWTH_RATE)).toBe(10);
  });

  test("should return 3 when given 3 * MAX_GROWTH_RATE / 10", () => {
    expect(_pl.getImprovabilityRating((3 * _pl.MAX_GROWTH_RATE) / 10)).toBe(3);
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
  test("when growth argument is false shouldn't apply the growthState", () => {
    const p = new _pl.Player("cf", new Date(), 18);
    expect(p.skills.passing).toBe(
      _pl.Player.getSkill(p, "passing", undefined, false)
    );
  });

  _pl.skillsApplicableMalus.forEach((sk) => {
    test(`when is playing out of position the ${sk} value is reduced`, () => {
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

  describe.each(poss)(
    "for a 28 years old (full grown) player at position %s ",
    (pos) => {
      const sample = Array.from({ length: 500 }, () =>
        _pl.Player.getScore(new _pl.Player(pos, new Date(), 28))
      );

      test("should return a mean score loosely around 64.5", () => {
        const m = mean(sample);
        expect(m).toBeGreaterThan(63.5);
        expect(m).toBeLessThan(65.5);
      });

      test("should return a standard deviation loosely around 5", () => {
        const m = Math.sqrt(variance(sample));
        expect(m).toBeGreaterThan(4);
        expect(m).toBeLessThan(6);
      });
    }
  );
});

describe("predictScore()", () => {
  const team = new Team("empty name");
  const dt = new Date();
  const p = new _pl.Player("lm", dt, 17);

  test("should be deterministic given the same imput", () => {
    expect(_pl.Player.predictScore(p, dt, team)).toBe(
      _pl.Player.predictScore(p, dt, team)
    );
  });

  test("should return the current score when older than END_GROWTH_AGE", () => {
    const p = new _pl.Player("gk", dt, _pl.END_GROWTH_AGE + 1);
    expect(_pl.Player.getScore(p)).toBe(_pl.Player.predictScore(p, dt, team));
  });

  test("should usually return a different score when younger than END_GROWTH_AGE", () => {
    team.scoutOffset = 0.2;
    expect(_pl.Player.getScore(p, undefined, false)).not.toBe(
      _pl.Player.predictScore(p, dt, team)
    );
  });

  test("should return a value within scoutOffset% of the real score", () => {
    team.scoutOffset = 0.1;
    const fct =
      _pl.Player.getScore(p, undefined, false) /
      _pl.Player.predictScore(p, dt, team);
    expect(fct).toBeGreaterThanOrEqual(1 - team.scoutOffset);
    expect(fct).toBeLessThanOrEqual(1 + team.scoutOffset);
  });

  test("the accuracy should improve when the player age get closer to END_GROWTH_AGE", () => {
    const now = new Date(dt);
    const p = new _pl.Player("gk", now, _pl.MIN_AGE);
    const after3Years = new Date(now.getFullYear() + 3, now.getMonth() + 1);
    const peakScore = _pl.Player.getScore(p, undefined, false);
    expect(
      Math.abs(peakScore - _pl.Player.predictScore(p, after3Years, team))
    ).toBeLessThan(Math.abs(peakScore - _pl.Player.predictScore(p, dt, team)));
  });

  test("two different teams should get two different score", () => {
    // cause the function random nature in rare occasions they could be the same
    const team2 = new Team("insert name");
    expect(_pl.Player.predictScore(p, dt, team2)).not.toBe(
      _pl.Player.predictScore(p, dt, team)
    );
  });

  test("lower is team.scoutOffset closer should be to the real score", () => {
    const dist = (p: _pl.Player, team: Team) =>
      Math.abs(
        _pl.Player.getScore(p, undefined, false) -
          _pl.Player.predictScore(p, dt, team)
      );
    const plrs = poss.map((p) => new _pl.Player(p, dt, 18));
    const team2 = new Team("insert name");
    team2.scoutOffset = 0.2;
    team.scoutOffset = 0.05;
    const offset = plrs.reduce((a, p) => a + dist(p, team), 0) / plrs.length;
    const offset2 = plrs.reduce((a, p) => a + dist(p, team2), 0) / plrs.length;
    expect(offset).toBeLessThan(offset2);
  });

  test("should never return a value less than current score", () => {
    const plrs = poss.map((p) => new _pl.Player(p, dt, _pl.END_GROWTH_AGE - 2));
    team.scoutOffset = 0.5;
    plrs.forEach((p) =>
      expect(_pl.Player.predictScore(p, dt, team)).toBeGreaterThanOrEqual(
        _pl.Player.getScore(p)
      )
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
  const p = poss[Math.floor(Math.random() * poss.length)];
  const plr = new _pl.Player(p, new Date(), 28);

  test("a very good player should ask for MAX_WAGE", () => {
    Object.keys(plr.skills).forEach((s) => (plr.skills[s as _pl.Skill] = 90));
    expect(_pl.Player.wantedWage(plr)).toBe(_pl.MAX_WAGE);
  });

  test("a bad player should ask for MIN_WAGE", () => {
    Object.keys(plr.skills).forEach((s) => (plr.skills[s as _pl.Skill] = 20));
    expect(_pl.Player.wantedWage(plr)).toBe(_pl.MIN_WAGE);
  });

  test("a mid player should ask for between MIN_WAGE and MAX_WAGE", () => {
    Object.keys(plr.skills).forEach((s) => (plr.skills[s as _pl.Skill] = 60));
    expect(_pl.Player.wantedWage(plr)).toBeGreaterThan(_pl.MIN_WAGE);
    expect(_pl.Player.wantedWage(plr)).toBeLessThan(_pl.MAX_WAGE);
  });
});

describe("Player.applicable()", () => {
  const team = new Team("spam");
  const p = poss[Math.floor(Math.random() * poss.length)];
  const plr = new _pl.Player(p, new Date(), 28);

  describe("for a good player", () => {
    const pr: _pl.Player = JSON.parse(JSON.stringify(plr));
    Object.keys(pr.skills).forEach((s) => (pr.skills[s as _pl.Skill] = 90));

    test("should return true when the appeal is 2.5", () => {
      team.appeal = 2.5;
      expect(_pl.Player.approachable(pr, team)).toBe(true);
    });

    test("should return true when the appeal is greater 2.5", () => {
      team.appeal = 3;
      expect(_pl.Player.approachable(pr, team)).toBe(true);
    });

    describe("for low appeal", () => {
      team.appeal = 1;
      const sample = Array.from({ length: 30 }, () =>
        _pl.Player.approachable(pr, team)
      );

      test("should return true sometimes", () => {
        expect(sample.filter((v) => v).length).toBeGreaterThan(0);
      });

      test("should return false most of the times", () => {
        expect(sample.filter((v) => !v).length).toBeGreaterThan(
          sample.filter((v) => v).length
        );
      });
    });
  });

  test("should return true when the appeal is less 2.5 for a mediocre player", () => {
    Object.keys(plr.skills).forEach((s) => (plr.skills[s as _pl.Skill] = 60));
    team.appeal = 1;
    expect(_pl.Player.approachable(plr, team)).toBe(true);
  });
});

describe("Player.wageRequest()", () => {
  const tm = new Team("spam");
  const p = poss[Math.floor(Math.random() * poss.length)];
  const plr = new _pl.Player(p, new Date(), 28);

  describe("for a good player", () => {
    const pr: _pl.Player = JSON.parse(JSON.stringify(plr));
    Object.keys(pr.skills).forEach((s) => (pr.skills[s as _pl.Skill] = 75));

    test("shouldn't overpay when the team appeal is 2.5 or higher", () => {
      tm.appeal = 2.5;
      expect(_pl.Player.wageRequest(pr, tm)).toBe(_pl.Player.wantedWage(pr));
    });

    test("should overpay when the team appeal is less than 2.5", () => {
      tm.appeal = 2;
      expect(_pl.Player.wageRequest(pr, tm)).toBeGreaterThan(
        _pl.Player.wantedWage(pr)
      );
    });

    test("a team with appeal 0 should pay more than one with 1.25", () => {
      const team2 = new Team("smap2");
      tm.appeal = 1.25;
      team2.appeal = 0;
      expect(_pl.Player.wageRequest(pr, team2)).toBeGreaterThan(
        _pl.Player.wageRequest(pr, tm)
      );
    });

    test("a team with appeal 0 should pay more than one with 1.25", () => {
      const team2 = new Team("spam2");
      tm.appeal = 1.25;
      team2.appeal = 0;
      expect(_pl.Player.wageRequest(pr, team2)).toBeGreaterThan(
        _pl.Player.wageRequest(pr, tm)
      );
    });

    test("the wage shouldn't exceed the MAX_WAGE", () => {
      Object.keys(pr.skills).forEach((s) => (pr.skills[s as _pl.Skill] = 90));
      tm.appeal = 0;
      expect(_pl.Player.wageRequest(pr, tm)).toBe(_pl.MAX_WAGE);
    });
  });

  describe("for a mediocre player", () => {
    test("shouldn't be overPaid when the team has a low appeal", () => {
      Object.keys(plr.skills).forEach((s) => (plr.skills[s as _pl.Skill] = 60));
      tm.appeal = 1;
      expect(_pl.Player.wageRequest(plr, tm)).toBe(_pl.Player.wantedWage(plr));
    });
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
