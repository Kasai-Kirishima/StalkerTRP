# STALKER Cordon 4.2.0

Dialogue expansion release based on 4.1.1.

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
- The optional external generative AI still requires the player to configure a trusted personal proxy. Without it, contextual local dialogue is used.
- This patch changes dialogue presentation and conversation logic; it does not add combat features.
- The Cordon uses one global terrain surface and no location-to-location loading transition. Local props remain grouped by map region for rendering performance.
- The visible height profile remains an authored approximation based on the supplied overhead map, not surveyed elevation data.
- Visual quality still varies by location; regression tests check code, geometry and state behavior, but cannot replace a complete human playthrough of every quest and route.

## QA notes
- `screenshots/qa-v401-global-map.png` is an off-screen, top-down render of the global terrain and roads. It is a geometry screenshot, not a live browser gameplay capture.
- `npm test` passes: startup, smoke/regression, and 3D renderer tests.
- Syntax checks pass for the modified main UI, main controller, and dialogue engine.
- A live Chromium screenshot could not be captured in the current QA environment: system Chromium stalled during headless startup and the Playwright-managed browser binary is not installed. The rendered HTML and UI strings are covered by automated tests, but in-browser visual inspection remains unverified.

## Run

```bash
python -m http.server 8000
```

Open http://localhost:8000.
