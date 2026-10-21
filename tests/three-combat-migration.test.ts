import { afterEach, describe, expect, it, vi } from 'vitest';
import { Color, Mesh, Texture, TextureLoader, Vector3 } from 'three';
import { Match } from '../src/game/Match';
import { combatBodyPose, COMBAT_ART } from '../src/render-three/CombatArt';
import { CombatSprites } from '../src/render-three/CombatSprites';
import { ThreeCamera } from '../src/render-three/Coordinates';
import { CombatEffects } from '../src/render-three/CombatEffects';
import { ActorSprites } from '../src/render-three/ActorSprites';
import { PrototypeHost } from '../src/presentation/PrototypeHost';
import { actorEnvironmentTint, paintedShadowFactor } from '../src/render-three/S01Look';
import { ART_BRAZIERS, ART_GUARDIANS, artBrazierMount } from '../src/render-three/PaintedMapLayout';
import { bridgePoint } from '../src/game/Bridge';
import { YASUO_R } from '../src/game/YasuoR';

afterEach(() => vi.restoreAllMocks());
function mockTextures() {
  const pending: (() => void)[] = [], textures: Texture[] = [];
  vi.spyOn(TextureLoader.prototype, 'load').mockImplementation((url, done) => {
    const art = Object.values(COMBAT_ART).find(art => art.url === url);
    const w = art?.width || 128, h = art?.height || 128;
    const texture = new Texture({ width: w * 8, height: h * 8 } as HTMLImageElement);
    textures.push(texture); pending.push(() => done?.(texture)); return texture;
  });
  return { textures, flush() { pending.splice(0).forEach(done => done()); } };
}

describe('approved combat art migration', () => {
  it('deforms an airborne actor around the torso and suppresses stale casting without mutating simulation', () => {
    const load = mockTextures(), actors = new ActorSprites(), camera = new ThreeCamera(), match = new Match({ ai: false, waves: false });
    const hero = match.hero('blue'); Object.assign(hero, { x: 400, y: 350, airborneStartedAt: 1, airborneUntil: 2, airborneDirection: { x: 1, y: 0 }, qCast: { startedAt: 1, facing: 0 } });
    const before = structuredClone(hero);
    try {
      actors.update([hero], 1.08, camera); load.flush(); actors.update([hero], 1.08, camera);
      const body = actors.body(hero.id)!, vertices = body.geometry.getAttribute('position');
      expect(body.position.y).toBeGreaterThan(20); expect(body.material.userData.classicQBody.value).toBe(0);
      expect(vertices.getX(0)).not.toBeCloseTo(vertices.getX(2)); expect(hero).toEqual(before);
      const paused = Array.from(vertices.array); actors.update([hero], 1.08, camera); expect(Array.from(vertices.array)).toEqual(paused);
      hero.qCast = null; actors.update([hero], 2.2, camera); expect(body.position.y).toBeCloseTo(.7);
      expect(vertices.getX(0)).toBeCloseTo(vertices.getX(2));
    } finally { actors.dispose(); }
  });
  it('finishes Q body and sword artwork while movement resumes, then returns to locomotion', () => {
    const load = mockTextures(), effects = new CombatEffects(), actors = new ActorSprites(), camera = new ThreeCamera();
    const host = new PrototypeHost(() => {
      const match = new Match({ ai: false, waves: false });
      Object.assign(match.hero('blue'), { x: 400, y: 350 });
      Object.assign(match.hero('red'), { x: 900, y: 500 }); return match;
    }, { frame(frame) {
      effects.consume(frame, actors);
      actors.update(frame.match.entities, frame.match.time, camera, effects.feel);
      effects.update(frame, camera, actors);
    }, dispose() { effects.dispose(); actors.dispose(); } });
    const hero = host.match.hero('blue');
    try {
      expect(host.command({ kind: 'cast', ability: 'q', point: { x: 460, y: 350 } })).toBe(true);
      for (let i = 0; i < 18; i++) { host.update(1 / 60); load.flush(); }
      const qTexture = actors.body(hero.id)!.material.map;
      expect(actors.body(hero.id)!.material.userData.classicQBody.value).toBe(1);
      expect(host.command({ kind: 'move', point: { x: 350, y: 400 } })).toBe(true);
      for (let i = 0; i < 15; i++) { host.update(1 / 60); load.flush(); }
      expect(hero.qCast).toBeNull(); expect(hero.x).toBeLessThan(400);
      expect(actors.body(hero.id)!.material.map).toBe(qTexture);
      const strokes = effects.group.getObjectByName('combat-foreground-contact-batch') as Mesh;
      expect(effects.sprites.group.children.some(card => card.visible && card.name === 'combat-qWind')).toBe(true);
      expect(effects.sprites.group.children.some(card => card.visible && card.name === 'combat-qSword')).toBe(false);
      host.pause(); const time = host.match.time; host.update(1);
      expect(host.match.time).toBe(time); expect(actors.body(hero.id)!.material.map).toBe(qTexture);
      host.pause();
      for (let i = 0; i < 16; i++) { host.update(1 / 60); load.flush(); }
      expect(effects.feel.qPresentation(hero, host.match.time)).toBeNull();
      expect(actors.body(hero.id)!.material.map).not.toBe(qTexture);
      expect(actors.body(hero.id)!.material.userData.classicQBody.value).toBe(0);
      expect(effects.sprites.group.children.some(card => card.visible && card.name === 'combat-qSword')).toBe(false);
      expect(strokes.geometry.drawRange.count).toBe(0);
      expect(effects.sprites.group.children.some(card => card.visible && card.name === 'combat-qWind')).toBe(false);
      host.restart(); host.update(0); expect(effects.feel.qPresentation(host.match.hero('blue'), 0)).toBeNull();
    } finally { host.dispose(); }
  });
  it('preserves Q/W/Q3/R frame clocks, anchors and precedence without changing the entity', () => {
    const match = new Match({ ai: false, waves: false }), hero = match.hero('blue');
    hero.qCast = { startedAt: 2, facing: Math.PI };
    const before = structuredClone(hero), q = combatBodyPose(hero, 2.2, angle => angle)!;
    expect(q.key).toBe('qBody'); expect(q.flip).toBe(true); expect(q.ay).toBe(108 / 113);
    hero.wCast = { startedAt: 2, facing: 0 };
    expect(combatBodyPose(hero, 2.2, angle => angle)?.key).toBe('cast');
    hero.rCast = { startedAt: 2, targetIds: [], hit: false };
    expect(combatBodyPose(hero, 2 + YASUO_R.hitAt, angle => angle)).toMatchObject({ key: 'ultimate', frame: 13, ax: 104 / 176, ay: 149 / 176 });
    delete hero.rCast; delete hero.wCast; expect(hero).toEqual(before);
  });
  it('keeps rear art depth-tested and foreground skills visible over units while sharing original atlases', () => {
    const load = mockTextures(), sprites = new CombatSprites(), camera = new ThreeCamera();
    const point = { x: 400, y: 300 };
    sprites.begin(); sprites.draw('ring3', 2, point, 76, 62, camera); load.flush();
    sprites.begin();
    const back = sprites.draw('ring3', 2, point, 76, 62, camera, { depth: -1, ringLayer: 1 });
    const front = sprites.draw('ring3', 3, point, 76, 62, camera, { depth: 1, ringLayer: 2 }); sprites.end();
    expect(back.material.map).toBe(front.material.map);
    expect(back.geometry.getAttribute('uv').getX(0)).not.toBe(front.geometry.getAttribute('uv').getX(0));
    expect(back.material.depthTest).toBe(true); expect(front.material.depthTest).toBe(false); expect(front.material.depthWrite).toBe(false);
    expect(front.renderOrder).toBeGreaterThan(back.renderOrder);
    expect(new Vector3().subVectors(front.position, back.position).length()).toBeCloseTo(2);
    const sourceUV = back.material.map!.matrix.clone();
    for (let i = 0; i < 100; i++) { sprites.begin(); sprites.draw('ring3', i % 8, point, 76, 62, camera); sprites.end(); }
    expect(sprites.group.children).toHaveLength(2); expect(new Set(load.textures).size).toBe(Object.keys(COMBAT_ART).length - 3); expect(back.material.map!.matrix).toEqual(sourceUV);
    sprites.reset(); expect(sprites.group.children.every(card => !card.visible)).toBe(true);
    const dispose = load.textures.map(texture => vi.spyOn(texture, 'dispose')); sprites.dispose(); sprites.dispose(); dispose.forEach(spy => expect(spy).toHaveBeenCalledTimes(1));
  });
  it('restores the correct depth mode when reusing foreground cards for ground clicks and walls', () => {
    const load = mockTextures(), sprites = new CombatSprites(), camera = new ThreeCamera(), point = { x: 400, y: 300 };
    try {
      load.flush();
      sprites.begin(); const sword = sprites.draw('qSword', 0, point, 100, 30, camera, { depth: 1 });
      expect(sword.material.depthTest).toBe(false);
      sprites.begin(); const ground = sprites.draw('move', 0, point, 50, 50, camera, { flat: true });
      expect(ground).toBe(sword); expect(ground.material.depthTest).toBe(true); expect(ground.renderOrder).toBe(0);
      sprites.begin(); const wall = sprites.draw('wall', 0, point, 100, 100, camera);
      expect(wall.material.depthTest).toBe(true);
      sprites.begin(); const tornado = sprites.draw('tornado', 0, point, 100, 100, camera);
      expect(tornado.material.depthTest).toBe(false);
    } finally { sprites.dispose(); }
  });
  it('shows a real wind curtain instead of a line and freezes or clears it on pause/restart', () => {
    const load = mockTextures(), effects = new CombatEffects(), actors = new ActorSprites(), camera = new ThreeCamera();
    const host = new PrototypeHost(() => new Match({ ai: false, waves: false }), { frame(frame) { effects.consume(frame, actors); effects.update(frame, camera, actors); }, dispose() { effects.dispose(); actors.dispose(); } });
    expect(host.command({ kind: 'cast', ability: 'w', point: { x: host.match.hero('blue').x + 100, y: host.match.hero('blue').y } })).toBe(true);
    for (let i = 0; i < 40; i++) { host.update(1 / 60); load.flush(); }
    const cards = effects.sprites.group.children.filter(card => card.visible) as Mesh[];
    expect(cards).toHaveLength(2); expect(cards.every(card => card instanceof Mesh)).toBe(true);
    const vertices = [...cards[0].geometry.getAttribute('position').array];
    const time = host.match.time; host.pause(); host.update(1); expect(host.match.time).toBe(time);
    expect([...cards[0].geometry.getAttribute('position').array]).toEqual(vertices);
    host.restart(); host.update(0); expect(effects.sprites.group.children.every(card => !card.visible)).toBe(true);
    host.dispose();
  });
  it('uses current fire placements for actor warmth and remains deterministic', () => {
    const fire = artBrazierMount(ART_BRAZIERS[0].u, ART_BRAZIERS[0].v), point = bridgePoint(fire.u, fire.v);
    const near = actorEnvironmentTint(point, 3, 'blue', new Color(), true), far = actorEnvironmentTint({ x: 0, y: 0 }, 3, 'blue', new Color(), true);
    expect(near.r).toBeGreaterThan(far.r); expect(near.b).toBeLessThan(far.b);
    expect(actorEnvironmentTint(point, 3, 'blue', new Color(), true)).toEqual(near);
    const guardian = bridgePoint(ART_GUARDIANS[0].u, ART_GUARDIANS[0].v);
    expect(paintedShadowFactor({ x: guardian.x + 155 * 400 / 850 / 2, y: guardian.y - 155 * 350 / 850 / 2 })).toBeCloseTo(.9);
    expect(paintedShadowFactor({ x: 0, y: 0 })).toBe(1);
  });
  it('routes original D/F and flute commands through the same simulation and rejects paused casts', () => {
    const host = new PrototypeHost(() => new Match({ ai: false, waves: false }), { frame() {}, dispose() {} });
    const hero = host.match.hero('blue');
    expect(host.command({ kind: 'flute' })).toBe(true);
    expect(hero.fluteAt).toBe(0);
    const point = { x: hero.x + 50, y: hero.y };
    expect(host.command({ kind: 'summoner', key: 'd', point, targetId: null })).toBe(true);
    expect(hero.x).toBeCloseTo(point.x); expect(host.match.summonerEffects[0].kind).toBe('flash');
    host.pause(); expect(host.command({ kind: 'summoner', key: 'f', point, targetId: host.match.hero('red').id })).toBe(false);
    host.dispose();
  });
});
