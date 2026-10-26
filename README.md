# Goldline - Live Stats for LoL

A browser extension that shows live stats for your current League of Legends match: item gold, lane matchups, enemy damage and resistance, and healing.

It reads match data from the League client's local Live Client Data API (`https://127.0.0.1:2999`) on your own machine, and public game data from Riot's Data Dragon. It has no accounts, analytics or tracking. See [PRIVACY.md](PRIVACY.md).

## Install

Install from the Chrome Web Store or Firefox Add-ons (links to come), or load it unpacked:

- **Chrome:** open `chrome://extensions`, enable Developer mode, choose "Load unpacked" and select the `extension/` folder.
- **Firefox:** open `about:debugging#/runtime/this-firefox`, choose "Load Temporary Add-on" and select `extension/manifest.json`.

## Use

1. Start a League of Legends match. The game client must be running.
2. Click the Goldline toolbar icon to open the dashboard.

## Build

`./package.sh` writes `dist/goldline-chrome.zip` and `dist/goldline-firefox.zip` for store upload. It needs `jq` and `zip`.

## License

MIT, see [LICENSE](LICENSE). Third-party notices are in [THIRD_PARTY.md](THIRD_PARTY.md).

Goldline - Live Stats for LoL isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games and all associated properties are trademarks or registered trademarks of Riot Games, Inc.
