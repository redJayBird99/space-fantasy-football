import { render, html, TemplateResult } from "lit-html";
import { repeat } from "lit-html/directives/repeat.js";
import { GameState } from "../../game-state/game-state";
import { Player, Skill } from "../../character/player";
import * as _ps from "../util/props-state";
import { goLink } from "../util/go-link";
import "../util/router.ts";
import style from "./players.css";
import { sortByInfo, sortBySkill, SorterBy } from "../../character/util";

class Players extends HTMLElement {
  connectedCallback() {
    if (this.isConnected) {
      this.render();
    }
  }

  render(): void {
    render(
      html`
        <sff-game-page>
          <style>
            ${style}
          </style>
          <players-table slot="in-main"></players-table>
        </sff-game-page>
      `,
      this
    );
  }
}

const TB_SIZE = 25;

class PlayersTable extends HTMLElement {
  private state = _ps.newState({ size: TB_SIZE, at: 0 }, () => this.render());
  private gs = window.$game.state;
  private players: Player[] = [];
  private skillsKeys: Skill[] = [];
  private sortBy = new SorterBy();

  connectedCallback() {
    if (this.isConnected) {
      window.$game.addObserver(this);
      this.players = Object.values(this.gs?.players ?? {});
      this.skillsKeys = Object.keys(this.players[0]?.skills ?? {}) as Skill[];
      this.addEventListener("click", this.onHeadClick);
      this.render();
    }
  }

  disconnectedCallback() {
    window.$game.removeObserver(this);
    this.removeEventListener("click", this.onHeadClick);
  }

  gameStateUpdated(gs?: Readonly<GameState>) {
    this.gs = gs;
    this.render();
  }

  /**
   * @returns the sort order of the table if is sorted by the given head
   */
  sortOrder(headName: string): "ascending" | "descending" | "" {
    if (this.sortBy.lastSortBy === headName) {
      return this.sortBy.ascending ? "ascending" : "descending";
    }

    return "";
  }

  /** sort the table according to the clicked th */
  onHeadClick = (e: Event) => {
    if (!e.target || !(e.target instanceof HTMLElement)) {
      return;
    }

    const btn = e.target.closest(".btn-txt");

    if (!btn || !(btn instanceof HTMLButtonElement)) {
      return;
    }

    if (this.skillsKeys.includes(btn.value as Skill)) {
      sortBySkill(
        btn.value as Skill,
        this.players,
        this.sortBy.ascendingly(btn.value)
      );
      this.render();
    } else {
      const k = btn.value as keyof Player;
      sortByInfo(k, this.players, this.sortBy.ascendingly(k));
      this.render();
    }
  };

  /**
   * the button contained by the th
   * @param value one of the player key property or a skill
   * @param child the content to nest in the button
   */
  headBtn(value: string, child: string | TemplateResult): TemplateResult {
    const ord = this.sortOrder(value);
    const lbel = ord === "ascending" || ord === "" ? "descending" : "ascending";
    return html`
      <button class="btn-txt ${ord}" value=${value} aria-label="sort ${lbel}">
        ${child}
      </button>
    `;
  }

  abbr(value: string, size: number): TemplateResult {
    return html`<abbr title=${value}>${value.substring(0, size)}</abbr>`;
  }

  renderHead(): TemplateResult {
    return html`<tr>
      <th class="${this.sortOrder("name")}">${this.headBtn("name", "name")}</th>
      <th class="${this.sortOrder("birthday")}">
        ${this.headBtn("birthday", "age")}
      </th>
      <th class="${this.sortOrder("position")}">
        ${this.headBtn("position", this.abbr("position", 3))}
      </th>
      ${this.skillsKeys.map((sk) => {
        const btn = this.headBtn(sk, this.abbr(sk, 3));
        return html`<th class="${this.sortOrder(sk)}">${btn}</th>`;
      })}
    </tr>`;
  }

  renderRows() {
    const { at, size } = this.state;
    const playerPath = (p: Player) => `${location.pathname}/player?id=${p.id}`;

    return repeat(
      this.players.slice(at, at + size),
      (p: Player) => p.id,
      (p: Player) =>
        html`<tr>
          <td>${goLink(playerPath(p), p.name)}</td>
          <td>${Player.age(p, this.gs!.date)}</td>
          <td>${p.position}</td>
          ${this.skillsKeys.map(
            (sk) => html`<td>${Math.round(Player.getSkill(p, sk))}</td>`
          )}
        </tr>`
    );
  }

  /** handle the page turning */
  onPageChange = (e: Event): void => {
    const to = Number((e.target as HTMLButtonElement).value);

    if (to >= 0 && to < this.players.length) {
      _ps.setState(() => Object.assign(this.state, { at: to }));
    }
  };

  /** handle the table size */
  onSizeChange = (e: Event): void => {
    const size = Number((e.target as HTMLSelectElement).value);

    if (size !== this.state.size) {
      _ps.setState(() =>
        Object.assign(this.state, {
          size,
          at: Math.trunc(this.state.at / size) * size,
        })
      );
    }
  };

  renderSizeOptions(): TemplateResult[] {
    return Array.from(
      { length: 8 },
      (_, i) => html`<option>${2 ** i * TB_SIZE}</option>`
    );
  }

  render(): void {
    const { at, size } = this.state;
    const pages = Math.ceil(this.players.length / size);
    const page = Math.trunc(at / size) + 1;

    render(
      html`
        <div class="tb-controls">
          <span>page ${page} / ${pages}</span>
          <button
            value=${at - size}
            @click=${this.onPageChange}
            aria-label="previous page"
          >
            🡨
          </button>
          <button
            value=${at + size}
            @click=${this.onPageChange}
            aria-label="next page"
          >
            🡪
          </button>
          <label for="sizes">page size:</label>
          <select id="sizes" @change=${this.onSizeChange}>
            ${this.renderSizeOptions()}
          </select>
        </div>
        <table>
          <thead>
            ${this.renderHead()}
          </thead>
          <tbody>
            ${this.renderRows()}
          </tbody>
        </table>
      `,
      this
    );
  }
}

if (!customElements.get("sff-players")) {
  customElements.define("sff-players", Players);
  customElements.define("players-table", PlayersTable);
}
