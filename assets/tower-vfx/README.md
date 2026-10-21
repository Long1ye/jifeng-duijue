# Tower attack VFX — 2026-10-19

Generated through the project game-assets skill with Meowa General Image 2.5, standard 1K, native transparent background. Successful job `job_2038d9c2fc0445b0b564aebc4ec2270f`, one credit. The original RGBA image and sanitized final output manifest remain under `generated/`.

The 1024 × 1024 atlas contains sixteen 256 × 256 cells: four blue flight frames, four red flight frames, four blue impact frames and four red impact frames. `scripts/package-tower-vfx.py` registers bright core anchors with integer translations, preserving native pixels and soft alpha. Source hash and offsets are in `contract.json`.

The redesign uses compact white-hot energy cores, red/blue short comet tails, a small crystal charge/release flash, and short radial impact sparks. These are generated adaptations of the classic turret energy-bolt style, not extracted Riot assets. Flight anchors are `(192,128)` and impact anchors `(128,128)`.

`TowerAttackPresentation.ts` follows the existing homing projectile in world space and projects its direction into the current camera. The release position comes from the same UV anchor and float transform as the visible tower crystal. Each flight retains its initial muzzle and descending progress so moving/Flashing targets do not pull the missile back up toward the crystal. Actual simulation damage events trigger impacts on heroes and minions. The existing damage, targeting, attack rate, speed and wind-wall bypass remain intact; ranged projectile creation only gains a presentation timestamp.

Validation: build succeeded; 157 test files / 852 tests passed, including direction alignment at camera elevations 45/60/75, floating-crystal anchors, target displacement continuity and existing tower/wind-wall mechanics. Browser evidence in `docs/visual-validation/2026-10-19/tower-vfx/` covers 28 stages across both teams attacking heroes and melee minions, pause/restart cleanup, and no page or asset errors. `preview.html` plays all sixteen native-resolution cells; two complete preview cycles were inspected.
