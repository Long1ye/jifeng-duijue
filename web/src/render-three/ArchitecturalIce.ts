import { BufferGeometry, DoubleSide, Group, LinearFilter, LinearMipmapLinearFilter, Mesh, MeshBasicMaterial, SRGBColorSpace, TextureLoader, type Texture } from 'three';
import arch from '../../assets/map-modules/howling-architectural-ice-v1/props.json';
import ground from '../../assets/map-modules/howling-small-details-v1/manifest.json';
import railingCrystal from '../../assets/map-modules/howling-railing-crystals-v2/railing-crystal.json';
import railingCrystalUrl from '../../assets/map-modules/howling-railing-crystals-v2/props/component_001.png?url';
import { bridgePoint } from '../game/Bridge';
import { ART_BRAZIERS, ART_GUARDIANS, artEdgeV } from './PaintedMapLayout';
import { parapetBays } from './PaintedParapet';
import { crystalAccents } from './MaterialAccents';
import { wallDetailGeometry, SMALL_DETAIL_PLACEMENTS, clearOfBrush } from './PaintedSmallDetails';
import { landmarkRelief } from './PaintedMapLandmarks';
import { toThree } from './Coordinates';
import { disposeSceneResources } from './SceneResources';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { applyTeamAccent, mapTeamAt } from './TeamPalette';
import { crystalAnchor, type CrystalEmitter } from './CrystalMotes';

type Kind = keyof typeof arch | 'ice-crystal-cluster' | 'ice-crystal-shard' | 'ice-crystal-fan';
export interface IcePlacement { kind: Kind; u: number; side: -1 | 1; inset: number; height: number; width: number; attachment: 'ground' | 'wall' | 'coping' | 'pillar' | 'underside'; }
const files = {
  ...import.meta.glob('../../assets/map-modules/howling-architectural-ice-v1/props/*.png', { eager: true, query: '?url', import: 'default' }),
  ...import.meta.glob('../../assets/map-modules/howling-small-details-v1/props/ice-crystal-*.png', { eager: true, query: '?url', import: 'default' }),
} as Record<string, string>;
const fixtures = SMALL_DETAIL_PLACEMENTS.filter(p => p.top !== undefined && p.kind !== 'icicle-fringe');
export function clearOfFixtures(u: number, side: number, margin = 24): boolean {
  return !fixtures.some(f => f.side === side && Math.abs(f.u - u) < margin);
}
const bareBays = (side: -1 | 1) => parapetBays(side).filter(b => clearOfFixtures(b.center, side, 21));
const nearBareBay = (u: number, side: -1 | 1) => bareBays(side).reduce((best, b) => Math.abs(b.center - u) < Math.abs(best.center - u) ? b : best);
// Concept 05/10: small crystals emerge from snowy masonry feet. Anchor each
// cluster beside a real post rather than scattering it along the paved shoulder.
const footSites = (side: -1 | 1): IcePlacement[] => {
  const bays = parapetBays(side);
  return [...new Set([-675, -480, -365, -245, -45, 175, 355, 475, 675].map(u =>
    bays.reduce((best, bay) => Math.abs(bay.leftPost - u) < Math.abs(best.leftPost - u) ? bay : best)))]
    .map((bay, i) => ({ kind: (['ice-crystal-cluster', 'ice-crystal-shard', 'ice-crystal-fan'] as const)[i % 3],
      u: bay.leftPost + 5, side, inset: 5, height: 1,
      width: [19, 16, 21][i % 3], attachment: 'ground' }));
};
const sites: IcePlacement[] = [
  ...footSites(-1), ...footSites(1),
  ...[-570, -380, 195, 380, 650].map((u): IcePlacement => ({ kind: 'coping-crown', u: nearBareBay(u, -1).center, side: -1, inset: 6, height: 72, width: 20, attachment: 'coping' })),
  { kind: 'coping-crown', u: nearBareBay(320, 1).center, side: 1, inset: -6, height: 72, width: 18, attachment: 'coping' },
  ...[-190, 375].map((u): IcePlacement => ({ kind: 'wall-seam', u: nearBareBay(u, -1).rightPost, side: -1, inset: 3, height: 61, width: 15, attachment: 'wall' })),
  ...[-410, 410].map((u): IcePlacement => ({ kind: 'pillar-foot', u: nearBareBay(u, 1).leftPost, side: 1, inset: -2, height: 1, width: 23, attachment: 'pillar' })),
  ...[-610, -230, 140, 510].map((u): IcePlacement => ({ kind: 'hanging-shards', u, side: 1, inset: -4, height: -13, width: 24, attachment: 'underside' })),
];

function availableIceSite(p: IcePlacement): boolean {
  if (ART_GUARDIANS.some(g => Math.sign(g.v) === p.side && Math.abs(g.u - p.u) < 20)) return false;
  if (p.attachment === 'underside') return true;
  if (ART_BRAZIERS.some(b => Math.sign(b.v) === p.side && Math.abs(b.u - p.u) < 18)) return false;
  // Ground crystals sit inward from the wall; banners and chains occupy a
  // separate, raised surface and must not reserve the whole shoulder below.
  if (p.attachment !== 'ground' && !clearOfFixtures(p.u, p.side, p.attachment === 'coping' ? 20 : 24)) return false;
  if (!clearOfBrush(p.u, p.side, 18)) return false;
  return true;
}
const primaryIce = sites.filter(availableIceSite).filter((p, i, list) => !list.slice(0, i).some(other => other.side === p.side
  && other.attachment !== 'underside' && p.attachment !== 'underside' && Math.abs(p.u - other.u) < 19));
// Pair each approved wall-foot crystal with a second silhouette on the same
// snowy edge. Keep the established road clearance and architectural accents.
const companionIce = primaryIce.filter(p => p.attachment === 'ground').map((p, i): IcePlacement => {
  const companion = { ...p, kind: (['ice-crystal-fan', 'ice-crystal-cluster', 'ice-crystal-shard'] as const)[i % 3] };
  return [-10, 10].map(offset => ({ ...companion, u: p.u + offset })).find(availableIceSite)!;
});
// Sparse larger crowns form an uneven skyline. Most occupy the near railing:
// the far wall already carries banners and lamps. Keep the central crest clear.
const largeCrownSites: IcePlacement[] = [
  { kind: 'coping-crown', u: nearBareBay(199, -1).center, side: -1, inset: 7, height: 72, width: 50, attachment: 'coping' },
  ...[
    [-568, 44], [-346, 36], [247, 48], [618, 40],
  ].map(([target, width]): IcePlacement => ({ kind: 'coping-crown',
    u: nearBareBay(target, 1).center, side: 1, inset: -7, height: 72, width, attachment: 'coping' })),
];
const largeCrowns = largeCrownSites.filter(availableIceSite);
export const ICE_PLACEMENTS = [...primaryIce, ...companionIce, ...largeCrowns]
  .map(p => p.attachment === 'coping' ? { ...p, width: p.width * (p.width >= 40 ? 1.2 : 1.5) } : p);

/** The newly drawn contact edge already follows the railing in screen space.
 * Recover its individual root depths without shearing or concealing the image. */
export function copingCrystalGeometry(width: number): BufferGeometry {
  return landmarkRelief({ size: railingCrystal.size as [number, number], anchor: railingCrystal.anchor as [number, number],
    baseline: railingCrystal.baseline as [number, number][], scale: width / railingCrystal.size[0] });
}

/** Curated crystal accents with reserved space around fixtures and grass. */
export class ArchitecturalIce {
  readonly crystalEmitters: CrystalEmitter[] = [];
  readonly group = new Group();
  readonly errors: string[] = [];
  private readonly ready = new Set<Texture>();
  private disposed = false;
  private readonly time = { value: 0 };
  constructor() {
    this.group.name = 'architectural-ice';
    const loader = new TextureLoader(), textures = new Map<Kind, Texture>(), materials = new Map<string, MeshBasicMaterial>(), batches = new Map<string, BufferGeometry[]>();
    const placements = new Map<string, IcePlacement[]>();
    const anchors = new Map<string, { anchor: ReturnType<typeof crystalAnchor>; spread: number }[]>();
    for (const placement of ICE_PLACEMENTS) {
      const { kind, u, side, inset, height, width, attachment } = placement;
      const team = attachment === 'underside' ? 'neutral' : mapTeamAt(u), key = `${kind}:${team}`;
      const isArch = kind in arch;
      const asset = kind === 'coping-crown' ? railingCrystal : isArch ? arch[kind as keyof typeof arch] : ground.assets.find(a => a.id === kind)!;
      let material = materials.get(key);
      if (!material) {
        const directory = isArch ? 'howling-architectural-ice-v1' : 'howling-small-details-v1';
        const url = kind === 'coping-crown' ? railingCrystalUrl : files[`../../assets/map-modules/${directory}/props/${kind}.png`];
        let map = textures.get(kind);
        if (!map) {
          map = loader.load(url, texture => { if (!this.disposed) this.ready.add(texture); }, undefined, () => { if (!this.disposed) this.errors.push(url); });
          map.colorSpace = SRGBColorSpace; map.magFilter = LinearFilter; map.minFilter = LinearMipmapLinearFilter; map.anisotropy = 4; textures.set(kind, map);
        }
        material = new MeshBasicMaterial({ map, alphaTest: .38, color: attachment === 'underside' ? 0xb4c7df : 0xffffff, side: DoubleSide, toneMapped: false, fog: false });
        if (team === 'red') applyTeamAccent(material, team, 'ice');
        crystalAccents(material, this.time);
        material.userData.team = team; materials.set(key, material);
      }
      const [w, h] = asset.size, base = h * .92;
      const vertical = attachment === 'wall' || attachment === 'underside';
      const geometry = attachment === 'coping' ? copingCrystalGeometry(width) : vertical ? wallDetailGeometry(w, h, width)
        : landmarkRelief({ size: [w, h], anchor: [w / 2, base], scale: width / w, baseline: [[0, base], [w, base]] });
      const depthInset = attachment === 'coping' ? 0 : inset;
      const point = toThree(bridgePoint(u, side * (artEdgeV(u) - depthInset)), height);
      // The fixed 45-degree camera projects equal Y/Z offsets to the same
      // contact line. Bring the complete root silhouette ahead of the snow
      // depth surface without lifting its visible foot off the coping.
      if (attachment === 'coping') { point.y += 5; point.z += 5; }
      geometry.translate(point.x, point.y, point.z);
      if (attachment !== 'underside') {
        const list = anchors.get(key) ?? [];
        list.push({ anchor: crystalAnchor({ geometry }, .5, .72), spread: Math.max(2.5, width * .12) }); anchors.set(key, list);
      }
      const batch = batches.get(key) ?? []; batch.push(geometry); batches.set(key, batch);
      const group = placements.get(key) ?? []; group.push(placement); placements.set(key, group);
    }
    for (const [key, geometries] of batches) {
      const geometry = mergeGeometries(geometries, false); if (!geometry) throw new Error(`Cannot merge ${key}`);
      const mesh = new Mesh(geometry, materials.get(key)!); mesh.name = `ice-${key.replace(':','-')}`;
      mesh.userData.team = materials.get(key)!.userData.team;
      mesh.userData.placements = placements.get(key); this.group.add(mesh); geometries.forEach(g => g.dispose());
      for (const entry of anchors.get(key) ?? []) this.crystalEmitters.push({ source: mesh, ...entry, red: mesh.userData.team === 'red' });
    }
    this.update();
  }
  update(time = 0): void {
    this.time.value = time;
    for (const child of this.group.children) {
      const mesh = child as Mesh<BufferGeometry, MeshBasicMaterial>; mesh.visible = this.ready.has(mesh.material.map!);
    }
  }
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true; disposeSceneResources(this.group); this.group.clear(); this.group.removeFromParent();
  }
}
