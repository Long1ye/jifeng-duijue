# Concealment brush art v3

Derived from approved concept `assets/map-concepts/howling-detail-v1/08-hero-concealment-brush.png`, using one built-in imagegen edit with native transparent background. No external paid API requests. `brush-bed.png` is the unmodified generated 1672×941 RGBA image, copied byte-for-byte. Exact prompt is in `generation.prompt.txt`; source, alpha range and SHA-256 are in `brush-bed.manifest.json`.

One complete dense frost-reed bed replaces the old grass/fern tuft batches at each of the five existing `ART_BRUSHES` anchors. Length and width continue to come from the shared bridge layout. The opaque image width controls scale; a measured sloping root profile in `BRUSH_BED` reconstructs height/depth at the fixed 45-degree camera and keeps the roots above the paving. All five beds share one alpha-tested texture/material, support depth occlusion and cast shadows. No runtime grass/fern props from details-v1 are loaded.

This replaces visual assets only. It does not add concealment or vision mechanics, change the five shared region bounds, or change movement/collision rules.
