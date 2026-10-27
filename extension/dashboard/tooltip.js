// Hover tooltips. Elements carry data-tip="kind:id" and data-name (shown until the data loads).

import {champInfo, itemInfo, spellInfo} from "./ddragon.js";
import {esc, plain} from "./util.js";

const OFFSET_X = 14;
const OFFSET_Y = 18;
const EDGE = 4;

const tooltip = document.createElement("div");
let activeKey = null;
let fallbackName = "";

function infoFor(key) {
  const [kind, id] = key.split(":");
  if (kind === "item") return itemInfo[id];
  if (kind === "spell") return spellInfo[id];
  if (kind === "champ") return champInfo[id];
}

function show() {
  const info = infoFor(activeKey) || {name: fallbackName};
  tooltip.innerHTML =
    `<b>${esc(info.name || fallbackName)}</b>` +
    (info.sub ? `<small>${esc(info.sub)}</small>` : "") +
    (info.desc ? `<p>${plain(info.desc)}</p>` : "");
  tooltip.hidden = false;
}

function hide() {
  activeKey = null;
  tooltip.hidden = true;
}

function place(e) {
  const w = tooltip.offsetWidth;
  const h = tooltip.offsetHeight;
  const flipUp = e.clientY + OFFSET_Y + h > innerHeight;
  tooltip.style.left = `${Math.max(EDGE, Math.min(e.clientX + OFFSET_X, innerWidth - w - EDGE))}px`;
  tooltip.style.top = `${Math.max(EDGE, flipUp ? e.clientY - h - 12 : e.clientY + OFFSET_Y)}px`;
}

export function initTooltip() {
  tooltip.id = "tip";
  tooltip.hidden = true;
  document.body.appendChild(tooltip);

  document.addEventListener("mousemove", e => {
    const target = e.target.closest && e.target.closest("[data-tip]");
    if (!target) return hide();
    if (target.dataset.tip !== activeKey) {
      activeKey = target.dataset.tip;
      fallbackName = target.dataset.name || "";
      show();
    }
    place(e);
  });
  document.addEventListener("mouseleave", hide);
}
