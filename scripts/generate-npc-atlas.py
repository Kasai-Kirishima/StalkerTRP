#!/usr/bin/env python3
"""Pack the project's transparent full-body NPC appearances into a compact RGBA atlas."""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "assets" / "npc" / "Vneska"
OUT = ROOT / "assets" / "textures" / "npc-appearance-atlas.png"
CELL_W, CELL_H, COLS, ROWS = 256, 512, 4, 4

# Loner, bandit and military appearance variants already included with the project.
FILES = [
    "volkvneska.webp", "stalkervneska2.webp", "stalkervneska4.webp", "stalkervneska5.webp",
    "stalkervneska6.webp", "banditbvneska3.webp", "banditvneska4.webp", "banditvneska5.webp",
    "banditvneska6.webp", "banditvneska7.webp", "voenuivneska1.webp", "voenuivneska2.webp",
    "voenuivneska3.webp", "dxerjunskivneska.webp", "stalkervneska1.webp", "stalkervneska3.webp",
]

atlas = Image.new("RGBA", (CELL_W * COLS, CELL_H * ROWS), (0, 0, 0, 0))
for index, name in enumerate(FILES):
    path = SRC / name
    if not path.exists():
        raise SystemExit(f"Missing NPC appearance: {path}")
    image = Image.open(path).convert("RGBA")
    # Source images are 1:2; preserve the entire silhouette and transparent edges.
    image.thumbnail((CELL_W - 20, CELL_H - 20), Image.Resampling.LANCZOS)
    x = (index % COLS) * CELL_W + (CELL_W - image.width) // 2
    y = (index // COLS) * CELL_H + (CELL_H - image.height) // 2
    atlas.alpha_composite(image, (x, y))

OUT.parent.mkdir(parents=True, exist_ok=True)
atlas.save(OUT, optimize=True)
print(f"Generated {OUT} ({OUT.stat().st_size:,} bytes)")
