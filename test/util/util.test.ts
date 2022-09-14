import { interpolate } from "../../src/util/util";

describe("interpolate()", () => {
  test("when there isn't any ${} symbol the txt should not insert replacements", () => {
    const txt = "nothing to insert";
    expect(interpolate(txt, { name: "name" })).toBe(txt);
  });

  test("should replace every ${} symbol with the corresponding replacements", () => {
    // eslint-disable-next-line no-template-curly-in-string
    const txt = "some insect ${here} and ${here}, but not ${there}";
    expect(interpolate(txt, { here: "fly", there: "all" })).toBe(
      "some insect fly and fly, but not all"
    );
  });
});
