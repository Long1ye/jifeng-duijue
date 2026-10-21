import { afterEach, expect, it, vi } from 'vitest';
import { Mesh, MeshBasicMaterial, Raycaster, Texture, TextureLoader, Vector2, Vector3 } from 'three';
import { Match } from '../src/game/Match';
import { ActorSprites } from '../src/render-three/ActorSprites';
import { ThreeCamera, toThree } from '../src/render-three/Coordinates';
import { LANDMARK_SPECS, landmarkRelief, PAINTED_TOWER_SCALE } from '../src/render-three/PaintedMapLandmarks';

afterEach(() => vi.restoreAllMocks());

it.each([45, 60, 75])('keeps sprite pixels fixed while standing the body above its feet at %s degrees', angle => {
  const pending: (() => void)[] = [];
  vi.spyOn(TextureLoader.prototype, 'load').mockImplementation((_url, done) => {
    const texture = new Texture({ width: 1024, height: 1024 } as HTMLImageElement);
    pending.push(() => done?.(texture)); return texture;
  });
  const sprites = new ActorSprites(), camera = new ThreeCamera(), hero = new Match({ ai: false, waves: false }).hero('blue');
  camera.setElevation(angle); camera.lookAt(hero);
  try {
    sprites.update([hero], 0, camera); pending.splice(0).forEach(done => done()); sprites.update([hero], 0, camera);
    const body = sprites.body(hero.id)!; body.updateMatrixWorld(true);
    const p = body.geometry.getAttribute('position');
    for (let i = 0; i < p.count; i++) {
      const upright = new Vector3().fromBufferAttribute(p, i).applyMatrix4(body.matrixWorld);
      const old = new Vector3(p.getX(i), p.getY(i), 0).applyMatrix4(body.matrixWorld);
      expect(upright.z).toBeCloseTo(toThree(hero).z, 4);
      const screen = upright.clone().project(camera.camera), oldScreen = old.project(camera.camera);
      expect(screen.x).toBeCloseTo(oldScreen.x, 5); expect(screen.y).toBeCloseTo(oldScreen.y, 5);
    }
    if (angle === 45) {
      const tower = new Mesh(landmarkRelief(LANDMARK_SPECS.tower), new MeshBasicMaterial());
      tower.scale.setScalar(PAINTED_TOWER_SCALE); tower.position.copy(toThree(hero, .8)); tower.updateMatrixWorld(true);
      try {
        for (const [offset, expected] of [[80, body], [-80, tower]] as const) {
          const foot = { x: hero.x, y: hero.y + offset };
          body.position.copy(toThree(foot, .7)); body.updateMatrixWorld(true);
          const screen = new Vector3(0, 35, 35).applyMatrix4(body.matrixWorld).project(camera.camera);
          const ray = new Raycaster(); ray.setFromCamera(new Vector2(screen.x, screen.y), camera.camera);
          const hits = ray.intersectObjects([body, tower]);
          expect(hits.some(hit => hit.object === tower)).toBe(true);
          expect(hits[0].object).toBe(expected);
        }
      } finally { tower.geometry.dispose(); tower.material.dispose(); }
    }
  } finally { sprites.dispose(); }
});
