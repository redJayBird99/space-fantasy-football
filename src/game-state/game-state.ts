import { Player, PositionArea } from "../character/player";
import { Team, Contract } from "../character/team";
import teams from "../asset/team-names.json";

const START_MONTH = 8; // september
const START_DATE = 1;

// instances of this inferface are saved as JSON on the user machine, this is
// the game save
class GameState {
  date: Date;
  players: { [id: string]: Player };
  teams: { [name: string]: Team };
  contracts: { [id: string]: Contract };

  constructor(date: Date, players = {}, teams = {}, contracts = {}) {
    this.date = date;
    this.players = players;
    this.teams = teams;
    this.contracts = contracts;
  }

  // get all team players or an empty array when the then doesn't exist
  static getTeamPlayers(s: GameState, team: string): Player[] {
    return s.teams[team]?.playerIds.map((id) => s.players[id]) ?? [];
  }

  static saveContract(s: GameState, c: Contract): void {
    s.contracts[c.playerId] = c;
  }

  static deleteContract(s: GameState, c: Contract): void {
    delete s.contracts[c.playerId];
  }

  static getContract(s: GameState, p: Player): Contract | void {
    return s.contracts[p.id];
  }

  static savePlayer(s: GameState, p: Player): void {
    s.players[p.id] = p;
  }

  static saveTeam(s: GameState, t: Team): void {
    s.teams[t.name] = t;
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
    GameState.savePlayer(s, p);
    return p;
  });
}

// creates new contracts for the given players and save every contracts to the
// given gameState, the min contrat duration is 1 max 5
function initContracts(s: GameState, plrs: Player[], t: Team): void {
  const contractDuration = () => Math.floor(Math.random() * 5) + 1;
  plrs.forEach((p) =>
    GameState.saveContract(s, {
      teamName: t.name,
      playerId: p.id,
      wage: Player.wantedWage(p),
      duration: contractDuration(),
    })
  );
}

// create new teams with the given names fill them with some new created players
// add everything to the given gameState and returns created teams
function initTeams(s: GameState, names: string[]): Team[] {
  return names.map((name) => {
    const team = new Team(name);
    GameState.saveTeam(s, team);

    const gks = initPlayers(s, "goolkeeper", 4);
    const defs = initPlayers(s, "defender", 10);
    const mdfs = initPlayers(s, "midfielder", 10);
    const fwrs = initPlayers(s, "forward", 8);
    initContracts(s, Team.pickPlayers(team, gks, 3), team);
    initContracts(s, Team.pickPlayers(team, defs, 8), team);
    initContracts(s, Team.pickPlayers(team, mdfs, 8), team);
    initContracts(s, Team.pickPlayers(team, fwrs, 6), team);

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
  initContracts,
};
