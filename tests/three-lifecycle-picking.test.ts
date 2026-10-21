import { describe, expect, it, vi } from 'vitest';
import { BoxGeometry, CylinderGeometry, Group, InstancedMesh, Mesh, MeshBasicMaterial, Texture } from 'three';
import { pickActorId } from '../src/render-three/InputPicking';
import { ThreeCamera, toThree } from '../src/render-three/Coordinates';
import { disposeSceneResources } from '../src/render-three/SceneResources';

describe('P1 real raycast and resource ownership', () => {
  it.each([45, 60, 75])('selects a body proxy at %s degrees without picking decorative geometry', angle => {
    const view = new ThreeCamera(); view.resize(1280, 720); view.setElevation(angle); view.lookAt({ x: 3100, y: 1700 });
    const rect = { left: 31.5, top: 19.75, width: 1280, height: 720 };
    const body = new Mesh(new CylinderGeometry(11, 11, 78, 8), new MeshBasicMaterial());
    body.position.copy(toThree({ x: 3100, y: 1700 }, 39)); body.userData.entityId = 3;
    body.visible = false; // P2 uses an invisible body proxy behind the sprite card.
    const decorative = new Mesh(new BoxGeometry(80, 200, 80), new MeshBasicMaterial());
    decorative.position.copy(toThree({ x: 3100, y: 1700 }, 100));
    const screen = view.project({ x: 3100, y: 1700 }, 39);
    const client = { x: screen.x + rect.left, y: screen.y + rect.top };
    expect(pickActorId(view, rect, client, [body])).toBe(3);
    expect(pickActorId(view, rect, client, [])).toBeNull();
    expect(pickActorId(view, rect, { x: -1, y: -1 }, [body])).toBeNull();
    expect(view.pick(client, rect)).not.toBeNull();
    body.geometry.dispose(); body.material.dispose(); decorative.geometry.dispose(); decorative.material.dispose();
  });
  it('releases shared geometry/material/texture exactly once and disposes instance attributes', () => {
    const root = new Group(), geometry = new BoxGeometry(), texture = new Texture();
    const material = new MeshBasicMaterial({ map: texture });
    const instanced = new InstancedMesh(geometry, material, 2);
    root.add(instanced, new Mesh(geometry, material));
    const g = vi.spyOn(geometry, 'dispose'), m = vi.spyOn(material, 'dispose'), t = vi.spyOn(texture, 'dispose');
    const instances = vi.fn(); instanced.addEventListener('dispose', instances);
    disposeSceneResources(root);
    expect(g).toHaveBeenCalledTimes(1); expect(m).toHaveBeenCalledTimes(1); expect(t).toHaveBeenCalledTimes(1);
    expect(instances).toHaveBeenCalledTimes(1);
  });
});
