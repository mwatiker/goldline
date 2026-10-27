// Data Dragon: the current game version plus item, champion and summoner spell data.
// Each dataset loads once per version. The exported bindings are live: they start empty and fill in as the
// requests finish, and nothing here throws on failure (a failed load is retried on the next render).

import {CDN, FALLBACK_VERSION, HEAL_ITEMS} from "./config.js";
import {squash} from "./util.js";

export let version = FALLBACK_VERSION;
fetch(`${CDN}/api/versions.json`)
  .then(r => r.json())
  .then(versions => {
    version = versions[0];
  })
  .catch(() => {
    /* keep the fallback version */
  });

const entries = data => Object.entries(data);

// Item stats: { itemID: {FlatMagicDamageMod, FlatPhysicalDamageMod, ...} }
// Item info for tooltips and classification: { itemID: {name, desc, sub, total, final, heal, anti} }
export let itemStats = {};
export let itemInfo = {};
let itemVersion = null;

function describeItem(id, item) {
  const tags = item.tags || [];
  const total = item.gold ? item.gold.total : 0;
  return {
    name: item.name,
    desc: item.description,
    sub: total ? `${total} gold` : "",
    total,
    final: !(item.into && item.into.length) || tags.includes("Boots"),
    heal: tags.some(t => t === "LifeSteal" || t === "SpellVamp") || HEAL_ITEMS.includes(Number(id)),
    anti: /Wounds/.test(item.description || ""),
  };
}

function loadItems() {
  if (itemVersion === version) return;
  const v = (itemVersion = version);
  fetch(`${CDN}/cdn/${v}/data/en_US/item.json`)
    .then(r => r.json())
    .then(({data}) => {
      itemStats = Object.fromEntries(entries(data).map(([id, item]) => [id, item.stats || {}]));
      itemInfo = Object.fromEntries(entries(data).map(([id, item]) => [id, describeItem(id, item)]));
    })
    .catch(() => {
      itemVersion = null;
    });
}

// Champion base stats: { championId: {attackdamage, attackdamageperlevel, ...} }
// Champion info for tooltips: { championId: {name, sub, desc} }
export let champStats = {};
export let champInfo = {};
export const champIds = new Set(); // Data Dragon champion ids
export let champByName = {}; // squashed champion id or display name -> id
let champVersion = null;

function loadChampions() {
  if (champVersion === version) return;
  const v = (champVersion = version);
  fetch(`${CDN}/cdn/${v}/data/en_US/champion.json`)
    .then(r => r.json())
    .then(({data}) => {
      champStats = Object.fromEntries(entries(data).map(([id, c]) => [id, c.stats || {}]));
      champInfo = Object.fromEntries(
        entries(data).map(([id, c]) => [
          id,
          {name: c.name, sub: c.title.charAt(0).toUpperCase() + c.title.slice(1), desc: c.blurb},
        ]),
      );
      champByName = {};
      for (const [id, c] of entries(data)) {
        champIds.add(id);
        champByName[squash(id)] = id;
        champByName[squash(c.name)] = id;
      }
    })
    .catch(() => {
      champVersion = null;
    });
}

// Summoner spells: { SummonerFlash: {name, desc, sub, cd} } with cd in seconds.
export let spellInfo = {};
let spellVersion = null;

function loadSpells() {
  if (spellVersion === version) return;
  const v = (spellVersion = version);
  fetch(`${CDN}/cdn/${v}/data/en_US/summoner.json`)
    .then(r => r.json())
    .then(({data}) => {
      spellInfo = Object.fromEntries(
        Object.values(data).map(spell => [
          spell.id,
          {name: spell.name, desc: spell.description, sub: `${spell.cooldownBurn}s cooldown`, cd: spell.cooldown[0]},
        ]),
      );
    })
    .catch(() => {
      spellVersion = null;
    });
}

export function loadGameData() {
  loadItems();
  loadChampions();
  loadSpells();
}
