import { createSkill } from "../../src/character/create-skills";
import { mean } from "../../src/util/math";

describe("createSkills()", () => {
  const sample = Array.from({ length: 1_000 }, () => createSkill(50, 20));

  test("createSkills(50, 20) shouldn't return numbers greater than 70", () => {
    expect(sample.some((n) => n > 70)).toBe(false);
  });

  test("customGaussian(50, 20) shouldn't return numbers smaller than 30", () => {
    expect(sample.some((n) => n < 30)).toBe(false);
  });

  test("createSkills(50, 20) should have mean around 48-52", () => {
    expect(mean(sample)).toBeLessThan(52);
    expect(mean(sample)).toBeGreaterThan(48);
  });
});
