// Enemy healing notice: shown while at least HEAL_MIN enemies have a healing source, with advice on antiheal.

import {HEAL_CHAMPS, HEAL_HEAVY, HEAL_HOLD, HEAL_MIN} from "./config.js";
import {itemInfo} from "./ddragon.js";
import {champKey, isBuilt} from "./player.js";
import {$, esc, html} from "./util.js";

// Game time of the last moment enough enemies had a healing source; null when the notice isn't showing.
let healSince = null;

const joinMarkup = (list, fn) => list.map(fn).join("");

// Enemy players with a healing source: a built item or a kit healer.
function healingSources(enemies) {
  return enemies
    .map(p => {
      const via = (p.items || [])
        .filter(i => isBuilt(i) && (itemInfo[i.itemID] || {}).heal)
        .map(i => itemInfo[i.itemID].name);
      if (HEAL_CHAMPS.includes(champKey(p))) via.push("kit");
      return {name: p.championName, via};
    })
    .filter(s => s.via.length);
}

// Teammates who already have Grievous Wounds. A component counts, since buying it early is right.
function antihealCover(allies) {
  return allies
    .map(p => ({
      name: p.championName,
      via: (p.items || []).filter(i => (itemInfo[i.itemID] || {}).anti).map(i => itemInfo[i.itemID].name),
    }))
    .filter(c => c.via.length);
}

export function renderInsight(enemies, allies, now) {
  const el = $("insight");
  const sources = healingSources(enemies);
  if (sources.length >= HEAL_MIN) healSince = now;
  if (healSince === null || now - healSince > HEAL_HOLD) {
    healSince = null;
    html(el, "");
    el.hidden = true;
    return;
  }

  const cover = antihealCover(allies);
  el.hidden = false;
  el.className = sources.length >= HEAL_HEAVY ? "heavy" : "";
  html(
    el,
    `<h3>ENEMY HEALING</h3>
    <div class="who">${joinMarkup(sources, s => `<span>${esc(s.name)}<small>${esc(s.via.join(", "))}</small></span>`)}</div>
    <div class="advice ${cover.length ? "ok" : ""}">${
      cover.length
        ? `&#10003; Antiheal covered: ${cover.map(c => `${esc(c.name)} (${esc(c.via[0])})`).join(", ")}`
        : "Consider antiheal"
    }</div>`,
  );
}
