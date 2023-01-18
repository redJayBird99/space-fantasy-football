import { html, render } from "lit-html";
import * as _ps from "../util/props-state";
import { db } from "../../game/game";
import style from "./menu-bar.css";
import { mainStyleSheet } from "../style-sheets";

/** menu with utils like game saver */
class MenuBar extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.setAttribute("role", "menu");
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
        <autosave-led></autosave-led>
        <menu-save></menu-save>
        <menu-save-file></menu-save-file>
        <saved-signal>game saved</saved-signal>
      `,
      this.shadowRoot!
    );
  }
}

/** signal to the user when the game was saved */
class SavedSignal extends HTMLElement {
  private timeoutID?: ReturnType<typeof setTimeout>;
  private active = false;

  constructor() {
    super();
    this.setAttribute("role", "log");
    this.setAttribute("aria-live", "assertive");
  }

  connectedCallback() {
    if (this.isConnected) {
      db.addDBStateObserver(this);
      this.render();
    }
  }

  disconnectedCallback() {
    db.removeDBStateObserver(this);
  }

  updateDBState(state: db.DBState): void {
    if (state === "saved") {
      this.active = true;
      this.render();
      clearTimeout(this.timeoutID);
      this.timeoutID = setTimeout(() => {
        this.active = false;
        this.render();
      }, 3000);
    }
  }

  render(): void {
    this.textContent = this.active ? "game saved" : "";
  }
}

/** led to signal the game autosave state to the user */
class AutosaveLed extends HTMLElement {
  connectedCallback() {
    if (this.isConnected) {
      db.addDBStateObserver(this);
      this.render();
    }
  }

  updateDBState(state: db.DBState): void {
    if (state !== "saved") {
      this.render();
    }
  }

  disconnectedCallback() {
    db.removeDBStateObserver(this);
  }

  render(): void {
    const save = `autosave ${db.on() ? "on" : "off"}`;
    this.className = `led ${db.on() ? "led--on" : "led--off"}`;
    this.ariaLabel = save;
    this.title = save;
    this.setAttribute("role", "img");
  }
}

/** download the game as a Json save on the local machine */
class SaveGameJson extends HTMLElement {
  json?: string;

  connectedCallback() {
    if (this.isConnected) {
      window.$game.addObserver(this);
      this.json = window.$game.getStateAsJsonUrl();
      this.render();
    }
  }

  disconnectedCallback() {
    URL.revokeObjectURL(this.json ?? "");
    window.$game.removeObserver(this);
  }

  gameStateUpdated(): void {
    // when the gameState update we need a new json reference for the new state
    URL.revokeObjectURL(this.json ?? "");
    this.json = window.$game.getStateAsJsonUrl();
    this.render();
  }

  render(): void {
    const name = db.getGameName(window.$game.state);
    render(
      html`<a download="${name}.json" href=${this.json!}>save file</a>`,
      this
    );
  }
}

/** a button to manually save, it is disabled if the db isn't open */
class SaveOnDB extends HTMLElement {
  private state = _ps.newState({ disabled: !db.on() }, () => this.render());

  connectedCallback() {
    if (this.isConnected) {
      db.addDBStateObserver(this);
      this.render();
    }
  }

  updateDBState(state: db.DBState): void {
    if (state !== "saved") {
      _ps.setState(() => Object.assign(this.state, { disabled: !db.on() }));
    }
  }

  disconnectedCallback() {
    db.removeDBStateObserver(this);
  }

  handleClick = (): void => {
    // TODO handle error
    _ps.setState(() => Object.assign(this.state, { disabled: true }));
    window.$game.saveGsOnDB(() =>
      _ps.setState(() => Object.assign(this.state, { disabled: !db.on() }))
    );
  };

  render(): void {
    render(
      html`<button
        ?disabled=${this.state.disabled}
        class="btn-link"
        @click=${this.handleClick}
      >
        save
      </button>`,
      this
    );
  }
}

export default function define() {
  if (!customElements.get("menu-bar")) {
    customElements.define("menu-bar", MenuBar);
    customElements.define("autosave-led", AutosaveLed);
    customElements.define("menu-save-file", SaveGameJson);
    customElements.define("menu-save", SaveOnDB);
    customElements.define("saved-signal", SavedSignal);
  }
}
