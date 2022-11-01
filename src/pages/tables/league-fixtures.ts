import { html, nothing, render, TemplateResult } from "lit-html";
import { ref } from "lit-html/directives/ref.js";
import { Match } from "../../game-sim/tournament-scheduler";
import { GameState } from "../../game-state/game-state";
import style from "./league-fixtures.css";

class LeagueFixtures extends HTMLElement {
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

  disconnectedCallback() {
    window.$game.removeObserver(this);
  }

  gameStateUpdated() {
    this.render();
  }

  scrollToRound = (round?: Element) => {
    requestAnimationFrame(() => {
      if (round instanceof HTMLElement) {
        round.parentElement!.scrollTop = round.offsetTop;
      }
    });
  };

  render(): void {
    const shd = GameState.getSeasonRounds(window.$game.state!, "now");
    const at = GameState.getNextRound(window.$game.state!);
    console.log(at);

    render(
      html`
        <style>
          ${style}
        </style>
        <h2>📆 League Fixtures</h2>
        <div class="rounds">
          ${shd?.map(
            (r, i) =>
              html`
                <article
                  class="round ${at === i ? "next-round" : ""}"
                  ${at === i ? ref(this.scrollToRound) : nothing}
                >
                  <h3>Matchday ${i + 1}</h3>
                  <ul class="round-fixtures">
                    ${r.map((m) => match(m))}
                  </ul>
                </article>
              `
          )}
          <div></div>
        </div>
      `,
      this.shadowRoot!
    );
  }
}

function match(m: Match): TemplateResult {
  const user = window.$game.state!.userTeam;

  return html`
    <li class=${user === m.away || user === m.home ? "user-fixture" : ""}>
      <span>${m.home}</span>
      <span class="result"
        >${m.result?.home ?? ""} - ${m.result?.away ?? ""}</span
      >
      <span>${m.away}</span>
    </li>
  `;
}

if (!customElements.get("league-fixtures")) {
  customElements.define("league-fixtures", LeagueFixtures);
}
