import { Formation, Formations, FORMATIONS, Spot } from "./formation";
import { Player, Position } from "./player";

/** pick the best fitting player at a position and cache the score answer */
class PlayersPicker {
  private pls: Player[];
  private cacheScores: Map<Player, Map<Position, number>>; // prevent the score recalculation
  // caching the best player for the given position instead doesn't give a boost

  constructor(players: Player[]) {
    this.pls = players;
    this.cacheScores = new Map(players.map((p) => [p, new Map()]));
  }

  /** get the player score for the given position and cache the answer */
  private getScore(p: Player, pos: Position): number {
    if (!this.cacheScores.get(p)?.has(pos)) {
      this.cacheScores.get(p)?.set(pos, Player.getScore(p, pos));
    }

    return this.cacheScores.get(p)!.get(pos)!;
  }

  /**
   * try to pick the best player for the given position
   * @param picked the players in this set can't be picked
   * @param p the wanted position
   * @param strict when true only player in their natural position can be picked
   */
  pickBest(picked: Set<Player>, p: Position, strict = true): Player | void {
    let bestScore = 0;
    let bestPlayer: Player | undefined;

    for (const player of this.pls) {
      if (!picked.has(player) && (!strict || player.position === p)) {
        const curScore = this.getScore(player, p);

        if (bestScore < curScore) {
          bestPlayer = player;
          bestScore = curScore;
        }
      }
    }

    return bestPlayer;
  }
}

interface LineupState {
  key: Formations;
  picked: Set<Player>; // players already in some spot
  lineup: Map<Spot, Player>;
  score: number; // the lineup score higher is better
}

/**
 * try to fill the lineup only with players in their natural position
 * @param key of the lineup to fill
 */
function strictFill(key: Formations, pkr: PlayersPicker): LineupState {
  const st = {
    key,
    picked: new Set<Player>(),
    lineup: new Map<Spot, Player>(),
    score: 0,
  };

  for (const spot of FORMATIONS[key]) {
    const player = pkr.pickBest(st.picked, spot.pos);

    if (player) {
      st.lineup.set(spot, player);
      st.picked.add(player);
    }
  }

  st.score = lineupScore(st.lineup);
  return st;
}

/**
 * try to fill all lineup spots with best fitting player no matter the player position,
 * the score LineupState property isn't important, it will get recalculated anyway
 * @param st get mutated
 * @param pkr
 */
function fillLineup(st: LineupState, pkr: PlayersPicker): LineupState {
  const strictFilled: Spot[] = [];
  const missing: Spot[] = [];

  for (const s of FORMATIONS[st.key]) {
    st.lineup.has(s) ? strictFilled.push(s) : missing.push(s);
  }

  // fill only the missing spots with the best available player per spot
  for (const spot of missing) {
    const best = pkr.pickBest(st.picked, spot.pos, false);

    if (best) {
      st.lineup.set(spot, best);
      st.picked.add(best);
    }
  }

  // recheck all the strictly positioned players if they can be substituted by a better available player
  for (const spot of strictFilled) {
    const sub = pkr.pickBest(st.picked, spot.pos, false);
    const pl = st.lineup.get(spot)!;

    if (sub && Player.getScore(pl, spot.pos) < Player.getScore(sub, spot.pos)) {
      st.lineup.set(spot, sub);
      st.picked.add(sub);
      st.picked.delete(pl);
    }
  }

  st.score = lineupScore(st.lineup);
  return st;
}

/** get the score sum of the player in the lineup considering out of position penalty */
function lineupScore(lineup: Map<Spot, Player>): number {
  let score = 0;

  for (const [spot, player] of lineup) {
    score += Player.getScore(player, spot.pos);
  }

  return score;
}

// this is the https://en.wikipedia.org/wiki/Maximum_weight_matching problem (for each lineup)
// there is a well know solution https://en.wikipedia.org/wiki/Blossom_algorithm
// but it runs in time O(e*v^2), there is some good approximation algorithms but
// considering we need a solution for each formation, we can use something else.
//
// this algorithm it based on the assumption that more players at their natural
// position can return an higher lineup score, it seams to work well in practice,
// getting close to the optimum solution
// (I think it is an heuristic algorithm, I am not sure about the terminology)
// the run time should be: formations * players * positions * posScores (and you must call it for each teams too)
/**
 * try to select the best matching formation and lineup for the given players, pairing each
 * player with a spot
 *
 * note: this function is slow, it is unnecessary for a single substitution
 * @param pls at least 11 for a complete lineup
 */
function findFormation(pls: Player[]): LineupState {
  let sols: LineupState[] = [];
  const pkr = new PlayersPicker(pls);

  for (const lineup in FORMATIONS) {
    // as assumed before we start selecting only player in their natural position
    sols.push(strictFill(lineup as Formations, pkr));
  }

  // here we apply the assumption described before, only the 3 most promising lineups are considered
  sols = sols.sort((a, b) => b.score - a.score);
  sols.length = 3;
  sols.forEach((st) => fillLineup(st, pkr));
  return sols.reduce((ac, l) => (ac.score >= l.score ? ac : l));
}

/** convert the given LineupState to a Formation  */
function toFormation(st: LineupState): Formation {
  const lineup: { pl: Player; sp: Spot }[] = [];

  for (const [sp, pl] of st.lineup) {
    lineup.push({ sp, pl });
  }

  return { name: st.key, lineup };
}

/**
 * get a good fitting formation for the given players, trying to find the best lineup.
 * note: this function is slow, it is unnecessary for a single substitution or
 * when a Formation was already picked (consider fillFormation)
 * @param players at least 11 for a complete lineup
 */
export function getFormation(pls: Player[]): Formation {
  return toFormation(findFormation(pls));
}

/** try to fill the best lineup for the given players and formation. */
export function fillFormation(pls: Player[], frm: Formations): Formation {
  const pkr = new PlayersPicker(pls);
  return toFormation(fillLineup(strictFill(frm, pkr), pkr));
}

export namespace exportedTypesForTesting {
  export type TLineupState = LineupState;
}

export const exportedForTesting = {
  PlayersPicker,
  strictFill,
  fillLineup,
  findFormation,
};
