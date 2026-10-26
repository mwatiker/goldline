const ORIGINS = ["https://127.0.0.1/*", "https://ddragon.leagueoflegends.com/*"];

chrome.action.onClicked.addListener(async () => {
  // Firefox doesn't grant host permissions at install, and without them the page can't
  // read the game's data. Ask now, while we still have the click's user gesture.
  // Patterns have no port: Firefox ignores host permissions that name one.
  try {
    if (!(await chrome.permissions.contains({ origins: ORIGINS }))) {
      await chrome.permissions.request({ origins: ORIGINS });
    }
  } catch (e) {}
  chrome.tabs.create({ url: chrome.runtime.getURL("dashboard.html") });
});

// The connection-success page asks to be closed once setup has worked.
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg && msg.type === "close-me" && sender.tab) chrome.tabs.remove(sender.tab.id);
});


// Firefox shows the game's JSON in its own viewer, where the content script above doesn't run and there's
// nothing worth showing, so close the setup tab from here as soon as it connects. Chrome keeps its content
// script's confirmation page. The tracker's link ends in #tracker; hand-opened tabs are left alone.
// The certificate warning page reports the same URL, so only close once the game actually answers.
if (navigator.userAgent.includes("Firefox")) {
  chrome.tabs.onUpdated.addListener(async (tabId, info, tab) => {
    if (info.status !== "complete" || !/^https:\/\/127\.0\.0\.1:2999\/liveclientdata\/gamestats#tracker$/.test(tab.url || "")) return;
    try {
      await fetch("https://127.0.0.1:2999/liveclientdata/gamestats", { signal: AbortSignal.timeout(2000) });
    } catch (e) { return; }
    chrome.tabs.remove(tabId).catch(() => {});
  });
}
