import { Formation } from "../character/formation";
import { getFormation } from "../character/formation-finder";
import { Player } from "../character/player";

type tForms = { [team: string]: Formation };

onmessage = (e) => {
  if (e.data.type === "getFormations") {
    postMessage(getFormations(e.data.teams));
  }
};

function getFormations(teams: { [team: string]: Player[] }): tForms {
  const rst: tForms = {};

  for (const tm in teams) {
    rst[tm] = getFormation(teams[tm]);
  }

  return rst;
}
