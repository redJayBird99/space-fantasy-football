const OBSERVERS = Symbol("observers");
const NOTIFYING = Symbol("notifying");
const CALLBACKS = Symbol("callbacks");

export interface ContextObserver {
  onContextUpdate(): void;
}

export interface Context {
  [OBSERVERS]: ContextObserver[];
  [NOTIFYING]: boolean;
  [CALLBACKS]: (() => void)[];
}

/** @returns the same given object mutated to get a context */
export function newContext<T extends object>(obj: T): Context & T {
  return Object.assign(obj, {
    [OBSERVERS]: [],
    [NOTIFYING]: false,
    [CALLBACKS]: [],
  });
}

/**
 * this function will always lead a notification, calling setContext() only when
 * the setContext will be mutated will avoid unnecessary work.
 * it batches updates, multiple calls during the same cycle
 * triggers only one notification, performed asynchronously at microtask timing.
 * @param update return the updated context
 * @param onNotify after all observer were notified call it
 */
export function setContext(update: () => Context, onNotify?: () => void): void {
  const context = update();
  onNotify && context[CALLBACKS].push(onNotify);

  if (!context[NOTIFYING]) {
    context[NOTIFYING] = true;

    queueMicrotask(() => {
      context[NOTIFYING] = false;
      context[OBSERVERS].forEach((obs) => obs.onContextUpdate());
      context[CALLBACKS].forEach((fn) => fn());
      context[CALLBACKS] = [];
    });
  }
}

/** the given observer will get notified when the context change */
export function addObserver(obs: ContextObserver, c: Context): void {
  c[OBSERVERS].push(obs);
}
