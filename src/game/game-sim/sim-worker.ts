import { Formation, Formations } from "../character/formation";
import { fillFormation, getFormation } from "../character/formation-finder";
import { type Player } from "../character/player";

type FormRes = { team: string; f: Formation };
type FormReq = { team: string; pls: Player[]; f?: Formations };

onmessage = (e) => {
  if (e.data.type === "getNewFormations") {
    postMessage(getNewFormations(e.data.reqs));
  } else if (e.data.type === "getUpdatedFormations") {
    postMessage(getUpdatedFormations(e.data.reqs));
  }
};

function getNewFormations(reqs: FormReq[]): FormRes[] {
  return reqs.map((req) => ({ team: req.team, f: getFormation(req.pls) }));
}

/** try to update the formation of the request, if the req doesn't have a formation field it will find a new one */
function getUpdatedFormations(reqs: FormReq[]): FormRes[] {
  return reqs.map((req) => {
    return {
      team: req.team,
      f: req.f ? fillFormation(req.pls, req.f) : getFormation(req.pls),
    };
  });
}
