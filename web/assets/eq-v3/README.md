# EQ / EQ3 revision — 2026-10-19

Generated with the project game-assets / Meowa skill, General Image 2.5, 1K, standard quality, native transparent background. Each original PNG is 1024 × 1024 RGBA, eight 256 × 512 cells in four columns. Source files and sanitized output manifests remain in `slash/` and `storm/`.

- Circular cutting sweep: `job_669e34b474e746748a3eda86bef75f3b`.
- Short rising wind ribbons: `job_8145b5ce9e374039ad390ae985586f34`.
- Both jobs completed successfully; each charged one credit. Downloads were recovered by original job ID into a shorter Windows path after the original long path failed. No duplicate submissions.
- `scripts/package-meowa-eq.py` registers centers by integer translation, preserving native soft alpha without resampling or repainting. `contract.json` records hashes and offsets.

Design: a thin steel-white cutting rim with blue-gray wake; EQ3 adds a short hollow updraft. The local original Yasuo Q video overview (`docs/screenshots/animation-qa/yasuo-official-q-overview.png`, circular cut at 12s) informed the restrained ring silhouette. These are newly generated adaptations, not extracted original VFX.

Gameplay radius increases from 38 to 50 world units (31.6%; diameter 76 to 100). Both EQ and EQ3 use `EQ.radius` for actual damage and knockup. The principal generated cutting rim is measured at 94px radius and rendered on a world-aligned ground plane at 50 world units, with faint trailing wisps beyond it. EQ3's upright wind is decorative; the ground cutting rim communicates the hit radius. Its upper wind renders behind the actor and near ground arc in front. Unit collision radii still contribute to hits at the boundary.

Two gathering frames begin 75ms before contact. Full frame 2 meets the actual simulation `triggerAt`; the six release frames finish within the existing 300ms recovery. Flash combos inherit their rescheduled contact and landing center. Generated gray-white hit sprites replace the former green EQ contact strokes.

Validation: production build; all 155 test files / 845 tests pass; added annulus and boundary checks for EQ/EQ3 in eight directions, one-hit-only, ally exclusion and knockup; existing EQ flash tests pass. Browser validation covers gathering, contact, sweep, release, fade, cleanup, camera elevations 45/60/75, pause and restart, without page/asset errors. Evidence: `docs/visual-validation/2026-10-19/meowa-eq/`. Native atlas playback: `preview.html`.
