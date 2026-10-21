# Forest dynamic layers v1

The original 511 × 327 map remains unchanged. `ground.png` is the original map with only selected foreground pixels replaced from the game-assets / Meowa clean-ground candidate. `layers.json` records source-pixel placement of 14 transparent PNG regions: two water surfaces, three reed patches, three canopy regions and six flames. Water retains a static foundation under the animated surface.

Run `node scripts/split-forest-layers.mjs` to reproduce extraction. The script asserts that placing all extracted original pixels back without animation reconstructs the original RGBA image exactly. No resampling is used in extraction.

`MapLayerFrames.ts` generates 12 cached frames per region: subtle water brightness flow and at most one source-pixel foliage displacement with anchored roots. Fire height and opacity vary independently. The game uses simulation time, so pause and training slow-motion also affect scenery. The original-map toggle is under Options / Practice. The separate preview supports individual layer visibility and links to each PNG.

Scope: a first dynamic-layer pass, not a complete editable tilemap or a complete object-by-object semantic decomposition. Rocks, structures, trunks, baked shadows, small ground plants and shrubs on rocks remain static. Map coordinates, collisions, movement and skill ranges are untouched. Foliage proximity fading is visual only, not a brush-stealth mechanic. The ground candidate is used only in selected holes; it is not substituted for the whole map.

Validation: per-region bounds and animation tests; lossless original reconstruction; browser preview of layers and game comparison switch. Check the original artwork when expanding masks because warm wood and green rock highlights can resemble flames or leaves.
