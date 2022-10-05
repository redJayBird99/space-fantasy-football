import { TemplateResult, render, html, nothing } from "lit-html";
import { GameState } from "../../game-state/game-state";
import simOps from "../../app-state/sim-options.json";
import * as _ps from "../util/props-state";
import {
  simulate,
  isSimulating,
  isSimDisabled,
} from "../../game-sim/game-simulation";
import style from "./sim-controls.css";

class SimControls extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    if (this.isConnected) {
      window.$game.addObserver(this);
      this.render();
    }
  }

  gameStateUpdated(): void {
    this.render();
  }

  disconnectedCallback() {
    window.$game.removeObserver(this);
  }

  render(): void {
    render(
      html`
        <style>
          ${style}
        </style>
        ${gameDate()}
        <play-sim></play-sim>
        <btn-sim-options></btn-sim-options>
      `,
      this.shadowRoot!
    );
  }
}

/** display the current game date, but not the time (it isn't used in game) */
function gameDate(): TemplateResult {
  const date =
    window.$game.state?.date.toLocaleDateString("en-GB", {
      dateStyle: "medium",
    }) ?? "";

  return html`<div class="game-date">
    <span>Date</span><time>${date}</time>
  </div>`;
}

/** the play button to start the game simulation and customizable options */
class PlaySim extends HTMLElement {
  private simCloser: ReturnType<typeof simulate> | undefined;
  private state = _ps.newState({} as { simGs?: Readonly<GameState> }, () =>
    this.render()
  );

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

  handleCloseModal = () => {
    this.simCloser?.();
  };

  /** save the given gameState */
  handleSimEnd = (gs: Readonly<GameState>) => {
    window.$game.state = gs;
    window.$game.saveGsOnDB();
    this.render();
  };

  /** update the sim game state */
  handleSimTick = (simGs: Readonly<GameState>) => {
    _ps.setState(() => Object.assign(this.state, { simGs }));
  };

  /** only play a simulation at the time */
  handlePlayClick = () => {
    if (isSimulating() || isSimDisabled(window.$game.state!)) {
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
        ${visualSim(this.state.simGs)}
      </sff-modal>
    `;
  }

  render(): void {
    render(
      html`
        <button
          @click=${this.handlePlayClick}
          ?disabled=${isSimDisabled(window.$game.state!)}
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
      this.render();
    }
  }

  handleOptionsClick = () => {
    this.open = !this.open;
    this.render();
  };

  render() {
    render(
      html`
        <button
          aria-label="${this.open ? "close" : "open"} sim options"
          @click=${this.handleOptionsClick}
          class="btn btn--acc"
        >
          ⚙
        </button>
        ${this.open ? simOptions(this.handleOptionsClick) : nothing}
      `,
      this
    );
  }
}

/** show the current state of the simulation */
function visualSim(gs?: Readonly<GameState>): TemplateResult {
  const d = gs?.date.toLocaleDateString("en-GB", { dateStyle: "full" }) ?? "";
  return html`<div class="visual-sim" aria-live="polite">${d}</div>`;
}

/**
 * a simulation options menu for user customization
 * @param onApply called when the apply btn is clicked
 */
function simOptions(onApply: () => void): TemplateResult {
  /** update the simOptions with what the user chooses and call the onApply */
  const handleClickApply = (e: Event) => {
    const cnt = (e.target as HTMLElement).parentElement!;
    const dur = cnt.querySelector("#js-sim-duration") as HTMLSelectElement;
    const speed = cnt.querySelector("#js-sim-speed") as HTMLSelectElement;
    window.$appState.simOptions.duration = Number(dur.value);
    window.$appState.simOptions.tickInterval = Number(speed.value);
    onApply();
  };

  return html`
    <section class="sim-options">
      <label for="js-sim-duration">choose a simulation duration</label>
      <select id="js-sim-duration">
        ${simSelectOptions(Object.entries(simOps.duration))}
      </select>
      <label for="js-sim-speed">choose a simulation speed</label>
      <select selected id="js-sim-speed">
        ${simSelectOptions(Object.entries(simOps.speed))}
      </select>
      <button class="btn btn--acc" @click=${handleClickApply}>apply</button>
    </section>
  `;
}

/** render the selectable sim option  */
function simSelectOptions(options: [string, number][]): TemplateResult[] {
  const ops = window.$appState.simOptions;
  const selected = (v: unknown) => v === ops.duration || v === ops.tickInterval;

  return options.map((e) =>
    selected(e[1])
      ? html`<option selected value=${e[1]}>(current) ${e[0]}</option>`
      : html`<option value=${e[1]}>${e[0]}</option>`
  );
}

if (!customElements.get("sim-controls")) {
  customElements.define("sim-controls", SimControls);
  customElements.define("play-sim", PlaySim);
  customElements.define("btn-sim-options", BtnSimOptions);
}
