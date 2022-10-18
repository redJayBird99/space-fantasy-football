import { MAX_GROWTH_RATE, Player } from "../character/player";
import { endSimOnEvent } from "../game-sim/game-simulation";
import { GameState } from "../game-state/game-state";

// some util scripts for testing (and cheating)
export default {
  endSimOnEvent,
  GameState,
  findPlrBy: (key: any, val: any) => {
    return Object.values(window.$game.state?.players ?? {}).filter(
      // @ts-ignore
      (p) => p[key] === val
    );
  },
  getImprovabilityRating(p: Player): number {
    return p.growthRate / MAX_GROWTH_RATE;
  },
};