import {expect,it} from 'vitest';
import {Match} from '../src/game/Match';
import {heroStatuses} from '../src/presentation/HeroStatuses';
import {grantStorm} from '../src/game/YasuoStorm';

function setup(){const m=new Match({league:true,ai:false,waves:false});m.start();m.time=10;return {m,h:m.hero('blue')};}
it('shows actual Q stacks, refreshes their expiry and transitions from full Flow to its shield',()=>{
 const {m,h}=setup();expect(heroStatuses(m,h)).toEqual([]);
 grantStorm(h,m.time);let q=heroStatuses(m,h).find(s=>s.id==='q-stacks')!;expect(q).toMatchObject({stacks:1,until:16});
 m.time=12;grantStorm(h,m.time);q=heroStatuses(m,h).find(s=>s.id==='q-stacks')!;expect(q).toMatchObject({stacks:2,until:18,name:'斩钢闪 · 旋风就绪'});
 h.flow=100;expect(heroStatuses(m,h).some(s=>s.id==='flow-ready')).toBe(true);
 h.flow=0;h.passiveShield=125;h.passiveShieldUntil=13;
 expect(heroStatuses(m,h).map(s=>s.id)).toContain('passive-shield');
 m.time=18;expect(heroStatuses(m,h)).toEqual([]);
});
it('separates timed buffs, ignite and debuffs, excluding effects on a different target',()=>{
 const {m,h}=setup();Object.assign(h,{eDamageStacks:3,eDamageStacksUntil:15,slowUntil:11,airborneUntil:11.2,grievousUntil:13});
 m.summonerEffects.push({kind:'ignite',team:'red',sourceId:m.hero('red').id,targetId:h.id,startedAt:9,endsAt:14,from:h,to:h});
 const effects=heroStatuses(m,h);expect(effects.find(s=>s.id==='e-stacks')).toMatchObject({kind:'buff',stacks:3,until:15});
 expect(effects.filter(s=>s.kind==='debuff').map(s=>s.name)).toEqual(['减速','击飞','重伤','点燃']);
 expect(heroStatuses(m,m.hero('red')).some(s=>s.name==='点燃')).toBe(false);
 m.time=15;expect(heroStatuses(m,h)).toEqual([]);
});
it('shows live equipment buffs, potion, shields and persistent stacks but never untriggered item cooldowns',()=>{
 const {m,h}=setup();h.inventory=[3142,3057,3742,null,null,null];
 h.itemState={spellbladeUntil:20,'cd:3142':99,momentum:65};
 h.itemBuffs=[{id:3142,until:16,stats:{percentMS:.2}}];h.potion={until:22,perSecond:8};
 h.itemShields=[{amount:100,until:12},{amount:50,until:11,magic:true},{amount:999,until:9}];
 const before=structuredClone(h),effects=heroStatuses(m,h);
 expect(effects.find(s=>s.id==='item-buff:3142')).toMatchObject({icon:3142,until:16});
 expect(effects.find(s=>s.id==='item-shield')!.description).toContain('150');
 expect(effects.find(s=>s.id==='momentum')).toMatchObject({stacks:65});expect(effects.find(s=>s.id==='momentum')!.until).toBeUndefined();
 expect(effects.map(s=>s.id)).toEqual(expect.arrayContaining(['potion','spellblade']));
 expect(effects.some(s=>s.id.includes('cd:'))).toBe(false);expect(h).toEqual(before);
 m.time=23;expect(heroStatuses(m,h).map(s=>s.id)).toEqual(['momentum']);
 h.hp=0;expect(heroStatuses(m,h)).toEqual([]);
});
it('reports damage-over-time and resistance shred with expiration and actual amounts',()=>{
 const {m,h}=setup();h.itemState={armorShred:.18,shredUntil:16,mrShred:.1,mrShredUntil:13};
 h.itemDots=[{key:6653,sourceId:m.hero('red').id,until:13,dps:20,magic:true}];
 const effects=heroStatuses(m,h);expect(effects).toHaveLength(3);
 expect(effects.find(s=>s.id==='armor-shred')!.description).toContain('18%');
 expect(effects.find(s=>s.id.startsWith('dot:'))!.description).toContain('20.0');
 m.time=16;expect(heroStatuses(m,h)).toEqual([]);
});
