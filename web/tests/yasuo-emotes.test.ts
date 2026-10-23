import {describe,it,expect} from 'vitest';
import {Match} from '../src/game/Match';
import {emoteActive,emoteShortcut,type YasuoEmote} from '../src/game/YasuoEmote';
import {YasuoAnimator,YASUO_EMOTES,YASUO_ASSETS} from '../src/render/YasuoAnimation';
import {YASUO_TEXTURES} from '../src/render/YasuoAssets';
import {readFileSync} from 'node:fs';

const actions:YasuoEmote[]=['joke','taunt','laugh'];
function setup(){const match=new Match({ai:false,waves:false});match.start();return match;}
describe('Yasuo emote animations',()=>{
  it('registers each new atlas with the renderers at the exported dimensions',()=>{
    for(const clip of YASUO_EMOTES.filter(c=>c.key.startsWith('yasuo-emote-v3-'))){
      const assets=YASUO_TEXTURES.filter(a=>a.clip.key===clip.key);
      expect(assets).toHaveLength(1);expect(assets[0].url.length).toBeGreaterThan(0);
      const png=readFileSync(new URL(`../assets/heroes/yasuo/emotes-v3-2026-10-19/${clip.sheet}`,import.meta.url));
      expect(png.readUInt32BE(16)).toBe(clip.width*clip.columns);
      expect(png.readUInt32BE(20)).toBe(clip.height*clip.rows);
    }
  });
  it('samples every original high-rate frame at its native timing',()=>{
    expect(YASUO_EMOTES.map(c=>c.action)).toEqual(actions);
    expect(YASUO_EMOTES.every(c=>c.key.startsWith('yasuo-emote-v3-'))).toBe(true);
    const match=setup(),hero=match.hero('blue'),animator=new YasuoAnimator();
    for(const clip of YASUO_EMOTES.filter(c=>c.key.startsWith('yasuo-emote-v3-'))){
      expect(clip.frame_count).toBe(90);expect(clip.duration_ms).toBe(4000);
      match.startEmote(clip.action as YasuoEmote);
      let ms=0;
      for(let i=0;i<clip.frame_count;i++){
        expect(animator.sample(hero,(ms+.01)/1000).frame).toBe(i);
        ms+=clip.durations_ms[i];
      }
      expect(animator.sample(hero,ms/1000).frame).toBe(0);
    }
  });
  it.each(actions)('loops %s continuously without an audio dependency until interrupted',action=>{
    const match=setup(),hero=match.hero('blue'),animator=new YasuoAnimator();
    const mana=hero.mana;match.orderMove('blue',{x:hero.x+100,y:hero.y});
    expect(match.startEmote(action)).toBe(true);
    expect(hero.destination).toBeNull();expect(hero.targetId).toBeNull();expect(hero.fluteAt).toBeNull();
    expect(hero.mana).toBe(mana);
    expect(animator.sample(hero,0)).toMatchObject({state:action,frame:0,scale:YASUO_ASSETS.scale_in_world});
    const clip=YASUO_EMOTES.find(c=>c.action===action)!;
    const cycle=clip.duration_ms/1000;
    expect(animator.sample(hero,cycle*.5).frame).toBeGreaterThan(0);
    expect(animator.sample(hero,cycle-.001).frame).toBe(clip.frame_count-1);
    expect(animator.sample(hero,cycle)).toMatchObject({state:action,frame:0});
    expect(animator.sample(hero,cycle*100+.25).state).toBe(action);
    match.stop('blue');expect(animator.sample(hero,match.time).state).toBe('idle');
  });
  it.each(actions)('cancels %s on move, attack, spell, stop, damage or flute',action=>{
    for(const cancel of ['move','attack','cast','stop','hit','flute']){
      const match=setup(),hero=match.hero('blue'),enemy=match.hero('red');match.startEmote(action);
      if(cancel==='move')match.orderMove('blue',{x:hero.x+100,y:hero.y});
      if(cancel==='attack')match.orderAttack('blue',enemy.id);
      if(cancel==='cast')match.cast('blue','q',{x:hero.x+30,y:hero.y});
      if(cancel==='stop')match.stop('blue');
      if(cancel==='hit')match.damage(enemy,hero,1);
      if(cancel==='flute')match.startFlute();
      expect(emoteActive(hero,match.time),cancel).toBe(false);
    }
  });
  it('rejects dead, paused, airborne and committed actions',()=>{
    const match=setup(),hero=match.hero('blue');hero.windup=.2;hero.attackStartedAt=0;
    expect(match.startEmote('joke')).toBe(false);hero.windup=0;hero.attackStartedAt=null;
    hero.airborneUntil=1;expect(match.startEmote('taunt')).toBe(false);hero.airborneUntil=0;
    match.phase='paused';expect(match.startEmote('laugh')).toBe(false);match.phase='playing';
    hero.hp=0;expect(match.startEmote('laugh')).toBe(false);
  });
  it('uses simulation time and permits replacing one emote with another',()=>{
    const match=setup(),hero=match.hero('blue'),animator=new YasuoAnimator();
    match.startFlute();match.startEmote('joke');match.step(.3);match.togglePause();
    const sample=animator.sample(hero,match.time);match.step(2);
    expect(animator.sample(hero,match.time).frame).toBe(sample.frame);match.togglePause();
    expect(match.startEmote('taunt')).toBe(true);expect(animator.sample(hero,match.time).frame).toBe(0);
  });
  it('maps digits and numpad with the same Ctrl fallback as flute',()=>{
    for(const [digit,action] of [['1','joke'],['2','taunt'],['4','laugh']]){
      for(const prefix of ['Digit','Numpad'])expect(emoteShortcut({code:prefix+digit,altKey:false,metaKey:false,shiftKey:false})).toBe(action);
    }
    expect(emoteShortcut({code:'Digit1',altKey:true,metaKey:false,shiftKey:false})).toBeNull();
    expect(YASUO_EMOTES.every(c=>c.frame_count===c.durations_ms.length&&c.frame_count<=c.columns*c.rows)).toBe(true);
  });
});
