import { GameState } from "../game-state/game-state";
import { Player, Position } from "./player";

/** the player spot in a formation */
export type Spot = Readonly<{ pos: Position; row: number; col: number }>;
type Lineup = readonly Spot[];
export type Side = "home" | "away";
export const ROWS = 7; // lineup rows
export const COLUMNS = 13; // lineup Columns

/**          Visual description of the lineups spots home side
     0    1    2    3    4    5    6    7    8    9   10   11   12
  | r0 |    | C0 | C1 | c2 |    | c3 |    | c4 | c5 | c6 |    | l0 |  0
  |    |    |    |    |    |    |    |    |    |    |    |    |    |  1
  |    |    |    |    | d0 |    | d1 |    | d2 |    |    |    |    |  2
  | r1 |    | m0 | m1 | m2 |    | m3 |    | m4 | m5 | m6 |    | l1 |  3
  |    |    | a0 | a1 | a2 |    | a3 |    | a4 | a5 | a6 |    |    |  4
  |    |    |    |    |    |    |    |    |    |    |    |    |    |  5
  | r2 |    | w0 |    | f0 |    | f1 |    | f2 |    | w1 |    | l2 |  6
*/
const GK: Spot = { pos: "gk", row: -1, col: -1 }; // th GK should be treated specially
const C0: Spot = { pos: "cb", row: 0, col: 2 };
const C1: Spot = { pos: "cb", row: 0, col: 3 };
const C2: Spot = { pos: "cb", row: 0, col: 4 };
const C3: Spot = { pos: "cb", row: 0, col: 6 };
const C4: Spot = { pos: "cb", row: 0, col: 8 };
const C5: Spot = { pos: "cb", row: 0, col: 9 };
const C6: Spot = { pos: "cb", row: 0, col: 10 };
const R0: Spot = { pos: "rb", row: 0, col: 0 };
const L0: Spot = { pos: "lb", row: 0, col: 12 };
const D0: Spot = { pos: "dm", row: 2, col: 4 };
const D1: Spot = { pos: "dm", row: 2, col: 6 };
const D2: Spot = { pos: "dm", row: 2, col: 8 };
const M0: Spot = { pos: "cm", row: 3, col: 2 };
const M1: Spot = { pos: "cm", row: 3, col: 3 };
const M2: Spot = { pos: "cm", row: 3, col: 4 };
const M3: Spot = { pos: "cm", row: 3, col: 6 };
const M4: Spot = { pos: "cm", row: 3, col: 8 };
const M5: Spot = { pos: "cm", row: 3, col: 9 };
const M6: Spot = { pos: "cm", row: 3, col: 10 };
const L1: Spot = { pos: "lm", row: 3, col: 12 };
const R1: Spot = { pos: "rm", row: 3, col: 0 };
const A0: Spot = { pos: "am", row: 4, col: 2 };
const A1: Spot = { pos: "am", row: 4, col: 3 };
// const A2: Spot = { pos: "am", row: 4, col: 4 };
const A3: Spot = { pos: "am", row: 4, col: 6 };
// const A4: Spot = { pos: "am", row: 4, col: 8 };
const A5: Spot = { pos: "am", row: 4, col: 9 };
const A6: Spot = { pos: "am", row: 4, col: 10 };
// const R2: Spot = { pos: "rw", row: 5, col: 0 };
// const L2: Spot = { pos: "lw", row: 5, col: 12 };
const W0: Spot = { pos: "rw", row: 6, col: 2 };
const W1: Spot = { pos: "lw", row: 6, col: 10 };
const F0: Spot = { pos: "cf", row: 6, col: 4 };
const F1: Spot = { pos: "cf", row: 6, col: 6 };
const F2: Spot = { pos: "cf", row: 6, col: 8 };

/** these are the basics formations, TODO: but extra ones are possible for the offensive transition */
const FORMATIONS = {
  "3-5-2": [GK, C0, C3, C6, R1, M1, M3, M5, L1, F0, F2] as Lineup,
  "3-5-2(1)": [GK, C0, C3, C6, R1, D0, D2, A3, L1, F0, F2] as Lineup,
  "3-5-2(2)": [GK, C0, C3, C6, R1, D1, M1, M5, L1, F0, F2] as Lineup,
  "3-5-2(3)": [GK, C0, C3, C6, R1, M3, A1, A5, L1, F0, F2] as Lineup,
  "3-5-2(4)": [GK, C0, C3, C6, R1, D1, A1, A5, L1, F0, F2] as Lineup,
  "3-4-3": [GK, C0, C3, C6, R1, M2, M4, L1, W0, F1, W1] as Lineup,
  "3-4-3(1)": [GK, C0, C3, C6, R1, D0, D2, L1, W0, F1, W1] as Lineup,
  "4-3-3": [GK, C2, C4, R0, L0, M0, M3, M6, W0, F1, W1] as Lineup,
  "4-3-3(1)": [GK, C2, C4, R0, L0, M0, D1, M6, W0, F1, W1] as Lineup,
  "4-3-3(2)": [GK, C2, C4, R0, L0, D0, D2, A3, W0, F1, W1] as Lineup,
  "4-3-3(3)": [GK, C2, C4, R0, L0, M3, A0, A6, W0, F1, W1] as Lineup,
  "4-5-1": [GK, C2, C4, R0, L0, M1, M3, M5, R1, L1, F1] as Lineup,
  "4-5-1(1)": [GK, C2, C4, R0, L0, M1, D1, M5, R1, L1, F1] as Lineup,
  "4-5-1(2)": [GK, C2, C4, R0, L0, D0, D2, A3, R1, L1, F1] as Lineup,
  "4-5-1(3)": [GK, C2, C4, R0, L0, D0, D2, A3, A0, A6, F1] as Lineup,
  "4-4-2": [GK, C2, C4, R0, L0, M2, M4, R1, L1, F0, F2] as Lineup,
  "4-4-2(1)": [GK, C2, C4, R0, L0, D0, D2, R1, L1, F0, F2] as Lineup,
  "4-4-2(2)": [GK, C2, C4, R0, L0, D0, D2, A0, A6, F0, F2] as Lineup,
  "4-4-2(3)": [GK, C2, C4, R0, L0, D1, M0, M6, A3, F0, F2] as Lineup,
  "4-4-2(4)": [GK, C2, C4, R0, L0, M2, M4, A0, A6, F0, F2] as Lineup,
  "5-3-2": [GK, C1, C3, C5, R0, L0, M0, M3, M6, F0, F2] as Lineup,
  "5-3-2(1)": [GK, C1, C3, C5, R0, L0, M0, D1, M6, F0, F2] as Lineup,
  "5-3-2(2)": [GK, C1, C3, C5, R0, L0, A0, M3, A6, F0, F2] as Lineup,
  "5-3-2(3)": [GK, C1, C3, C5, R0, L0, D0, D2, A3, F0, F2] as Lineup,
  "5-4-1": [GK, C1, C3, C5, R0, L0, M2, M4, R1, L1, F1] as Lineup,
  "5-4-1(1)": [GK, C1, C3, C5, R0, L0, D1, M0, M6, A3, F1] as Lineup,
  "5-4-1(2)": [GK, C1, C3, C5, R0, L0, D0, D2, R1, L1, F1] as Lineup,
  "5-4-1(3)": [GK, C1, C3, C5, R0, L0, M2, M4, A0, A6, F1] as Lineup,
  "5-4-1(4)": [GK, C1, C3, C5, R0, L0, D0, D2, A0, A6, F1] as Lineup,
} as const;

/**
 * when given the home side return thr equivalent away spot
 * @param sp home spot
 */
export function getAwaySpot(sp: Spot): Spot {
  return { pos: sp.pos, row: ROWS - 1 - sp.row, col: COLUMNS - 1 - sp.col };
}

type Formations = keyof typeof FORMATIONS;

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
   * @param picked the player is in this set can't be picked
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
 * try to fill all lineup spots with best fitting player no matter the player position
 * @param st get mutated
 * @param pkr
 */
function fillLineup(st: LineupState, pkr: PlayersPicker): void {
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

export interface Formation {
  name: Formations;
  lineup: { pl: Player; sp: Spot }[];
}

/**
 * get a good fitting formation for the given players, trying to find the best lineup
 * note: this function is slow, it is unnecessary for a single substitution
 * @param players at least 11 for a complete lineup
 */
export function getFormation(pls: Player[]): Formation {
  const st = findFormation(pls);
  const lineup: { pl: Player; sp: Spot }[] = [];

  for (const [sp, pl] of st.lineup) {
    lineup.push({ sp, pl });
  }

  return { name: st.key, lineup };
}

export namespace exportedTypesForTesting {
  export type TLineupState = LineupState;
}

export const exportedForTesting = {
  FORMATIONS,
  PlayersPicker,
  strictFill,
  fillLineup,
  findFormation,
};
