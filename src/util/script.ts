import { getScore, MAX_GROWTH_RATE, Player } from "../game/character/player";
import { endSimOnEvent } from "../game/game-sim/game-simulation";
import { GameState } from "../game/game-state/game-state";

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
  getScore(team: string) {
    const gs = window.$game.state!;
    const l = gs.teams[team].formation?.lineup!;
    return l.reduce((a, s) => a + getScore(gs.players[s.plID!], s.sp.pos), 0);
  },
};
