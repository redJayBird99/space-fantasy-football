import { render, html, TemplateResult } from "lit-html";
import { GameState } from "../../game-state/game-state";
import { Player } from "../../character/player";
import * as _ps from "../util/props-state";
import "../util/router.ts";
import style from "./players.css";

class Players extends HTMLElement {
  private gs: GameState = window.$GAME.state!;

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
        <sff-layout>
          <style>
            ${style}
          </style>
          <div slot="in-header">
            <h1>TODO: header</h1>
          </div>
          <div slot="in-nav"><h2>TODO: nav bar</h2></div>
          <div slot="in-main">
            <players-table .gs=${this.gs}></players-table>
          </div>
          <div slot="in-aside"><h2>TODO: aside</h2></div>
          <div slot="in-footer"><h2>TODO: footer</h2></div>
        </sff-layout>
      `,
      this.shadowRoot!
    );
  }
}

const TB_SIZE = 25;

class PlayersTable extends HTMLElement {
  private state = _ps.newState({ size: TB_SIZE, at: 0 }, () => this.render());
  private gs?: GameState;
  private players?: Player[];

  connectedCallback() {
    if (this.isConnected) {
      this.players = Object.values(this.gs?.players ?? {});
      this.render();
    }
  }

  renderHead(): TemplateResult {
    const skillsKeys = Object.keys(this.players?.[0].skills ?? {});

    return html`<tr>
      <th>name</th>
      <th>age</th>
      <th><abbr title="position">pos</abbr></th>
      ${skillsKeys.map(
        (sk) =>
          html`<th><abbr title=${sk}></abb>${sk.substring(0, 3)}</abbr></th>`
      )}
    </tr>`;
  }

  renderRows(): TemplateResult[] {
    const { at, size } = this.state;
    const playerPath = (p: Player) => `${location.pathname}/player?id=${p.id}`;

    return (
      this.players?.slice(at, at + size).map(
        (p) =>
          html`<tr>
            <td>
              <sff-go href=${playerPath(p)}>
                <a href=${playerPath(p)}>${p.name}</a>
              </sff-go>
            </td>
            <td>${Player.age(p, this.gs!.date)}</td>
            <td>${p.position}</td>
            ${Object.values(p.skills).map((sk) => html`<td>${sk}</td>`)}
          </tr>`
      ) ?? []
    );
  }

  onPageChange = (e: Event): void => {
    const to = Number((e.target as HTMLButtonElement).value);

    if (to >= 0 && to < (this.players?.length || 0)) {
      _ps.setState(() => Object.assign(this.state, { at: to }));
    }
  };

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
    const pages = Math.ceil((this.players?.length || 0) / size);
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
            &#8678;
          </button>
          <button
            value=${at + size}
            @click=${this.onPageChange}
            aria-label="next page"
          >
            &#8680;
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
