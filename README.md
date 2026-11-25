# STALKER Cordon 3.8.0

Incremental update based on 3.7.0.

## Included in 3.8.0
- Main menu and preview identify version 3.8.0.
- The 3D ground now samples the supplied 768×1536 `cordon-clean.webp` map using the existing location coordinates.
- Added map-aligned terrain relief: a raised east-west railway embankment, cuts at the bridge and maintenance underpass, a lower ravine section, gentle ridges on the map edges, and a shallow village basin.
- Replaced the flat local ground tint with the matching satellite-style Cordon ground texture, with UVs derived from each location's map coordinates.
- The local road mesh follows the major mapped road lines and terrain heights.
- Preserved the opening above Sidorovich's underground trading room so the surface mesh does not seal the bunker.
- Updated the service-worker cache and added regression checks for map transforms, map texture usage, relief variation, the embankment and bunker opening.

## Known limitations
- The source image is an overhead/satellite-style map, not a surveyed elevation model. The relief is an authored approximation guided by the visible roads, forest edges, embankment, bridge, underpass and ravine; it is not real measured elevation data.
- The Cordon is still streamed as separate location scenes. Scene transitions have **not** been removed, and this is not yet one fully seamless global world. The current terrain pass makes the local terrain and texture correspond to the same map coordinates, but does not finish unified global streaming.
- Building interiors and all props have not yet been individually height-adjusted to a surveyed terrain mesh.
- The current firearm/aiming combat logic was not changed in this update.
- The cloud layer remains procedural low-poly geometry rather than volumetric weather simulation.

## Run

```bash
python -m http.server 8000
```

Open http://localhost:8000.
