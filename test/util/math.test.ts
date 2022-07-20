import * as _m from "../../src/util/math";

describe("mean()", () => {
  const sample = Array.from({ length: 10 }, (_, i) => i * 2 + 2);

  test(`should return 11 for ${sample}`, () => {
    expect(_m.mean(sample)).toBe(11);
  });
});

describe("variance()", () => {
  const sample = Array.from({ length: 10 }, (_, i) => i * 2 + 2);

  test(`should return 40 for ${sample}`, () => {
    expect(_m.variance(sample)).toBeCloseTo(36.67);
  });
});

describe("within()", () => {
  test("should throw an error when min is greater than max", () => {
    expect(() => _m.within(2, 3, 2)).toThrow();
  });

  test("should return v when it is between min and max", () => {
    expect(_m.within(2, 1, 3)).toBe(2);
  });

  test("should return min when min is greater than v", () => {
    expect(_m.within(0, 1, 2)).toBe(1);
  });

  test("should return max when max is less than v", () => {
    expect(_m.within(3, 1, 2)).toBe(2);
  });
});
