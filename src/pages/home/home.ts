import { html, render, TemplateResult } from "lit-html";
import { goTo } from "../util/router";
import "../util/layout.ts";
import "../util/modal.ts";
import style from "./home.css";
import btnStyle from "../util/button.css";
import teams from "../../asset/teams.json";

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
          ${style + btnStyle}
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
  private openTeamPiacker = false;
  private openLoadFile = false;

  connectedCallback() {
    if (this.isConnected) {
      this.render();
      this.addEventListener("closeModal", this.handleCloseModal);
      this.addEventListener("teamPicked", this.goToDashboard);
      this.addEventListener("filePicked", this.goToDashboard);
    }
  }

  disconnectedCallback() {
    this.removeEventListener("closeModal", this.handleCloseModal);
    this.removeEventListener("teamPicked", this.goToDashboard);
    this.removeEventListener("filePicked", this.goToDashboard);
  }

  closeAll(): void {
    this.openTeamPiacker = false;
    this.openLoadFile = false;
  }

  handleCloseModal = () => {
    this.closeAll();
    this.render();
  };

  goToDashboard = (): void => {
    goTo(`${window.$PUBLIC_PATH}dashboard`);
  };

  handleOpenTeamPiacker = (): void => {
    this.closeAll();
    this.openTeamPiacker = true;
    this.render();
  };

  handleOpenFile = (): void => {
    this.closeAll();
    this.openLoadFile = true;
    this.render();
  };

  renderTeamPicker(): TemplateResult {
    return html`
      <sff-modal style="--modal-container-flex: 1">
        <home-team-picker></home-team-picker>
      </sff-modal>
    `;
  }

  renderFilePicker(): TemplateResult {
    return html`<sff-modal><home-file-picker></home-file-picker></sff-modal>`;
  }

  render(): void {
    render(
      html`
        <div>
          <button class="btn" @click=${this.handleOpenTeamPiacker}>
            new game
          </button>
          <button class="btn" @click=${this.handleOpenFile}>
            load game file
          </button>
        </div>
        ${this.openTeamPiacker ? this.renderTeamPicker() : ""}
        ${this.openLoadFile ? this.renderFilePicker() : ""}
      `,
      this
    );
  }
}

/** it dispatch a teamPicked Event when a team was picked and a new game loaded */
class TeamPicker extends HTMLElement {
  connectedCallback() {
    if (this.isConnected) {
      render(html`${this.teams()}`, this);
    }
  }

  handleClick = (e: Event) => {
    window.$GAME.newGame((e.target as HTMLButtonElement).value);
    this.dispatchEvent(
      new CustomEvent("teamPicked", { bubbles: true, composed: true })
    );
  };

  teams(): TemplateResult[] {
    return Object.keys(teams).map(
      (n) => html`
        <button
          class="btn"
          aria-label=${`pick team ${n}`}
          @click=${this.handleClick}
          .value=${n}
        >
          ${n}
        </button>
      `
    );
  }
}

/** it dispatch a filePicked Event when the file was successfully picked and loaded */
class FilePicker extends HTMLElement {
  connectedCallback() {
    if (this.isConnected) {
      this.render();
    }
  }

  onFileLoad = (e: Event): void => {
    const file = (e?.target as HTMLInputElement).files?.[0];

    if (file && file.type === "application/json") {
      file
        .text()
        .then((str) => window.$GAME.loadGameFromJSON(str))
        .catch(() => console.error("TODO: handle json error"));

      this.dispatchEvent(
        new CustomEvent("filePicked", { bubbles: true, composed: true })
      );
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

if (!customElements.get("sff-home")) {
  customElements.define("sff-home", Home);
  customElements.define("home-main", Main);
  customElements.define("home-team-picker", TeamPicker);
  customElements.define("home-file-picker", FilePicker);
}
