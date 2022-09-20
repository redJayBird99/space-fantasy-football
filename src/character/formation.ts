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
const GK: Spot = { pos: "gk", row: -1, col: -1 }; // the GK should be treated specially
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

/** these are the basic formations, TODO: but extra ones are possible for the offensive transition */
export const FORMATIONS = {
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

export type Formations = keyof typeof FORMATIONS;

/**
 * when given the home spot side return the equivalent away spot
 * @param sp home spot
 */
export function getAwaySpot(sp: Spot): Spot {
  return { pos: sp.pos, row: ROWS - 1 - sp.row, col: COLUMNS - 1 - sp.col };
}

export interface Formation {
  name: Formations;
  lineup: { pl: Player; sp: Spot }[];
}
