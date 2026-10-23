import blueUrl from '../../assets/structures/howling-tower-v1/components/component_002.png?url';
import redUrl from '../../assets/structures/howling-tower-v1/components/component_001.png?url';

// Both cutouts share a 714px canvas height. Anchor at the centre of the base,
// rather than its bottom edge, so y-sorting agrees with the ground footprint.
export const TOWER_ART = { blue: blueUrl, red: redUrl };
export const TOWER_HEIGHT = 180;
export const TOWER_SCALE = TOWER_HEIGHT / 714;
export const TOWER_ORIGIN_Y = 0.9;
export const TOWER_BAR_OFFSET = TOWER_HEIGHT * TOWER_ORIGIN_Y + 8;
