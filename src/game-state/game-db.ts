import { goTo } from "../pages/util/router";
import { GameState } from "./game-state";

// TODO: testing

/**
 * a IndexedDB where the current game is saved,
 * this db is mostly used as autosave, but the game is still playable without
 * all the games are stored with a prefix
 */
let db: IDBDatabase | undefined;
const savesKey = "sff-saves"; // for the localStorage where the saves names are stored
const storeKey = "game"; // for the ObjectStore where the gameState is stored
const gameStateKey = "state"; // for the gameState stored in the ObjectStore

/** check if the db is available */
function on(): boolean {
  return !db; // when we have a reference it means the db is open;
}

/** get all the saved games names on the local machine */
function getSavesNames(): string[] {
  return JSON.parse(localStorage.getItem(savesKey) ?? "[]");
}

/** save the saved game name on the local machine  */
function saveGameName(name: string): void {
  const saves = getSavesNames();
  !saves.includes(name) && saves?.push(name);
  localStorage.setItem(savesKey, JSON.stringify(saves));
}

/** handle the upgradeneeded when opening a db and create a new store for the game save */
function onupgradeneeded(req: IDBOpenDBRequest) {
  req.onupgradeneeded = () => {
    req.result.createObjectStore(storeKey);
  };
}

/**
 * on opening a db save the reference, handle versionchange and close events
 * when the db is opened call the given callback
 */
function onsuccess(req: IDBOpenDBRequest, onOpen?: () => unknown) {
  req.onsuccess = () => {
    db = req.result;
    // if another version is opened we just close this game
    req.result.onversionchange = () => {
      req.result.close();
      goTo(window.$PUBLIC_PATH);
    };

    // it is not fired if the database connection is closed normally
    req.result.onclose = () => {
      db = undefined;
    };
    onOpen && onOpen();
  };
}

/** try to open a new db for the given game and save it */
function openNewGame(gs: GameState) {
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
function saveGame(gs: GameState, onSaved?: () => unknown) {
  const ts = db?.transaction(storeKey, "readwrite");
  ts?.objectStore(storeKey).put(gs, gameStateKey);
  ts?.addEventListener("error", () => {}); // TODO: handle
  ts?.addEventListener("complete", () => onSaved?.());
}

/**
 * try to open the game with the given name from the db, when the db is ready
 * it calls the onLoad with the game, when an error occurs it calls onErr
 */
function openGame(
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
    ?.transaction(storeKey, "readonly")
    .objectStore(storeKey)
    .get(gameStateKey);
  req?.addEventListener("success", () => onLoad(req.result));
  req?.addEventListener("error", () => {
    // TODO: if the game doesn't exist we should warn the user and remove
    // the entry from the localStorage
    alert("sorry the game save doesn't exist");
  });
}

export { on, getSavesNames, openNewGame, saveGame, openGame };
