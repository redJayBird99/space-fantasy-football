import { TemplateResult, render, html, nothing } from "lit-html";
import simOps from "../../app-state/sim-options.json";
import { daysBetween } from "../../util/math";
import * as _ps from "../util/props-state";
import { sim, type GameState } from "../../game/game";
import style from "./sim-controls.css";
import { goTo } from "../util/router";
import { HTMLSFFGameElement } from "./html-game-element";
import { createRef, Ref, ref } from "lit-html/directives/ref.js";
import { mainStyleSheet } from "../style-sheets";

class SimControls extends HTMLSFFGameElement {
  gName?: string; // named group of the matched URL passed as property

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  render(): void {
    render(
      html`
        ${mainStyleSheet.cloneNode(true)}
        <style>
          ${style}
        </style>
        ${gameDate()}
        <play-sim .gName=${this.gName}></play-sim>
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
    <div class="game-date text-sm">
      <div><time>${date}</time></div>
      <div>${dateEventInfo()}</div>
    </div>
  `;
}

/** return some textual information on the current game date */
function dateEventInfo(): string {
  switch (window.$game.state!.flags.onGameEvent) {
    case "draftStart":
      return "Draft";
    case "draft":
      return "Draft End";
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
class PlaySim extends HTMLSFFGameElement {
  gName?: string; // named group of the matched URL passed as property
  private simCloser: ReturnType<typeof sim.simulate> | undefined;
  private state = _ps.newState({} as { simGs?: Readonly<GameState> }, () =>
    this.render()
  );

  disconnectedCallback() {
    this.handleCloseModal();
    super.disconnectedCallback();
  }

  handleCloseModal = () => {
    this.simCloser?.();
  };

  /** save the given gameState and sometimes redirect to some page when on some specific game date */
  handleSimEnd = (gs: Readonly<GameState>) => {
    /** check if should redirect to a specific page when on a specific event */
    if (gs.flags.onGameEvent === "draftStart") {
      goTo(`/${this.gName!}/draft`);
    } else if (gs.flags.onGameEvent === "updateContracts") {
      goTo(`/${this.gName!}/finances`);
    } else if (gs.flags.onGameEvent === "retiring") {
      goTo(`/${this.gName!}/retiring`);
    } else if (gs.flags.onGameEvent === "openFreeSigningWindow") {
      goTo(`/${this.gName!}/players?team=free+agent`);
    } else if (gs.flags.onGameEvent === "openTradeWindow") {
      goTo(`/${this.gName!}/trade`);
    }

    // unfortunately will cause a double rendering for some elements
    window.$game.state = gs;
    window.$game.saveGsOnDB();
  };

  /** update the sim game state */
  handleSimTick = (simGs: Readonly<GameState>) => {
    _ps.setState(() => Object.assign(this.state, { simGs }));
  };

  /** only play a simulation at the time */
  handlePlayClick = () => {
    if (
      sim.isSimulating() ||
      sim.isSimDisabled(window.$game.state!) ||
      !this.askPermissionToProceed()
    ) {
      return;
    }

    this.simCloser = sim.simulate(
      structuredClone(window.$game.state!),
      this.handleSimTick,
      this.handleSimEnd,
      window.$appState.simOptions.duration as sim.SimEndEvent | undefined
    );

    window.$appState.simOptions.duration = undefined; // clean after the usage, return to the default
    this.render();
  };

  renderSim(): TemplateResult {
    return html`
      <sff-modal .closeHandler=${this.handleCloseModal}>
        <h2 class="dig-label" slot="title">Simulating</h2>
        ${visualSim(this.state.simGs)}
      </sff-modal>
    `;
  }

  getDisabledDescription(): string {
    const gs = window.$game.state!;

    if (gs.flags.userDrafting) {
      return "⚠ disabled until you draft a player";
    }
    if (!gs.flags.canSimRound) {
      if (gs.flags.whyIsSimDisabled === "underMinTeamSize") {
        return `⚠ disabled your team has too few players`;
      }
      if (gs.flags.whyIsSimDisabled === "missingLineup") {
        return `⚠ disabled your team lineup is incomplete`;
      }
    }

    return "";
  }

  renderDisabledDescription(): TemplateResult {
    // for now only for drafting in the future for all condition
    return html`<p id="play-disabled-desc">
      ${this.getDisabledDescription()}
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
    const dis = sim.isSimDisabled(window.$game.state!);

    render(
      html`
        <button
          @click=${this.handlePlayClick}
          ?disabled=${dis}
          class="btn btn--acc icon-bg-btn play-btn"
          aria-label="play the simulation"
          aria-describedby=${dis ? "play-disabled-desc" : nothing}
        ></button>
        ${dis ? this.renderDisabledDescription() : nothing}
        ${sim.isSimulating() ? this.renderSim() : nothing}
      `,
      this
    );
  }
}

/** open and close the simOption menu */
class BtnSimOptions extends HTMLSFFGameElement {
  private dialogRef: Ref<HTMLDialogElement> = createRef();

  handleOpenOptions = () => {
    this.dialogRef.value!.show();
  };

  handleCloseOptions = () => {
    this.dialogRef.value!.close();
  };

  render() {
    render(
      html`
        <button
          aria-label="open sim options"
          @click=${this.handleOpenOptions}
          class="btn sim-btn icon-bg-btn"
        ></button>
        <dialog
          ${ref(this.dialogRef)}
          class="sim-ops-dialog bg-650"
          aria-labelledby="dig-ops-title"
        >
          <div class="dig-head">
            <h2 id="dig-ops-title" class="dig-title">Sim options</h2>
            <button
              autofocus
              @click=${this.handleCloseOptions}
              class="btn-close self-center"
              aria-label="close dialog"
            ></button>
          </div>
          ${simOptions(this.handleCloseOptions)}
        </dialog>
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
  const onSubmit = (e: Event) => {
    e.preventDefault();
    const cnt = (e.target as HTMLElement).parentElement!;
    const dur = cnt.querySelector("#js-sim-duration") as HTMLSelectElement;
    const speed = cnt.querySelector("#js-sim-speed") as HTMLSelectElement;
    window.$appState.simOptions.duration = dur.value;
    window.$appState.simOptions.tickInterval = Number(speed.value);
    onApply();
  };

  return html`
    <form class="sim-options" @submit=${onSubmit}>
      <label for="js-sim-duration">choose a simulation duration</label>
      <select class="form-select" id="js-sim-duration">
        ${simSelectOptions(simDurationOptions())}
      </select>
      <label for="js-sim-speed">choose a simulation speed</label>
      <select class="form-select" id="js-sim-speed">
        ${simSelectOptions(Object.entries(simOps.speed))}
      </select>
      <button class="btn btn-rounded btn--acc">apply</button>
    </form>
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

type durOps = [string, sim.SimEndEvent][];

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
  const hasEvent = (e: sim.SimEndEvent) => eQueue.some((evt) => evt.type === e);
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

export default function define() {
  if (!customElements.get("sim-controls")) {
    customElements.define("sim-controls", SimControls);
    customElements.define("play-sim", PlaySim);
    customElements.define("btn-sim-options", BtnSimOptions);
  }
}
