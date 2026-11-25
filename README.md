# STALKER Cordon 4.2.3

Local-only NPC dialogue build, refined first-person hand meshes, and mobile stability maintenance.

## Included in 4.2.3
- The mobile 3D interface now keeps only the four most-used movement/interaction controls plus an «ЕЩЁ» button visible. Secondary actions can be opened in a compact tray instead of permanently covering the lower-right of the screen.
- Touch targets are 42–44 px, respect phone safe-area insets, and use a dedicated compact layout for landscape phones.
- Mobile 3D rendering uses a lighter terrain mesh and a lower WebGL pixel-ratio cap to reduce GPU work and improve startup/per-frame performance on phones.
- iOS Safari and Android browser home-screen metadata is present; the app remains orientation-flexible.
- Touch joystick/look/sprint inputs are explicitly cleared when the browser loses focus or the app is backgrounded, preventing stuck movement after switching apps or opening system overlays.
- The PWA remains orientation-flexible; portrait and landscape layouts are both supported.
- Added regression checks for the mobile control tray, touch target sizes, viewport and focus-loss cleanup.
- Removed the external generative-AI adapter, API-key proxy server, `.env.example` secret template, API endpoint setting and related UI. NPC dialogue now uses only the local game dialogue engine; no game dialogue or save data is sent to an external AI service.
- Legacy and imported saves automatically discard the obsolete `npcAiEndpoint` setting.
- Rebuilt first-person empty hands: narrower forearms, a tapered wrist-to-palm connection, smoother wider palms, four individually shaped fingers with unequal lengths and articulated joints, and a separately shaped thumb. Bare hands include small nail details; equipped armor retains the glove/sleeve material.
- Added fresh offline QA renders for bare and gloved empty hands in `screenshots/qa-v423-empty-hands-bare.png` and `screenshots/qa-v423-empty-hands-gloved.png`.

## Included in 4.2.1
- The first-person view now shows relaxed, open empty hands when no weapon is present in the active equipment slots; the renderer no longer invents a default AKS-74U.
- Unarmored players have bare forearms and hands; wearing armor restores the appropriate sleeves, cuffs and gloves.
- The weapon HUD now says «Пустые руки» when the active loadout has no weapon instead of showing an automatically selected backpack item.
- Added geometry regression checks for bare and armored empty-hands meshes.
- The idle weapon HUD has an «Убрать из рук» action; it clears only the active held-item selection and leaves the assigned equipment slots intact. This action is hidden during an encounter.

## Included in 4.2.0
- Expanded player-written NPC conversations with dedicated topics for repairs, live quest status, artifact descriptions, rest locations, radio/communications, inventory summaries, local services and encyclopedia records.
- NPC quest-status answers read the active game quest list and report active or ready objectives instead of incorrectly treating every question about tasks as a new job request.
- Artifact answers can identify known artifacts from the catalog and show their in-game description; Sidorovich can quote the catalog base value while reminding the player that actual trade prices are shown in the exchange UI.
- Inventory questions summarize the current carried items rather than returning generic dialogue.
- No quick-reply buttons or canned player messages have been reintroduced. All questions are typed by the player.
- Added regression coverage for the expanded dialogue topics and their dynamic game-state details.

## Included from 4.1.0
- Redesigned the NPC dialogue as a framed PDA-style conversation panel with a character profile, portrait, faction/rank details, current location, relationship meter, and distinct player/NPC message bubbles.
- Improved desktop and touch layouts.
- NPC relationship has a visible state (wary, reserved, acquainted, trusting) tied to the existing dialogue rapport value.
- Named NPCs rotate through contextual responses rather than repeatedly selecting the same deterministic line for the same topic.
- Follow-up replies refer to the previous conversation topic. NPC answers can also reflect the player's current health, hunger, and thirst when asked about condition.

## Included from 4.0.1
- Added a visible **СБЕЖАТЬ** action whenever a first-person encounter is active. The action is available on desktop and touch layouts.
- Ending an encounter no longer randomly fails, deals extra damage, or teleports the player to a neighbouring scene. The player's global Cordon coordinates remain unchanged.
- The active threat NPC is no longer an invisible movement wall. Players can move past the encounter, and the encounter ends when they get more than 18 world units away.
- Initial saved coordinates are clamped back inside the playable Cordon map if a save contains positions outside its boundaries.
- The playable area has an invisible safety margin inside the satellite-map rectangle. NPC patrol destinations are kept inside the same rectangle.
- Location prop meshes are triangle-culled at the exact map rectangle; static loot and dropped items outside it are not rendered.

## Current limitations
- This patch changes dialogue presentation and conversation logic; it does not add combat features.
- The Cordon uses one global terrain surface and no location-to-location loading transition. Local props remain grouped by map region for rendering performance.
- The visible height profile remains an authored approximation based on the supplied overhead map, not surveyed elevation data.
- Visual quality still varies by location; regression tests check code, geometry and state behavior, but cannot replace a complete human playthrough of every quest and route.

## QA notes
- `screenshots/qa-v423-empty-hands-bare.png` and `qa-v423-empty-hands-gloved.png` are offline VTK mesh renders used to inspect the revised hand proportions; they are not browser gameplay captures.
- `screenshots/qa-v401-global-map.png` is an off-screen, top-down render of the global terrain and roads. It is a geometry screenshot, not a live browser gameplay capture.
- `npm test` passes: startup, smoke/regression, and 3D renderer tests.
- Syntax checks pass for the modified main UI, main controller, and dialogue engine.
- A live Chromium screenshot could not be captured in the current QA environment: system Chromium stalled during headless startup and the Playwright-managed browser binary is not installed. The rendered HTML and UI strings are covered by automated tests, but in-browser visual inspection remains unverified.

## Run

```bash
python -m http.server 8000
```

Open http://localhost:8000.
