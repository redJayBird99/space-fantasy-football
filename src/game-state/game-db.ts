import { goTo } from "../pages/util/router";
import { atUrl } from "../util/util";
import { GameState } from "./game-state";

// TODO: testing

/**
 * a IndexedDB where the current game is saved,
 * this db is mostly used as autosave, but the game is still playable without
 * all the games are stored with a prefix
 */
let db: IDBDatabase | undefined;
const SAVES_KEY = "sff-saves"; // for the localStorage where the saves names are stored
const STORE_KEY = "game"; // for the ObjectStore where the gameState is stored
const GAME_STATE_KEY = "state"; // for the gameState stored in the ObjectStore
export type DBState = "on" | "off" | "saved";

interface DBStateObserver {
  updateDBState: (state: DBState) => void;
}

let stateListeners: DBStateObserver[] = [];

/** the observer get notify every time the state of the db change */
export function addDBStateObserver(o: DBStateObserver) {
  stateListeners.push(o);
}

export function removeDBStateObserver(o: DBStateObserver) {
  stateListeners = stateListeners.filter((obs) => o !== obs);
}

/** use this method to set the db so the listeners can be notified */
function setDB(to: IDBDatabase | undefined): void {
  db = to;
  stateListeners.forEach((o) => o.updateDBState(on() ? "on" : "off"));
}

/** add this prefix to every new game save, it prevents conflicts with any other db in the current origin */
export const SAVES_PREFIX = "sff-";

/** get the game name without the prefix */
export function getGameName(gs?: GameState): string {
  return gs?.name.substring(SAVES_PREFIX.length) ?? "save";
}

/** check if the db is available */
export function on(): boolean {
  return !!db; // when we have a reference it means the db is open;
}

/** get all the saved games names on the local machine */
export function getSavesNames(): string[] {
  return JSON.parse(localStorage.getItem(SAVES_KEY) ?? "[]");
}

/** save the saved game name on the local machine  */
export function saveGameName(name: string): void {
  const saves = getSavesNames();
  !saves.includes(name) && saves?.push(name);
  localStorage.setItem(SAVES_KEY, JSON.stringify(saves));
}

/** remove from the local machine the given game save name */
function deleteGameName(name: string): void {
  localStorage.setItem(
    SAVES_KEY,
    JSON.stringify(getSavesNames().filter((s) => s !== name))
  );
}

/** handle the upgradeneeded when opening a db and create a new store for the game save */
function onupgradeneeded(req: IDBOpenDBRequest) {
  req.onupgradeneeded = () => {
    req.result.createObjectStore(STORE_KEY);
  };
}

/**
 * on opening a db save the reference, handle versionchange and close events
 * when the db is opened call the given callback
 */
function onsuccess(req: IDBOpenDBRequest, onOpen?: () => unknown) {
  req.onsuccess = () => {
    setDB(req.result);
    // if another version is opened we just close this game
    req.result.onversionchange = () => {
      req.result.close();
      setDB(undefined);
      !atUrl(window.$PUBLIC_PATH) && goTo(window.$PUBLIC_PATH);
    };

    // it is not fired if the database connection is closed normally
    req.result.onclose = () => {
      setDB(undefined);
    };
    onOpen && onOpen();
  };
}

/** try to open a new db for the given game and save it */
export function openNewGame(gs: GameState) {
  db?.close();
  const req = indexedDB.open(gs.name, 1);
  onupgradeneeded(req);
  onsuccess(req, () => saveGame(gs, () => saveGameName(gs.name)));

  req.onerror = () => {
    // TODO: handle some errors
    // the game is still fully playable but the user must save manually (a file)
    console.warn("the autosave is off, unable to open the browser database");
  };
}

/** try to save the given game on the current open db, when the game is saved call onSaved */
export function saveGame(gs: GameState, onSaved?: () => unknown) {
  const ts = db?.transaction(STORE_KEY, "readwrite");
  ts?.objectStore(STORE_KEY).put(gs, GAME_STATE_KEY);
  ts?.addEventListener("error", () => {}); // TODO: handle
  ts?.addEventListener("complete", () => {
    onSaved?.();
    stateListeners.forEach((o) => o.updateDBState("saved"));
  });
}

/**
 * try to open the game with the given name from the db, when the db is ready
 * it calls the onLoad with the game, when an error occurs it calls onErr
 */
export function openGame(
  name: string,
  onLoad: (s: GameState) => unknown,
  onErr: () => unknown
): void {
  db?.close();
  const req = indexedDB.open(name, 1);
  onupgradeneeded(req);
  onsuccess(req, () => loadGame(onLoad));
  // TODO: try to handle some errors
  req.onerror = onErr;
}

/** try to load the game from the current open db and pass it to onLoad */
function loadGame(onLoad: (s: GameState) => unknown): void {
  const req = db
    ?.transaction(STORE_KEY, "readonly")
    .objectStore(STORE_KEY)
    .get(GAME_STATE_KEY);
  req?.addEventListener("success", () => onLoad(req.result));
  req?.addEventListener("error", () => {
    // TODO: if the game doesn't exist we should warn the user and remove
    // the entry from the localStorage
    alert("sorry the game save doesn't exist");
  });
}

/**
 * try to delete the game with the given name
 * @param onDel called when the game get deleted
 */
export function deleteGame(name: string, onDel: () => unknown): void {
  const r = indexedDB.deleteDatabase(name);
  r.onsuccess = () => {
    deleteGameName(name);
    setDB(undefined);
    onDel();
  };
  r.onerror = () => {}; // TODO
}
