import type {Match} from '../game/Match';
import type {Entity} from '../game/types';
import {hasItem,itemById,statLines} from '../game/ItemCatalog';
import {shieldRemaining} from '../game/YasuoPassive';
import {STORM} from '../game/YasuoStorm';

export interface HeroStatus {id:string;name:string;description:string;kind:'buff'|'debuff';icon:string|number;until?:number;duration?:number;stacks?:number}
/** Read simulation state only. Cooldowns and effects which never triggered are not buffs. */
export function heroStatuses(match:Pick<Match,'time'|'summonerEffects'>,hero:Entity):HeroStatus[]{
 if(hero.hp<=0)return [];
 const now=match.time,result:HeroStatus[]=[],state=hero.itemState??{};
 const timed=(id:string,name:string,description:string,icon:string|number,until:number|undefined,kind:'buff'|'debuff'='buff',duration?:number,stacks?:number)=>{
  if(until!==undefined&&until>now)result.push({id,name,description,icon,until,kind,duration,stacks});
 };
 if((hero.flow??0)>=100&&shieldRemaining(hero,now)<=0)result.push({id:'flow-ready',name:'浪客之道 · 百折不屈',description:'剑意已满，受到敌方英雄伤害时触发护盾。',kind:'buff',icon:'passive'});
 if(shieldRemaining(hero,now)>0)timed('passive-shield','浪客之道 · 护盾',`吸收伤害，剩余护盾 ${Math.ceil(shieldRemaining(hero,now))}。`,'passive',hero.passiveShieldUntil,'buff',1);
 if((hero.qStacks??0)>0)timed('q-stacks',hero.qStacks===2?'斩钢闪 · 旋风就绪':'斩钢闪 · 旋风烈斩',hero.qStacks===2?'下一次 Q 释放旋风，命中时击飞敌人。':'已积攒一层旋风，下一次命中可使旋风就绪。','q',hero.qStacksUntil,'buff',STORM.stackDuration,hero.qStacks);
 if((hero.eDamageStacks??0)>0)timed('e-stacks','踏前斩 · 伤害叠加','连续施放踏前斩提高后续踏前斩伤害。','e',hero.eDamageStacksUntil,'buff',5,hero.eDamageStacks);
 timed('homeguard','家园卫士','脱离战斗时获得移动加速，参战或抵达前线后结束。','speed',hero.homeguardUntil,'buff',45);
 if(hero.potion)timed('potion','药水回复',`每秒回复 ${hero.potion.perSecond.toFixed(1)} 生命值。`,hasItem(hero,2031)?2031:2003,hero.potion.until,'buff',hasItem(hero,2031)?12:15);
 timed('guard','伤害减免','受到的非点燃伤害降低 40%。','shield',hero.guardUntil);
 timed('stasis','凝滞','进入凝滞，期间无法行动并免疫伤害。',3157,hero.stasisUntil,'buff',2.5);
 timed('slow','减速','移动速度受到减速效果影响。','slow',hero.slowUntil,'debuff',1.5);
 timed('airborne','击飞','被击飞期间无法移动或进行普通行动。','airborne',hero.airborneUntil,'debuff');
 timed('hit-stun','受击硬直','短暂无法行动，已输入的指令将在恢复后处理。','control',hero.flinchUntil,'debuff');
 timed('grievous','重伤','生命回复与治疗效果降低。','wound',hero.grievousUntil,'debuff');
 for(const effect of match.summonerEffects)if(effect.kind==='ignite'&&effect.targetId===hero.id)
  timed(`ignite:${effect.sourceId}`,'点燃','持续受到真实伤害，治疗和生命回复降低 40%。','ignite',effect.endsAt,'debuff',effect.endsAt-effect.startedAt);
 for(const dot of hero.itemDots??[])timed(`dot:${dot.sourceId}:${dot.key??'damage'}`,'持续伤害',`每秒受到 ${dot.dps.toFixed(1)} ${dot.trueDamage?'真实':dot.magic?'魔法':'物理'}伤害。`,dot.key&&itemById(dot.key)?dot.key:'wound',dot.until,'debuff');
 if((state.armorShred??0)>0)timed('armor-shred','护甲削减',`护甲被削减 ${(state.armorShred*100).toFixed(0)}%。`,3071,state.shredUntil,'debuff',6);
 if((state.mrShred??0)>0)timed('mr-shred','魔法抗性削减',`魔法抗性被削减 ${(state.mrShred*100).toFixed(0)}%。`,8010,state.mrShredUntil,'debuff');
 for(const buff of hero.itemBuffs??[]){
  const item=itemById(buff.id);if(!item)continue;
  const description=statLines({...item,stats:buff.stats}).join('；');
  const stacks=buff.id===3124?Math.min(4,state.rageHits??0):buff.id===3302?state.terminus:buff.id===6657?state.rodStacks:undefined;
  if(buff.until>now)result.push({id:`item-buff:${buff.id}`,name:item.name,description,kind:'buff',icon:buff.id,
   until:buff.until>now+86400?undefined:buff.until,stacks});
 }
 const shields=(hero.itemShields??[]).filter(s=>s.until>now&&s.amount>0);
 if(shields.length)timed('item-shield','装备护盾',`剩余护盾 ${Math.ceil(shields.reduce((sum,s)=>sum+s.amount,0))}，${shields.some(s=>s.magic)?'包含魔法护盾。':'吸收受到的伤害。'}`,'shield',Math.max(...shields.map(s=>s.until)));
 const spellblade=[3057,3078,3100,3508,6662,2510].find(id=>hasItem(hero,id));
 if(spellblade&&(state.spellbladeCD??0)<=now)timed('spellblade','咒刃 · 强化普攻','下一次普攻或 Q 的首个目标触发咒刃额外伤害。',spellblade,state.spellbladeUntil,'buff',10);
 if(hasItem(hero,3161)&&(state.shojinStacks??0)>0)timed('shojin','朔极之矛 · 技能增伤','每层提高技能伤害 3%。',3161,state.shojinUntil,'buff',6,state.shojinStacks);
 for(const [id,key,name,description] of [
  [3110,'frozenUntil','冰霜之心 · 攻速降低','攻击速度降低 20%。'],
  [4005,'mandateUntil','帝国指令 · 标记','受到的伤害提高 7%。'],
 ] as const)timed(key,name,description,id,state[key],'debuff');
 if(hasItem(hero,2523))timed('c44','射程提升','攻击距离增加。',2523,state.c44Until,'buff',8);
 if(hasItem(hero,4401)&&(state.natureStacks??0)>0&&!result.some(status=>status.id==='item-buff:4401'))timed('nature','自然之力 · 坚定','受到魔法伤害积攒层数，叠满后获得装备强化效果。',4401,state.natureUntil,'buff',7,state.natureStacks);
 if(hasItem(hero,3050))timed('zeke','基克的聚合 · 冰霜风暴','对周围敌人造成伤害和减速。',3050,state.zekeUntil,'buff',5);
 const tear=[3070,3003,3004,3119,2526].find(id=>hasItem(hero,id));
 if(tear&&(state.tearStacks??0)>0)result.push({id:'tear',name:'法力积攒',description:'施放技能积攒装备层数，满层后可升级对应装备。',kind:'buff',icon:tear,stacks:state.tearStacks});
 if(hasItem(hero,3742)&&(state.momentum??0)>0)result.push({id:'momentum',name:'亡者的板甲 · 气势',description:'移动积攒气势，提高移动速度；攻击消耗气势并造成额外伤害。',kind:'buff',icon:3742,stacks:Math.floor(state.momentum)});
 const energized=[3094,3095,3087].find(id=>hasItem(hero,id));
 if(energized&&(state.energized??0)>0)result.push({id:'energized',name:'盈能',description:'移动积攒充能，达到 100 时强化下一次攻击。',kind:'buff',icon:energized,stacks:Math.floor(state.energized)});
 return result;
}
