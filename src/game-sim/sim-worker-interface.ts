import { Formation, Formations } from "../character/formation";
import { Player } from "../character/player";
import { GameState } from "../game-state/game-state";

type FormRes = { team: string; f: Formation };
type FormReq = { team: string; pls: Player[]; f?: Formations };
type ReqFor = { gs: GameState; teams: string[] };
type WorkerReq = {
  type: "getNewFormations" | "getUpdatedFormations";
  reqs: FormReq[];
};

const worker = new Worker("sim-worker.js"); // to offload some heavy tasks

/** ask to the worker to process the given request */
function request(req: WorkerReq): Promise<FormRes[]> {
  return new Promise((resolve) => {
    worker.onmessage = (e) => {
      worker.onmessage = null;
      resolve(e.data);
    };
    worker.postMessage(req);
  });
}

/** get new formations for each given team, trying to find the best lineup. */
export function fetchNewFormations(r: ReqFor): Promise<FormRes[]> {
  return request({ type: "getNewFormations", reqs: toNewFormReqs(r) });
}

/** get updated formations (or new ones if the team doesn't already have a formation)
 * for each given team, trying to find the best lineup. */
export function fetchUpdatedFormations(r: ReqFor): Promise<FormRes[]> {
  return request({ type: "getUpdatedFormations", reqs: toUpdateFormReqs(r) });
}

/** create formation requests with the given type for each given team */
function toFormReqs(r: ReqFor, type: "update" | "new"): FormReq[] {
  return r.teams.map((t) => ({
    team: t,
    pls: GameState.getTeamPlayers(r.gs, t),
    f: type === "update" ? r.gs.teams[t].formation?.name : undefined,
  }));
}

/** create new formation requests for each given team */
function toNewFormReqs(r: ReqFor): FormReq[] {
  return toFormReqs(r, "new");
}

/** create update formation requests for each given team */
function toUpdateFormReqs(r: ReqFor): FormReq[] {
  return toFormReqs(r, "update");
}
