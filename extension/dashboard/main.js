// Dashboard entry point: polls the game client and keeps the page in sync.

import {LIVE_URL, POLL_IDLE_MS, POLL_LIVE_MS, REQUEST_TIMEOUT_MS} from "./config.js";
import {initSpellTimers} from "./lanes.js";
import {gameTime, redraw, render} from "./render.js";
import {initToggle} from "./summary.js";
import {initTooltip} from "./tooltip.js";
import {$, storage, watchImageErrors} from "./util.js";

// Help starts expanded for new users and collapses once live match data has shown up at least once.
// This only records that the dashboard has worked before, not whether it is connected right now.
const SEEN_LIVE_KEY = "seenLive";
let seenLive = storage.get(SEEN_LIVE_KEY) === "1";

async function fetchGame() {
  try {
    const response = await fetch(LIVE_URL, {signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)});
    const data = await response.json();
    // While the game is still loading the endpoint returns an error payload instead of players.
    return data.allPlayers ? data : null;
  } catch {
    return null;
  }
}

async function tick() {
  const data = await fetchGame();
  $("waiting").hidden = Boolean(data);
  $("game").hidden = !data;
  if (!data) return;
  if (!seenLive) {
    seenLive = true;
    storage.set(SEEN_LIVE_KEY, "1");
  }
  render(data);
}

// Polls every second during a game, and backs off while waiting so a closed game doesn't spam failed requests.
async function poll() {
  await tick();
  setTimeout(poll, $("game").hidden ? POLL_IDLE_MS : POLL_LIVE_MS);
}

watchImageErrors();
initTooltip();
initToggle(redraw);
initSpellTimers(gameTime);
$("help").open = !seenLive;
poll();
