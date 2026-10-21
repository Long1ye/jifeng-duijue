import { expect, it, vi } from 'vitest';
import { Mesh, Texture, TextureLoader } from 'three';
import { PaintedDetails, DETAIL_PLACEMENTS } from '../src/render-three/PaintedDetails';
import { ART_BRAZIERS, ART_CRYSTALS, ART_GUARDIANS, ART_BRUSHES, artEdgeV } from '../src/render-three/PaintedMapLayout';
import { bridgePoint, onPlayableBridge } from '../src/game/Bridge';
import { onBridgeFootprint } from '../src/game/BridgeInteraction';

it('keeps details clear of existing props, waits for textures and disposes shared assets once', () => {
  const loads: { texture: Texture; done(): void }[] = [];
  const urls: string[] = [];
  const mock = vi.spyOn(TextureLoader.prototype, 'load').mockImplementation((_url, done) => {
    urls.push(_url);
    const texture = new Texture<HTMLImageElement>(); loads.push({ texture, done: () => done?.(texture) }); return texture;
  });
  const details = new PaintedDetails();
  try {
    expect(loads).toHaveLength(1);
    expect(DETAIL_PLACEMENTS).toHaveLength(0);
    expect(urls.filter(url => url.includes('howling-brush-v3/brush-bed.png'))).toHaveLength(1);
    expect(urls.some(url => /props\/(grass|fern)\.png/.test(url))).toBe(false);
    expect(DETAIL_PLACEMENTS.some(p => p.kind === 'fern' || p.kind === 'grass')).toBe(false);
    for (const b of ART_BRUSHES) {
      expect(details.group.children.filter(o => o.userData.brushId === b.id)).toHaveLength(1);
      for (const du of [-b.length / 2, 0, b.length / 2]) for (const dv of [-b.width / 2, 0, b.width / 2]) {
        const p = bridgePoint(b.u + du, b.v + dv);
        expect(onPlayableBridge(p)).toBe(true); expect(onBridgeFootprint(p, 11)).toBe(false);
      }
    }
    expect(details.group.children.every(o => !o.visible)).toBe(true);
    for (const p of DETAIL_PLACEMENTS) for (const other of [...ART_BRAZIERS, ...ART_CRYSTALS, ...ART_GUARDIANS]) {
      if (Math.sign(other.v) === p.side && Math.abs(Math.abs(other.v) - (artEdgeV(p.u) - p.inset)) < 40) expect(Math.abs(other.u - p.u)).toBeGreaterThanOrEqual(25);
    }
    loads.forEach(l => l.done()); details.update();
    expect(details.group.children.every(o => o.visible)).toBe(true);
    for (const child of details.group.children) {
      const mesh = child as Mesh; mesh.geometry.computeBoundingBox();
      expect(mesh.geometry.boundingBox!.min.y + mesh.position.y).toBeGreaterThan(.55);
    }
    const disposal = loads.map(l => vi.spyOn(l.texture, 'dispose'));
    details.dispose(); details.dispose(); loads.forEach(l => l.done());
    disposal.forEach(spy => expect(spy).toHaveBeenCalledTimes(1));
  } finally { details.dispose(); mock.mockRestore(); }
});
