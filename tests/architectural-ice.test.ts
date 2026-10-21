import { expect, it, vi } from 'vitest';
import { BufferGeometry, Mesh, MeshBasicMaterial, Texture, TextureLoader } from 'three';
import { ArchitecturalIce, ICE_PLACEMENTS } from '../src/render-three/ArchitecturalIce';
import { ART_BRUSHES, artEdgeV } from '../src/render-three/PaintedMapLayout';
import { mapTeamAt } from '../src/render-three/TeamPalette';

it('uses curated forms on architectural surfaces, keeps grass open and releases shared textures once', () => {
  const loads: { texture: Texture; done(): void }[] = [];
  const mock = vi.spyOn(TextureLoader.prototype, 'load').mockImplementation((_url, done) => {
    const texture = new Texture<HTMLImageElement>(); loads.push({ texture, done: () => done?.(texture) }); return texture;
  });
  const ice = new ArchitecturalIce();
  try {
    expect(new Set(ICE_PLACEMENTS.map(p => p.attachment)).size).toBeGreaterThanOrEqual(3);
    expect(loads).toHaveLength(new Set(ICE_PLACEMENTS.map(p => p.kind)).size);
    expect(ice.group.children).toHaveLength(new Set(ICE_PLACEMENTS.map(p => `${p.kind}:${p.attachment === 'underside' ? 'neutral' : mapTeamAt(p.u)}`)).size);
    for (const mesh of ice.group.children) for (const p of mesh.userData.placements) {
      expect(mesh.userData.team).toBe(p.attachment === 'underside' ? 'neutral' : mapTeamAt(p.u));
      if (p.attachment === 'ground') {
        const material = (mesh as Mesh<BufferGeometry, MeshBasicMaterial>).material;
        expect(material.depthTest).toBe(true);
        expect(material.depthWrite).toBe(true);
        expect(mesh.renderOrder).toBe(0);
      }
    }
    expect(ice.group.children.every(o => !o.visible)).toBe(true);
    expect(ICE_PLACEMENTS.filter(p => p.attachment === 'coping').length).toBeGreaterThanOrEqual(1);
    for (const p of ICE_PLACEMENTS) {
      if (p.attachment === 'underside') expect(p.height).toBeLessThan(0);
      if (p.attachment === 'coping') expect(p.height).toBeGreaterThan(60);
      if (p.attachment !== 'ground') continue;
      const v = p.side * (artEdgeV(p.u) - p.inset);
      expect(ART_BRUSHES.some(b => Math.abs(p.u - b.u) < b.length / 2 + 10 && Math.abs(v - b.v) < b.width / 2 + 12)).toBe(false);
    }
    loads.forEach(l => l.done()); ice.update(); expect(ice.group.children.every(o => o.visible)).toBe(true);
    const disposal = loads.map(l => vi.spyOn(l.texture, 'dispose'));
    ice.dispose(); ice.dispose(); loads.forEach(l => l.done());
    disposal.forEach(spy => expect(spy).toHaveBeenCalledTimes(1));
  } finally { ice.dispose(); mock.mockRestore(); }
});


