import { render, html, TemplateResult, nothing } from "lit-html";
import { repeat } from "lit-html/directives/repeat.js";
import {
  MacroSkill,
  MACRO_SKILLS,
  Player,
  POSITIONS,
  Skill,
  SKILLS,
} from "../../character/player";
import "../common/game-page.ts";
import "../util/router.ts";
import { goLink } from "../util/go-link";
import style from "./players-page.css";
import {
  sortByInfo,
  sortByMacroSkill,
  sortBySkill,
  updateSort,
} from "../../character/util";
import * as qsSync from "../util/query-string-sync";
import {
  estimateImprovabilityRating,
  getPlayerRating,
  getPlayerRatingSymbol,
  improvabilityRatingSymbol,
} from "../../character/user";
import { GameState } from "../../game-state/game-state";

/** filters applicable to players, when null or undefined the filter won't be applied */
interface PlayersFilters {
  team?: string | null;
  pos?: string | null;
  minAge?: number | null;
  maxAge?: number | null;
  search?: string | null;
}

interface TableState {
  at: number; // table starting entry position
  size: number; // table amount of entries
  sortBy: string | null;
  sortAsc: boolean; // ascending order
}

interface PageGlobal {
  state: TableState & PlayersFilters;
  teams: string[]; // all game teams plus free agent
  players: Player[]; // all players shown, get mutated according to the state (filters, order etc)
}

const TB_SIZE = 25;
const AT = 0;
/** the globals of this page is bound to the PlayersPage HTMLElement,
 * when it connects this variable is populated, when it disconnects this variable is cleared */
let pgGb: PageGlobal | undefined;

/** get the PageState fields from the current query string URL or fall back to the default */
function getPageState(): TableState & PlayersFilters {
  const q = qsSync.getQueryString();
  return {
    size: q.size ? Number(q.size) : TB_SIZE,
    at: q.at ? Number(q.at) : AT,
    sortBy: q.sortBy ?? null,
    sortAsc: q.sortAsc ? JSON.parse(q.sortAsc) : false,
    team: q.team ?? null,
    pos: q.pos ?? null,
    minAge: q.minAge ? Number(q.minAge) : null,
    maxAge: q.maxAge ? Number(q.maxAge) : null,
    search: q.search ?? null,
  };
}

/** init the pageGlobal and recover the state from the current query string URL
 * if any exist */
function initPageGlobal() {
  const context = getPageState();
  pgGb = {
    state: context,
    players: getPlayers(context),
    teams: ["free agent", ...Object.keys(window.$game.state!.teams)],
  };

  if (pgGb.state.sortBy) {
    sortPlayersBy(pgGb.state.sortBy as string, pgGb.state.sortAsc);
  }
}

/** handle click to the next or prev position on the table and update the query string */
function onTableTurn(to: number): void {
  if (to >= 0 && to < pgGb!.players.length) {
    qsSync.save({ ...pgGb!.state, at: to });
  }
}

/** handle the change of table entries amount and update the query string */
function onTbSizeChange(size: number): void {
  if (size !== pgGb!.state.size) {
    const at = Math.trunc(pgGb!.state.at / size) * size;
    qsSync.save({ ...pgGb!.state, size, at });
  }
}

/** sort the table according to the the given key, it is assumed to be a table head key */
function sortPlayersBy(key: string, ascending: boolean) {
  const gs = window.$game.state!;

  if (key in MACRO_SKILLS) {
    sortByMacroSkill(key as MacroSkill, pgGb!.players, ascending);
  } else if (SKILLS.includes(key as Skill)) {
    sortBySkill(key as Skill, pgGb!.players, ascending);
  } else {
    sortByInfo(key as keyof Player, pgGb!.players, ascending, gs);
  }
}

/**
 * get players from the game state applying the given filters
 * @param f only defined filters are applied
 */
function getPlayers(f: PlayersFilters): Player[] {
  const gs = window.$game.state!;
  const rExp = f.search ? new RegExp(f.search, "gi") : null;
  return Object.values(gs.players).filter(
    (p) =>
      p.team !== "draft" &&
      (!f.team || p.team === f.team) &&
      (!f.pos || p.position === f.pos) &&
      (!f.minAge || Player.age(p, gs.date) >= f.minAge) &&
      (!f.maxAge || Player.age(p, gs.date) <= f.maxAge) &&
      (!rExp || rExp.test(p.name))
  );
}

/** update the players and the querystring with the given filters */
function onFilterChange(f: PlayersFilters) {
  const s = pgGb!.state;
  pgGb!.players = getPlayers(f);
  const at =
    s.at >= pgGb!.players.length
      ? Math.trunc(pgGb!.players.length / s.size) * s.size
      : s.at;
  qsSync.save({ ...s, ...f, at, sortBy: null, sortAsc: false }); // clear the sorting order too (just a preference)
}

/** it is the root of the page and handle the PageGlobal */
class PlayersPage extends HTMLElement {
  gb?: PageGlobal;

  connectedCallback() {
    if (this.isConnected) {
      initPageGlobal();
      qsSync.addObserver(this);
      window.$game.addObserver(this);
      this.gb = pgGb;
      this.render();
    }
  }

  disconnectedCallback() {
    if (this.gb === pgGb) {
      // we need to check because Chrome is unpredictable on when it call this method
      // Chrome when substitutes a PlayersPage with a new one it calls connectedCallback
      // of the new one before the disconnectedCallback of the old one
      pgGb = undefined; // if the page close the global get closed too
    }

    window.$game.removeObserver(this);
    qsSync.removeObserver(this);
  }

  onQueryStringUpdate() {
    pgGb!.state = getPageState();
    this.render();
  }

  gameStateUpdated() {
    pgGb!.players = getPlayers(pgGb!.state); // we don't want a stale players reference
    this.render();
  }

  render(): void {
    render(
      html`
        <style>
          ${style}
        </style>
        <sff-game-page>
          <div slot="in-main">
            <div class="cnt-filters">
              ${filterControls()}${filtersApplied()}
            </div>
            <div class="tb-controls">${tableControls()}</div>
            <players-table></players-table>
          </div>
        </sff-game-page>
      `,
      this
    );
  }
}

/** control the current entry position and the table size */
function tableControls(): TemplateResult {
  const c = pgGb!.state;
  const pages = Math.ceil((pgGb!.players.length ?? 0) / c.size);
  const page = Math.trunc(c.at / c.size) + 1;
  const sizes = Array.from({ length: 8 }, (_, i) => 2 ** i * TB_SIZE);
  const onPrev = () => onTableTurn(c.at - c.size);
  const onNext = () => onTableTurn(c.at + c.size);
  const onSizeChange = (e: Event) =>
    onTbSizeChange(Number((e.target as HTMLSelectElement).value));
  const onSearchChange = (e: Event) =>
    onFilterChange({
      ...pgGb!.state,
      search: (e.target as HTMLSelectElement).value || null,
    });

  return html`
    <span>page ${page} / ${pages}</span>
    <button ?disabled=${page === 1} @click=${onPrev} aria-label="previous page">
      🡨
    </button>
    <button ?disabled=${page === pages} @click=${onNext} aria-label="next page">
      🡪
    </button>
    <label for="sizes">entries:</label>
    <select class="input-bg" id="sizes" @change=${onSizeChange}>
      ${sizes.map(
        (sz) => html`<option ?selected=${c.size === sz}>${sz}</option>`
      )}
    </select>
    <label
      >search: <input class="input-bg" type="search" @input=${onSearchChange}
    /></label>
  `;
}

/** a input number for age */
function inputAge(name: string, placeHld: string, lbl: string): TemplateResult {
  return html`
    <input
      class="input-bg"
      name=${name}
      type="number"
      min="15"
      max="60"
      step="1"
      placeholder=${placeHld}
      aria-label=${lbl}
    />
  `;
}

/** list all the filters that are currently applied to the players,
 * and the number of players */
function filtersApplied(): TemplateResult {
  const { minAge, maxAge, team, pos } = pgGb!.state;
  const filter = (k: string, v: unknown) =>
    html`<span class="filter-rst">${k} ${v}</span>`;
  return html`<output form="js-filters">
    ${minAge ? filter("Age ≥", minAge) : nothing}
    ${maxAge ? filter("Age ≤", maxAge) : nothing}
    ${team ? filter("Team:", team) : nothing}
    ${pos ? filter("Position:", pos) : nothing}
    ${filter("Players:", pgGb!.players.length)}
  </output>`;
}

/** a form that allows the user to apply some filters to players */
function filterControls(): TemplateResult {
  const onSummit = (e: Event) => {
    const form = e.currentTarget as HTMLFormElement;
    e.preventDefault();
    onFilterChange({
      team: form.teams.value || null,
      pos: form.pos.value || null,
      minAge: form["min-age"].value || null,
      maxAge: form["max-age"].value || null,
      search: pgGb!.state.search,
    });
  };
  return html`
    <form id="js-filters" @submit=${onSummit} aria-label="filter players">
      <select class="input-bg" name="teams" aria-label="filter by team">
        <option selected value="">Filter by team</option>
        ${pgGb!.teams.map((t) => html`<option>${t}</option>`)}
      </select>
      <select class="input-bg" name="pos" aria-label="filter by position">
        <option selected value="">Filter by position</option>
        ${POSITIONS.map((p) => html`<option>${p}</option>`)}
      </select>
      <div>
        age range ${inputAge("min-age", "min", "minimum age")} to
        ${inputAge("max-age", "max", "maximum age")}
      </div>
      <button>Apply filters</button>
    </form>
  `;
}

class PlayersTable extends HTMLElement {
  connectedCallback() {
    if (this.isConnected) {
      window.$game.addObserver(this);
      qsSync.addObserver(this);
      this.render();
    }
  }

  disconnectCallback() {
    qsSync.removeObserver(this);
    window.$game.removeObserver(this);
  }

  disconnectedCallback() {
    qsSync.removeObserver(this);
    window.$game.removeObserver(this);
  }

  gameStateUpdated() {
    this.render();
  }

  onQueryStringUpdate() {
    this.render();
  }

  /** @returns the sort order of the table if is sorted by the given head */
  sortOrder(headName: string): "ascending" | "descending" | "" {
    if (pgGb!.state.sortBy === headName) {
      return pgGb!.state.sortAsc ? "ascending" : "descending";
    }

    return "";
  }

  /** sort the table according to the clicked th */
  onHeadClick = (key: string) => {
    const s = { by: pgGb!.state.sortBy, ascending: pgGb!.state.sortAsc };
    sortPlayersBy(key, updateSort(s, key));
    qsSync.save({ ...pgGb!.state, sortBy: s.by, sortAsc: s.ascending });
  };

  /**
   * the button contained by the th
   * @param key one of the player key property or a skill
   * @param child the content to nest in the button
   */
  headBtn(key: string, child: string | TemplateResult): TemplateResult {
    const ord = this.sortOrder(key);
    const lbl = ord === "ascending" || ord === "" ? "descending" : "ascending";
    const onClick = () => this.onHeadClick(key);
    return html`
      <button class="btn-txt ${ord}" @click=${onClick} aria-label="sort ${lbl}">
        ${child}
      </button>
    `;
  }

  renderHead(): TemplateResult {
    const abbr = (v: string) =>
      html`<abbr title=${v}>${v.substring(0, 3)}.</abbr>`;

    return html`<tr>
      <th class="${this.sortOrder("name")}">${this.headBtn("name", "name")}</th>
      <th class="${this.sortOrder("position")}">
        ${this.headBtn("position", abbr("position"))}
      </th>
      <th class="${this.sortOrder("rating")}">
        ${this.headBtn("rating", abbr("rating"))}
      </th>
      <th class="${this.sortOrder("birthday")}">
        ${this.headBtn("birthday", "age")}
      </th>
      <th class="${this.sortOrder("improvability")}">
        ${this.headBtn("improvability", abbr("improvability"))}
      </th>
      ${Object.keys(MACRO_SKILLS).map((sk) => {
        const btn = this.headBtn(sk, abbr(sk));
        return html`<th class="${this.sortOrder(sk)}">${btn}</th>`;
      })}
    </tr>`;
  }

  render(): void {
    const { at, size } = pgGb!.state;

    render(
      html`
        <table>
          <thead>
            ${this.renderHead()}
          </thead>
          <tbody>
            ${renderRows(pgGb!.players.slice(at, at + size))}
          </tbody>
        </table>
      `,
      this
    );
  }
}

if (!customElements.get("sff-players")) {
  customElements.define("sff-players", PlayersPage);
  customElements.define("players-table", PlayersTable);
}

/** render table rows with the given players as entries */
function renderRows(players: Player[]) {
  const gs = window.$game.state!;
  const playerPath = (p: Player) =>
    `${window.$PUBLIC_PATH}players/player?id=${p.id}`;

  return repeat(
    players,
    (p: Player) => p.id,
    (p: Player) =>
      html`<tr>
        <td>${goLink(playerPath(p), p.name)}</td>
        <td class="plr-pos">${p.position}</td>
        ${ratingCell(p, gs)}
        <td>${Player.age(p, gs.date)}</td>
        ${improvabilityCell(p, gs)}
        ${Object.keys(MACRO_SKILLS).map(
          (sk) =>
            html`<td>
              ${Math.round(Player.getMacroSkill(p, sk as MacroSkill))}
            </td>`
        )}
      </tr>`
  );
}

function improvabilityCell(p: Player, gs: GameState): TemplateResult {
  const u = gs.teams[gs.userTeam];
  return rtgCell(
    improvabilityRatingSymbol(p, u),
    estimateImprovabilityRating(p, u)
  );
}

function ratingCell(p: Player, gs: GameState): TemplateResult {
  return rtgCell(getPlayerRatingSymbol(p, gs), getPlayerRating(p, gs));
}

function rtgCell(symbol: string, rating: number): TemplateResult {
  const s = `border-color: hsl(${rating * 120}deg 100% 60%)`;
  return html`
    <td>
      <div class="rtg-cell" style=${s}><span>${symbol}</span></div>
    </td>
  `;
}
