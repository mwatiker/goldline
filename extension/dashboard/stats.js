// Estimated damage and resistance from items and champion base stats.
// Runes, buffs and passives aren't included.

import {HEARTSTEEL, RABADON} from "./config.js";
import {champStats, itemStats} from "./ddragon.js";
import {champKey} from "./player.js";
import {num} from "./util.js";

// Per-level stat growth is not linear: stat = base + perLevel * (n * (0.7025 + 0.0175 * n)) for n = level - 1.
const growth = n => n * (0.7025 + 0.0175 * n);

// Estimated bonus AD (items), base AD (champion + level) and AP from items, plus bonus AR and MR (items) and base AR and MR
// (champion + level).
export function itemPower(items, champ, level) {
  let ad = 0;
  let ap = 0;
  let ar = 0;
  let mr = 0;
  let heartsteels = 0;
  let hasRabadon = false;
  for (const item of items) {
    const stats = itemStats[item.itemID] || {};
    if (item.itemID === HEARTSTEEL) heartsteels += item.count;
    if (item.itemID === RABADON) hasRabadon = true;
    ad += (stats.FlatPhysicalDamageMod || 0) * item.count;
    ap += (stats.FlatMagicDamageMod || 0) * item.count;
    ar += (stats.FlatArmorMod || 0) * item.count;
    mr += (stats.FlatSpellBlockMod || 0) * item.count;
  }
  if (hasRabadon) ap *= 1.3;
  const base = champStats[champ] || {};
  const g = growth(level - 1);
  const baseAd = (base.attackdamage || 0) + (base.attackdamageperlevel || 0) * g;
  return {
    ad: Math.round(ad),
    baseAd: Math.round(baseAd),
    ap: Math.round(ap),
    ar: Math.round(ar),
    mr: Math.round(mr),
    baseAr: Math.round((base.armor || 0) + (base.armorperlevel || 0) * g),
    baseMr: Math.round((base.spellblock || 0) + (base.spellblockperlevel || 0) * g),
    hs: heartsteels,
  };
}

// Share of damage blocked by a resist value (negative resist increases damage taken).
export const reduction = resist => (resist >= 0 ? resist / (100 + resist) : 1 - (2 - 100 / (100 - resist)));

// Team damage mix and resists. Physical = each player's bonus AD from items (inherent base AD excluded), magic = their AP;
// armor and MR likewise count only the bonus from items. 1 AD is treated as equal to 1 AP. The % blocked is the average of each player's damage reduction, before penetration.
// With mode "avg" the figures are per player, otherwise team totals.
export function teamPower(players, mode) {
  let phys = 0;
  let magic = 0;
  let ar = 0;
  let mr = 0;
  let arBlocked = 0;
  let mrBlocked = 0;
  let heartsteels = 0;
  for (const p of players) {
    const power = itemPower(p.items || [], champKey(p), p.level);
    phys += power.ad;
    magic += power.ap;
    ar += power.ar;
    mr += power.mr;
    heartsteels += power.hs;
    arBlocked += reduction(power.ar);
    mrBlocked += reduction(power.mr);
  }
  const count = players.length || 1;
  const divisor = mode === "avg" ? count : 1;
  const items = phys + magic;
  const physPct = items ? Math.round((100 * phys) / items) : 50;
  const fmt = value => num(value / divisor);
  return {
    items,
    pp: physPct,
    mp: 100 - physPct,
    hs: heartsteels,
    phys: fmt(phys),
    magic: fmt(magic),
    ar: fmt(ar),
    mr: fmt(mr),
    arBlock: `${Math.round((100 * arBlocked) / count)}%`,
    mrBlock: `${Math.round((100 * mrBlocked) / count)}%`,
  };
}
