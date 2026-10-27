// Draws a live-client snapshot into the dashboard.

import {DIFF_SHOW_AFTER, ROLES, ROLE_LABEL, SUMMONERS_RIFT} from "./config.js";
import {loadGameData} from "./ddragon.js";
import {renderInsight} from "./insight.js";
import {ensureLanes, getLanes, updateSide} from "./lanes.js";
import {itemGold, playerId} from "./player.js";
import {teamPower} from "./stats.js";
import {damageMode, NO_ASIDE, summaryMarkup, syncToggleLabel} from "./summary.js";
import {$, html, num, signed, text} from "./util.js";

let lastData = null;

export const gameTime = () => (lastData ? lastData.gameData.gameTime : 0);

// Redraws the last snapshot, for changes that don't come with new game data.
export function redraw() {
  if (lastData) render(lastData);
}

// Teams sit where they do on the map (blue on the left, red on the right), but take their colour from the viewer,
// as in the game's health bars: .mine is blue, .foe is red.
function tint(el, isMine) {
  el.classList.toggle("mine", isMine);
  el.classList.toggle("foe", !isMine);
}

function renderTeamHeader(el, isMine, label, gold) {
  tint(el, isMine);
  text(el.querySelector(".label"), label);
  text(el.querySelector(".gold span"), num(gold));
}

// Pairs players for the lane rows. Lane pairing only happens on Summoner's Rift, and only when both teams have all
// five roles assigned exactly once, so a missing or duplicated position (practice tool, custom games, ARAM) never
// produces a wrong matchup. Otherwise players pair by item gold.
function pairPlayers(d, ours, theirs) {
  const rolesAssigned =
    d.gameData.mapNumber === SUMMONERS_RIFT &&
    [ours, theirs].every(
      team => team.length === ROLES.length && ROLES.every(role => team.filter(p => p.position === role).length === 1),
    );
  if (rolesAssigned) {
    return {
      rolesAssigned,
      pairs: ROLES.map(role => [ours.find(p => p.position === role), theirs.find(p => p.position === role)]),
    };
  }
  const byGold = team => team.slice().sort((a, b) => itemGold(b) - itemGold(a));
  const a = byGold(ours),
    b = byGold(theirs);
  return {
    rolesAssigned,
    pairs: Array.from({length: Math.max(a.length, b.length)}, (_, i) => [a[i] || null, b[i] || null]),
  };
}

// The box between two laners: role label and gold difference. Before the difference is shown, the label sits alone in the box.
function renderLaneDiff(lane, ours, theirs, flip, diffShown) {
  const diff = itemGold(ours) - itemGold(theirs);
  text(lane.midDiff, signed(diff));
  lane.midDiff.style.visibility = diffShown ? "" : "hidden";
  lane.midDiff.className = `d ${diff >= 0 ? "good" : "bad"}`;
  text(lane.midRole, ROLE_LABEL[ours.position]);

  // An edge line on the box's inner edge, on the side that is ahead, in that team's colour.
  const classes = ["mid"];
  if (!diffShown) classes.push("nodiff");
  else if (diff !== 0) {
    const leftAhead = diff > 0 !== flip;
    classes.push(leftAhead ? "lead-l" : "lead-r", diff > 0 ? "mine" : "foe");
  }
  lane.mid.className = classes.join(" ");
}

export function render(d) {
  lastData = d;
  loadGameData();

  const now = d.gameData.gameTime;
  const me = playerId(d.activePlayer);
  const self = d.allPlayers.find(p => playerId(p) === me);
  const myTeam = self ? self.team : "ORDER";
  const flip = myTeam === "CHAOS";
  const ours = d.allPlayers.filter(p => p.team === myTeam);
  const theirs = d.allPlayers.filter(p => p.team !== myTeam);
  const {rolesAssigned, pairs} = pairPlayers(d, ours, theirs);

  const ourGold = ours.reduce((sum, p) => sum + itemGold(p), 0);
  const theirGold = theirs.reduce((sum, p) => sum + itemGold(p), 0);
  const lead = ourGold - theirGold;
  renderTeamHeader($("teamL"), !flip, flip ? "ENEMY TEAM" : "YOUR TEAM", flip ? theirGold : ourGold);
  renderTeamHeader($("teamR"), flip, flip ? "YOUR TEAM" : "ENEMY TEAM", flip ? ourGold : theirGold);
  text($("lead"), signed(lead));
  $("lead").className = `big ${lead >= 0 ? "mine" : "foe"}`;
  // Early item gold is too lumpy to compare, so the gold differences stay hidden until later.
  const diffShown = now > DIFF_SHOW_AFTER;
  document.querySelector(".lead").style.visibility = diffShown ? "" : "hidden";

  $("lanes").classList.toggle("nomid", !rolesAssigned);
  ensureLanes(pairs.length);
  const lanes = getLanes();
  const ctx = {me, now};
  pairs.forEach(([ourPlayer, theirPlayer], i) => {
    const lane = lanes[i];
    updateSide(lane.left, flip ? theirPlayer : ourPlayer, ctx);
    updateSide(lane.right, flip ? ourPlayer : theirPlayer, ctx);
    tint(lane.left.el, !flip);
    tint(lane.right.el, flip);
    if (rolesAssigned) renderLaneDiff(lane, ourPlayer, theirPlayer, flip, diffShown);
  });

  // Extra markup beside the enemy's blocks.
  const aside = {};
  const mode = damageMode();
  const left = flip ? theirs : ours;
  const right = flip ? ours : theirs;
  html($("sumL"), summaryMarkup(flip ? "ENEMY TEAM'S" : "YOUR TEAM'S", teamPower(left, mode), flip ? aside : NO_ASIDE));
  html(
    $("sumR"),
    summaryMarkup(flip ? "YOUR TEAM'S" : "ENEMY TEAM'S", teamPower(right, mode), flip ? NO_ASIDE : aside),
  );
  tint($("sumL"), !flip);
  tint($("sumR"), flip);
  renderInsight(theirs, ours, now);
  syncToggleLabel();
}
