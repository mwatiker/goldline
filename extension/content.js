// Runs on the game's gamestats page, which is where the setup link in the tracker sends people.
// The page only loads once the browser has accepted the game's certificate, so reaching it means setup worked.
document.documentElement.innerHTML = `<head><meta charset="utf-8"><title>Connected</title></head>
<body style="margin:0;display:grid;place-items:center;min-height:100vh;background:#0b0e14;color:#e6e9f0;font:18px system-ui,sans-serif;text-align:center">
  <div><div style="font-size:28px;font-weight:700;color:#5fd38d;margin-bottom:8px">Connection established!</div>
  <div id="note">You can close this tab.</div></div></body>`;

// The tracker's link ends in #tracker, so a tab someone opened by hand isn't closed on them.
if (location.hash === "#tracker") {
  document.getElementById("note").textContent = "Returning to the tracker…";
  setTimeout(() => chrome.runtime.sendMessage({ type: "close-me" }), 1500);
  // Still here means the close didn't happen, so fall back to asking the user.
  setTimeout(() => { document.getElementById("note").textContent = "You can close this tab."; }, 4000);
}
