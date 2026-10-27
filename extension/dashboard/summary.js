// Team damage and resistance summaries, with a toggle between per-player averages and team totals.

import {storage} from "./util.js";

const MODE_KEY = "damageMode";
const MODE_LABEL = {avg: "per player", total: "total"};
// Segments narrower than this share of the damage bar don't get a percentage label.
const MIN_LABELLED_PCT = 14;

let mode = storage.get(MODE_KEY) === "total" ? "total" : "avg";

export const damageMode = () => mode;

export function syncToggleLabel() {
  const label = document.querySelector("#tog .mode");
  if (label) label.textContent = MODE_LABEL[mode];
}

// Calls onChange after the mode flips so the caller can redraw.
export function initToggle(onChange) {
  document.addEventListener("click", e => {
    if (!(e.target.closest && e.target.closest("#tog"))) return;
    mode = mode === "avg" ? "total" : "avg";
    storage.set(MODE_KEY, mode);
    onChange();
  });
  syncToggleLabel();
}

// No extra markup beside the blocks.
export const NO_ASIDE = {};

// Markup for one team's damage and resistance blocks. `aside` may add markup to each block:
// {damage, resistance, label}.
export function summaryMarkup(who, t, aside = NO_ASIDE) {
  const damageLabel = pct => (t.items && pct >= MIN_LABELLED_PCT ? `${pct}%` : "");
  const heartsteel = t.hs
    ? `<div class="cap faint">+ Heartsteel damage not counted (${t.hs} Heartsteel${t.hs > 1 ? "s" : ""})</div>`
    : "";
  return `<div class="blk">${aside.damage || ""}
      <h3>${who} DAMAGE</h3>
      <div class="dbar"><div class="p" style="width:${t.pp}%">${damageLabel(t.pp)}</div><div class="m">${damageLabel(t.mp)}</div></div>
      <div class="pair"><div><div class="num">${t.phys}</div><div class="cap phys">physical</div></div><div class="r"><div class="num">${t.magic}</div><div class="cap magic">magic</div></div></div>
      ${heartsteel}
    </div>
    <div class="blk">${aside.resistance || ""}
      <h3>${who} RESISTANCE</h3>
      <div class="res">
        <div class="a"><small>ARMOR</small><div class="num">${t.ar}</div><div class="cap">blocks ${t.arBlock} <span class="phys">physical</span></div></div>
        <div class="m"><small>MAGIC RESIST</small><div class="num">${t.mr}</div><div class="cap">blocks ${t.mrBlock} <span class="magic">magic</span></div></div>
      </div>
    </div>${aside.label || ""}`;
}
