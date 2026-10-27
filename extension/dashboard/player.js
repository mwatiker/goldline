// Helpers for players and items as the live client API reports them.

import {BUILT_MIN_PRICE} from "./config.js";
import {champByName, champIds, itemInfo} from "./ddragon.js";
import {squash} from "./util.js";

// Stable identity for a player across polls.
export const playerId = p => p.riotId || p.summonerName;

// Data Dragon champion id for a live-API player. rawChampionName is usually "game_character_displayname_<id>", but not always
// (Seraphine arrives as "Character_Seraphine_Name"). Once Data Dragon has loaded, an id it doesn't know falls back to
// matching the display name.
export function champKey(p) {
  const key = (p.rawChampionName || "")
    .replace(/^game_character_displayname_/, "")
    .replace(/^Character_(.+)_Name$/, "$1");
  if (!champIds.size || champIds.has(key)) return key;
  return champByName[squash(p.championName || "")] || key;
}

// Riot's live API uses internal names for upgraded spells (S12_SummonerTeleportUpgrade, S5_SummonerSmitePlayerGanker);
// Data Dragon only has the base spell.
export function spellKey(spell) {
  const key = ((spell.rawDisplayName || "").match(/SummonerSpell_(.+?)_DisplayName/) || [])[1];
  return (
    key &&
    key
      .replace(/^S\d+_/, "")
      .replace(/^(SummonerSmite)\w*/, "$1")
      .replace(/^(SummonerTeleport)\w*/, "$1")
  );
}

export const isBuilt = item => {
  const info = itemInfo[item.itemID];
  return Boolean(info) && info.final && info.total >= BUILT_MIN_PRICE;
};

// The live API's price is not always the full cost of a built item, so prefer Data Dragon's total and fall back to it.
const itemCost = item => {
  const info = itemInfo[item.itemID];
  return info && info.total ? info.total : item.price;
};

export const itemGold = p => (p.items || []).reduce((sum, item) => sum + itemCost(item) * item.count, 0);
