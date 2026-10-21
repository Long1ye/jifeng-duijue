import { afterEach, expect, it, vi } from 'vitest';
import { Texture, TextureLoader } from 'three';
import { brushAt } from '../src/render-three/BrushConcealment';
import { ART_BRUSHES } from '../src/render-three/PaintedMapLayout';
import { bridgePoint } from '../src/game/Bridge';
import { ActorSprites } from '../src/render-three/ActorSprites';
import { ThreeCamera } from '../src/render-three/Coordinates';
import { Match } from '../src/game/Match';

afterEach(() => vi.restoreAllMocks());

it('detects every authored grass footprint while keeping the adjacent lane outside concealment', () => {
  for (const brush of ART_BRUSHES) {
    expect(brushAt(bridgePoint(brush.u, brush.v))).toBe(brush.id);
    expect(brushAt(bridgePoint(brush.u + brush.length / 2 - 1, brush.v))).toBe(brush.id);
    expect(brushAt(bridgePoint(brush.u + brush.length / 2 + 1, brush.v))).toBeNull();
    expect(brushAt(bridgePoint(brush.u, brush.v + brush.width / 2 + 1))).toBeNull();
  }
  expect(brushAt(bridgePoint(0, 0))).toBeNull();
});

it('shows the own hero as a translucent silhouette in grass and restores its normal material after exiting', () => {
  vi.spyOn(TextureLoader.prototype, 'load').mockImplementation(() => new Texture());
  const sprites = new ActorSprites(), camera = new ThreeCamera(), hero = new Match({ ai: false, waves: false }).hero('blue');
  const brush = ART_BRUSHES[0];
  try {
    Object.assign(hero, bridgePoint(brush.u, brush.v));
    const before = structuredClone(hero);
    sprites.update([hero], 0, camera);
    const body = sprites.body(hero.id)!;
    expect(body.material.opacity).toBe(.45); expect(body.material.transparent).toBe(true);
    expect(body.material.depthTest).toBe(false); expect(body.material.depthWrite).toBe(false);
    expect(body.renderOrder).toBe(10); expect(hero).toEqual(before);
    Object.assign(hero, bridgePoint(brush.u, 0)); sprites.update([hero], .1, camera);
    expect(body.material.opacity).toBe(1); expect(body.material.transparent).toBe(false);
    expect(body.material.depthTest).toBe(true); expect(body.material.depthWrite).toBe(true);
    Object.assign(hero, bridgePoint(brush.u, brush.v)); sprites.update([hero], .2, camera, undefined, false);
    expect(body.material.opacity).toBe(1);
  } finally { sprites.dispose(); }
});
