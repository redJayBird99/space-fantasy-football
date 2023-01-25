import "../../../src/game/game-sim/sim-worker-interface";
import "../../mock/broadcast-channel.mock";
import "../../../src/pages/util/router";
import { GameStateHandle } from "../../../src/game/game-state/game-handle";
import { GameState } from "../../../src/game/game-state/game-state";
jest.mock("../../../src/pages/util/router");
jest.mock("../../../src/game/game-sim/sim-worker-interface");

const rdmYear = 1990 + Math.floor(Math.random() * 35);
const startD = new Date(rdmYear, 6, 6);

describe("GameStateHandle", () => {
  const st: GameState = new GameState(startD);
  const mockFn = jest.fn();
  const gameStateUpdated = () => mockFn();
  beforeEach(() => mockFn.mockReset());

  test("when the a state change should notify the observers", () => {
    return new Promise<any>((resolve) => {
      const gh = new GameStateHandle();
      mockFn.mockImplementation(() => resolve(mockFn));
      const obs = { gameStateUpdated };
      gh.addObserver(obs);
      gh.state = st;
    }).then((mk) => expect(mk.mock.calls.length).toBe(1));
  });

  test("when the a state change should not notify removed observers", () => {
    return new Promise<any>((resolve) => {
      const gh = new GameStateHandle();
      mockFn.mockImplementation(() => resolve(mockFn));
      const obs = { gameStateUpdated };
      const obs2 = { gameStateUpdated };
      gh.addObserver(obs);
      gh.addObserver(obs2);
      gh.removeObserver(obs2);
      gh.state = st;
    }).then((mk) => expect(mk.mock.calls.length).toBe(1));
  });

  test(".gameStateUpdated() should be called with the updated state", () => {
    return new Promise<GameState>((resolve) => {
      const gh = new GameStateHandle();
      const obs = {
        gameStateUpdated: (gs?: GameState) => resolve(gs!),
      };
      gh.addObserver(obs);
      gh.state = JSON.parse(JSON.stringify(st));
    }).then((gs) => expect(gs).not.toBe(st));
  });
});
