import * as _p from "./player";
import * as _gs from "../game-state/game-state";
import * as _t from "./team";
import { estimateImprovabilityRating, getPlayerRating } from "./user";

const GOOD_STAT = 75;
const BAD_STAT = 35;
const areas = Object.keys(_p.POSITION_AREA) as _p.PositionArea[];

// not used at the moment
/** find the best player from pls at the given pos */
export function bestAtPos(
  pls: Iterable<_p.Player>,
  pos: _p.Position
): _p.Player | void {
  let bestScore = 0;
  let bestPlayer: _p.Player | undefined;

  for (const player of pls) {
    const pScore = _p.Player.getScore(player, pos);

    if (bestScore < pScore) {
      bestPlayer = player;
      bestScore = pScore;
    }
  }

  return bestPlayer;
}

function createPlayers(a: _p.PositionArea, n: number): _p.Player[] {
  return Array.from({ length: n }, () =>
    _p.Player.createPlayerAt(new Date(), a)
  );
}

function rdmArea(): _p.PositionArea {
  return areas[Math.floor(Math.random() * areas.length)];
}

function rdmPlayers(n: number) {
  return Array.from({ length: n }, () =>
    _p.Player.createPlayerAt(new Date(), rdmArea())
  );
}

/**
 * set all skills of the players to the given value
 */
function setSkillsTo(p: _p.Player, v: number): void {
  Object.keys(p.skills).forEach((k) => (p.skills[k as _p.Skill] = v));
}

function getContracts(st: _gs.GameState, team: _t.Team): _t.Contract[] {
  return _gs.GameState.getTeamPlayers(st, team.name).map(
    (p) => _gs.GameState.getContract(st, p)!
  );
}

/** keep track of the sorting position, by is the key and ascending the orientation */
export type Sort = { ascending: boolean; by: unknown };

/**
 * it sets sort.by to by and updates ascending to false by default but when
 * by is the same of sort.by toggle to the opposite
 * @returns the ascending value after an update
 */
export function updateSort(s: Sort, by: unknown): boolean {
  s.ascending = !s.ascending && s.by === by;
  s.by = by;
  return s.ascending;
}

export function sortBySkill(
  s: _p.Skill,
  pls: _p.Player[],
  ascending: boolean
): void {
  pls.sort((p1, p2) =>
    ascending
      ? _p.Player.getSkill(p1, s) - _p.Player.getSkill(p2, s)
      : _p.Player.getSkill(p2, s) - _p.Player.getSkill(p1, s)
  );
}

export function sortByMacroSkill(
  m: _p.MacroSkill,
  pls: _p.Player[],
  ascending: boolean
) {
  pls.sort((p1, p2) =>
    ascending
      ? _p.Player.getMacroSkill(p1, m) - _p.Player.getMacroSkill(p2, m)
      : _p.Player.getMacroSkill(p2, m) - _p.Player.getMacroSkill(p1, m)
  );
}

export function sortByAge(pls: _p.Player[], ascending: boolean): void {
  pls.sort((p1, p2) =>
    ascending
      ? new Date(p2.birthday).getTime() - new Date(p1.birthday).getTime()
      : new Date(p1.birthday).getTime() - new Date(p2.birthday).getTime()
  );
}

/**
 * it sorts the given players according the preferred player key and direction
 * NOTE: it doesn't sort for skills, growthRate (but improvability) and growthState keys
 */
export function sortByInfo(
  k: keyof _p.Player | "improvability" | "rating",
  pls: _p.Player[],
  ascending: boolean,
  gs: _gs.GameState
) {
  if (k === "birthday") {
    sortByAge(pls, ascending);
  } else if (k === "position") {
    sortByPosition(pls, ascending);
  } else if (k === "improvability") {
    sortByImprovability(gs.teams[gs.userTeam], pls, ascending);
  } else if (k === "rating") {
    sortByPlayerRating(gs, pls, ascending);
  } else if (k !== "skills" && k !== "growthRate" && k !== "growthState") {
    pls.sort((p1, p2) =>
      ascending ? p1[k].localeCompare(p2[k]) : p2[k].localeCompare(p1[k])
    );
  }
}

/** sort the given players according to the team scouting estimation  */
function sortByImprovability(t: _t.Team, pls: _p.Player[], ascending: boolean) {
  pls.sort((p1, p2) =>
    ascending
      ? estimateImprovabilityRating(p1, t) - estimateImprovabilityRating(p2, t)
      : estimateImprovabilityRating(p2, t) - estimateImprovabilityRating(p1, t)
  );
}

/** sort the given players according to the team scouting estimation  */
function sortByPlayerRating(
  gs: _gs.GameState,
  pls: _p.Player[],
  ascending: boolean
) {
  pls.sort((p1, p2) =>
    ascending
      ? getPlayerRating(p1, gs) - getPlayerRating(p2, gs)
      : getPlayerRating(p2, gs) - getPlayerRating(p1, gs)
  );
}

const posOrder: Record<_p.Position, number> = _p.POSITIONS.reduce((a, p, i) => {
  a[p] = i;
  return a;
}, {} as Record<_p.Position, number>);

export function sortByPosition(pls: _p.Player[], ascending: boolean): void {
  pls.sort((p1, p2) =>
    ascending
      ? posOrder[p1.position] - posOrder[p2.position]
      : posOrder[p2.position] - posOrder[p1.position]
  );
}

/** sort the teams according to the given team property, the properties supported are:
 * appeal
 */
export function sortTeamsBy(
  ts: _t.Team[],
  k: keyof _t.Team,
  ascending = true
): _t.Team[] {
  if (k !== "appeal") {
    return ts;
  }

  return ts.sort((t1, t2) => (ascending ? t1[k] - t2[k] : t2[k] - t1[k]));
}

/** sort the teams according their given finance key  */
export function sortByFinances(
  ts: _t.Team[],
  k: keyof _t.Finances,
  ascending = true
): _t.Team[] {
  return ts.sort((t1, t2) =>
    ascending
      ? t1.finances[k] - t2.finances[k]
      : t2.finances[k] - t1.finances[k]
  );
}

export const exportedForTesting = {
  GOOD_STAT,
  BAD_STAT,
  createPlayers,
  rdmArea,
  rdmPlayers,
  setSkillsTo,
  getContracts,
};
