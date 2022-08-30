import * as _p from "../../../src/pages/util/props-state";

describe("setState()", () => {
  test("when props is mutated should update the MODF property too", () => {
    const props = _p.newProps({ name: "raspberry" });
    const oldMODF = props[_p.MODF];
    _p.setProps(() => {
      props.name = "lemon";
      return props;
    });
    expect(props[_p.MODF]).not.toBe(oldMODF);
  });

  test("when props isn't mutated should update the MODF property anyway", () => {
    const props = _p.newProps({ name: "raspberry" });
    const oldMODF = props[_p.MODF];
    _p.setProps(() => props);
    expect(props[_p.MODF]).not.toBe(oldMODF);
  });
});

describe("newProps", () => {
  test("should return a props with the same properties of the given object", () => {
    const props = _p.newProps({ action: "move", state: "stun" });
    expect(props).toEqual(
      expect.objectContaining({ action: "move", state: "stun" })
    );
  });

  test("should return a props with a MODF property", () => {
    const props = _p.newProps({ action: "move", state: "stun" });
    expect(props[_p.MODF]).toBeDefined();
  });
});

describe("when props are modified directly", () => {
  test("should not update the MODF property", () => {
    const props = _p.newProps({ action: "move", state: "stun" });
    const oldMODF = props[_p.MODF];
    props.action = "";
    expect(oldMODF).toBe(props[_p.MODF]);
  });
});

describe("newState()", () => {
  test("should return a state with the same properties of the given object", () => {
    const state = _p.newState({ action: "move", state: "stun" }, () => {});
    expect(state).toEqual(
      expect.objectContaining({ action: "move", state: "stun" })
    );
  });
});

describe("setState()", () => {
  test("should call the state render", () => {
    return new Promise((resolve) => {
      const mockFn = jest.fn();
      mockFn.mockImplementation(() => resolve(mockFn));
      const state = _p.newState({ action: "move" }, mockFn);
      _p.setState(() => state);
    }).then((mockFn: any) => expect(mockFn.mock.calls).toHaveLength(1));
  });

  test("multiple setState() calls should call the state render only once", () => {
    return new Promise((resolve) => {
      const mockFn = jest.fn();
      mockFn.mockImplementation(() => resolve(mockFn));
      const state = _p.newState({ action: "move" }, mockFn);
      _p.setState(() => state);
      _p.setState(() => state);
      _p.setState(() => state);
    }).then((mockFn: any) => expect(mockFn.mock.calls).toHaveLength(1));
  });

  test("should call the state render asynchronously", () => {
    return new Promise((resolve) => {
      const mockFn = jest.fn();
      mockFn.mockImplementation(() => resolve(mockFn));
      const state = _p.newState({ action: "move" }, mockFn);
      _p.setState(() => state);
      expect(mockFn.mock.calls).toHaveLength(0);
    }).then((mockFn: any) => expect(mockFn.mock.calls).toHaveLength(1));
  });
});
