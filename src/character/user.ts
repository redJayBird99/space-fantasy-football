// a series of utils for the user interaction with the games
import { GameState } from "../game-state/game-state";
import { hash } from "../util/generator";
import { within } from "../util/math";
import { Player, getImprovabilityRating } from "./player";

/**
 * estimate the player improvability rating according the user team scouting
 * @returs a value between 0 and 10
 */
export function getImprovability(p: Player, gs: GameState): number {
  const uTeam = gs.teams[gs.userTeam];
  // the hash it used to get a deterministic value for each player and team without storing anything extra
  const h = (hash(p.id + uTeam.name, 200) - 100) / 100;
  return within(
    Math.round(
      getImprovabilityRating(p.growthRate) + h * 20 * uTeam.scoutOffset
    ),
    0,
    10
  );
}
