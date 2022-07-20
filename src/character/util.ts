import * as _p from "./player";
import * as _gs from "../game-state/game-state";
import * as _t from "./team";

const GOOD_STAT = 70;
const BAD_STAT = 40;
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

export {
  GOOD_STAT,
  BAD_STAT,
  createPlayers,
  rdmArea,
  rdmPlayers,
  setSkillsTo,
  getContracts,
};
