# Fefe games

Two games for the LetiArts Fefe app store, built to the Fefe developer docs
(`apps/fefe-dashboard/src/content/docs`: Runtime, Bundling, Leaderboards, Uploading).

| Game | Stack | Fefe ID (local) |
| --- | --- | --- |
| **Adinkra Match** (`adinkra-match/`) | React 18 + Vite + TypeScript | 47 |
| **Ananse Hop** (`ananse-hop/`) | Plain HTML5 canvas, no dependencies | 48 |

## How they talk to Fefe

Both load `shared/fefe.js`, the docs' helper extended with a `finishRun()` end-of-run flow:

- **Identity:** reads `window.FEFE_AUTH_TOKEN` (injected by the app / launcher) and
  `window.FEFE_GAME_ID || window.GAME_ID`, falling back to `FEFE_CONFIG.gameId` for offline copies.
- **API root:** derived from the hosted URL (`…/html5/games/<id>/play`), else `FEFE_CONFIG.apiUrl`.
- **Leaderboard:** uses the game's default board (`/leaderboards/status`). It only posts a score
  when it beats the player's stored one (boards keep the *last* score), and if that lookup fails it
  compares against the device's best so a worse run can never overwrite a better one.
- **Guests / offline:** never post; best score is kept in `localStorage`; the game always plays.

## Build & bundle

```bash
FEFE_API_URL=http://localhost/fefe/api ADINKRA_GAME_ID=47 ANANSE_GAME_ID=48 scripts/bundle.sh
```

Outputs `dist/adinkra-match.zip` and `dist/ananse-hop.zip` with `index.html` at the root, relative
paths only and no CDN assets, so they pass the docs' pre-upload checklist and play offline.
The React build ships a classic deferred script (not `type="module"`), because module scripts
are blocked from `file://`, which is where the mobile app runs downloaded games.

## Upload (docs → Uploading)

```bash
curl -X POST "$FEFE_API_URL/html5/games/47/upload" -H "Authorization: Bearer $FEFE_TOKEN" \
  -F offline_enabled=true -F bundle=@dist/adinkra-match.zip
```

## Hosting

`site/` plus the built games are published to GitHub Pages (free) by `scripts/deploy-pages.sh`.
Fefe itself hosts the uploaded bundles, and that is what powers in-app play, download and offline.
