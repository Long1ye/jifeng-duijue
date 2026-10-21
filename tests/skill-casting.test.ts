import { describe, expect, it } from 'vitest';
import { SkillCasting } from '../src/presentation/SkillCasting';
import { skillPreview } from '../src/presentation/SkillPreview';
import { Match } from '../src/game/Match';
import { grantStorm, STORM } from '../src/game/YasuoStorm';
import { ABILITIES } from '../src/game/config';
import { dashEndpoint } from '../src/game/YasuoE';
import { WIND_WALL } from '../src/game/WindWall';

describe('skill input confirmation', () => {
  it('casts once on keydown in instant mode, once on keyup in release mode', () => {
    const casts:string[]=[],casting=new SkillCasting(k=>casts.push(k),()=>{});
    casting.keyDown('q'); casting.keyUp('q');expect(casts).toEqual(['q']);
    casting.setMode('release');casting.keyDown('w');expect(casting.active).toBe('w');expect(casts).toEqual(['q']);
    casting.keyUp('q');expect(casting.active).toBe('w');
    casting.keyUp('w');casting.keyUp('w');expect(casts).toEqual(['q','w']);expect(casting.active).toBeNull();
  });
  it('UI selection waits for confirmation in both modes; keyup does not confirm it', () => {
    for(const mode of ['instant','release'] as const){
      const casts:string[]=[],casting=new SkillCasting(k=>casts.push(k),()=>{});casting.setMode(mode);
      casting.select('e');casting.keyUp('e');expect(casts).toEqual([]);
      expect(casting.confirm()).toBe(true);expect(casting.confirm()).toBe(false);expect(casts).toEqual(['e']);
    }
  });
  it('cancel, switching modes, and replacing held keys cannot cause a delayed cast', () => {
    const casts:string[]=[],casting=new SkillCasting(k=>casts.push(k),()=>{});casting.setMode('release');
    casting.keyDown('q');casting.cancel();casting.keyUp('q');expect(casts).toEqual([]);
    casting.keyDown('q');casting.keyDown('w');casting.keyUp('q');expect(casts).toEqual([]);
    casting.setMode('instant');casting.keyUp('w');expect(casts).toEqual([]);
  });
});

describe('skill preview uses actual combat geometry', () => {
  function setup(){const match=new Match({ai:false,waves:false});match.start();const hero=match.hero('blue');const target=match.hero('red');Object.assign(hero,{x:300,y:300});Object.assign(target,{x:350,y:300});return {match,hero,target};}
  it('Q range changes to Q3 only while two stacks are active',()=>{
    const {match,hero}=setup(),aim={x:600,y:300};
    expect(skillPreview(match,'blue','q',aim).range[0].x-hero.x).toBe(ABILITIES.q.range);
    grantStorm(hero,match.time);grantStorm(hero,match.time);
    expect(skillPreview(match,'blue','q',aim).range[0].x-hero.x).toBe(STORM.range);
    match.time+=7;expect(skillPreview(match,'blue','q',aim).range[0].x-hero.x).toBe(ABILITIES.q.range);
  });
  it('W preview and actual wall share the forward distance in arbitrary directions',()=>{
    for(const aim of [{x:600,y:300},{x:300,y:100},{x:500,y:500}]){
      const {match,hero}=setup();
      const preview=skillPreview(match,'blue','w',aim),center=preview.paths[1][1];
      expect(Math.hypot(center.x-hero.x,center.y-hero.y)).toBeCloseTo(48);
      expect(ABILITIES.w.range).toBe(WIND_WALL.distance);
      expect(match.cast('blue','w',aim)).toBe(true);
      expect(match.windWalls[0].x).toBeCloseTo(center.x);
      expect(match.windWalls[0].y).toBeCloseTo(center.y);
    }
  });
  it('E marks eligible units and the real dash endpoint, rejects locked/hidden/out-of-range targets',()=>{
    const {match,hero,target}=setup();
    const preview=skillPreview(match,'blue','e',target);expect(preview.valid).toBe(true);
    expect(preview.paths[1][1]).toEqual(dashEndpoint(hero,target));
    expect(skillPreview(match,'blue','e',target,()=>false).paths).toEqual([]);
    match.eTargetLocks.set(target.id,match.time+6);expect(skillPreview(match,'blue','e',target).valid).toBe(false);
    target.x=700;expect(skillPreview(match,'blue','e',target).valid).toBe(false);
  });
  it('R requires an airborne visible hero and previews never mutate the match',()=>{
    const {match,target}=setup();
    expect(skillPreview(match,'blue','r',target).valid).toBe(false);
    target.airborneUntil=match.time+1;
    const before=JSON.stringify(match);
    expect(skillPreview(match,'blue','r',target).valid).toBe(true);
    expect(skillPreview(match,'blue','r',target,()=>false).valid).toBe(false);
    expect(JSON.stringify(match)).toBe(before);
  });
});
