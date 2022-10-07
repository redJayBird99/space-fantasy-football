import { render, html, TemplateResult } from "lit-html";
import { Team } from "../../character/team";
import { MacroSkill, MACRO_SKILLS, Player } from "../../character/player";
import style from "./re-sign.css";
import { GameState, SignRequest } from "../../game-state/game-state";

/** show infos about expiring contracts of the user team and re-signing tools */
class ReSign extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    if (this.isConnected) {
      window.$game.addObserver(this);
      this.render();
    }
  }

  gameStateUpdated() {
    this.render();
  }

  disconnectedCallback() {
    window.$game.removeObserver(this);
  }

  render(): void {
    render(
      html`
        <style>
          ${style}
        </style>
        ${expiringPlayers()}
      `,
      this.shadowRoot!
    );
  }
}

/** table the players re-signing request */
function expiringPlayers(): TemplateResult {
  const gs = window.$game.state!;
  const sks = Object.keys(MACRO_SKILLS) as MacroSkill[];

  return html`
    <table>
      <caption>
        <h2>📝 Re-sign:</h2>
      </caption>
      <tr>
        <th>name</th>
        <th class="small-col"><abbr title="position">pos</abbr></th>
        <th class="small-col">age</th>
        ${sks.map(
          (s) =>
            html`<th class="small-col">
              <abbr title=${s}>${s.substring(0, 3)}</abbr>
            </th>`
        )}
        <th class="small-col"><abbr title="seasons">sea</abbr></th>
        <th>wage</th>
        <th>sign</th>
      </tr>
      ${gs.reSigning?.map((r) => expiringPlayer(r, sks))}
    </table>
  `;
}

/** show infos about the given request and the player */
function expiringPlayer(r: SignRequest, sks: MacroSkill[]): TemplateResult {
  const gs = window.$game.state!;
  const p = gs.players[r.plId];
  const frt = new Intl.NumberFormat("en-GB");

  return html`
    <tr>
      <td>${p.name}</td>
      <td class="small-col"><span class="plr-pos">${p.position}</span></td>
      <td class="small-col">${Player.age(p, gs.date)}</td>
      ${sks.map(
        (sk) =>
          html`<td class="small-col">
            ${Math.round(Player.getMacroSkill(p, sk))}
          </td>`
      )}
      <td class="small-col">${r.seasons}</td>
      <td>${`${frt.format(r.wage)}₡`}</td>
      <td><button @click=${resignPlayer(r)}>sign</button></td>
    </tr>
  `;
}

/** return a signing function where the user team re-sign the given player request */
function resignPlayer(r: SignRequest): () => void {
  return () => {
    const gs = window.$game.state! as GameState;
    const p = gs.players[r.plId];
    const t = gs.teams[gs.userTeam];
    Team.signPlayer({ gs, t, p }, r.wage, r.seasons);
    gs.reSigning = gs.reSigning?.filter((rq) => rq !== r);
    window.$game.state = gs; // mutation notification
  };
}

if (!customElements.get("re-sign")) {
  customElements.define("re-sign", ReSign);
}
