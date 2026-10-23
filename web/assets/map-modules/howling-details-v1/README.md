# Independent frozen bridge details v1

Grass/fern runtime update: these two original props are archived. The current painted-map renderer uses `howling-brush-v3/brush-bed.png`, derived from concept 08, as one whole dense reed bed at each shared brush anchor. It no longer assembles functional-looking grass areas from these small props. Other decorative props in this folder remain in use.

Six transparent PNG props extracted from a built-in imagegen atlas: frost grass, snowy fern, low stone rubble, crates, barrels/sack, and lantern on a low stone.

References: assets/map-concepts/howling-detail-v1/{01-frost-brush,02-ruined-shoulder,03-sanctuary-life}.png.

Generation prompt: transparent 3-column by 2-row prop atlas, one isolated cluster per cell, matching the references at orthographic 45 degrees, cold blue-gray materials, snowy tops, upper-left lighting. Exclude standing walls, fences, terrain rectangles and scenery. Amber lantern only. Source atlas is preserved as atlas.png; props/*.png are cropped cells with original alpha retained. props.json records native canvas sizes.

Runtime: src/render-three/PaintedDetails.ts. Props follow the existing fence edge, avoid fire bowls, crystals and guardians, and leave the central combat lane clear. They are decorative; grass has no hiding or collision behavior. Static alpha-tested relief geometry preserves source projection at the painted map camera. No changes to the continuous fence or gameplay footprint.
