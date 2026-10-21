import { BufferGeometry, InstancedMesh, Line, Material, Mesh, Object3D, Texture } from 'three';

/** Dispose a detached ownership tree once, even when modules share resources. */
export function disposeSceneResources(root: Object3D): void {
  const geometries = new Set<BufferGeometry>(), materials = new Set<Material>(), textures = new Set<Texture>();
  root.traverse(object => {
    if (object instanceof InstancedMesh) object.dispose();
    if (!(object instanceof Mesh || object instanceof Line)) return;
    geometries.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      materials.add(material);
      for (const value of Object.values(material)) if (value instanceof Texture) textures.add(value);
    }
  });
  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) material.dispose();
  for (const texture of textures) texture.dispose();
}
