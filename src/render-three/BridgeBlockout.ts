import {
  BoxGeometry, Color, CylinderGeometry, DataTexture, ExtrudeGeometry, Group, InstancedMesh,
  Mesh, MeshLambertMaterial, NearestFilter, Object3D, RGBAFormat, Shape, SRGBColorSpace,
} from 'three';
import { BRIDGE_OUTLINE, BRIDGE_SLOTS, bridgePoint, onPlayableBridge } from '../game/Bridge';
import { BRIDGE_FOOTPRINTS } from '../game/BridgeInteraction';
import { unproject } from '../../assets/map-studies/howling-abyss-v1/geometry';
import { BRIDGE } from '../game/Bridge';
import { toThree } from './Coordinates';

export const SAMPLE_REGION = { id: 'S01', minU: -280, maxU: 80, minV: -112, maxV: 112 } as const;
export const BLOCKOUT_TILE_SIZE = 32;
export function pixelGrid(size: 32 | 64): DataTexture {
  // Diagnostic texel grid only: not a generated or approved production asset.
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const shade = x === 0 || y === 0 ? 135 : ((x >> 2) + (y >> 2)) % 2 ? 219 : 235;
    data.set([shade, shade, shade, 255], (y * size + x) * 4);
  }
  const texture = new DataTexture(data, size, size, RGBAFormat);
  texture.colorSpace = SRGBColorSpace; texture.magFilter = texture.minFilter = NearestFilter;
  texture.generateMipmaps = false; texture.needsUpdate = true;
  return texture;
}

export function createBridgeBlockout(): { group: Group; material: MeshLambertMaterial; tiles: number } {
  const group = new Group(); group.name = 'P1 diagnostic blockout';
  const shape = new Shape();
  BRIDGE_OUTLINE.forEach((point, index) => {
    const p = toThree(point); if (index === 0) shape.moveTo(p.x, -p.z); else shape.lineTo(p.x, -p.z);
  }); shape.closePath();
  const base = new Mesh(new ExtrudeGeometry(shape, { depth: 60, bevelEnabled: false }), new MeshLambertMaterial({ color: 0x343e4d }));
  base.rotation.x = -Math.PI / 2; base.position.y = -62; group.add(base);
  const cells: { x: number; y: number; sample: boolean }[] = [];
  const step = BLOCKOUT_TILE_SIZE, half = step / 2;
  const minX = Math.min(...BRIDGE_OUTLINE.map(p => p.x)), maxX = Math.max(...BRIDGE_OUTLINE.map(p => p.x));
  const minY = Math.min(...BRIDGE_OUTLINE.map(p => p.y)), maxY = Math.max(...BRIDGE_OUTLINE.map(p => p.y));
  for (let y = Math.floor(minY / step) * step; y < maxY; y += step) for (let x = Math.floor(minX / step) * step; x < maxX; x += step) {
    if (![-half, half].every(dx => [-half, half].every(dy => onPlayableBridge({ x: x + dx, y: y + dy })))) continue;
    const [u, v] = unproject(BRIDGE, x, y);
    cells.push({ x, y, sample: u >= SAMPLE_REGION.minU && u <= SAMPLE_REGION.maxU && Math.abs(v) <= SAMPLE_REGION.maxV });
  }
  const material = new MeshLambertMaterial({ map: pixelGrid(32) });
  const tiles = new InstancedMesh(new BoxGeometry(step - 0.6, 2, step - 0.6), material, cells.length);
  const dummy = new Object3D();
  cells.forEach((cell, i) => {
    dummy.position.copy(toThree(cell, -1)); dummy.updateMatrix(); tiles.setMatrixAt(i, dummy.matrix);
    tiles.setColorAt(i, new Color(cell.sample ? 0x8b9dad : 0x627180));
  });
  tiles.instanceMatrix.needsUpdate = true;
  if (tiles.instanceColor) tiles.instanceColor.needsUpdate = true;
  tiles.computeBoundingSphere(); group.add(tiles);
  const foundationMaterial = new MeshLambertMaterial({ color: 0x566579 });
  for (const site of BRIDGE_FOOTPRINTS) {
    const mesh = new Mesh(new CylinderGeometry(1, 1, 12, 12), foundationMaterial);
    mesh.scale.set(site.rx, 1, site.ry); mesh.position.copy(toThree(site, 6)); group.add(mesh);
  }
  // Decorative sites have no gameplay entities. Active outer towers are actors.
  for (const slot of BRIDGE_SLOTS.filter(s => s.id.endsWith('inner') || s.id.includes('nexus-tower'))) {
    const column = new Mesh(new BoxGeometry(30, 90, 30), foundationMaterial);
    column.position.copy(toThree(bridgePoint(slot.u, slot.v), 45)); group.add(column);
  }
  return { group, material, tiles: cells.length };
}
