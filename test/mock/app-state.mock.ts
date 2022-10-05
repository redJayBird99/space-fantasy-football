import appState from "../../src/app-state/app-state";

appState.simOptions.tickInterval = 0;

Object.defineProperty(window, "$appState", {
  writable: true,
  value: appState,
});
