// Runs on the game's gamestats page, which is where the dashboard's setup link sends people.
// The page only loads once the browser has accepted the game's certificate, so reaching it means setup worked.

const SETUP_HASH = "#setup";
const CLOSE_DELAY_MS = 1500;
const FALLBACK_DELAY_MS = 4000;
const CLOSE_NOTE = "You can close this tab.";

document.documentElement.innerHTML = `<head><meta charset="utf-8"><title>Connected</title></head>
<body style="margin:0;display:grid;place-items:center;min-height:100vh;background:#0b0e14;color:#e6e9f0;font:18px system-ui,sans-serif;text-align:center">
  <div><div style="font-size:28px;font-weight:700;color:#5fd38d;margin-bottom:8px">Connection established!</div>
  <div id="note">${CLOSE_NOTE}</div></div></body>`;

// Only tabs opened from the dashboard's setup link close themselves; a tab someone opened by hand is left alone.
if (location.hash === SETUP_HASH) {
  const note = document.getElementById("note");
  note.textContent = "Returning to Goldline…";
  setTimeout(() => chrome.runtime.sendMessage({type: "close-me"}), CLOSE_DELAY_MS);
  // Still here means the close didn't happen, so fall back to asking the user.
  setTimeout(() => {
    note.textContent = CLOSE_NOTE;
  }, FALLBACK_DELAY_MS);
}
