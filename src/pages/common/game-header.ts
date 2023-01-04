import { html, render } from "lit-html";
import style from "./game-header.css";
import teams from "../../asset/teams.json";
import defineSimControls from "./sim-controls";
import { mainStyleSheet } from "../style-sheets";
defineSimControls();

/** the header of the pages when in game */
class GameHeader extends HTMLElement {
  gName?: string; // named group of the matched URL passed as property

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    if (this.isConnected) {
      this.render();
    }
  }

  render(): void {
    render(
      html`
        ${mainStyleSheet.cloneNode(true)}
        <style>
          ${style}
        </style>
        <div class="ctn-team">
          ${userTeamColor()}
          <h2 class="bg-700 italic absolute leading-5">
            ${window.$game.state!.userTeam}
          </h2>
        </div>
        <sim-controls .gName=${this.gName!} class="cts"></sim-controls>
      `,
      this.shadowRoot!
    );
  }
}

function userTeamColor() {
  const user = window.$game.state!.userTeam;
  const [pc, sc] = teams[user as keyof typeof teams].colors;
  const prClr = `stroke: ${pc}`;
  const seClr = `stroke: ${sc}`;
  return html`
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      class="team-svg"
      role="img"
      aria-label="Lines with your Club colors"
    >
      <line style=${prClr} class="primary" x1="5" x2="60" y1="104" y2="-4" />
      <line style=${seClr} class="secondary" x1="16" x2="71" y1="104" y2="-4" />
      <line style=${prClr} class="primary" x1="27" x2="82" y1="104" y2="-4" />
      <line style=${seClr} class="secondary" x1="38" x2="93" y1="104" y2="-4" />
    </svg>
  `;
}

export default function define() {
  if (!customElements.get("sff-game-header")) {
    customElements.define("sff-game-header", GameHeader);
  }
}
