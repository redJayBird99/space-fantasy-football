import { TemplateResult, render, html, nothing } from "lit-html";
import { GameState } from "../../game-state/game-state";
import simOps from "../../app-state/sim-options.json";
import { daysBetween } from "../../util/math";
import * as _ps from "../util/props-state";
import {
  simulate,
  isSimulating,
  isSimDisabled,
  SimEndEvent,
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

  return html`
    <div class="game-date">
      <div><span>Date</span> <time>${date}</time></div>
      <div>${dateEventInfo()}</div>
    </div>
  `;
}

/** return some textual information on the current game date */
function dateEventInfo(): string {
  switch (window.$game.state!.flags.onGameEvent) {
    case "draftStart":
      return "Draft day";
    case "draft":
      return "Drafting";
    case "retiring":
      return "Retiring day";
    case "simRound":
      return "Post-match";
    case "openTradeWindow":
      return "transfer window start";
    case "openFreeSigningWindow":
      return "free agency start";
    case "seasonEnd":
      return "End of season";
    case "seasonStart":
      return "Start of season";
    case "updateContracts":
      return "re-signing";
    default:
      return "Idle";
  }
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
    if (
      isSimulating() ||
      isSimDisabled(window.$game.state!) ||
      !this.askPermissionToProceed()
    ) {
      return;
    }

    this.simCloser = simulate(
      structuredClone(window.$game.state!),
      this.handleSimTick,
      this.handleSimEnd,
      window.$appState.simOptions.duration as SimEndEvent | undefined
    );

    window.$appState.simOptions.duration = undefined; // clean after the usage, return to the default
    this.render();
  };

  renderSim(): TemplateResult {
    return html`
      <sff-modal .closeHandler=${this.handleCloseModal}>
        ${visualSim(this.state.simGs)}
      </sff-modal>
    `;
  }

  renderDisabledDescription(): TemplateResult {
    // for now only for drafting in the future for all condition
    return html`<p id="play-disabled-desc">
      ⚠ disabled until you draft a player
    </p>`;
  }

  /** notify the user he could loose the opportunity to re-sign expiring contracts */
  askPermissionToProceed(): boolean {
    if (window.$game.state?.flags.onGameEvent === "updateContracts") {
      return confirm(
        "your team will lose all not re-signed player, are you sure you want to proceed"
      );
    }

    return true;
  }

  render(): void {
    const dis = isSimDisabled(window.$game.state!);

    render(
      html`
        <button
          @click=${this.handlePlayClick}
          ?disabled=${dis}
          class="btn btn--acc"
          aria-label="play the simulation"
          aria-describedby=${dis ? "play-disabled-desc" : nothing}
        >
          play
        </button>
        ${dis ? this.renderDisabledDescription() : nothing}
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
    window.$appState.simOptions.duration = dur.value;
    window.$appState.simOptions.tickInterval = Number(speed.value);
    onApply();
  };

  return html`
    <section class="sim-options">
      <label for="js-sim-duration">choose a simulation duration</label>
      <select id="js-sim-duration">
        ${simSelectOptions(simDurationOptions())}
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
function simSelectOptions(options: [string, any][]): TemplateResult[] {
  const ops = window.$appState.simOptions;
  const selected = (v: unknown) => v === ops.duration || v === ops.tickInterval;

  return options.map((e) =>
    selected(e[1])
      ? html`<option selected value=${e[1]}>${e[0]}</option>`
      : html`<option value=${e[1]}>${e[0]}</option>`
  );
}

type durOps = [string, SimEndEvent][];

/** find some sim duration options, usually are:
 * - oneDay
 * - one between seasonEnd or seasonStart (which one was found in the eventQueue)
 * - and the next closest event between: updateContract draftStart, draft, openFreeSigningWindow, openTradeWindow, simRound and retiring
 */
function simDurationOptions(): durOps {
  // TODO this code needs refactoring
  const gs = window.$game.state!;
  const userDrafted = !gs.drafts.now.lottery.some((t) => t === gs.userTeam);
  const eQueue = gs.eventQueue;
  const hasEvent = (e: SimEndEvent) => eQueue.some((evt) => evt.type === e);
  const immediate: durOps = [
    ["until draft", "draftStart"],
    [userDrafted ? "until end of draft" : "until your pick", "draft"],
    ["until free agency", "openFreeSigningWindow"],
    ["until transfer window", "openTradeWindow"],
    ["until next match", "simRound"],
    ["until retiring", "retiring"],
    ["until re-sign", "updateContracts"],
  ];
  const qEvt = eQueue.find((e) => immediate.find((n) => n[1] === e.type));
  const nextEvent = immediate.find((e) => e[1] === qEvt?.type);

  const defaults: durOps = [
    ["until end of season", "seasonEnd"],
    ["until start of season", "seasonStart"],
  ];

  const rst: durOps = [
    ["one day", "oneDay"],
    ...defaults.filter((e) => hasEvent(e[1])),
  ];
  nextEvent && rst.push(nextEvent);
  return sortSimDurationOps(rst);
}

/** sort the given option by time closeness and add the missing days to
 * reach the target ( expect for oneDay) */
function sortSimDurationOps(ops: durOps): durOps {
  // TODO this code needs refactoring
  const now = window.$game.state!.date;
  const eQueue = window.$game.state!.eventQueue;
  const sortOps = ops
    .map((o) => ({
      days: daysBetween(now, eQueue.find((e) => e.type === o[1])?.date ?? now),
      op: o,
    }))
    .sort((a, b) => a.days - b.days);
  sortOps.forEach((o) => {
    if (o.op[1] !== "oneDay") {
      o.op[0] += o.days === 1 ? " (1 day)" : ` (${o.days} days)`;
    }
  });

  return sortOps.map((o) => o.op);
}

if (!customElements.get("sim-controls")) {
  customElements.define("sim-controls", SimControls);
  customElements.define("play-sim", PlaySim);
  customElements.define("btn-sim-options", BtnSimOptions);
}
