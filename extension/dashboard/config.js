// Constants shared across the dashboard.

// Riot's Data Dragon: public game data and images.
export const CDN = "https://ddragon.leagueoflegends.com";
// Patch used until the current version list has loaded.
export const FALLBACK_VERSION = "16.21.1";

// The running game serves its live data here; the extension's host permission lets the page read it directly.
export const LIVE_URL = "https://127.0.0.1:2999/liveclientdata/allgamedata";
// Polling interval in milliseconds while a game is live, and while waiting for one.
export const POLL_LIVE_MS = 1000;
export const POLL_IDLE_MS = 3000;
export const REQUEST_TIMEOUT_MS = 2000;

export const ROLES = ["TOP", "JUNGLE", "MIDDLE", "BOTTOM", "UTILITY"];
export const ROLE_LABEL = {TOP: "TOP", JUNGLE: "JNG", MIDDLE: "MID", BOTTOM: "BOT", UTILITY: "SUP"};
// Summoner's Rift, the only map with fixed lanes.
export const SUMMONERS_RIFT = 11;

// Item ids with special handling.
export const RABADON = 3089; // +30% total AP (Data Dragon's stats don't include this)
export const HEARTSTEEL = 3084; // its Colossal Consumption damage is a passive, so it isn't in the damage totals

// Enemy healing sources. Items: anything Data Dragon tags LifeSteal or SpellVamp, plus these, which heal without the tag (Sundered Sky).
// Champions: they heal mostly through their kit, so no item shows it. The list only needs the obvious ones.
export const HEAL_ITEMS = [6610];
export const HEAL_CHAMPS = ["Soraka", "Aatrox", "Warwick", "Vladimir", "Swain", "DrMundo"];
// Enemy healing shows once HEAL_MIN players have a source (HEAL_HEAVY marks it as serious), and stays up until
// fewer than that have one for HEAL_HOLD seconds of game time.
export const HEAL_MIN = 2;
export const HEAL_HEAVY = 3;
export const HEAL_HOLD = 15;

// A finished item builds into nothing further, or is boots (tier-2 boots only upgrade through Ornn).
// The price floor keeps starter items such as Doran's from counting as finished.
export const BUILT_MIN_PRICE = 900;

// The lane gold difference stays hidden until this much game time (seconds) has passed.
// Early on, item gold is too lumpy to compare.
export const DIFF_SHOW_AFTER = 360;

// Fallback summoner spell cooldown (seconds) when Data Dragon hasn't loaded.
export const DEFAULT_SPELL_COOLDOWN = 300;
