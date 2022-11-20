import "../mock/broadcast-channel.mock";
import "../../src/game-sim/sim-worker-interface";
import "../../src/pages/util/router";
import * as _trd from "../../src/game-sim/trade";
import {
  canTrade,
  getPlayerRating,
  getPlayerRatingSymbol,
  improvabilityRatingSymbol,
  tradeOfferIsStillValid,
} from "../../src/character/user";
import * as _gs from "../../src/game-state/game-state";
import { MAX_GROWTH_RATE, Player } from "../../src/character/player";
import { Team } from "../../src/character/team";
jest.mock("../../src/pages/util/router");
jest.mock("../../src/game-sim/sim-worker-interface");
jest.mock("../../src/game-sim/trade");

(_trd.tradeRequirements as jest.Mock) = jest.fn(() => ({ ok: true }));
const mockTradeRequirements = _trd.tradeRequirements as jest.Mock;
(_trd.acceptable as jest.Mock) = jest.fn();
const mockTradeAcceptable = _trd.acceptable as jest.Mock;

Player.getScore = jest.fn();
const mockPlrGetScore = Player.getScore as jest.Mock;
Team.estimateGrowthRate = jest.fn();
const mockEstimateGrowthRate = Team.estimateGrowthRate as jest.Mock;

describe("improvabilityRatingSymbol()", () => {
  const gs = new _gs.GameState(new Date("2000-10-10"));
  const p = new Player("am", gs.date);
  const t = new Team("a");

  test("should return C when a player growth rate is half MAX_GROWTH_RATE", () => {
    mockEstimateGrowthRate.mockImplementation(() => MAX_GROWTH_RATE / 2);
    expect(improvabilityRatingSymbol(p, t)).toBe("C");
  });

  test("should return A+ when a player growth rate is MAX_GROWTH_RATE", () => {
    mockEstimateGrowthRate.mockImplementation(() => MAX_GROWTH_RATE);
    expect(improvabilityRatingSymbol(p, t)).toBe("A+");
  });

  test("should return F when a player growth rate is 0", () => {
    mockEstimateGrowthRate.mockImplementation(() => 0);
    expect(improvabilityRatingSymbol(p, t)).toBe("F");
  });
});

describe("getPlayerRating()", () => {
  const gs = new _gs.GameState(new Date("2000-10-10"));
  const mean = 60;
  const stdDev = 5;
  gs.popStats.meanScore = mean;
  gs.popStats.standardDev = stdDev;
  const p = new Player("am", gs.date);

  test("should not exceed 0 or 1", () => {
    mockPlrGetScore.mockImplementation(() => mean + 4 * stdDev);
    expect(getPlayerRating(p, gs)).toBeLessThanOrEqual(1);
    mockPlrGetScore.mockImplementation(() => mean - 4 * stdDev);
    expect(getPlayerRating(p, gs)).toBeGreaterThanOrEqual(0);
  });

  test("should return around 0.667 when a player is one Standard deviation higher than the mean", () => {
    mockPlrGetScore.mockImplementation(() => mean + 1 * stdDev);
    expect(getPlayerRating(p, gs)).toBeCloseTo(0.667);
  });
});

describe("getPlayerRatingSymbol()", () => {
  const gs = new _gs.GameState(new Date("2000-10-10"));
  const mean = 60;
  const stdDev = 5;
  gs.popStats.meanScore = mean;
  gs.popStats.standardDev = stdDev;
  const p = new Player("am", gs.date);

  test("should return C when a player on the mean", () => {
    mockPlrGetScore.mockImplementation(() => gs.popStats.meanScore);
    expect(getPlayerRatingSymbol(p, gs)).toBe("C");
  });

  test("should return A+ when a player is 3 Standard deviation higher than the mean", () => {
    mockPlrGetScore.mockImplementation(() => mean + 3 * stdDev);
    expect(getPlayerRatingSymbol(p, gs)).toBe("A+");
  });

  test("should return F when a player is 3 Standard deviation lower than the mean", () => {
    mockPlrGetScore.mockImplementation(() => mean - 3 * stdDev);
    expect(getPlayerRatingSymbol(p, gs)).toBe("F");
  });

  test("should return F when a player is over 3 Standard deviation lower than the mean", () => {
    mockPlrGetScore.mockImplementation(() => mean - 4 * stdDev);
    expect(getPlayerRatingSymbol(p, gs)).toBe("F");
  });

  test("should return A+ when a player is over 3 Standard deviation higher than the mean", () => {
    mockPlrGetScore.mockImplementation(() => mean + 4 * stdDev);
    expect(getPlayerRatingSymbol(p, gs)).toBe("A+");
  });
});

describe("tradeOfferIsStillValid()", () => {
  const gs = _gs.GameState.init(["a", "b"]);
  gs.tradeOffers.push({
    when: "",
    sides: [
      { team: "a", plIds: gs.teams.a.playerIds.slice(0, 3) },
      { team: "b", plIds: gs.teams.b.playerIds.slice(0, 3) },
    ],
  });
  gs.flags.openTradeWindow = true;

  test("when the player are still available should return true", () => {
    const mockGs = _gs.GameState.parse(JSON.stringify(gs));
    (window.$game as any) = { state: mockGs };
    expect(tradeOfferIsStillValid(mockGs, mockGs.tradeOffers[0])).toBe(true);
  });

  test("when the player aren't available should return false", () => {
    const mockGs = _gs.GameState.parse(JSON.stringify(gs));
    mockGs.teams.a.playerIds = [];
    (window.$game as any) = { state: mockGs };
    expect(tradeOfferIsStillValid(mockGs, mockGs.tradeOffers[0])).toBe(false);
  });
});

describe("canTrade()", () => {
  const gs = _gs.GameState.init(["a", "b"]);
  gs.userTeam = "a";
  const user = gs.teams.a;
  const other = gs.teams.b;
  const get = gs.teams.b.playerIds.slice(0, 3).map((id) => gs.players[id]);
  const give = gs.teams.a.playerIds.slice(0, 3).map((id) => gs.players[id]);
  gs.flags.openTradeWindow = true;

  describe("when the user team fail the trade requirements should return false", () => {
    mockTradeRequirements.mockImplementation(({ t }) => ({ ok: t !== user }));
    (window.$game as any) = { state: gs };
    expect(canTrade(other, get, give).ok).toBe(false);
  });

  describe("when the other team fail the trade requirements should return false", () => {
    mockTradeRequirements.mockImplementation(({ t }) => ({ ok: t === user }));
    (window.$game as any) = { state: gs };
    expect(canTrade(other, get, give).ok).toBe(false);
  });

  describe("when the other team doesn't accept the offer should return false", () => {
    mockTradeRequirements.mockImplementation(() => ({ ok: true }));
    mockTradeAcceptable.mockImplementation(() => false);
    (window.$game as any) = { state: gs };
    expect(canTrade(other, get, give).ok).toBe(false);
  });

  describe("when the requirements are fine and the other team accept the offer should return true", () => {
    mockTradeRequirements.mockImplementation(() => ({ ok: true }));
    mockTradeAcceptable.mockImplementation(() => true);
    (window.$game as any) = { state: gs };
    expect(canTrade(other, get, give).ok).toBe(true);
  });
});
