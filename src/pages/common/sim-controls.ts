import { TemplateResult, render, html, nothing } from "lit-html";
import { GameState } from "../../game-state/game-state";
import simOps from "../../app-state/sim-options.json";
import * as _ps from "../util/props-state";
import {
  simulate,
  isSimulating,
  setTickInterval,
  DEFAULT_TICK_INTERVAL,
} from "../../game-sim/game-simulation";
import style from "./sim-controls.css";

class SimControls extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    if (this.isConnected) {
      this.render();
    }
  }

  gameStateUpdated(): void {
    this.render();
  }

  render(): void {
    render(
      html`
        <style>
          ${style}
        </style>
        <game-date></game-date>
        <play-sim></play-sim>
        <btn-sim-options></btn-sim-options>
      `,
      this.shadowRoot!
    );
  }
}

class GameDate extends HTMLElement {
  connectedCallback() {
    if (this.isConnected) {
      window.$game.addObserver(this);
      this.render();
    }
  }

  disconnectedCallback() {
    window.$game.removeObserver(this);
  }

  gameStateUpdated(): void {
    this.render();
  }

  render(): void {
    const date =
      window.$game.state?.date.toLocaleDateString("en-GB", {
        dateStyle: "medium",
      }) ?? "";

    render(html`<span>Date</span><time>${date}</time>`, this);
  }
}

/** the play button to start the game simulation and customizable options */
class PlaySim extends HTMLElement {
  private simCloser: ReturnType<typeof simulate> | undefined;
  private state = _ps.newState(
    { childProps: _ps.newProps({} as { gs?: Readonly<GameState> }) },
    () => this.render()
  );

  connectedCallback() {
    if (this.isConnected) {
      this.render();
    }
  }

  handleCloseModal = () => {
    this.simCloser?.();
  };

  /** save the given gameState */
  handleSimEnd = (gs: Readonly<GameState>) => {
    window.$game.state = gs;
    window.$game.saveGsOnDB();
    this.render();
  };

  /** update the visual sim proprs with the given gs */
  handleSimTick = (gs: Readonly<GameState>) => {
    _ps.setState(() => {
      _ps.setProps(() => Object.assign(this.state.childProps, { gs }));
      return this.state;
    });
  };

  /** only play a simulation at the time */
  handlePlayClick = () => {
    if (isSimulating()) {
      return;
    }

    const duration = window.$appState.simOptions.duration;
    this.simCloser = simulate(
      structuredClone(window.$game.state!),
      this.handleSimTick,
      this.handleSimEnd,
      duration === 0 ? undefined : duration
    );

    this.render();
  };

  renderSim(): TemplateResult {
    return html`
      <sff-modal .closeHandler=${this.handleCloseModal}>
        <visual-sim
          data-modf=${this.state.childProps[_ps.MODF]}
          .props=${this.state.childProps}
        ></visual-sim>
      </sff-modal>
    `;
  }

  render(): void {
    render(
      html`
        <button
          @click=${this.handlePlayClick}
          class="btn btn--acc"
          aria-label="play the simulation"
        >
          play
        </button>
        ${isSimulating() ? this.renderSim() : nothing}
      `,
      this
    );
  }
}

/** open and close the simOption menu */
class BtnSimOptions extends HTMLElement {
  private open = false;

  connectedCallback() {
    if (this.isConnected) {
      this.addEventListener("simOptionChanged", this.handleOptionsClick);
      this.render();
    }
  }

  disconnectedCallback() {
    this.removeEventListener("simOptionChanged", this.handleOptionsClick);
  }

  handleOptionsClick = () => {
    this.open = !this.open;
    this.render();
  };

  render() {
    render(
      html`
        <button @click=${this.handleOptionsClick} class="btn btn--acc">
          ${this.open ? "close" : "open"} sim options
        </button>
        ${this.open ? html`<sim-options></sim-options>` : nothing}
      `,
      this
    );
  }
}

/** show the current state of the simulation */
class VisualSim extends HTMLElement {
  private props?: Readonly<_ps.Props & { gs?: Readonly<GameState> }>;

  connectedCallback() {
    if (this.isConnected) {
      this.render();
    }
  }

  static get observedAttributes() {
    return ["data-modf"];
  }

  attributeChangedCallback(name: string, old: string | null) {
    // the first render is left to connectedCallback
    if (name === "data-modf" && old !== null) {
      this.render();
    }
  }

  render(): void {
    this.setAttribute("aria-live", "polite");
    this.textContent =
      this.props?.gs?.date.toLocaleDateString("en-GB", {
        dateStyle: "full",
      }) ?? "";
  }
}

/**
 * a simulation options menu for user customization,
 * it fires a simOptionChanged event on user change
 */
class SimOptions extends HTMLElement {
  connectedCallback() {
    if (this.isConnected) {
      this.render();
    }
  }

  /** update the state of the simOptions with what the user chooses */
  handleClickApply = () => {
    const dur = this.querySelector("#js-sim-duration") as HTMLSelectElement;
    const speed = this.querySelector("#js-sim-speed") as HTMLSelectElement;
    window.$appState.simOptions.duration = Number(dur.value);
    window.$appState.simOptions.speed = Number(speed.value);
    setTickInterval(DEFAULT_TICK_INTERVAL / window.$appState.simOptions.speed);
    this.dispatchEvent(new CustomEvent("simOptionChanged", { bubbles: true }));
  };

  /** check if the value is a current setted simOption */
  ckeckIfSelected(value: unknown): boolean {
    return (
      value === window.$appState.simOptions.duration ||
      value === window.$appState.simOptions.speed
    );
  }

  renderOptions(entries: [string, number][]): TemplateResult[] {
    return entries.map((e) =>
      this.ckeckIfSelected(e[1])
        ? html`<option selected value=${e[1]}>(current) ${e[0]}</option>`
        : html`<option value=${e[1]}>${e[0]}</option>`
    );
  }

  render(): void {
    render(
      html`
        <label for="js-sim-duration">choose a simulation duration</label>
        <select id="js-sim-duration">
          ${this.renderOptions(Object.entries(simOps.duration))}
        </select>
        <label for="js-sim-speed">choose a simulation speed</label>
        <select selected id="js-sim-speed">
          ${this.renderOptions(Object.entries(simOps.speed))}
        </select>
        <button class="btn btn--acc" @click=${this.handleClickApply}>
          apply
        </button>
      `,
      this
    );
  }
}

if (!customElements.get("sim-controls")) {
  customElements.define("sim-controls", SimControls);
  customElements.define("play-sim", PlaySim);
  customElements.define("visual-sim", VisualSim);
  customElements.define("sim-options", SimOptions);
  customElements.define("game-date", GameDate);
  customElements.define("btn-sim-options", BtnSimOptions);
}
