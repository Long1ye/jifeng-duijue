import { afterEach, expect, it, vi } from 'vitest';
import { Mesh, Texture, TextureLoader, Vector3, type PlaneGeometry } from 'three';
import { ActorSprites } from '../src/render-three/ActorSprites';
import { ThreeCamera } from '../src/render-three/Coordinates';
import { Match } from '../src/game/Match';
import { RenderPositions } from '../src/render/RenderPositions';
import { HeroHealthBar } from '../src/render-three/HeroHealthBar';

afterEach(() => vi.restoreAllMocks());

it('restores the client hero frame, live segments and flow while retaining a paused damage trail', () => {
  vi.spyOn(TextureLoader.prototype, 'load').mockImplementation(() => new Texture());
  const sprites = new ActorSprites(), camera = new ThreeCamera(), hero = new Match({ ai: false, waves: false }).hero('blue');
  camera.lookAt(hero);
  try {
    sprites.update([hero], 0, camera);
    const bar = sprites.group.getObjectByName(`actor-health-${hero.id}`) as HeroHealthBar;
    expect(bar).toBeInstanceOf(HeroHealthBar);
    expect((bar.children[0] as Mesh<PlaneGeometry>).geometry.parameters.width).toBe(68);
    for (const zoom of [.36, .6, 1.5]) {
      camera.setZoom(zoom); sprites.update([hero], 0, camera); sprites.group.updateMatrixWorld(true);
      const fill = bar.fill, p = fill.geometry.getAttribute('position');
      const left = new Vector3().fromBufferAttribute(p, 0).applyMatrix4(fill.matrixWorld).project(camera.camera);
      const right = new Vector3().fromBufferAttribute(p, 1).applyMatrix4(fill.matrixWorld).project(camera.camera);
      expect((right.x - left.x) * camera.size.width / 2).toBeCloseTo(64, 5);
    }
    hero.hp = hero.maxHp / 2; hero.flow = 100;
    sprites.update([hero], .1, camera);
    expect(bar.fill.scale.x).toBe(.5);
    const trail = bar.children[2] as Mesh;
    expect(trail.visible).toBe(true); expect(trail.scale.x).toBe(1);
    sprites.update([hero], .1, camera); expect(trail.scale.x).toBe(1);
    sprites.update([hero], 1, camera); expect(trail.visible).toBe(false);
    hero.hp = hero.maxHp; sprites.update([hero], 1.1, camera);
    expect(bar.fill.scale.x).toBe(1);
  } finally { sprites.dispose(); }
});

it('keeps moving minion health fills two CSS pixels thick across zooms and non-integer viewport scales', () => {
  vi.spyOn(TextureLoader.prototype, 'load').mockImplementation(() => new Texture());
  const sprites = new ActorSprites(), camera = new ThreeCamera(), match = new Match({ ai: false, waves: false });
  const minion = match.spawnMinion('blue', 'melee', match.hero('blue'));
  camera.setElevation(45); camera.lookAt(minion);
  const positions = new RenderPositions(); positions.capture([minion]); minion.x += 1.4; minion.y += .8;
  try {
    for (const [width, height] of [[783, 440.4375], [1280, 720], [1920, 1080]]) for (const zoom of [.36, .6, 1.5]) {
      camera.resize(width, height); camera.setZoom(zoom);
      let previousX = -Infinity;
      for (const alpha of [.1, .3, .5, .7, .9]) {
        const sample = positions.sample(minion, alpha); sprites.update([sample], alpha / 60, camera);
        const bar = sprites.group.getObjectByName(`actor-health-${minion.id}`)!;
        sprites.group.updateMatrixWorld(true);
        const anchor = bar.position.clone().project(camera.camera);
        const x = (anchor.x + 1) * width / 2;
        expect(x).toBeGreaterThan(previousX); previousX = x;
        expect(x).toBeCloseTo(camera.project(sample).x, 6);
        for (const mesh of bar.children as Mesh<PlaneGeometry>[]) {
          const p = mesh.geometry.getAttribute('position');
          const top = new Vector3().fromBufferAttribute(p, 0).applyMatrix4(mesh.matrixWorld).project(camera.camera);
          const bottom = new Vector3().fromBufferAttribute(p, 2).applyMatrix4(mesh.matrixWorld).project(camera.camera);
          expect(Math.abs(top.y - bottom.y) * height / 2).toBeCloseTo(mesh.geometry.parameters.height, 5);
          expect((mesh.material as import('three').MeshBasicMaterial).depthWrite).toBe(false);
        }
      }
    }
  } finally { sprites.dispose(); }
});
