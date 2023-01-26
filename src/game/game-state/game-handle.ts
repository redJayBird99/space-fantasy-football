import { onStateUpdate, setNewFormations } from "../game-sim/game-simulation";
import { GameState, init as gsInit } from "./game-state";
import { sendSyncUpdatedGame } from "./game-sync";
import * as db from "./game-db";

interface GameStateObserver {
  gameStateUpdated: (gs: Readonly<GameState> | undefined) => void;
}

export class GameStateHandle {
  /** HTMLElement observers mostly, it could be cleared,
   * add another one for more persistent observers if needed */
  private observers: Set<GameStateObserver> = new Set();
  private _state?: GameState;
  private updateScheduled = false;

  get state(): Readonly<GameState> | undefined {
    return this._state;
  }

  /** it will notify every observer of the change */
  set state(updated: GameState | undefined) {
    const init = !this._state;
    this._state = updated;
    this._state && onStateUpdate(this._state); // to check the user activity
    this.onUpdate();

    if (!init) {
      this.sendState();
    }
  }

  /** send the state to the other open tabs */
  private sendState(): void {
    this.state && sendSyncUpdatedGame(this.state);
  }

  /**
   * every time the gs get modified call this method to notify every observer,
   * it batches multiple calls during the same cycle triggers only one call,
   * performed asynchronously at microtask timing.
   */
  private onUpdate(): void {
    if (!this.updateScheduled) {
      this.updateScheduled = true;
      queueMicrotask(() => {
        this.notifyObservers();
        this.updateScheduled = false;
      });
    }
  }

  /** mostly for HTMLElement observers, it could be cleared, every
   * GameStateObserver will be notified when the gameState change */
  addObserver(ob: GameStateObserver): void {
    this.observers.add(ob);
  }

  removeObserver(ob: GameStateObserver): void {
    this.observers.delete(ob);
  }

  clearObservers = () => this.observers.clear();

  private notifyObservers(): void {
    this.observers.forEach((ob) => ob.gameStateUpdated(this._state));
  }

  /** get the current gameState without not essential data as a json url,
   * the resource must be revoked when not used */
  getStateAsJsonUrl(): string {
    return URL.createObjectURL(
      new Blob([this.getJSONSave()], {
        type: "application/json",
      })
    );
  }

  /** get the current game state as a JSON to be saved on the local machine,
   * the returned JSON doesn't contain some not essential data from the game state
   * (like formations expect the userTeam one)
   */
  private getJSONSave(): string {
    const gs = this._state;

    function remover(this: any, k: string, v: unknown) {
      return k === "formation" && gs?.userTeam !== this.name ? undefined : v;
    }

    return JSON.stringify(gs, remover);
  }

  /** init a new gameSate and try to save it on the db */
  newGame(userTeam?: string, gameName?: string): void {
    this.state = gsInit(
      undefined,
      userTeam,
      gameName,
      () => (this.state = this._state) // just to notify everyone
    );
    this.saveNewGSOnDB(); // saving the complete game state is not needed
  }

  /** load the given the gameState, any similar named game on the db will be overridden */
  loadGameFrom(gs: GameState): void {
    this._state = gs;
    this.saveNewGSOnDB();
    // we need to set the formation because they don't get saved in a json file except for the user
    setNewFormations(
      this._state,
      !window.$appState.userSettings.autoFormation
    ).then(() => (this.state = this._state)); // set just to notify everyone
  }

  /** try to save the current gameState as a new entry on the db, if a game name is provided */
  private saveNewGSOnDB(): void {
    if (this._state?.name) {
      db.openNewGame(this._state);
    }
  }

  /** try to save the current gameState on the current db, if a game name is provided */
  saveGsOnDB(onSaved?: () => unknown): void {
    if (this._state?.name) {
      db.saveGame(this._state, onSaved);
    } else {
      onSaved?.();
    }
  }

  /**
   * try to load a saved game from the local machine database
   * @param name of the saved game
   * @param onLoad called after the save was successfully loaded
   * @param onErr called after an unsuccessful attempt
   */
  loadGameFromDB(name: string, onLoad: () => unknown, onErr: () => unknown) {
    db.openGame(
      name,
      (s: GameState) => {
        this.state = s;
        onLoad();
        // we don't know if the formations were saved except for the user, set to notify
        setNewFormations(
          this.state,
          !window.$appState.userSettings.autoFormation
        ).then(() => (this.state = this._state));
      },
      onErr
    );
  }

  /**
   * delete the game with the given name (from the db too)
   * @param onDel called after the deletion
   */
  deleteGame(name: string, onDel: () => unknown): void {
    if (this._state?.name === name) {
      delete this._state;
    }

    if (db.getSavesNames().includes(name)) {
      db.deleteGame(name, onDel);
    } else {
      // in case the user is not using the db
      onDel();
    }
  }

  /** when a game in another tab get updated, this will handles the synchronization when needed */
  onSyncGameUpdate(gs: GameState): void {
    if (gs.name === this._state?.name) {
      this._state = gs; // set _state directly otherwise would call sendSyncUpdatedGame again
      this.notifyObservers();
    }
  }
}
