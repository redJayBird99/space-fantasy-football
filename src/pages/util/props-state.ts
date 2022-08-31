export const MODF = Symbol("count_modifications");
const RENDERER = Symbol("renderer");
const RENDERING = Symbol("rendering");

/**
 * The custom element attributeChangedCallback() is not called when a property
 * is changed, Props is used to circumvent this limitation
 *
 * the symbol MODF property should be added as an element attribute,
 * every time you call setProps() this property automatically change too,
 * if the properties are modified outside of setProps() MODF will not update
 *
 * the attributeChangedCallback() can check the MODF attribute to know when Props was changed
 *
 * ```ts
 *  attributeChangedCallback(name) {
 *    if (name === "modf") {
 *    // do something with this.props
 *    }
 *  }
 * ```
 */
export interface Props {
  [MODF]: number;
}

/** @returns the same given object mutated to Props */
export function newProps<T extends Object>(obj: T): Props & T {
  return Object.assign(obj, { [MODF]: 0 });
}

/**
 * this function will always lead to an update of MODF property, calling
 * setProps() only when the props will be mutated will avoid unnecessary work.
 * @param update return the updated props
 */
export function setProps(update: () => Props): void {
  // it shoulden't overflow Number.MAX_SAFE_INTEGER, we don't need the % operator
  update()[MODF]++;
}

/** the custom element State */
export interface State {
  [RENDERER]: () => unknown;
  [RENDERING]: boolean;
}

/**
 * @param renderer (should be an element render method) is called when setState() is called,
 * @returns the same given object mutated to state
 */
export function newState<T extends Object>(
  obj: T,
  renderer: () => unknown
): State & T {
  return Object.assign(obj, { [RENDERER]: renderer, [RENDERING]: false });
}

/**
 * this function will always lead to a render call, calling setState() only when
 * the state will be mutated will avoid unnecessary rendering.
 * it batches updates, multiple calls during the same cycle
 * triggers only one render, performed asynchronously at microtask timing.
 * @param update return the updated state
 */
export function setState(update: () => State): void {
  const state = update();

  if (!state[RENDERING]) {
    state[RENDERING] = true;

    queueMicrotask(() => {
      state[RENDERING] = false;
      state[RENDERER]();
    });
  }
}
