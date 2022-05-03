import { Player, PositionArea } from "../character/player";
import { Team } from "../character/team";
import teams from "../asset/team-names.json";

const START_MONTH = 8; // september
const START_DATE = 1;

// instances of this inferface are saved as JSON on the user machine, this is
// the game save
class GameState {
  date: Date;
  players: { [id: string]: Player };
  teams: { [name: string]: Team };

  constructor(date: Date, players = {}, teams = {}) {
    this.date = date;
    this.players = players;
    this.teams = teams;
  }

  static getTeamPlayers(s: GameState, team: string): Player[] {
    return s.teams[team]?.playerIds.map((id) => s.players[id]) ?? [];
  }
}

interface GameStateObserver {
  gameStateUpdated: () => void;
}

class GameStateHandle {
  private observers: Set<GameStateObserver> = new Set();
  private _state: GameState;

  constructor(state: GameState) {
    this._state = structuredClone(state);
  }

  // the gameState returned is a deep copy
  get state(): GameState {
    return structuredClone(this._state);
  }

  // the saved gameState is a copy of updated
  set state(updated: GameState) {
    this._state = structuredClone(updated);
    this.notifyObservers();
  }

  // if an object depended on the GameState should add itself as an observer
  // every GameStateObserver will be notified when the gameState change
  addObserver(ob: GameStateObserver): void {
    this.observers.add(ob);
  }

  removeObserver(ob: GameStateObserver): void {
    this.observers.delete(ob);
  }

  private notifyObservers(): void {
    this.observers.forEach((ob) => ob.gameStateUpdated());
  }

  // get the gamseState as a json url
  getStateAsJsonUrl(): string {
    return URL.createObjectURL(
      new Blob([JSON.stringify(this._state)], { type: "application/json" })
    );
  }
}

// create n new players at the given position area and add to the given gameState
// returns the players created
function initPlayers(s: GameState, at: PositionArea, n: number): Player[] {
  return Array.from({ length: n }, () => {
    const p = Player.createPlayerAt(s.date, at);
    s.players[p.id] = p;
    return p;
  });
}

// create new teams with the given names fill them with some new created players
// add everything to the given gameState and returns created teams
function initTeams(s: GameState, names: string[]): Team[] {
  return names.map((name) => {
    const team = (s.teams[name] = new Team(name));
    Team.pickPlayers(team, initPlayers(s, "goolkeeper", 4), 3);
    Team.pickPlayers(team, initPlayers(s, "defender", 10), 8);
    Team.pickPlayers(team, initPlayers(s, "midfielder", 10), 8);
    Team.pickPlayers(team, initPlayers(s, "forward", 8), 6);
    return team;
  });
}

// init a new game state filling it with players, team and all the necessary for a new game
function initGameState(): GameState {
  const state = new GameState(
    new Date(new Date().getFullYear(), START_MONTH, START_DATE)
  );
  initTeams(state, teams.eng.names); // TODO: select the location
  return state;
}

export {
  GameState,
  GameStateObserver,
  GameStateHandle,
  initPlayers,
  initTeams,
  initGameState,
};
