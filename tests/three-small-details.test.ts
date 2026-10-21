import { expect, it, vi } from 'vitest';
import { Mesh, Texture, TextureLoader, Vector3 } from 'three';
import { PaintedSmallDetails, SMALL_DETAIL_PLACEMENTS, CONCEPT_WALL_GROUPS, ORIGINAL_WALL_BANNERS, wallDetailGeometry } from '../src/render-three/PaintedSmallDetails';
import { BRIDGE, bridgePoint, onPlayableBridge } from '../src/game/Bridge';
import { ART_BRUSHES, artEdgeV } from '../src/render-three/PaintedMapLayout';
import { ThreeCamera, WORLD_ORIGIN } from '../src/render-three/Coordinates';
import { mapTeamAt } from '../src/render-three/TeamPalette';

it('attaches wall props to the bridge axis while preserving the source projection', () => {
  const geometry = wallDetailGeometry(196, 335, 28), p = geometry.getAttribute('position');
  const camera = new ThreeCamera(); camera.setElevation(45); camera.lookAt(WORLD_ORIGIN);
  const origin = camera.project(WORLD_ORIGIN), factor = camera.size.height / (camera.camera.top - camera.camera.bottom);
  for (let i = 0; i < p.count; i++) {
    expect(p.getZ(i)).toBeCloseTo(p.getX(i) * BRIDGE.projection.along[1] / BRIDGE.projection.along[0], 5);
    const point = new Vector3(p.getX(i), p.getY(i), p.getZ(i)).project(camera.camera);
    expect((1 - point.y) * camera.size.height / 2 - origin.y).toBeCloseTo((i < 2 ? 0 : 335 * 28 / 196) * factor, 3);
  }
  geometry.dispose();
});

it('centers banners between real posts and leaves chains out of the live map', () => {
  const flags = SMALL_DETAIL_PLACEMENTS.filter(p => p.kind === 'wall-banner');
  expect(flags).toHaveLength(ORIGINAL_WALL_BANNERS.length * 2);
  for (const flag of flags) expect(clearFlag(flag.u)).toBe(true);
  expect(SMALL_DETAIL_PLACEMENTS.some(p => p.kind === 'wall-chain')).toBe(false);
  for (const { banner } of CONCEPT_WALL_GROUPS) {
    expect(banner.center).toBeCloseTo((banner.leftPost + banner.rightPost) / 2);
    expect(banner.width).toBeGreaterThanOrEqual(85);
  }
});

function clearFlag(u: number): boolean {
  return !ART_BRUSHES.some(b => b.v < 0 && Math.abs(u - b.u) < b.length / 2 + 20);
}

it('loads curated non-crystal prop types, keeps ground details outside brush and disposes shared textures once', () => {
  const loads: { texture: Texture; done(): void }[] = [];
  const mock = vi.spyOn(TextureLoader.prototype, 'load').mockImplementation((_url, done) => {
    const texture = new Texture<HTMLImageElement>(); loads.push({ texture, done: () => done?.(texture) }); return texture;
  });
  const details = new PaintedSmallDetails();
  try {
    const kinds = new Set(SMALL_DETAIL_PLACEMENTS.map(p => p.kind));
    expect(loads).toHaveLength(kinds.size); expect(details.group.children.every(o => !o.visible)).toBe(true);
    const props = details.group.children.filter(o => o.name.startsWith('painted-small-'));
    expect(props).toHaveLength(new Set(SMALL_DETAIL_PLACEMENTS.map(p => `${p.kind}:${p.kind === 'wall-banner' ? mapTeamAt(p.u) : 'neutral'}`)).size);
    for (const mesh of props) for (const p of mesh.userData.placements) {
      expect(mesh.userData.team).toBe(p.kind === 'wall-banner' ? mapTeamAt(p.u) : 'neutral');
    }
    expect(props.flatMap(o => o.userData.placements)).toHaveLength(SMALL_DETAIL_PLACEMENTS.length);
    for (const p of SMALL_DETAIL_PLACEMENTS) {
      if (p.top !== undefined) continue;
      const v = p.side * (artEdgeV(p.u) - p.inset);
      expect(onPlayableBridge(bridgePoint(p.u, v))).toBe(true);
      expect(ART_BRUSHES.some(b => Math.abs(p.u - b.u) < b.length / 2 + 10 && Math.abs(v - b.v) < b.width / 2 + 12)).toBe(false);
    }
    loads.forEach(l => l.done()); details.update();
    expect(details.group.children.every(o => o.visible)).toBe(true);
    for (const child of details.group.children) {
      // Chain quads include transparent corners below their physical hanging links.
      if (child.name === 'painted-small-wall-chain' || child.name === 'detail-chain-wall-shadow' || child.name === 'detail-wall-warmth') continue;
      const mesh = child as Mesh; mesh.geometry.computeBoundingBox();
      expect(mesh.geometry.boundingBox!.min.y + mesh.position.y, child.name).toBeGreaterThan(.55);
    }
    const disposal = loads.map(l => vi.spyOn(l.texture, 'dispose'));
    details.dispose(); details.dispose(); loads.forEach(l => l.done());
    disposal.forEach(spy => expect(spy).toHaveBeenCalledTimes(1));
  } finally { details.dispose(); mock.mockRestore(); }
});
