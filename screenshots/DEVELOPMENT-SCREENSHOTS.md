# 3D development screenshots — historical renders plus v4.2.1 QA

PNG files in this folder are offline QA renders and asset previews, not screenshots captured from a running browser session. A Chromium WebGL context could not be created in the QA container, so live WebGL rendering was not visually verified here.

- `00`–`06` — representative location scenes from earlier procedural world QA.
- `07` — 3D mesh gallery for all 53 item catalog entries.
- `08` — earlier player/faction mesh lineup; retained as historical development output.
- `09` — earlier behind-the-shoulder camera composition; retained as historical development output.
- `10-character-hands.png` — offline character/hand geometry preview from the earlier pass.
- `11-first-person-preview.png` — offline first-person composition preview, not a browser capture.
- `13-npc-appearance-preview.png` — new offline asset preview showing the full-body transparent appearance art used by the runtime atlas for loner, bandit and military NPCs.

The current runtime draws NPC appearances as camera-facing transparent sprites in the 3D scene, with player-facing rotation and ground shadows. They are not rigged 3D character meshes and do not yet have skeletal walk cycles.

- `qa-v421/empty-hands-bare.png` and `qa-v421/empty-hands-armored.png` — off-screen VTK renders of the new neutral open-hand pose with bare forearms and with equipped armor/gloves. These inspect the generated hand geometry, not live browser gameplay.
