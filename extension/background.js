// Background script: opens the dashboard and closes the connection-setup tab once it has served its purpose.

const ORIGINS = ["https://127.0.0.1/*", "https://ddragon.leagueoflegends.com/*"];
const GAME_STATS_URL = "https://127.0.0.1:2999/liveclientdata/gamestats";
// The dashboard's setup link ends in this hash, so a tab someone opened by hand is never closed on them.
const SETUP_HASH = "#setup";

chrome.action.onClicked.addListener(async () => {
  // Firefox doesn't grant host permissions at install, and without them the page can't read the game's data.
  // Ask now, while we still have the click's user gesture.
  // Patterns have no port: Firefox ignores host permissions that name one.
  try {
    if (!(await chrome.permissions.contains({origins: ORIGINS}))) {
      await chrome.permissions.request({origins: ORIGINS});
    }
  } catch {
    // Without the permissions the dashboard still opens and shows its setup help.
  }
  chrome.tabs.create({url: chrome.runtime.getURL("dashboard/dashboard.html")});
});

// The content script on the connection-success page asks to be closed once setup has worked.
chrome.runtime.onMessage.addListener((message, sender) => {
  if (message && message.type === "close-me" && sender.tab) chrome.tabs.remove(sender.tab.id);
});

// Firefox shows the game's JSON in its own viewer, where the content script doesn't run and there's nothing worth
// showing, so close the setup tab from here as soon as it connects. Chrome keeps the content script's confirmation page.
// The certificate warning page reports the same URL, so only close once the game actually answers.
if (navigator.userAgent.includes("Firefox")) {
  chrome.tabs.onUpdated.addListener(async (tabId, info, tab) => {
    if (info.status !== "complete" || (tab.url || "") !== GAME_STATS_URL + SETUP_HASH) return;
    try {
      await fetch(GAME_STATS_URL, {signal: AbortSignal.timeout(2000)});
    } catch {
      return;
    }
    chrome.tabs.remove(tabId).catch(() => {
      /* already closed */
    });
  });
}
