import { expect, it, vi } from 'vitest';
import { Mesh, Texture, TextureLoader } from 'three';
import { MapPoros, PORO_PLACEMENTS } from '../src/render-three/MapPoros';
import { ThreeCamera, toSimulation } from '../src/render-three/Coordinates';
import { bridgePoint, onPlayableBridge } from '../src/game/Bridge';
import { ART_BRUSHES } from '../src/render-three/PaintedMapLayout';

it('keeps a sanctuary pair and three residents spread along the bridge outside functional brush', () => {
  expect(PORO_PLACEMENTS.filter(p => p.u < -470)).toHaveLength(2);
  expect(PORO_PLACEMENTS.filter(p => Math.abs(p.u) < 180)).toHaveLength(1);
  expect(PORO_PLACEMENTS.filter(p => Math.abs(p.u) >= 180 && Math.abs(p.u) < 470)).toHaveLength(2);
  for (const p of PORO_PLACEMENTS) {
    expect(onPlayableBridge(bridgePoint(p.u, p.v), 12)).toBe(true);
    expect(ART_BRUSHES.some(b => Math.abs(p.u - b.u) < b.length / 2 + 12 && Math.abs(p.v - b.v) < b.width / 2 + 12)).toBe(false);
  }
});

it('waits for sprites, moves contact shadows with residents and releases active and detached maps once', () => {
  const loads: { texture: Texture; done(): void }[] = [];
  const mock = vi.spyOn(TextureLoader.prototype, 'load').mockImplementation((_url, done) => {
    const texture = new Texture<HTMLImageElement>(); loads.push({ texture, done: () => done?.(texture) }); return texture;
  });
  const poros = new MapPoros(), camera = new ThreeCamera();
  try {
    expect(loads).toHaveLength(4);
    poros.update(0, camera); expect(poros.group.children.every(o => !o.visible)).toBe(true);
    loads.forEach(l => l.done()); poros.update(0, camera);
    expect(poros.group.children.every(o => o.visible)).toBe(true);
    const shadow = poros.group.children.find(o => o.name === 'poro-shadow-sanctuary-companion') as Mesh;
    const body = poros.group.children.find(o => o.name === 'poro-sanctuary-companion') as Mesh;
    const shadowY = shadow.position.y;
    const startX = body.position.x;
    for (let t = 0; t <= 12; t += 1 / 60) poros.update(t, camera);
    expect(body.position.x).not.toBe(startX);
    expect(body.position.x).toBe(shadow.position.x); expect(body.position.z).toBe(shadow.position.z);
    expect(body.position.y).toBeCloseTo(.9);
    expect(shadow.position.y).toBe(shadowY);
    const nearHero = bridgePoint(-587, -90);
    poros.update(12.01, camera, [nearHero]);
    expect(body.material).toHaveProperty('map', loads[0].texture);
    // Heroes behind either shoulder must still select the two face-visible
    // atlas rows. No independent head/body orientation is applied.
    const point = toSimulation(shadow.position);
    for (const dx of [-60, 60]) for (const dy of [-60, 60]) {
      poros.update(12.02, camera, [{ x: point.x + dx, y: point.y + dy }]);
      const uv = body.geometry.getAttribute('uv');
      for (let i = 0; i < uv.count; i++) expect(uv.getY(i)).toBeGreaterThanOrEqual(.5);
    }
    poros.update(0, camera); expect(body.position.y).toBeCloseTo(.9);
    const disposal = loads.map(l => vi.spyOn(l.texture, 'dispose'));
    poros.dispose(); poros.dispose(); loads.forEach(l => l.done());
    disposal.forEach(spy => expect(spy).toHaveBeenCalledTimes(1)); expect(poros.group.children).toHaveLength(0);
  } finally { poros.dispose(); mock.mockRestore(); }
});
