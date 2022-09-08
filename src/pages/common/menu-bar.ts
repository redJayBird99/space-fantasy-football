import { html, render } from "lit-html";
import * as _ps from "../util/props-state";
import * as db from "../../game-state/game-db";
import style from "./menu-bar.css";

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
        <style>
          ${style}
        </style>
        <autosave-led></autosave-led>
        <menu-save></menu-save>
        <menu-save-file data-name=${this.dataset.gameName!}></menu-save-file>
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
      window.$GAME.addObserver(this);
      this.json = window.$GAME.getStateAsJsonUrl();
      this.render();
    }
  }

  disconnectedCallback() {
    URL.revokeObjectURL(this.json ?? "");
    window.$GAME.removeObserver(this);
  }

  gameStateUpdated(): void {
    // when the gamestate update we need a new json referece for the new state
    URL.revokeObjectURL(this.json ?? "");
    this.json = window.$GAME.getStateAsJsonUrl();
    this.render();
  }

  render(): void {
    render(
      html`<a download="${this.dataset.name}.json" href=${this.json!}
        >save file</a
      >`,
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
    window.$GAME.saveGsOnDB(() =>
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

if (!customElements.get("menu-bar")) {
  customElements.define("menu-bar", MenuBar);
  customElements.define("autosave-led", AutosaveLed);
  customElements.define("menu-save-file", SaveGameJson);
  customElements.define("menu-save", SaveOnDB);
  customElements.define("saved-signal", SavedSignal);
}