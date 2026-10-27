---
layout: policy
permalink: /privacy/
title: Goldline privacy policy
---

# Goldline - Live Stats for League of Legends privacy policy

Last updated: 2026-10-26

Goldline - Live Stats for League of Legends is a browser extension that shows live information about your current League of Legends match. It does not collect, store or transmit personal data to the developer or to any third party analytics or advertising service.

## What the extension reads

- **Your game client, on your own computer.** While a match is running, the extension reads match data (players, champions, items, game time) from the League of Legends client's local API at `https://127.0.0.1:2999`. That address points back to your own machine, and this data never leaves it.
- **Riot's Data Dragon.** The extension downloads public game data (item, champion and summoner spell information and images) from `https://ddragon.leagueoflegends.com`. These are ordinary requests for public files. Riot's servers can see your IP address as they would for any website visit, and no match or account information is included in them.

## What the extension stores

Two small preferences are saved in your browser's local storage: whether damage is shown per player or as a team total, and whether the setup help has been collapsed. Nothing else is stored, and this never leaves your browser.

## What the extension does not do

- No accounts, tracking, analytics or advertising.
- No sending of match data, your Riot ID or any other information to the developer or anyone else.
- No reading of any websites other than the two addresses above.

## Permissions

- `https://127.0.0.1/*` reads match data from your local game client.
- `https://ddragon.leagueoflegends.com/*` downloads public game data and images.

## Disclaimer

Goldline - Live Stats for League of Legends isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games and all associated properties are trademarks or registered trademarks of Riot Games, Inc.

## Changes

If this policy changes, the date above is updated and the new version is published at this page.

## Contact

Questions about this policy: contact@satplex.io
