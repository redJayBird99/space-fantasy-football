import { html, nothing, render, TemplateResult } from "lit-html";
import { goTo } from "../util/router";
import { db, parse as gsParse } from "../../game/game";
import style from "./home.css";
import teams from "../../asset/teams.json";
import { forkMe } from "../common/fork-me";

class Home extends HTMLElement {
  connectedCallback() {
    if (this.isConnected) {
      document.title = `Space Fantasy Football Home Page`;
      this.render();
    }
  }

  render(): void {
    render(
      html`
        <style>
          ${style}
        </style>
        <div class="bg-wave"></div>
        <div class="cnt-content">
          <header class="head">
            <h1><span>Space Fantasy</span> <span>Football</span></h1>
            <p>An atypical football management game</p>
          </header>
          <home-main></home-main>
          ${forkMe()}
        </div>
      `,
      this
    );
  }
}

type MainState = "newGame" | "loadFile" | "loadGame" | "";

/** handle the opening or loading game options */
class Main extends HTMLElement {
  private state: MainState = "";

  connectedCallback() {
    if (this.isConnected) {
      this.render();
      this.addEventListener("closeModal", this.handleCloseModal);
    }
  }

  disconnectedCallback() {
    this.removeEventListener("closeModal", this.handleCloseModal);
  }

  private stateUpdater = (to: MainState): (() => void) => {
    return () => {
      this.state = to;
      this.render();
    };
  };

  private handleCloseModal = this.stateUpdater("");

  renderState(): TemplateResult | typeof nothing {
    if (this.state === "loadFile") {
      return html`<sff-load-file></sff-load-file> `;
    }
    if (this.state === "loadGame") {
      return html` <sff-load-game></sff-load-game> `;
    }
    if (this.state === "newGame") {
      return html` <sff-open-new-game></sff-open-new-game> `;
    }

    return nothing;
  }

  render(): void {
    render(
      html`
        <button class="btn hm-btn" @click=${this.stateUpdater("newGame")}>
          New Game
        </button>
        <button class="btn hm-btn" @click=${this.stateUpdater("loadFile")}>
          Load File
        </button>
        <button class="btn hm-btn" @click=${this.stateUpdater("loadGame")}>
          Load Game
        </button>
        ${this.renderState()}
      `,
      this
    );
  }
}

/** open a modal to select a team and a game name
 * it can dispatch a newGame Event when the selection is ended, or a closeModal event */
class NewGame extends HTMLElement {
  private pickedTeam?: string;

  connectedCallback() {
    if (this.isConnected) {
      this.render();
    }
  }

  private handleTeamClick = (e: Event): void => {
    this.pickedTeam = (e.currentTarget as HTMLButtonElement).value;
    this.render();
  };

  /** when the name is valid a new game will be created and it will redirect to the dashboard */
  private onSubmitGameName = (e: Event): void => {
    e.preventDefault();
    const input = this.querySelector("#game-name") as HTMLInputElement;

    if (input.value && /^\w{4,14}$/.test(input.value)) {
      const gName = `${db.SAVES_PREFIX}${input.value}`;
      window.$game.newGame(this.pickedTeam, gName);
      goTo(`${gName}/dashboard`);
    } else {
      alert(`${input.value} is not a valid name`);
    }
  };

  private teams(): TemplateResult {
    const bts = (Object.keys(teams) as (keyof typeof teams)[]).map((t) => {
      return html`
        <button
          class="btn pick-team-btn"
          aria-label=${`pick team ${t}`}
          @click=${this.handleTeamClick}
          value=${t}
        >
          <span class="text-2xl italic"> ${t}</span>
          <span class="text-sm font-light">${teams[t].fanBase} fanbase</span>
        </button>
      `;
    });

    return html`
      <h2 class="dig-label" slot="title">Choose a team</h2>
      <div class="teams">${bts}</div>
    `;
  }

  private gameName(): TemplateResult {
    return html`
      <h2 class="dig-label" slot="title">Choose a game name</h2>
      <form class="cnt-new-game-name" @submit=${this.onSubmitGameName}>
        <div>
          <label class="form-label" for="game-name"
            >game name between 4 and 14 characters</label
          >
          <input
            class="form-control"
            type="text"
            id="game-name"
            pattern="^\\w{4,14}$"
            size="14"
            required
            placeholder="Name"
          />
        </div>
        <button class="btn btn-rounded btn-acc">Apply</button>
      </form>
    `;
  }

  private render(): void {
    render(
      html`
        <sff-modal>
          ${this.pickedTeam ? this.gameName() : this.teams()}
        </sff-modal>
      `,
      this
    );
  }
}

/** open a modal to select a game file, it can dispatch a filePicked Event
 * when the file was successfully selected and loaded, or a closeModal */
class LoadFile extends HTMLElement {
  connectedCallback() {
    if (this.isConnected) {
      this.render();
    }
  }

  private openSave = (json: string): void => {
    // TODO check if state is a valid GameState
    const gs = gsParse(json);
    const name = gs.name.substring(db.SAVES_PREFIX.length);
    const warning = `are you sure do you want to open this file?, any other autosave with the name ${name} will be overridden`;

    if (confirm(warning)) {
      window.$game.loadGameFrom(gs);
      goTo(`${gs.name}/dashboard`);
    }
  };

  /** try to open the given json as a GameState if it is valid redirect to the dashboard */
  private onFileLoad = (e: Event): void => {
    const file = (e?.target as HTMLInputElement).files?.[0];

    if (file && file.type === "application/json") {
      file
        .text()
        .then((str) => this.openSave(str))
        .catch(() => alert("the file isn't a valid save"));
    } else {
      alert("the picked file is invalid, pick another one");
    }
  };

  onLabelPressEnter = (e: KeyboardEvent) => {
    if (e.code === "Enter") {
      (this.querySelector("#game-file") as HTMLInputElement).click();
    }
  };

  render() {
    render(
      html`
        <sff-modal>
          <h2 class="dig-label" slot="title">Select a game file</h2>
          <div>
            <label
              for="game-file"
              tabindex="0"
              class="btn btn-sml btn-rounded"
              @keydown=${this.onLabelPressEnter}
              >Select Game File</label
            >
            <input
              type="file"
              accept=".json"
              class="hide"
              id="game-file"
              @change=${this.onFileLoad}
            />
          </div>
        </sff-modal>
      `,
      this
    );
  }
}

/** open a modal when the user can load the game from the local machine database, or delete a game */
class LoadGame extends HTMLElement {
  connectedCallback() {
    if (this.isConnected) {
      this.render();
    }
  }

  /** try to load the clicked game from the db, when successful redirect to the dashboard */
  private handleLoadSave = (e: Event): void => {
    const v = (e.target as HTMLButtonElement).value;
    window.$game.loadGameFromDB(
      v,
      () => goTo(`${window.$game.state!.name}/dashboard`),
      () => alert(`something went wrong, the ${v} game wasn't loaded`)
    );
  };

  /** ask for confirmation before deleting the clicked game save */
  private handleDeleteGame = (e: Event): void => {
    const v = (e.target as HTMLButtonElement).value;
    const name = v.substring(db.SAVES_PREFIX.length);

    if (confirm(`are you sure you want to delete ${name}`)) {
      window.$game.deleteGame(v, () => this.render());
    }
  };

  /** list of all the available game saves */
  private saves(): TemplateResult[] {
    return db.getSavesNames().map((s) => {
      const name = s.substring(db.SAVES_PREFIX.length);
      return html`
        <li>
          <em>${name}</em>
          <button class="btn btn--acc" value=${s} @click=${this.handleLoadSave}>
            open
          </button>
          <button
            class="btn btn--err"
            value=${s}
            @click=${this.handleDeleteGame}
          >
            delete
          </button>
        </li>
      `;
    });
  }

  private render(): void {
    render(
      html`
        <sff-modal>
          <h2 class="dig-label" slot="title">Select a game save</h2>
          <ul class="saves">
            ${this.saves()}
          </ul>
        </sff-modal>
      `,
      this
    );
  }
}

export default function define() {
  if (!customElements.get("sff-home")) {
    customElements.define("sff-home", Home);
    customElements.define("home-main", Main);
    customElements.define("sff-open-new-game", NewGame);
    customElements.define("sff-load-file", LoadFile);
    customElements.define("sff-load-game", LoadGame);
  }
}
