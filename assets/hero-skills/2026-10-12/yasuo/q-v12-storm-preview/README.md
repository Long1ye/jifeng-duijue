# Q readiness and free-angle tornado study

Standalone preview, not integrated into the main game's Q stack, damage, collision or knockup systems.

- Q3 character: unchanged W horizontal slash, single facing.
- Readiness: generated 8-frame transparent wind, 143×96, 800 ms; follows character, clipped into rear/front drawing regions.
- Tornado: generated 8-frame transparent loop, 112×141, 800 ms; fixed upright art. Ground anchor (57,112), with natural one-pixel variation at the base.
- Both animations preserve generated pixels and timing in WebP and four-column atlases; no edge clipping detected.
- Flight: vector from continuous aiming angle; locked when casting. No artwork rotation. Sorting is based on projectile ground Y relative to the character.
- Preview timing: 1400 ms readiness, release at 300 ms into the original 800 ms W slash, 1150 ms flight including short opacity fades. These are art-preview settings, not final balance.
- Source design and animation jobs are recorded in each component's plan/state files; original assets were not overwritten.
- Tests cover eight directions plus arbitrary 17°, 123°, 359° and clamped flight bounds. Browser checks cover readiness, north flight, 37° flight and locked trajectory after aim change.

Open `index.html` through the project's Vite server. Angle slider uses screen coordinates: right 0°, down 90°, left 180°, up 270°.
