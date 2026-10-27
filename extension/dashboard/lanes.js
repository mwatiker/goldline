// The lane rows: one card per player, two per row, with the lane gold difference between them.

import {CDN, DEFAULT_SPELL_COOLDOWN} from "./config.js";
import {spellInfo, version} from "./ddragon.js";
import {champKey, isBuilt, itemGold, playerId, spellKey} from "./player.js";
import {$, esc, html, num, setImage, text} from "./util.js";

let lanes = [];

export const getLanes = () => lanes;

function buildSide(cls) {
  const el = document.createElement("div");
  el.className = `side ${cls}`;
  el.innerHTML = `<div class="champ" data-tip=""><img alt=""><div class="in"><div class="cname"></div><span class="lvl"></span></div></div>
    <div class="spells"><div class="sp"><img alt="" data-tip=""><span></span></div><div class="sp"><img alt="" data-tip=""><span></span></div></div>
    <div class="stat"><div class="col"><div class="kda"></div><div class="ratio"></div></div><div class="col econ"><div class="egold"></div></div></div>
    <div class="spacer"></div><div class="items"></div><div class="deadtag" hidden></div>`;
  const q = selector => el.querySelector(selector);
  return {
    el,
    champ: q(".champ"),
    splash: q(".champ img"),
    name: q(".cname"),
    level: q(".lvl"),
    playerId: null,
    spells: [...el.querySelectorAll(".spells img")],
    spellTimers: [...el.querySelectorAll(".spells span")],
    kda: q(".kda"),
    ratio: q(".ratio"),
    gold: q(".egold"),
    items: q(".items"),
    deadTag: q(".deadtag"),
  };
}

function buildLane() {
  const el = document.createElement("div");
  el.className = "lane";
  const left = buildSide("left");
  const right = buildSide("right");
  const mid = document.createElement("div");
  mid.className = "mid";
  mid.innerHTML = `<div class="d"></div><div class="r"></div>`;
  el.append(left.el, mid, right.el);
  return {el, left, right, mid, midDiff: mid.firstChild, midRole: mid.lastChild};
}

export function ensureLanes(count) {
  if (lanes.length === count) return;
  lanes = Array.from({length: count}, buildLane);
  $("lanes").replaceChildren(...lanes.map(lane => lane.el));
}

// Summoner spell cooldowns: click a spell to start its timer (and fade it), click again to reset.
// Keyed by player + slot; values are the game time (seconds) the spell comes back.
const cooldownEnds = new Map();

function cooldownLeft(key, now) {
  const end = cooldownEnds.get(key);
  if (!end) return 0;
  const left = Math.ceil(end - now);
  if (left <= 0) cooldownEnds.delete(key);
  return Math.max(left, 0);
}

export function initSpellTimers(gameTime) {
  document.addEventListener("click", e => {
    const spell = e.target.closest(".sp");
    if (!spell) return;
    const side = lanes.flatMap(lane => [lane.left, lane.right]).find(s => s.el.contains(spell));
    if (!side || !side.playerId) return;
    const slot = [...spell.parentNode.children].indexOf(spell);
    const key = `${side.playerId}:${slot}`;
    const now = gameTime();
    if (cooldownEnds.has(key)) cooldownEnds.delete(key);
    else cooldownEnds.set(key, now + ((spellInfo[spell.dataset.spell] || {}).cd || DEFAULT_SPELL_COOLDOWN));
    spell.classList.toggle("cd", cooldownEnds.has(key));
    text(side.spellTimers[slot], cooldownEnds.has(key) ? String(Math.ceil(cooldownEnds.get(key) - now)) : "");
  });
}

// Longest word in a champion name, in characters. The name shrinks to fit it (see .cname in the CSS),
// since a single long word like "Fiddlesticks" can't wrap.
const longestWord = name => Math.max(...name.split(/\s+/).map(word => word.length));

function updateSpells(side, p, now) {
  [p.summonerSpells.summonerSpellOne, p.summonerSpells.summonerSpellTwo].forEach((spell, slot) => {
    const key = spellKey(spell);
    const img = side.spells[slot];
    const cooldownKey = `${side.playerId}:${slot}`;
    const left = cooldownLeft(cooldownKey, now);
    img.parentNode.dataset.spell = key;
    img.parentNode.classList.toggle("cd", left > 0);
    text(side.spellTimers[slot], left > 0 ? String(left) : "");
    img.dataset.tip = `spell:${key}`;
    img.dataset.name = spell.displayName;
    setImage(img, `${CDN}/cdn/${version}/img/spell/${key}.png`);
  });
}

// Slots 0-5; the trinket (slot 6) isn't shown. Items sit side by side with no gaps. The row runs outward to inward on
// both sides, so components come first and finished items last, nearest the middle; slot order within each group.
function itemsMarkup(p) {
  return (p.items || [])
    .filter(item => item.slot < 6)
    .sort((a, b) => isBuilt(a) - isBuilt(b) || a.slot - b.slot)
    .map(
      item =>
        `<img src="${CDN}/cdn/${version}/img/item/${item.itemID}.png" alt="" class="${isBuilt(item) ? "done" : "part"}" data-tip="item:${item.itemID}" data-name="${esc(item.displayName)}">`,
    )
    .join("");
}

// ctx: {me: id of the viewing player, now: game time in seconds}
export function updateSide(side, p, ctx) {
  side.el.style.visibility = p ? "" : "hidden";
  if (!p) return;

  const key = champKey(p);
  side.champ.dataset.tip = `champ:${key}`;
  side.champ.dataset.name = p.championName;
  setImage(side.splash, `${CDN}/cdn/img/champion/splash/${key}_0.jpg`);
  text(side.name, p.championName);
  const longest = longestWord(p.championName);
  if (side.name._longest !== longest) {
    side.name._longest = longest;
    side.name.style.setProperty("--n", longest);
  }
  text(side.level, String(p.level));
  side.playerId = playerId(p);
  updateSpells(side, p, ctx.now);

  const {kills, deaths, assists} = p.scores;
  html(side.kda, `${kills}<i>/</i>${deaths}<i>/</i>${assists}`);
  text(side.ratio, `${((kills + assists) / Math.max(deaths, 1)).toFixed(1)} KDA`);
  html(side.gold, `<i class="coin"></i>${num(itemGold(p))}`);
  html(side.items, itemsMarkup(p));

  side.el.classList.toggle("dead", Boolean(p.isDead));
  side.el.classList.toggle("you", side.playerId === ctx.me);
  side.deadTag.hidden = !p.isDead;
  if (p.isDead) text(side.deadTag, `DEAD · ${Math.ceil(p.respawnTimer)}s`);
}
