interface UserSettings {
  // this option are setting shared by every game and are saved (when possible) separately in the localStorage
  autoFormation: boolean; // update the user formation automatically before a match
}

/** the local storage key for the auto options settings */
const STORAGE_KEY = "sff-user-settings";

const appState = {
  simOptions: {
    tickInterval: 500, // milliseconds interval, control the sim speed
    duration: "simRound" as string | undefined, // simulate until the given SimEndEvent happen
  },
  userSettings: loadAutoOptions(),
};
export default appState;

/** load from the local storage the user setting, if none was found return a default */
function loadAutoOptions(): UserSettings {
  const ops = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
  return {
    autoFormation: ops.autoFormation ?? false,
  };
}

/** this function set the given option and sync it with the local storage so it can be recovered */
export function setAutoOptions(ops: Partial<UserSettings>) {
  for (const k in ops) {
    appState.userSettings[k as keyof UserSettings] =
      ops[k as keyof UserSettings]!;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(appState.userSettings));
}
