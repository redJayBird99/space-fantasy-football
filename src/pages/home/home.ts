import { html, render, TemplateResult } from "lit-html";
import { goTo } from "../util/router";
import { getSavesNames } from "../../game-state/game-db";
import "../util/layout.ts";
import "../util/modal.ts";
import style from "./home.css";
import btnStyle from "../util/button.css";
import formStyle from "../util/form.css";
import teams from "../../asset/teams.json";

const savesPrefix = "sff-"; // add this prefix on every new game save

class Home extends HTMLElement {
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
        <style>
          ${style + btnStyle + formStyle}
        </style>
        <sff-layout>
          <div slot="in-header"><h1>TODO: header</h1></div>
          <div slot="in-nav"><h2>TODO: nav bar</h2></div>
          <home-main slot="in-main"></home-main>
          <div slot="in-aside"><h2>TODO: aside</h2></div>
          <div slot="in-footer"><h2>TODO: footer</h2></div>
        </sff-layout>
      `,
      this.shadowRoot!
    );
  }
}

class Main extends HTMLElement {
  private openNewGame = false;
  private openLoadFile = false;
  private openLoadGame = false;

  connectedCallback() {
    if (this.isConnected) {
      this.render();
      this.addEventListener("closeModal", this.handleCloseModal);
    }
  }

  disconnectedCallback() {
    this.removeEventListener("closeModal", this.handleCloseModal);
  }

  closeAll(): void {
    this.openNewGame = false;
    this.openLoadFile = false;
    this.openLoadGame = false;
  }

  private handleCloseModal = () => {
    this.closeAll();
    this.render();
  };

  private handleOpenNewGame = (): void => {
    this.closeAll();
    this.openNewGame = true;
    this.render();
  };

  private handleOpenFile = (): void => {
    this.closeAll();
    this.openLoadFile = true;
    this.render();
  };

  private handleLoadGame = (): void => {
    this.closeAll();
    this.openLoadGame = true;
    this.render();
  };

  private renderNewGame(): TemplateResult {
    return html`
      <sff-modal style="--modal-container-flex: 1">
        <home-new-game></home-new-game>
      </sff-modal>
    `;
  }

  private renderFilePicker(): TemplateResult {
    return html`<sff-modal><home-file-picker></home-file-picker></sff-modal>`;
  }

  private renderLoadGame(): TemplateResult {
    return html`<sff-modal><home-load-game></home-load-game></sff-modal>`;
  }

  render(): void {
    render(
      html`
        <div>
          <button class="btn" @click=${this.handleOpenNewGame}>new game</button>
          <button class="btn" @click=${this.handleOpenFile}>load file</button>
          <button class="btn" @click=${this.handleLoadGame}>load game</button>
        </div>
        ${this.openNewGame ? this.renderNewGame() : ""}
        ${this.openLoadFile ? this.renderFilePicker() : ""}
        ${this.openLoadGame ? this.renderLoadGame() : ""}
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
      window.$GAME.newGame(this.pickedTeam, `${savesPrefix}${input.value}`);
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
      <button @click=${this.handleGameNameClick} class="btn">apply</button>
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

  /** try to open the given json as a GameState if it is valid redirect to the dashboard */
  onFileLoad = (e: Event): void => {
    const file = (e?.target as HTMLInputElement).files?.[0];

    if (file && file.type === "application/json") {
      file
        .text()
        .then((str) => window.$GAME.loadGameFromJSON(str))
        .then(() => goTo(`${window.$PUBLIC_PATH}dashboard`))
        .catch(() => console.error("TODO: handle json error"));
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
    window.$GAME.loadGameFromDB(
      v,
      () => goTo(`${window.$PUBLIC_PATH}dashboard`),
      () => alert(`something went wrong, the ${v} game wasn't loaded`)
    );
  };

  /** ask for confirmation defore deliting the clicked game from from the saved ones */
  private handleDeleteGame = (e: Event): void => {
    const v = (e.target as HTMLButtonElement).value;
    const name = v.substring(savesPrefix.length);

    if (confirm(`are you sure you want to delete ${name}`)) {
      window.$GAME.deleteGame(v, () => this.render());
    }
  };

  private saves(): TemplateResult[] {
    return getSavesNames().map((s) => {
      const name = s.substring(savesPrefix.length);
      return html`
        <li>
          <em>${name}</em>
          <button class="btn-acc" value=${s} @click=${this.handleLoadSave}>
            open
          </button>
          <button class="btn-err" value=${s} @click=${this.handleDeleteGame}>
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

if (!customElements.get("sff-home")) {
  customElements.define("sff-home", Home);
  customElements.define("home-main", Main);
  customElements.define("home-new-game", NewGame);
  customElements.define("home-file-picker", FilePicker);
  customElements.define("home-load-game", LoadGame);
}
