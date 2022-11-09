import { html, nothing, render, TemplateResult } from "lit-html";
import { goTo } from "../util/router";
import { getSavesNames, SAVES_PREFIX } from "../../game-state/game-db";
import { GameState } from "../../game-state/game-state";
import style from "./home.css";
import teams from "../../asset/teams.json";
import ghLogo from "../../asset/github-mark.svg";

class Home extends HTMLElement {
  connectedCallback() {
    if (this.isConnected) {
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
          <p class="fork-gh">
            <span>fork me on</span>
            <a
              target="_blank"
              href="https://github.com/RedAndBlu/space-fantasy-football"
            >
              <img src=${ghLogo} alt="gitHub logo" width="20" height="20" />
            </a>
          </p>
        </div>
      `,
      this
    );
  }
}

type MainState = "newGame" | "loadFile" | "loadGame" | "";

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
      return html`<sff-modal><home-file-picker></home-file-picker></sff-modal>`;
    }
    if (this.state === "loadGame") {
      return html`<sff-modal><home-load-game></home-load-game></sff-modal>`;
    }
    if (this.state === "newGame") {
      return html`<sff-modal><home-new-game></home-new-game></sff-modal>`;
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

/** it dispatch a newGame Event when a team was picked and a new game loaded */
class NewGame extends HTMLElement {
  private pickedTeam?: string;

  connectedCallback() {
    if (this.isConnected) {
      this.render();
    }
  }

  private handleTeamClick = (e: Event): void => {
    this.pickedTeam = (e.target as HTMLButtonElement).value;
    this.render();
  };

  /** when the name is valid a new game will be created and it will redirect to the dashboard */
  private handleGameNameClick = (): void => {
    const input = this.querySelector("#game-name") as HTMLInputElement;

    if (input.value && /^\w{4,14}$/.test(input.value)) {
      window.$game.newGame(this.pickedTeam, `${SAVES_PREFIX}${input.value}`);
      goTo(`${window.$PUBLIC_PATH}dashboard`);
    } else {
      alert(`${input.value} is not a valid name`);
    }
  };

  private teams(): TemplateResult {
    const bts = Object.keys(teams).map(
      (n) => html`
        <button
          class="btn"
          aria-label=${`pick team ${n}`}
          @click=${this.handleTeamClick}
          .value=${n}
        >
          ${n}
        </button>
      `
    );

    return html`<div class="teams">${bts}</div>`;
  }

  private gameName(): TemplateResult {
    return html`
      <label for="game-name">
        name of the new game (between 4 to 14 alphanumeric characters):
      </label>
      <input
        type="text"
        id="game-name"
        pattern="^\\w{4,14}$"
        size="14"
        required
      />
      <button @click=${this.handleGameNameClick} class="btn btn-acc">
        apply
      </button>
    `;
  }

  private render(): void {
    render(html`${this.pickedTeam ? this.gameName() : this.teams()}`, this);
  }
}

/** it dispatch a filePicked Event when the file was successfully picked and loaded */
class FilePicker extends HTMLElement {
  connectedCallback() {
    if (this.isConnected) {
      this.render();
    }
  }

  private openSave = (json: string): void => {
    // TODO check if state is a valid GameState
    const gs = GameState.parse(json);
    const name = gs.name.substring(SAVES_PREFIX.length);
    const warning = `are you sure do you want to open this file?, any other autosave with the name ${name} will be overridden`;

    if (confirm(warning)) {
      window.$game.loadGameFrom(gs);
      goTo(`${window.$PUBLIC_PATH}dashboard`);
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

  render() {
    render(
      html`
        <label for="file">pick your saved game</label>
        <input
          type="file"
          accept=".json"
          id="file"
          @change=${this.onFileLoad}
        />
      `,
      this
    );
  }
}

/** load the game from the local machine database, or delete a game */
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
      () => goTo(`${window.$PUBLIC_PATH}dashboard`),
      () => alert(`something went wrong, the ${v} game wasn't loaded`)
    );
  };

  /** ask for confirmation before deleting the clicked game from from the saved ones */
  private handleDeleteGame = (e: Event): void => {
    const v = (e.target as HTMLButtonElement).value;
    const name = v.substring(SAVES_PREFIX.length);

    if (confirm(`are you sure you want to delete ${name}`)) {
      window.$game.deleteGame(v, () => this.render());
    }
  };

  private saves(): TemplateResult[] {
    return getSavesNames().map((s) => {
      const name = s.substring(SAVES_PREFIX.length);
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
        <ul class="saves">
          ${this.saves()}
        </ul>
      `,
      this
    );
  }
}

export default function define() {
  if (!customElements.get("sff-home")) {
    customElements.define("sff-home", Home);
    customElements.define("home-main", Main);
    customElements.define("home-new-game", NewGame);
    customElements.define("home-file-picker", FilePicker);
    customElements.define("home-load-game", LoadGame);
  }
}
