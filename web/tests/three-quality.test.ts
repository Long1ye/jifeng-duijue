import { afterEach, describe, expect, it, vi } from 'vitest';
import { BoxGeometry, DirectionalLight, Group, Matrix4, Mesh, MeshBasicMaterial, PlaneGeometry, Texture, Vector3 } from 'three';
import { QualitySettings, actorGrounding } from '../src/render-three/QualitySettings';
import { ShadowFocus } from '../src/render-three/ShadowFocus';
import { ThreeCamera, WORLD_ORIGIN, toThree } from '../src/render-three/Coordinates';
import { ContactOcclusion } from '../src/render-three/ContactOcclusion';
import { ArchitecturalGlow } from '../src/render-three/ArchitecturalGlow';
import { ActorLightField } from '../src/render-three/ActorLightField';
import { EnvironmentIllumination } from '../src/render-three/EnvironmentIllumination';
import { projectActorShadow } from '../src/render-three/ActorShadow';
import { PavingShadows } from '../src/render-three/PavingShadows';

afterEach(() => vi.restoreAllMocks());
describe('maintainable painted quality enhancements', () => {
  it('projects the current mirrored atlas frame along the sun, follows lift and leaves body data unchanged', () => {
    const body = new PlaneGeometry(40, 100).translate(0, 50, 0), shadow = new PlaneGeometry();
    const uv = body.getAttribute('uv'); for (let i = 0; i < uv.count; i++) uv.setX(i, 1 - uv.getX(i));
    const original = Array.from(body.getAttribute('position').array);
    projectActorShadow(body, shadow, 0);
    const positions = shadow.getAttribute('position');
    expect(positions.getX(0)).toBeGreaterThan(body.getAttribute('position').getX(0)); expect(positions.getZ(0)).toBeLessThan(0);
    for (let i = 0; i < positions.count; i++) expect(positions.getY(i)).toBe(0);
    expect(Array.from(shadow.getAttribute('uv').array)).toEqual(Array.from(uv.array));
    const groundedX = positions.getX(0), groundedZ = positions.getZ(0);
    projectActorShadow(body, shadow, 50); expect(positions.getX(0)).toBeGreaterThan(groundedX); expect(positions.getZ(0)).toBeLessThan(groundedZ);
    expect(Array.from(body.getAttribute('position').array)).toEqual(original); body.dispose(); shadow.dispose();
  });
  it('receives shadows above painted paving in one draw and disposes only its own merged geometry', () => {
    const root = new Group(), source = new Mesh(new PlaneGeometry(150, 150).rotateX(-Math.PI / 2), new MeshBasicMaterial());
    source.name = 'painted-circular-paving'; source.position.y = .68; root.add(source);
    const quality = new QualitySettings(), receiver = new PavingShadows(quality, [root]); receiver.update();
    const p = receiver.receiver.geometry.getAttribute('position');
    for (let i = 0; i < p.count; i++) expect(p.getY(i)).toBeGreaterThan(source.position.y);
    expect(receiver.receiver.receiveShadow).toBe(true); expect(receiver.group.children).toHaveLength(1);
    quality.setEnhanced(false); receiver.update(); expect(receiver.group.visible).toBe(false);
    quality.setEnhanced(true); quality.reduced = true; receiver.update(); expect(receiver.group.visible).toBe(false);
    const sourceDispose = vi.spyOn(source.geometry, 'dispose'); receiver.dispose(); receiver.dispose(); expect(sourceDispose).not.toHaveBeenCalled();
    source.geometry.dispose(); source.material.dispose();
  });
  it('anchors environmental light to art sources, respects hidden ancestors and freezes at paused simulation time', () => {
    const root = new Group(), source = new Mesh(new BoxGeometry(), new MeshBasicMaterial());
    source.name = 'painted-fire-bowl'; source.position.set(120, 2, -50); root.add(source);
    const combat = new Mesh(source.geometry, source.material); combat.name = 'combat-tornado'; root.add(combat);
    const field = new EnvironmentIllumination([root]);
    expect(field.sources).toHaveLength(1);
    expect(field.positions.value[0].toArray().slice(0, 3)).toEqual([120, 40, -50]);
    field.update(2); const strength = field.strengths.value[0];
    expect(strength).toBeGreaterThan(0); field.update(2); expect(field.strengths.value[0]).toBe(strength);
    root.visible = false; field.update(2); expect(field.strengths.value[0]).toBe(0);
    root.visible = true; source.visible = false; field.update(2); expect(field.strengths.value[0]).toBe(0);
    source.geometry.dispose(); source.material.dispose();
  });
  it('moves light with its source hierarchy and shares continuous falloff at different actor heights', () => {
    const root = new Group(), source = new Mesh(new BoxGeometry(), new MeshBasicMaterial());
    source.name = 'painted-fire-bowl'; root.add(source);
    const field = new EnvironmentIllumination([root]); field.update(2);
    const sourceStrength = field.strengths.value[0];
    const near = { x: WORLD_ORIGIN.x, y: WORLD_ORIGIN.y }, copy = { ...near };
    expect(field.sample(near, 38)).toBeGreaterThan(field.sample(near, 130));
    expect(field.sample({ x: near.x + 1000, y: near.y }, 38)).toBe(0);
    expect(near).toEqual(copy);
    root.position.x = 500; field.update(2);
    expect(field.positions.value[0].x).toBe(500); expect(field.sample(near, 38)).toBe(0);
    expect(field.sample({ x: near.x + 500, y: near.y }, 38)).toBeCloseTo(Math.min(1, sourceStrength));
    root.visible = false; field.update(2); expect(field.sample({ x: near.x + 500, y: near.y }, 38)).toBe(0);
    source.geometry.dispose(); source.material.dispose();
  });
  it('keeps airborne contact continuous, fades the tight contact first and never makes it negative', () => {
    let previousContact = Infinity, previousOuter = Infinity;
    for (let height = 0; height <= 150; height += .25) {
      const pose = actorGrounding(height);
      expect(pose.contactOpacity).toBeGreaterThanOrEqual(0); expect(pose.contactOpacity).toBeLessThanOrEqual(previousContact);
      expect(pose.outerOpacity).toBeGreaterThan(0); expect(pose.outerOpacity).toBeLessThanOrEqual(previousOuter);
      if (height >= 12) expect(pose.contactOpacity).toBe(0);
      previousContact = pose.contactOpacity; previousOuter = pose.outerOpacity;
    }
  });
  it('fits visible ground and tall casters, reuses a stopped shadow, and restores the baseline target', () => {
    const light = new DirectionalLight(), focus = new ShadowFocus(light), rig = new ThreeCamera(); rig.setElevation(45); rig.setZoom(.6);
    rig.lookAt({ x: WORLD_ORIGIN.x - 1200, y: WORLD_ORIGIN.y + 350 });
    focus.update(rig, true, 'tower:true');
    const camera = light.shadow.camera;
    expect(camera.right - camera.left).toBeLessThan(6400);
    for (const x of [0, rig.size.width]) for (const y of [0, rig.size.height]) {
      const p = rig.pick({ x, y }, { left: 0, top: 0, ...rig.size })!;
      for (const height of [0, 420]) {
        const projected = toThree(p, height).project(camera);
        expect(Math.abs(projected.x)).toBeLessThan(1); expect(Math.abs(projected.y)).toBeLessThan(1); expect(Math.abs(projected.z)).toBeLessThan(1);
      }
    }
    light.shadow.needsUpdate = false; focus.update(rig, true, 'tower:true'); expect(light.shadow.needsUpdate).toBe(false);
    focus.update(rig, true, 'tower:false'); expect(light.shadow.needsUpdate).toBe(true);
    focus.update(rig, false); expect(light.target.position.length()).toBe(0);
    expect(new Vector3().setFromMatrixPosition(light.target.matrixWorld).length()).toBe(0);
    light.shadow.dispose(); light.dispose();
  });
  it('removes destroyed building contact and keeps ownership separate from source geometry/maps', () => {
    const root = new Group(), map = new Texture(), source = new Mesh(new BoxGeometry(50, 100, 30), new MeshBasicMaterial({ map }));
    source.name = 'painted-tower'; root.add(source);
    const settings = new QualitySettings(), contact = new ContactOcclusion(settings, [root]);
    const instances = contact.group.getObjectByName('building-contact-stamps') as import('three').InstancedMesh;
    const matrix = new Matrix4(); instances.getMatrixAt(0, matrix); expect(matrix.determinant()).toBeGreaterThan(0);
    source.visible = false; contact.update(); instances.getMatrixAt(0, matrix); expect(matrix.determinant()).toBe(0);
    settings.setEnhanced(false); contact.update(); expect(contact.group.visible).toBe(false);
    const geometryDispose = vi.spyOn(source.geometry, 'dispose'), mapDispose = vi.spyOn(map, 'dispose');
    contact.dispose(); contact.dispose(); expect(geometryDispose).not.toHaveBeenCalled(); expect(mapDispose).not.toHaveBeenCalled();
    source.geometry.dispose(); source.material.dispose(); map.dispose();
  });
  it('limits glows to selected architecture, respects visibility and releases only owned materials', () => {
    const root = new Group(), map = new Texture({ width: 344, height: 513 } as HTMLImageElement);
    const source = new Mesh(new BoxGeometry(1, 1, 1), new MeshBasicMaterial({ map })); source.name = 'painted-tower'; root.add(source);
    const effect = new Mesh(new BoxGeometry(1, 1, 1), new MeshBasicMaterial({ map })); effect.name = 'combat-tornado'; root.add(effect);
    const settings = new QualitySettings(), glow = new ArchitecturalGlow(settings, [root]); glow.update();
    expect(glow.group.children).toHaveLength(1); expect((glow.group.children[0] as Mesh).geometry).toBe(source.geometry);
    source.visible = false; glow.update(); expect(glow.group.children[0].visible).toBe(false);
    settings.reduced = true; glow.update(); expect(glow.group.visible).toBe(false);
    const geometryDispose = vi.spyOn(source.geometry, 'dispose'), mapDispose = vi.spyOn(map, 'dispose');
    const materialDispose = vi.spyOn((glow.group.children[0] as Mesh).material as MeshBasicMaterial, 'dispose');
    glow.dispose(); glow.dispose(); expect(materialDispose).toHaveBeenCalledOnce(); expect(geometryDispose).not.toHaveBeenCalled(); expect(mapDispose).not.toHaveBeenCalled();
    source.geometry.dispose(); source.material.dispose(); effect.geometry.dispose(); effect.material.dispose(); map.dispose();
  });
  it('follows actual blocker height and visibility when shading actors without moving them', () => {
    const root = new Group(), source = new Mesh(new BoxGeometry(50, 200, 50), new MeshBasicMaterial()); source.name = 'painted-tower'; root.add(source);
    const field = new ActorLightField([root]); field.update();
    const point = { x: WORLD_ORIGIN.x + 100 * 400 / 850 / 2, y: WORLD_ORIGIN.y - 100 * 350 / 850 / 2 }, copy = { ...point };
    expect(field.shade(point)).toBeCloseTo(.9); expect(point).toEqual(copy);
    source.visible = false; expect(field.shade(point)).toBe(1); source.geometry.dispose(); source.material.dispose();
  });
});
