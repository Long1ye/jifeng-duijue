import { expect, it } from 'vitest';
import { BufferGeometry, Vector3 } from 'three';
import { BRIDGE, bridgePoint } from '../src/game/Bridge';
import { ThreeCamera, WORLD_ORIGIN, toThree } from '../src/render-three/Coordinates';
import { ART_BRUSHES, artEdgeV } from '../src/render-three/PaintedMapLayout';
import { BRUSH_BED, DETAIL_PLACEMENTS } from '../src/render-three/PaintedDetails';
import { SMALL_DETAIL_PLACEMENTS, wallDetailGeometry } from '../src/render-three/PaintedSmallDetails';
import { ICE_PLACEMENTS, clearOfFixtures } from '../src/render-three/ArchitecturalIce';
import { landmarkRelief } from '../src/render-three/PaintedMapLandmarks';

it('keeps the full lamp silhouette outside tall-grass silhouettes at the actual camera angle', () => {
  const camera = new ThreeCamera(); camera.setElevation(45); camera.lookAt(WORLD_ORIGIN);
  const bounds = (g: BufferGeometry, point: Vector3) => {
    const p = g.getAttribute('position'), xs: number[] = [], ys: number[] = [];
    for (let i = 0; i < p.count; i++) {
      const projected = new Vector3(p.getX(i), p.getY(i), p.getZ(i)).add(point).project(camera.camera);
      xs.push(projected.x); ys.push(projected.y);
    }
    g.dispose(); return { l: Math.min(...xs), r: Math.max(...xs), b: Math.min(...ys), t: Math.max(...ys) };
  };
  const grass = ART_BRUSHES.map(b => bounds(landmarkRelief({ ...BRUSH_BED,
    scale: (b.length * Math.abs(BRIDGE.projection.along[0]) + b.width * Math.abs(BRIDGE.projection.across[0])) / BRUSH_BED.opaqueWidth,
  }), toThree(bridgePoint(b.u, b.v), 1.1)));
  for (const lamp of SMALL_DETAIL_PLACEMENTS.filter(p => p.kind === 'wall-lantern')) {
    const box = bounds(wallDetailGeometry(143, 281, lamp.width), toThree(bridgePoint(lamp.u, -(artEdgeV(lamp.u) - lamp.inset)), lamp.top));
    for (const bed of grass) expect(box.l < bed.r && box.r > bed.l && box.b < bed.t && box.t > bed.b).toBe(false);
  }
});

it('reserves lamp and banner space for ice and keeps supplies out of open courtyards', () => {
  for (const ice of ICE_PLACEMENTS) {
    if (ice.attachment !== 'underside' && ice.attachment !== 'ground') expect(clearOfFixtures(ice.u, ice.side, ice.attachment === 'coping' ? 20 : 24)).toBe(true);
  }
  expect(DETAIL_PLACEMENTS.some(p => p.kind === 'lantern')).toBe(false);
  for (const p of [...DETAIL_PLACEMENTS, ...SMALL_DETAIL_PLACEMENTS]) {
    if (['rope-coil', 'folded-tarp', 'crates', 'barrels'].includes(p.kind)) {
      expect(Math.abs(p.u)).toBeGreaterThanOrEqual(450); expect(Math.abs(p.u)).toBeLessThanOrEqual(490);
    }
  }
});
