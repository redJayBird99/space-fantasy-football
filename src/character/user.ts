// a series of utils for the user interaction with the games
import { GameState } from "../game-state/game-state";
import { within } from "../util/math";
import { Player, getImprovabilityRating } from "./player";
import { Team } from "./team";

/**
 * estimate the player improvability rating according the user team scouting
 * @Returns a value between 0 and 10
 */
export function getImprovability(p: Player, gs: GameState): number {
  const gRate = Team.estimateGrowthRate(gs.teams[gs.userTeam], p);
  return within(getImprovabilityRating(gRate), 0, 10);
}
