import {
  addObserver,
  newContext,
  setContext,
} from "../../../src/pages/util/context";

describe("setContext()", () => {
  test("should call all the context observers", () => {
    return new Promise((resolve) => {
      const mockFn = jest.fn();
      const mockObs = { onContextUpdate: mockFn };
      mockObs.onContextUpdate.mockImplementation(() => resolve(mockFn));
      const c = newContext({ action: "move" });
      addObserver(mockObs, c);
      setContext(() => c);
    }).then((mockFn: any) => expect(mockFn.mock.calls).toHaveLength(1));
  });

  test("multiple setContext() on th same cycle should notify the observer only once", () => {
    return new Promise((resolve) => {
      const mockFn = jest.fn();
      const mockObs = { onContextUpdate: mockFn };
      const c = newContext({ action: "move" });
      mockObs.onContextUpdate.mockImplementation(() =>
        resolve({ m: mockFn, c })
      );
      addObserver(mockObs, c);
      setContext(() => c);
      setContext(() => c);
      setContext(() => Object.assign(c, { action: "xop" }));
    }).then((rst: any) => {
      expect(rst.m.mock.calls).toHaveLength(1);
      expect(rst.c.action).toBe("xop");
    });
  });

  test("should notify asynchronously", () => {
    return new Promise((resolve) => {
      const mockFn = jest.fn();
      const mockObs = { onContextUpdate: mockFn };
      mockObs.onContextUpdate.mockImplementation(() => resolve(mockFn));
      const c = newContext({ action: "move" });
      addObserver(mockObs, c);
      setContext(() => c);
      expect(mockFn.mock.calls).toHaveLength(0);
    }).then((mockFn: any) => expect(mockFn.mock.calls).toHaveLength(1));
  });
});
