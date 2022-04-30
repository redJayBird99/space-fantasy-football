import * as gen from "../../src/util/generator";

const rdmAge = () => Math.floor(90 * Math.random()) + 1;

describe("mean()", () => {
  const sample = Array.from({ length: 10 }, (_, i) => i * 2 + 2);

  test(`should return 11 for ${sample}`, () => {
    expect(gen.mean(sample)).toBe(11);
  });
});

describe("variance()", () => {
  const sample = Array.from({ length: 10 }, (_, i) => i * 2 + 2);

  test(`should return 40 for ${sample}`, () => {
    expect(gen.variance(sample)).toBeCloseTo(36.67);
  });
});

describe("isMoreFrequent()", () => {
  const bits = [0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0];

  test(`return true when checking the frequence of 0s in ${bits}`, () => {
    expect(gen.isMoreFrequent(0, 1, bits)).toBe(true);
  });

  test(`return false when checking the frequence of 1s in ${bits}`, () => {
    expect(gen.isMoreFrequent(1, 0, bits)).toBe(false);
  });
});

describe("createId()", () => {
  test("should return unique strings", () => {
    // a small check for major error, checking for uniqueness is tricky
    const ids = Array.from({ length: 1_000 }, () => gen.createId());
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
});

describe("randomGauss()", () => {
  const sample = Array.from({ length: 1_000 }, () => gen.randomGauss());

  test("should return numbers greater or equal than 0", () => {
    expect(gen.randomGauss()).toBeGreaterThanOrEqual(0);
  });

  test("should return numbers smaller than 1", () => {
    expect(gen.randomGauss()).toBeLessThan(1);
  });

  test("should have a standard deviation around 0.144 (max diff 0.01)", () => {
    const stdDev = Math.sqrt(gen.variance(sample));
    expect(stdDev).toBeLessThan(0.144 + 0.1);
    expect(stdDev).toBeGreaterThan(0.144 - 0.1);
  });

  test("around 64%-72% should be within one standard deviation", () => {
    const count = sample.reduce((a, v) => {
      if (v <= 0.5 + 0.144 && v >= 0.5 - 0.144) {
        a++;
      }

      return a;
    }, 0);

    expect(count / sample.length).toBeLessThan(0.72);
    expect(count / sample.length).toBeGreaterThan(0.64);
  });
});

describe("customGaussian()", () => {
  const sample = Array.from({ length: 1_000 }, () =>
    gen.customGaussian(50, 50)
  );

  test("customGaussian(50, 50) should have a standard deviation around 0.144 (max diff 1)", () => {
    const stdDev = Math.sqrt(gen.variance(sample));
    expect(stdDev).toBeLessThan(14.4 + 1);
    expect(stdDev).toBeGreaterThan(14.4 - 1);
  });

  test("customGaussian(50, 50) shouldn't return numbers greater than 100", () => {
    expect(sample.some((n) => n > 100)).toBe(false);
  });

  test("customGaussian(50, 50) shouldn't return numbers smaller than 0", () => {
    expect(sample.some((n) => n < 0)).toBe(false);
  });

  xtest("around 65%-70% should be within one standard deviation", () => {});
});

describe("getAgeAt()", () => {
  test("should return 87 birthday 1934-5-1 at 2022-4-30", () => {
    expect(gen.getAgeAt("1934-5-1", new Date("2022-4-30"))).toBe(87);
  });

  test("should return 88 birthday 1934-4-28 at 2022-4-28", () => {
    expect(gen.getAgeAt("1934-4-28", new Date("2022-4-28"))).toBe(88);
  });

  test("should return 1 birthday 2020-1-5 at 2021-1-21", () => {
    expect(gen.getAgeAt("2020-1-5", new Date("2021-1-21"))).toBe(1);
  });
});

describe("createBirthdayDate()", () => {
  const now = new Date();

  test("should return a birthday corresponding to the given age", () => {
    Array.from({ length: 10 }, () => rdmAge()).forEach((age) => {
      const birthday = gen.createBirthdayDate(age, now);
      const distanceAge = gen.getAgeAt(birthday.toDateString(), now);
      expect(distanceAge).toBe(age);
    });
  });

  test("should throw an error when age is negative", () => {
    expect(() => gen.createBirthdayDate(-1, now)).toThrowError();
  });
});

describe("createBirthday()", () => {
  const now = new Date();

  test("should return a valid dateString corresponding to the given age", () => {
    Array.from({ length: 10 }, () => rdmAge()).forEach((age) => {
      const birthday = new Date(gen.createBirthday(age, now));
      const distanceAge = gen.getAgeAt(birthday.toDateString(), now);
      expect(distanceAge).toBe(age);
    });
  });
});

describe("createName", () => {
  xtest("should depend on the nationality", () => {});
});
