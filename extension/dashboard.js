const CDN = "https://ddragon.leagueoflegends.com";
let ver = "16.21.1";
fetch(CDN + "/api/versions.json").then(r => r.json()).then(v => ver = v[0]).catch(() => {});

// Healing sources the enemy can have. Items: anything Data Dragon tags LifeSteal or SpellVamp, plus these that heal without the tag (Sundered Sky).
// Champions: heal mostly through their kit, so no item shows it. Keep the list short; it only needs the obvious ones.
const HEAL_ITEMS = [6610];
const HEAL_CHAMPS = ["Soraka", "Aatrox", "Warwick", "Vladimir", "Swain", "DrMundo"];
// Enemy healing shows once this many players have a source, and stays up until fewer than that for HEAL_HOLD seconds of game time.
const HEAL_MIN = 2, HEAL_HEAVY = 3, HEAL_HOLD = 15;
// Thousands separators only from five digits up: 4850 reads cleaner than 4,850, while 31,350 still needs one.
const num = n => { const r = Math.round(n); return Math.abs(r) < 10000 ? String(r) : r.toLocaleString("en-US"); };

// Item stats from Data Dragon, loaded once per game version: { itemID: {FlatMagicDamageMod, FlatPhysicalDamageMod, ...} }
let itemStats = {}, itemInfo = {}, itemStatsVer = null;
function loadItemStats() {
  if (itemStatsVer === ver) return;
  const v = itemStatsVer = ver;
  fetch(`${CDN}/cdn/${v}/data/en_US/item.json`).then(r => r.json()).then(j => {
    itemStats = Object.fromEntries(Object.entries(j.data).map(([id, it]) => [id, it.stats || {}]));
    itemInfo = Object.fromEntries(Object.entries(j.data).map(([id, it]) => [id, {name: it.name, desc: it.description, sub: it.gold && it.gold.total ? it.gold.total + " gold" : "", total: it.gold ? it.gold.total : 0, final: !(it.into && it.into.length) || (it.tags || []).includes("Boots"),
      heal: (it.tags || []).some(t => t === "LifeSteal" || t === "SpellVamp") || HEAL_ITEMS.includes(+id), anti: /Wounds/.test(it.description || "")}]));
  }).catch(() => { itemStatsVer = null; });
}

// Champion base stats from Data Dragon: { champId: {attackdamage, attackdamageperlevel, ...} }
let champStats = {}, champInfo = {}, champStatsVer = null;
const champIds = new Set();  // Data Dragon champion ids
let champByName = {};        // squashed champion id or display name -> id
function loadChampStats() {
  if (champStatsVer === ver) return;
  const v = champStatsVer = ver;
  fetch(`${CDN}/cdn/${v}/data/en_US/champion.json`).then(r => r.json()).then(j => {
    champStats = Object.fromEntries(Object.entries(j.data).map(([id, c]) => [id, c.stats || {}]));
    champByName = {};
    for (const [id, c] of Object.entries(j.data)) { champIds.add(id); champByName[squash(id)] = id; champByName[squash(c.name)] = id; }
    champInfo = Object.fromEntries(Object.entries(j.data).map(([id, c]) => [id, {name: c.name, sub: c.title.charAt(0).toUpperCase() + c.title.slice(1), desc: c.blurb}]));
  }).catch(() => { champStatsVer = null; });
}

// Summoner spells from Data Dragon: { SummonerFlash: {name, desc} }
let spellInfo = {}, spellVer = null;
function loadSpells() {
  if (spellVer === ver) return;
  const v = spellVer = ver;
  fetch(`${CDN}/cdn/${v}/data/en_US/summoner.json`).then(r => r.json()).then(j => {
    spellInfo = Object.fromEntries(Object.values(j.data).map(sp => [sp.id, {name: sp.name, desc: sp.description, sub: sp.cooldownBurn + "s cooldown", cd: sp.cooldown[0]}]));
  }).catch(() => { spellVer = null; });
}

// Hover tooltips. Elements carry data-tip="kind:id" and data-name (shown until the data loads).
const esc = t => String(t).replace(/[&<>"]/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]));
// Data Dragon descriptions contain markup; keep line breaks, drop the rest.
const plain = h => esc((h || "").replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "")).replace(/\n+/g, "<br>");
const tipEl = document.createElement("div");
tipEl.id = "tip"; tipEl.hidden = true;
document.body.appendChild(tipEl);
let tipKey = null, tipName = "";
function tipInfo(key) {
  const [kind, id] = key.split(":");
  if (kind === "item") return itemInfo[id];
  if (kind === "spell") return spellInfo[id];
  if (kind === "champ") return champInfo[id];
}
function showTip() {
  const info = tipInfo(tipKey) || {name: tipName};
  tipEl.innerHTML = `<b>${esc(info.name || tipName)}</b>${info.sub ? `<small>${esc(info.sub)}</small>` : ""}${info.desc ? `<p>${plain(info.desc)}</p>` : ""}`;
  tipEl.hidden = false;
}
document.addEventListener("mousemove", e => {
  const el = e.target.closest && e.target.closest("[data-tip]");
  if (!el) { tipKey = null; tipEl.hidden = true; return; }
  if (el.dataset.tip !== tipKey) { tipKey = el.dataset.tip; tipName = el.dataset.name || ""; showTip(); }
  const w = tipEl.offsetWidth, h = tipEl.offsetHeight;
  tipEl.style.left = Math.max(4, Math.min(e.clientX + 14, innerWidth - w - 4)) + "px";
  tipEl.style.top = Math.max(4, e.clientY + 18 + h > innerHeight ? e.clientY - h - 12 : e.clientY + 18) + "px";
});
document.addEventListener("mouseleave", () => { tipKey = null; tipEl.hidden = true; });

const RABADON = 3089;  // +30% total AP (Data Dragon's stats don't include this)

const HEARTSTEEL = 3084;  // its Colossal Consumption damage is a passive, so it isn't in the damage totals

// Estimated bonus AD (items), base AD (champion + level) and AP from items, plus total AR and MR.
// Runes, buffs and passives aren't included.
function itemPower(items, champ, level) {
  let ad = 0, ap = 0, rab = 0, ar = 0, mr = 0, hs = 0;
  for (const i of items) {
    const st = itemStats[i.itemID] || {};
    if (i.itemID === HEARTSTEEL) hs += i.count;
    ad += (st.FlatPhysicalDamageMod || 0) * i.count;
    ap += (st.FlatMagicDamageMod || 0) * i.count;
    ar += (st.FlatArmorMod || 0) * i.count;
    mr += (st.FlatSpellBlockMod || 0) * i.count;
    if (i.itemID === RABADON) rab = 1;
  }
  if (rab) ap *= 1.3;
  const c = champStats[champ] || {}, n = level - 1;
  const grow = n * (0.7025 + 0.0175 * n);
  const baseAd = (c.attackdamage || 0) + (c.attackdamageperlevel || 0) * grow;
  const totalAr = Math.round((c.armor || 0) + (c.armorperlevel || 0) * grow + ar);
  const totalMr = Math.round((c.spellblock || 0) + (c.spellblockperlevel || 0) * grow + mr);
  return {ad: Math.round(ad), baseAd: Math.round(baseAd), ap: Math.round(ap), ar: totalAr, mr: totalMr, hs};
}

// Damage and resist show a per-player average or the team total; remembered between sessions.
let damageMode = "avg", lastData = null;
try { const m = localStorage.getItem("damageMode"); damageMode = m === "total" ? m : "avg"; } catch (e) {}
function markToggle() {
  const m = document.querySelector("#tog .mode");
  if (m) m.textContent = {avg: "per player", total: "total", eff: "effective"}[damageMode];
}
document.addEventListener("click", e => {
  if (!(e.target.closest && e.target.closest("#tog"))) return;
  damageMode = damageMode === "avg" ? "total" : "avg";
  try { localStorage.setItem("damageMode", damageMode); } catch (err) {}
  if (lastData) render(lastData);
});
markToggle();

// Enemy players with a healing source (a built item or a kit healer), and teammates who already have Grievous Wounds (a component counts, since buying it early is right).
let healSince = null;
function renderInsight(theirs, ours, now) {
  const el = $("insight");
  const src = theirs.map(p => {
    const via = (p.items || []).filter(i => isBuilt(i) && (itemInfo[i.itemID] || {}).heal).map(i => itemInfo[i.itemID].name);
    if (HEAL_CHAMPS.includes(champKey(p))) via.push("kit");
    return {name: p.championName, via};
  }).filter(s => s.via.length);
  if (src.length >= HEAL_MIN) healSince = now;
  if (healSince === null || now - healSince > HEAL_HOLD) { healSince = null; html(el, ""); el.hidden = true; return; }
  const cover = ours.map(p => ({name: p.championName, via: (p.items || []).filter(i => (itemInfo[i.itemID] || {}).anti).map(i => itemInfo[i.itemID].name)})).filter(c => c.via.length);
  el.hidden = false;
  el.className = src.length >= HEAL_HEAVY ? "heavy" : "";
  const list = (a, f) => a.map(f).join("");
  html(el, `<h3>ENEMY HEALING</h3>
    <div class="who">${list(src, s => `<span>${esc(s.name)}<small>${esc(s.via.join(", "))}</small></span>`)}</div>
    <div class="advice ${cover.length ? "ok" : ""}">${cover.length
      ? `&#10003; Antiheal covered: ${cover.map(c => esc(c.name) + " (" + esc(c.via[0]) + ")").join(", ")}`
      : "Consider antiheal"}</div>`);
}

// Share of damage blocked by a resist value (negative resist increases damage taken).
const reduction = r => r >= 0 ? r / (100 + r) : 1 - (2 - 100 / (100 - r));

// Team damage mix and resists. Physical = each player's bonus AD from items (inherent base AD excluded), magic = their AP; 1 AD is treated as equal to 1 AP.
// The % blocked is the average of each player's damage reduction, before penetration.
function teamPower(players) {
  let phys = 0, magic = 0, items = 0, ar = 0, mr = 0, arRed = 0, mrRed = 0;
  let hs = 0;
  for (const p of players) {
    const w = itemPower(p.items || [], champKey(p), p.level);
    phys += w.ad; magic += w.ap; items += w.ad + w.ap;
    ar += w.ar; mr += w.mr;
    hs += w.hs;
    arRed += reduction(w.ar); mrRed += reduction(w.mr);
  }
  const n = players.length || 1, div = damageMode === "avg" ? n : 1;
  const arAvg = arRed / n, mrAvg = mrRed / n;
  const pp = items ? Math.round(100 * phys / (phys + magic)) : 50;
  const fmt = v => num(v / div);
  return {
    items, pp, mp: 100 - pp, arAvg, mrAvg, hs,
    phys: fmt(phys), magic: fmt(magic), ar: fmt(ar), mr: fmt(mr),
    arBlock: Math.round(100 * arRed / n) + "%", mrBlock: Math.round(100 * mrRed / n) + "%",
  };
}

// Effective mode: your average damage reduction weighted by the enemy's physical / magic mix (an estimate; see teamPower).
function defenseMarkup(who, t, foe) {
  const pct = v => Math.round(100 * v) + "%";
  const fp = foe.pp / 100, fm = foe.mp / 100;
  const leakP = fp * (1 - t.arAvg), leakM = fm * (1 - t.mrAvg);
  return `<div>
      <h3>${who} EFFECTIVE DEFENSE</h3>
      <div class="pair"><div><div class="num">${pct(fp * t.arAvg + fm * t.mrAvg)}</div><div class="cap">of enemy damage blocked</div></div></div>
      <div class="ebar"><div class="es p" style="width:${foe.pp}%"><div style="width:${100 - Math.round(100 * t.arAvg)}%"></div></div><div class="es m" style="width:${foe.mp}%"><div style="width:${100 - Math.round(100 * t.mrAvg)}%"></div></div></div>
      <div class="cap">${leakP + leakM < 0.005 ? "nothing gets through" : `<span class="${leakP > leakM ? "phys" : "magic"}">${leakP > leakM ? "physical" : "magic"}</span> is ${Math.round(100 * Math.max(leakP, leakM) / (leakP + leakM))}% of what gets through`}</div>
      <div class="cap faint">bright = gets through, dim = blocked</div>
    </div>`;
}

function sumMarkup(who, t, foe, picks) {
  if (damageMode === "eff") return defenseMarkup(who, t, foe);
  return `<div class="blk">${(picks && picks.top) || ""}
      <h3>${who} DAMAGE</h3>
      <div class="dbar"><div class="p" style="width:${t.pp}%">${t.items && t.pp >= 14 ? t.pp + "%" : ""}</div><div class="m">${t.items && t.mp >= 14 ? t.mp + "%" : ""}</div></div>
      <div class="pair"><div><div class="num">${t.phys}</div><div class="cap phys">physical</div></div><div class="r"><div class="num">${t.magic}</div><div class="cap magic">magic</div></div></div>
      ${t.hs ? `<div class="cap faint">+ Heartsteel damage not counted (${t.hs} Heartsteel${t.hs > 1 ? "s" : ""})</div>` : ""}
    </div>
    <div class="blk">${(picks && picks.bottom) || ""}
      <h3>${who} RESISTANCE</h3>
      <div class="res">
        <div class="a"><small>ARMOR</small><div class="num">${t.ar}</div><div class="cap">blocks ${t.arBlock} <span class="phys">physical</span></div></div>
        <div class="m"><small>MAGIC RESIST</small><div class="num">${t.mr}</div><div class="cap">blocks ${t.mrBlock} <span class="magic">magic</span></div></div>
      </div>
    </div>${(picks && picks.label) || ""}`;
}

const $ = id => document.getElementById(id);
// Data Dragon champion id for a live-API player. rawChampionName is usually "game_character_displayname_<id>", but not always
// (Seraphine arrives as "Character_Seraphine_Name"). Once Data Dragon has loaded, an id it doesn't know falls back to matching the display name.
const squash = t => String(t).toLowerCase().replace(/[^a-z0-9]/g, "");
const champKey = p => {
  const k = (p.rawChampionName || "").replace(/^game_character_displayname_/, "").replace(/^Character_(.+)_Name$/, "$1");
  return !champIds.size || champIds.has(k) ? k : champByName[squash(p.championName || "")] || k;
};
// Riot's live API uses internal names for upgraded spells (S12_SummonerTeleportUpgrade, S5_SummonerSmitePlayerGanker); Data Dragon only has the base spell.
const spellKey = s => {
  const k = ((s.rawDisplayName || "").match(/SummonerSpell_(.+?)_DisplayName/) || [])[1];
  return k && k.replace(/^S\d+_/, "").replace(/^(SummonerSmite)\w*/, "$1").replace(/^(SummonerTeleport)\w*/, "$1");
};

// Retry a failed image with growing delays (server caches successes) before hiding it.
function imgFail(el) {
  const n = +(el.dataset.try || 0);
  if (n >= 5) { el.style.visibility = "hidden"; return; }
  el.dataset.try = n + 1;
  setTimeout(() => { el.src = el.dataset.want + "?r=" + (n + 1); }, 1000 * (n + 1));
}
// Extension pages can't use inline onerror handlers; error events don't bubble, so listen in the capture phase.
document.addEventListener("error", e => { if (e.target.tagName === "IMG") imgFail(e.target); }, true);

// The page updates in place every second. Nodes are only replaced when their content changes, so hovering
// (and the tooltip) isn't interrupted and images don't reload.
const html = (el, h) => { if (el._h !== h) { el._h = h; el.innerHTML = h; } };
const text = (el, t) => { if (el.textContent !== t) el.textContent = t; };
function setImg(el, src) {
  // Compare against the wanted URL, not the attribute: retries append ?r=N, and without this every tick would see a mismatch, reset the retry count and restart a slow load.
  if (el.dataset.want === src) return;
  el.dataset.want = src;
  el.removeAttribute("data-try"); el.style.visibility = "";
  el.setAttribute("src", src);
}
const signed = n => (n >= 0 ? "+" : "−") + num(Math.abs(n));

const ROLES = ["TOP", "JUNGLE", "MIDDLE", "BOTTOM", "UTILITY"];
const ROLE_LABEL = {TOP: "TOP", JUNGLE: "JNG", MIDDLE: "MID", BOTTOM: "BOT", UTILITY: "SUP"};
// Both fill modes are relative to the game's average item gold per player, so a bar means the same thing at 8 and 35 minutes.
// Rows without a lane opponent fill by how far a player's item gold is above that average:
// nothing at or below it, the whole bar at this much above it.
const FULL_ABOVE_AVG = 0.4;
// Lane rows fill by the lane gold difference, the whole half at this fraction of the average.
const FULL_LANE_FRAC = 0.35;
// Support lanes run structurally behind on item gold, so their lane diff counts for less.
const SUPPORT_DAMP = 0.5;
// Item gold includes ~500 of starting items nobody earned, so the scale uses the average above that.
const START_GOLD = 500;
// The scale never drops below this much earned item gold per minute of game time. Early on the average is small, so every purchase by anyone would
// otherwise visibly rescale every bar; the time floor changes smoothly instead.
const SCALE_PER_MIN = 250;
// Differences under this fraction of the scale (about one component late game) are noise and draw nothing.
const FILL_DEADZONE = 0.05;
const fillCurve = x => Math.min(1, Math.max(0, (x - FILL_DEADZONE) / (1 - FILL_DEADZONE)));
// No fills before this much game time (seconds), then they fade in over FILL_FADE; early on everyone's items are about equal and purchases are lumpy.
const FILL_AFTER = 360;
const FILL_FADE = 120;

// ARAM-style modes (ARAM, ARAM Mayhem) have no CS.
const isAram = mode => /^(ARAM|KIWI)$/i.test(mode || "");
// A finished item builds into nothing further (Data Dragon's "into" list is empty), or is a boots item (tier-2 boots only upgrade through Ornn); the price floor keeps starter items like Doran's from counting.
const BUILT_MIN_PRICE = 900;
const isBuilt = i => { const info = itemInfo[i.itemID]; return !!info && info.final && info.total >= BUILT_MIN_PRICE; };
// The live API's price is not always the full cost of a built item, so prefer Data Dragon's total and fall back to it.
const itemCost = i => { const info = itemInfo[i.itemID]; return info && info.total ? info.total : i.price; };
const itemGold = p => (p.items || []).reduce((n, i) => n + itemCost(i) * i.count, 0);

function buildSide(cls) {
  const el = document.createElement("div");
  el.className = "side " + cls;
  el.innerHTML = `<div class="champ" data-tip=""><img alt=""><div class="in"><div class="cname"></div><span class="lvl"></span></div></div>
    <div class="spells"><div class="sp"><img alt="" data-tip=""><span></span></div><div class="sp"><img alt="" data-tip=""><span></span></div></div>
    <div class="stat"><div class="col"><div class="kda"></div><div class="ratio"></div></div><div class="col econ"><div class="egold"></div><div class="cs"></div></div></div>
    <div class="spacer"></div><div class="items"></div><div class="deadtag" hidden></div>`;
  const q = s => el.querySelector(s);
  return {el, champ: q(".champ"), splash: q(".champ img"), name: q(".cname"), lvl: q(".lvl"),
    pid: null, spells: [...el.querySelectorAll(".spells img")], spTimers: [...el.querySelectorAll(".spells span")], kda: q(".kda"), ratio: q(".ratio"), cs: q(".cs"), egold: q(".egold"), items: q(".items"), dead: q(".deadtag")};
}

function buildLane() {
  const el = document.createElement("div");
  el.className = "lane";
  el.innerHTML = `<div class="fill l"><i></i></div><div class="fill r"><i></i></div>`;
  const left = buildSide("left"), right = buildSide("right");
  const mid = document.createElement("div");
  mid.className = "mid";
  mid.innerHTML = `<div class="d"></div><div class="r"></div>`;
  el.append(left.el, mid, right.el);
  return {el, left, right, mid, fillL: el.querySelector(".fill.l"), fillR: el.querySelector(".fill.r"), midD: mid.firstChild, midR: mid.lastChild};
}

function updateSide(s, p, aram) {
  s.el.style.visibility = p ? "" : "hidden";
  if (!p) return;
  const key = champKey(p);
  s.champ.dataset.tip = "champ:" + key; s.champ.dataset.name = p.championName;
  setImg(s.splash, `${CDN}/cdn/img/champion/splash/${key}_0.jpg`);
  text(s.name, p.championName);
  text(s.lvl, String(p.level));
  s.pid = p.riotId || p.summonerName;
  [p.summonerSpells.summonerSpellOne, p.summonerSpells.summonerSpellTwo].forEach((sp, i) => {
    const k = spellKey(sp);
    s.spells[i].parentNode.dataset.spell = k;
    const end = spellCd.get(s.pid + ":" + i), left = end ? Math.ceil(end - gameTime()) : 0;
    if (end && left <= 0) spellCd.delete(s.pid + ":" + i);
    s.spells[i].parentNode.classList.toggle("cd", left > 0);
    text(s.spTimers[i], left > 0 ? String(left) : "");
    s.spells[i].dataset.tip = "spell:" + k; s.spells[i].dataset.name = sp.displayName;
    setImg(s.spells[i], `${CDN}/cdn/${ver}/img/spell/${k}.png`);
  });
  const sc = p.scores;
  text(s.kda, `${sc.kills}/${sc.deaths}/${sc.assists}`);
  text(s.ratio, ((sc.kills + sc.assists) / Math.max(sc.deaths, 1)).toFixed(1) + " KDA");
  html(s.egold, `<i class="coin"></i>${num(itemGold(p))}`);
  text(s.cs, aram ? "" : sc.creepScore + " CS");
  // Slots 0-5; the trinket (slot 6) isn't shown. Items sit side by side with no gaps. The row runs outward to inward on both sides, so components come first and finished items last, nearest the middle; slot order within each group.
  const items = (p.items || []).filter(i => i.slot < 6).sort((a, b) => isBuilt(a) - isBuilt(b) || a.slot - b.slot);
  html(s.items, items.map(i =>
    `<img src="${CDN}/cdn/${ver}/img/item/${i.itemID}.png" alt="" class="${isBuilt(i) ? "done" : "part"}" data-tip="item:${i.itemID}" data-name="${esc(i.displayName)}">`).join(""));
  s.el.classList.toggle("dead", !!p.isDead);
  s.el.classList.toggle("you", s.pid === (lastData.activePlayer.riotId || lastData.activePlayer.summonerName));
  s.dead.hidden = !p.isDead;
  if (p.isDead) text(s.dead, `DEAD · ${Math.ceil(p.respawnTimer)}s`);
}

// Click a summoner spell to start its cooldown timer (and fade it); click again to reset. Keyed by player + slot, in game seconds.
const spellCd = new Map();
const gameTime = () => lastData ? lastData.gameData.gameTime : 0;
document.addEventListener("click", e => {
  const sp = e.target.closest(".sp");
  if (!sp) return;
  const side = lanes.flatMap(l => [l.left, l.right]).find(s => s.el.contains(sp));
  if (!side || !side.pid) return;
  const i = [...sp.parentNode.children].indexOf(sp), key = side.pid + ":" + i;
  if (spellCd.has(key)) spellCd.delete(key);
  else spellCd.set(key, gameTime() + ((spellInfo[sp.dataset.spell] || {}).cd || 300));
  sp.classList.toggle("cd", spellCd.has(key));
  text(side.spTimers[i], spellCd.has(key) ? String(Math.ceil(spellCd.get(key) - gameTime())) : "");
});

let lanes = [];
function ensureLanes(n) {
  if (lanes.length === n) return;
  lanes = Array.from({length: n}, buildLane);
  $("lanes").replaceChildren(...lanes.map(l => l.el));
}

function render(d) {
  lastData = d;
  loadItemStats(); loadChampStats(); loadSpells();
  const aram = isAram(d.gameData.gameMode);

  const me = d.activePlayer.riotId || d.activePlayer.summonerName;
  const mine = d.allPlayers.find(p => (p.riotId || p.summonerName) === me);
  const myTeam = mine ? mine.team : "ORDER";
  // Teams sit where they do on the map: blue (ORDER) on the left, red (CHAOS) on the right. Colour follows ours/theirs, not side.
  const flip = myTeam === "CHAOS";
  const ours = d.allPlayers.filter(p => p.team === myTeam), theirs = d.allPlayers.filter(p => p.team !== myTeam);

  // Lane pairing only on Summoner's Rift (map 11) and only when both teams have all five roles assigned exactly once,
  // so a missing or duplicated position (practice tool, custom games, ARAM) never produces a wrong matchup.
  const rolesOk = d.gameData.mapNumber === 11 && [ours, theirs].every(team =>
    team.length === 5 && ROLES.every(r => team.filter(p => p.position === r).length === 1));
  let pairs;
  if (rolesOk) {
    pairs = ROLES.map(r => [ours.find(p => p.position === r), theirs.find(p => p.position === r)]);
  } else {
    const byGold = team => team.slice().sort((a, b) => itemGold(b) - itemGold(a));
    const a = byGold(ours), b = byGold(theirs);
    pairs = Array.from({length: Math.max(a.length, b.length)}, (_, i) => [a[i] || null, b[i] || null]);
  }

  const youGold = ours.reduce((n, p) => n + itemGold(p), 0), enGold = theirs.reduce((n, p) => n + itemGold(p), 0);
  const avg = d.allPlayers.length ? (youGold + enGold) / d.allPlayers.length : 0;
  const scale = Math.max(avg - START_GOLD, SCALE_PER_MIN * d.gameData.gameTime / 60);
  const lead = youGold - enGold;
  const sideOf = (el, mine, label, gold) => {
    el.classList.toggle("mine", mine); el.classList.toggle("foe", !mine);
    if (label !== undefined) { text(el.querySelector(".label"), label); text(el.querySelector(".gold span"), num(gold)); }
  };
  sideOf($("teamL"), !flip, flip ? "ENEMY TEAM" : "YOUR TEAM", flip ? enGold : youGold);
  sideOf($("teamR"), flip, flip ? "YOUR TEAM" : "ENEMY TEAM", flip ? youGold : enGold);
  text($("lead"), signed(lead));
  $("lead").className = "big " + (lead >= 0 ? "mine" : "foe");
  // Early item gold is too lumpy to compare, so the gold difference stays hidden for as long as the fills do.
  const fade = Math.min(1, Math.max(0, (d.gameData.gameTime - FILL_AFTER) / FILL_FADE));
  const diffShown = fade > 0;
  document.querySelector(".lead").style.visibility = diffShown ? "" : "hidden";

  $("lanes").classList.toggle("nomid", !rolesOk);
  ensureLanes(pairs.length);
  pairs.forEach(([y, e], i) => {
    const l = lanes[i];
    updateSide(l.left, flip ? e : y, aram); updateSide(l.right, flip ? y : e, aram);
    sideOf(l.left.el, !flip); sideOf(l.right.el, flip); sideOf(l.fillL, !flip); sideOf(l.fillR, flip);
    let wl = 0, wr = 0;
    if (rolesOk) {
      const diff = itemGold(y) - itemGold(e);
      const w = scale > 0 ? fillCurve(Math.abs(diff) * (y.position === "UTILITY" ? SUPPORT_DAMP : 1) / (scale * FULL_LANE_FRAC)) : 0;
      if (diff >= 0) wl = w; else wr = w;
      text(l.midD, signed(diff));
      l.midD.style.visibility = diffShown ? "" : "hidden";
      l.midD.className = "d " + (diff >= 0 ? "good" : "bad");
      // Edge line on the box's inner edge, on the side that is ahead, in that team's colour.
      const leftAhead = diff > 0 !== flip;
      l.mid.className = "mid" + (diffShown ? "" : " nodiff") + (diff === 0 ? "" : (leftAhead ? " lead-l" : " lead-r") + (diff > 0 ? " mine" : " foe"));
      text(l.midR, ROLE_LABEL[y.position]);
    } else if (scale > 0) {
      const above = p => p ? fillCurve((itemGold(p) - avg) / (scale * FULL_ABOVE_AVG)) : 0;
      wl = above(y); wr = above(e);
    }
    wl *= fade; wr *= fade;
    // wl / wr are "ours ahead" / "theirs ahead"; each bar grows on the side of the team that is ahead.
    l.fillL.firstChild.style.width = ((flip ? wr : wl) * 100).toFixed(1) + "%";
    l.fillR.firstChild.style.width = ((flip ? wl : wr) * 100).toFixed(1) + "%";
  });

  let picks = {};
  html($("sumL"), sumMarkup(flip ? "ENEMY TEAM'S" : "YOUR TEAM'S", teamPower(flip ? theirs : ours), teamPower(flip ? ours : theirs), flip && picks));
  html($("sumR"), sumMarkup(flip ? "YOUR TEAM'S" : "ENEMY TEAM'S", teamPower(flip ? ours : theirs), teamPower(flip ? theirs : ours), !flip && picks));
  sideOf($("sumL"), !flip); sideOf($("sumR"), flip);
  renderInsight(theirs, ours, d.gameData.gameTime);
  markToggle();
}

// The live client API is served by the running game; the extension's host permission lets us read it directly.
const LIVE_URL = "https://127.0.0.1:2999/liveclientdata/allgamedata";

// Help starts expanded for new users and collapses once live match data has shown up at least once.
// This only records that the tracker has worked before, not whether it is connected right now.
let seenLive = false;
try { seenLive = localStorage.getItem("seenLive") === "1"; } catch (e) {}
$("help").open = !seenLive;

async function tick() {
  let d = null;
  try {
    const r = await fetch(LIVE_URL, {signal: AbortSignal.timeout(2000)});
    d = await r.json();
    if (!d.allPlayers) d = null;  // error payload while the game is still loading
  } catch (e) {}
  $("waiting").hidden = !!d;
  $("game").hidden = !d;
  if (d) {
    if (!seenLive) {
      seenLive = true;
      try { localStorage.setItem("seenLive", "1"); } catch (e) {}
    }
    render(d);
  }
}

// Poll every second during a game; back off while waiting so a closed game doesn't spam failed requests.
async function loop() {
  await tick();
  setTimeout(loop, $("game").hidden ? 3000 : 1000);
}
loop();
