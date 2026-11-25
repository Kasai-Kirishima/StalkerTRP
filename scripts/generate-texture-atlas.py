#!/usr/bin/env python3
"""Generate a compact, tileable offline albedo atlas for the Cordon WebGL scene."""
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw

SIZE = 512
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets' / 'textures' / 'cordon-materials.png'

def periodic_noise(size: int, grid: int, seed: int) -> np.ndarray:
    rng = np.random.default_rng(seed)
    lattice = rng.random((grid, grid), dtype=np.float32)
    axis = np.arange(size, dtype=np.float32) / size * grid
    ix = np.floor(axis).astype(np.int32) % grid
    fx = axis - np.floor(axis)
    smooth = fx * fx * (3 - 2 * fx)
    ix1 = (ix + 1) % grid
    x0, x1 = ix[:, None], ix1[:, None]
    y0, y1 = ix[None, :], ix1[None, :]
    sx, sy = smooth[:, None], smooth[None, :]
    a = lattice[x0, y0] * (1 - sx) + lattice[x1, y0] * sx
    b = lattice[x0, y1] * (1 - sx) + lattice[x1, y1] * sx
    return a * (1 - sy) + b * sy

def fbm(seed: int, weights=(0.48, 0.27, 0.15, 0.07, 0.03)) -> np.ndarray:
    grids = (3, 6, 12, 24, 48)
    return sum(w * periodic_noise(SIZE, g, seed + i * 31) for i, (g, w) in enumerate(zip(grids, weights)))

def clamp_rgb(a):
    return np.clip(a, 0, 255).astype(np.uint8)

Y, X = np.mgrid[0:SIZE, 0:SIZE].astype(np.float32)
x = X / SIZE
y = Y / SIZE

# Top-left: damp soil, gravel and compacted footpaths.
n = fbm(101)
n2 = fbm(141, (0.2, 0.25, 0.25, 0.2, 0.1))
pebble = periodic_noise(SIZE, 74, 201)
soil = np.zeros((SIZE, SIZE, 3), dtype=np.float32)
soil[:] = [76, 78, 58]
soil += (n[..., None] - .5) * np.array([74, 70, 48])[None, None, :]
soil += (n2[..., None] - .5) * np.array([26, 26, 20])[None, None, :]
soil += (pebble > .83)[..., None] * np.array([37, 35, 28])[None, None, :]
soil -= (pebble < .12)[..., None] * np.array([18, 17, 13])[None, None, :]
soil_img = Image.fromarray(clamp_rgb(soil))

# Top-right: weathered pine planks with vertical grain and worn edges.
wood_n = fbm(302, (0.35, 0.25, 0.2, 0.13, 0.07))
wood_fine = periodic_noise(SIZE, 88, 343)
plank = (np.sin(X / SIZE * 2 * np.pi * 12) * .5 + .5)
seams = (plank < .055).astype(np.float32)
grains = np.sin(X * .21 + np.sin(Y * .035 + wood_n * 8) * 1.4) * .5 + .5
wood = np.zeros((SIZE, SIZE, 3), dtype=np.float32)
wood[:] = [91, 70, 47]
wood += (wood_n[..., None] - .5) * np.array([77, 61, 40])[None, None, :]
wood += (grains[..., None] - .5) * np.array([27, 22, 14])[None, None, :]
wood += (wood_fine[..., None] - .5) * np.array([20, 17, 12])[None, None, :]
wood -= seams[..., None] * np.array([44, 35, 25])[None, None, :]
wood_img = Image.fromarray(clamp_rgb(wood))

# Bottom-left: aged concrete with aggregate, stains and tiny pits.
con_n = fbm(411)
con_fine = periodic_noise(SIZE, 92, 412)
stain = periodic_noise(SIZE, 9, 413)
concrete = np.zeros((SIZE, SIZE, 3), dtype=np.float32)
concrete[:] = [112, 113, 103]
concrete += (con_n[..., None] - .5) * np.array([70, 70, 65])[None, None, :]
concrete += (con_fine[..., None] - .5) * np.array([34, 34, 31])[None, None, :]
concrete -= (stain[..., None] > .72) * np.array([24, 24, 21])[None, None, :]
concrete += (con_fine[..., None] > .93) * np.array([24, 23, 20])[None, None, :]
concrete_img = Image.fromarray(clamp_rgb(concrete))

# Bottom-right: oxidised corrugated steel, faded paint and rust blooms.
metal_n = fbm(501)
metal_rust = periodic_noise(SIZE, 17, 502)
ridge = (np.sin(X / SIZE * 2 * np.pi * 44) * .5 + .5)
vertical = (np.sin(X * .15 + metal_n * 12) * .5 + .5)
rust_mask = np.clip((metal_rust - .40) * 2.2 + (vertical - .58) * .25, 0, 1)
metal = np.zeros((SIZE, SIZE, 3), dtype=np.float32)
metal[:] = [68, 75, 69]
metal += (ridge[..., None] - .5) * np.array([27, 29, 25])[None, None, :]
metal += (metal_n[..., None] - .5) * np.array([42, 43, 37])[None, None, :]
metal = metal * (1 - rust_mask[..., None] * .68) + np.array([133, 75, 43])[None, None, :] * rust_mask[..., None] * .68
metal_img = Image.fromarray(clamp_rgb(metal))

# Top-right: mottled leaves with clustered light/dark patches, suitable for low-poly foliage.
leaf_n = fbm(611, (0.26, 0.25, 0.22, 0.17, 0.10))
leaf_fine = periodic_noise(SIZE, 86, 612)
leaf_spots = periodic_noise(SIZE, 19, 613)
leaf = np.zeros((SIZE, SIZE, 3), dtype=np.float32)
leaf[:] = [48, 65, 39]
leaf += (leaf_n[..., None] - .5) * np.array([34, 50, 27])[None, None, :]
leaf += (leaf_fine[..., None] - .5) * np.array([20, 25, 15])[None, None, :]
leaf += (leaf_spots[..., None] > .69) * np.array([24, 31, 14])[None, None, :]
leaf -= (leaf_spots[..., None] < .22) * np.array([18, 21, 12])[None, None, :]
leaf_img = Image.fromarray(clamp_rgb(leaf))

# Bottom-right: faded olive canvas / clothing weave with subtle diagonal fibres.
fabric_n = fbm(711, (0.28, 0.24, 0.20, 0.16, 0.12))
fabric_fine = periodic_noise(SIZE, 114, 712)
weave_a = (np.sin((X + Y * .72) * .42) * .5 + .5)
weave_b = (np.sin((X - Y * .72) * .42) * .5 + .5)
fabric = np.zeros((SIZE, SIZE, 3), dtype=np.float32)
fabric[:] = [69, 75, 58]
fabric += (fabric_n[..., None] - .5) * np.array([42, 43, 32])[None, None, :]
fabric += (fabric_fine[..., None] - .5) * np.array([18, 18, 14])[None, None, :]
fabric += ((weave_a * weave_b)[..., None] - .25) * np.array([14, 14, 10])[None, None, :]
fabric_img = Image.fromarray(clamp_rgb(fabric))

# Top-right: worn asphalt with compacted aggregate, dark tyre scuffs and patched areas.
asphalt_n = fbm(811, (0.30, 0.24, 0.19, 0.15, 0.12))
asphalt_grain = periodic_noise(SIZE, 112, 812)
asphalt_patch = periodic_noise(SIZE, 12, 813)
asphalt = np.zeros((SIZE, SIZE, 3), dtype=np.float32)
asphalt[:] = [51, 53, 48]
asphalt += (asphalt_n[..., None] - .5) * np.array([38, 39, 35])[None, None, :]
asphalt += (asphalt_grain[..., None] - .5) * np.array([30, 29, 26])[None, None, :]
asphalt -= (asphalt_patch[..., None] > .76) * np.array([23, 22, 19])[None, None, :]
asphalt += (asphalt_patch[..., None] < .15) * np.array([14, 14, 12])[None, None, :]
asphalt_img = Image.fromarray(clamp_rgb(asphalt))

# Bottom-right: cloudy, scratched blue-grey glass. A restrained sheen avoids a flat blue tile.
glass_n = fbm(911, (0.36, 0.26, 0.18, 0.12, 0.08))
glass_streak = np.sin(X * .11 + np.sin(Y * .025 + glass_n * 7) * 1.8) * .5 + .5
glass = np.zeros((SIZE, SIZE, 3), dtype=np.float32)
glass[:] = [24, 37, 39]
glass += (glass_n[..., None] - .5) * np.array([25, 36, 38])[None, None, :]
glass += (glass_streak[..., None] - .5) * np.array([18, 23, 24])[None, None, :]
glass += (periodic_noise(SIZE, 71, 912)[..., None] > .94) * np.array([35, 40, 39])[None, None, :]
glass_img = Image.fromarray(clamp_rgb(glass))

atlas = Image.new('RGB', (SIZE * 4, SIZE * 2))
atlas.paste(soil_img, (0, 0))
atlas.paste(wood_img, (SIZE, 0))
atlas.paste(leaf_img, (SIZE * 2, 0))
atlas.paste(asphalt_img, (SIZE * 3, 0))
atlas.paste(concrete_img, (0, SIZE))
atlas.paste(metal_img, (SIZE, SIZE))
atlas.paste(fabric_img, (SIZE * 2, SIZE))
atlas.paste(glass_img, (SIZE * 3, SIZE))
OUT.parent.mkdir(parents=True, exist_ok=True)
atlas.save(OUT, format='PNG', optimize=True)
print(f'Generated {OUT} ({OUT.stat().st_size:,} bytes)')
