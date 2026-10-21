import { describe, expect, it } from 'vitest';
import { WORLD, BALANCE } from '../src/game/config';
import { Match } from '../src/game/Match';
import { attackClipFor, attackFrameAt, spriteFrameAt, YasuoAnimator, YASUO_ASSETS, flipYasuoAttack, yasuoWalkPlaybackRate } from '../src/render/YasuoAnimation';

function setup() {
  const match = new Match({ ai: false, waves: false }); match.start();
  const hero = match.hero('blue'); hero.x = 500; hero.y = 300;
  const target = match.spawnMinion('red', 'melee', { x: 537, y: 315 });
  target.speed = 0; target.hp = target.maxHp = 10000; target.damage = 0;
  return { match, hero, target };
}
function advance(match: Match, duration: number) {
  for (let i = 0; i < Math.ceil(duration / WORLD.step); i++) match.step(WORLD.step);
}

describe('user-selected Yasuo attack assets', () => {
  it('records original-file checksums and imports all native frames', () => {
    expect(YASUO_ASSETS.selection).toBe('user_approved');
    expect(YASUO_ASSETS.generated_this_turn).toBe(false);
    expect(YASUO_ASSETS.credits_consumed).toBe(0);
    expect(YASUO_ASSETS.attacks.map(c => c.id)).toEqual(['A', 'B']);
    for (const clip of YASUO_ASSETS.attacks) {
      expect(clip.source_sha256).toMatch(/^[a-f0-9]{64}$/);
      expect([clip.width, clip.height, clip.frame_count]).toEqual([201, 201, 48]);
      expect(clip.durations_ms).toHaveLength(48);
      expect(clip.durations_ms.every(d=>d>0)).toBe(true);
      expect(clip.duration_ms).toBe(1973);
      expect(clip.source_pixels_preserved).toBe(true);
    }
    expect(YASUO_ASSETS.locomotion).toHaveLength(16);
  });

  it('uses sixteen poses per direction without changing the locomotion cycle length', () => {
    for (const state of ['idle', 'walk']) {
      const clips = YASUO_ASSETS.locomotion.filter(clip => clip.state === state);
      expect(clips.map(clip => clip.direction).sort()).toEqual(['e','ne','n','nw','se','s','sw','w'].sort());
      for (const clip of clips) {
        expect([clip.width, clip.height, clip.frame_count, clip.columns, clip.rows]).toEqual([128,128,16,4,4]);
        if(clip.state==='walk'&&clip.direction==='ne'){
          expect(clip.durations_ms[0]+clip.durations_ms[1]+clip.durations_ms[15]).toBeLessThanOrEqual(60);
          expect(clip.durations_ms.reduce((a,b)=>a+b,0)).toBe(800);
        }else expect(clip.durations_ms).toEqual(Array(16).fill(50));
        expect(clip.duration_ms).toBe(800);
        expect(spriteFrameAt(799,clip.durations_ms,true)).toBe(15);
        expect(spriteFrameAt(800,clip.durations_ms,true)).toBe(0);
      }
    }
  });

  it('samples all source frames in order, and holds rather than looping at the endpoint', () => {
    for (const clip of YASUO_ASSETS.attacks) {
      expect(clip.durations_ms.map((_,i)=>spriteFrameAt(clip.durations_ms.slice(0,i).reduce((a,b)=>a+b,0),clip.durations_ms,false))).toEqual(Array.from({length:48},(_,i)=>i));
      expect(spriteFrameAt(clip.duration_ms, clip.durations_ms, false)).toBe(47);
      expect(spriteFrameAt(clip.duration_ms, clip.durations_ms, true)).toBe(0);
    }
    expect(spriteFrameAt(50, [50, 100], false)).toBe(1);
    expect(() => spriteFrameAt(-1, [125], false)).toThrow(RangeError);
  });
});

describe('simulation-linked A/B attack presentation', () => {
  it('mirrors left-facing attacks without flipping right or vertical attacks',()=>{
    for(const a of [Math.PI,Math.PI*.75,Math.PI*1.25])expect(flipYasuoAttack(a)).toBe(true);
    for(const a of [0,Math.PI/4,Math.PI/2,-Math.PI/2])expect(flipYasuoAttack(a)).toBe(false);
  });
  it('alternates only after an actual attack release and preserves existing balance', () => {
    const { match, hero, target } = setup();
    match.orderAttack('blue', target.id); match.step(WORLD.step);
    expect(attackClipFor(hero).id).toBe('A');
    expect(hero.attacksReleased).toBe(0);
    advance(match, BALANCE.hero.windup + 0.02);
    expect(hero.attacksReleased).toBe(1);
    expect(attackClipFor(hero).id).toBe('A');
    expect(hero.attackReleasedAt).not.toBeNull();
    expect(attackFrameAt(hero, hero.attackReleasedAt!)).toBe(YASUO_ASSETS.attacks[0].impact_frame);
    advance(match, hero.attackInterval + 0.03);
    expect(hero.windup).toBeGreaterThan(0);
    expect(attackClipFor(hero).id).toBe('B');
    expect(hero.range).toBe(BALANCE.hero.range);
    expect(hero.damage).toBe(BALANCE.hero.damage);
    advance(match, BALANCE.hero.windup + 0.02);
    expect(hero.attacksReleased).toBe(2);
    expect(attackClipFor(hero).id).toBe('B');
  });

  it('does not consume A/B parity for movement, target changes, stop or dash cancellation', () => {
    for (const cancel of ['move', 'target', 'stop', 'dash'] as const) {
      const { match, hero, target } = setup();
      match.orderAttack('blue', target.id); match.step(WORLD.step);
      if (cancel === 'move') match.orderMove('blue', { x: 510, y: 350 });
      if (cancel === 'stop') match.stop('blue');
      if (cancel === 'target') {
        const next = match.spawnMinion('red', 'melee', { x: 900, y: 300 });
        match.orderAttack('blue', next.id);
      }
      if (cancel === 'dash') match.cast('blue', 'w', { x: 510, y: 350 });
      expect(hero.attackStartedAt).toBeNull();
      expect(hero.attackReleasedAt).toBeNull();
      expect(hero.attacksReleased).toBe(0);
      expect(attackClipFor(hero).id).toBe('A');
      expect(target.hp).toBe(target.maxHp);
    }
  });

  it('cancels if the target dies or leaves windup range, without a ghost attack', () => {
    for (const mode of ['dead', 'range'] as const) {
      const { match, hero, target } = setup();
      match.orderAttack('blue', target.id); match.step(WORLD.step);
      if (mode === 'dead') target.hp = 0; else target.x += 200;
      match.step(WORLD.step);
      expect(hero.attackStartedAt).toBeNull();
      expect(hero.attacksReleased).toBe(0);
      expect(new YasuoAnimator().sample(hero, match.time).state).not.toBe('A');
    }
  });

  it('finishes recovery after a kill; pause freezes frame and restart begins from A', () => {
    const { match, hero, target } = setup(), animator = new YasuoAnimator();
    match.orderAttack('blue', target.id); advance(match, 0.24);
    target.hp = 0; match.step(WORLD.step);
    expect(animator.sample(hero, match.time).state).toBe('A');
    match.togglePause(); const paused = animator.sample(hero, match.time);
    advance(match, 3);
    expect(animator.sample(hero, match.time)).toEqual(paused);
    animator.reset();
    const fresh = setup(); fresh.match.orderAttack('blue', fresh.target.id); fresh.match.step(WORLD.step);
    expect(animator.sample(fresh.hero, fresh.match.time).state).toBe('A');
  });

  it('walks in eight directions and freezes a walking pose when simulation time pauses', () => {
    const { match, hero } = setup(), animator = new YasuoAnimator();
    animator.sample(hero, match.time);
    match.orderMove('blue', { x: 560, y: 360 }); match.step(WORLD.step);
    const sample = animator.sample(hero, match.time);
    expect(sample.state).toBe('walk'); expect(sample.clip.key).toBe('yasuo-walk-se');
    expect(animator.sample(hero, match.time)).toEqual(sample);
    match.stop('blue'); match.step(WORLD.step);
    expect(animator.sample(hero, match.time).state).toBe('idle');
  });

  it('keeps boosted cadence and gives ordinary walking a longer stride cycle',()=>{
    const {hero}=setup();hero.homeguardUntil=0;hero.slowUntil=0;
    expect(.8/yasuoWalkPlaybackRate(hero,1)).toBeCloseTo(1.04);
    hero.homeguardUntil=20;expect(.8/yasuoWalkPlaybackRate(hero,1)).toBeCloseTo(.65);
    hero.slowUntil=5;expect(yasuoWalkPlaybackRate(hero,1)).toBeCloseTo(.8/.65*.7);
    hero.homeguardUntil=0;expect(yasuoWalkPlaybackRate(hero,1)).toBeCloseTo(.8/1.04*.7);
  });

  it('changes movement cadence without restarting or jumping the footstep phase',()=>{
    const {hero}=setup(),animator=new YasuoAnimator();hero.homeguardUntil=0;hero.slowUntil=0;hero.facing=0;
    animator.sample(hero,1);hero.x++;animator.sample(hero,1.1);
    hero.x++;expect(animator.sample(hero,1.35).frame).toBe(3);
    hero.homeguardUntil=20;
    expect(animator.sample(hero,1.35).frame).toBe(3);
    hero.x++;expect(animator.sample(hero,1.46).frame).toBe(6);
    hero.homeguardUntil=0;
    expect(animator.sample(hero,1.46).frame).toBe(6);
    hero.x++;expect(animator.sample(hero,1.62).frame).toBe(9);
  });
});
