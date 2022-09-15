import * as _p from "./player";
import * as _gs from "../game-state/game-state";
import * as _t from "./team";

const GOOD_STAT = 75;
const BAD_STAT = 35;
const areas = Object.keys(_p.positionArea) as _p.PositionArea[];

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

/** keep track of the sorting position */
export class SorterBy {
  ascending = false;
  lastSortBy: unknown;

  /**
   * it sets lastSortBy to by and updates ascending to false by default but when
   * by is the same of lastSortBy toggle to the opposite
   * @returns ascending after an update
   */
  ascendingly(by: unknown): boolean {
    this.ascending = !this.ascending && this.lastSortBy === by;
    this.lastSortBy = by;
    return this.ascending;
  }
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

export function sortByAge(pls: _p.Player[], ascending: boolean): void {
  pls.sort((p1, p2) =>
    ascending
      ? new Date(p2.birthday).getTime() - new Date(p1.birthday).getTime()
      : new Date(p1.birthday).getTime() - new Date(p2.birthday).getTime()
  );
}

/**
 * it sorts the given players according the preferred player key and direction
 * NOTE: it doesn't sort for skills, growthRate and growthState keys
 */
export function sortByInfo(
  k: keyof _p.Player,
  pls: _p.Player[],
  ascending: boolean
) {
  if (k === "birthday") {
    sortByAge(pls, ascending);
  } else if (k === "position") {
    sortByPosition(pls, ascending);
  } else if (k !== "skills" && k !== "growthRate" && k !== "growthState") {
    pls.sort((p1, p2) =>
      ascending ? p1[k].localeCompare(p2[k]) : p2[k].localeCompare(p1[k])
    );
  }
}

const posOrder: Record<_p.Position, number> = {
  gk: 1,
  cb: 2,
  lb: 3,
  rb: 4,
  cm: 5,
  dm: 6,
  lm: 7,
  rm: 8,
  am: 9,
  rw: 10,
  lw: 11,
  cf: 12,
};

export function sortByPosition(pls: _p.Player[], ascending: boolean): void {
  pls.sort((p1, p2) =>
    ascending
      ? posOrder[p1.position] - posOrder[p2.position]
      : posOrder[p2.position] - posOrder[p1.position]
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
