import type {Match} from '../game/Match';
import type {AbilityKey,Entity} from '../game/types';
import {canUpgradeSkill,championLevel,experienceProgress,LEAGUE_RULES,skillCooldown,skillDamage} from '../game/ChampionProgression';
import {yasuoCritStats} from '../game/YasuoPassive';
import './champion-hud.css';
import {updateEquipmentHud} from './EquipmentHud';
import {mountHeroStatusHud,updateHeroStatusHud} from './HeroStatusHud';

export function mountChampionHud(upgrade:(key:AbilityKey)=>void):void {
 mountHeroStatusHud();
 const hud=document.querySelector<HTMLElement>('.player-hud')!;
 const level=document.createElement('span');level.id='champion-level';level.className='champion-level';
 document.querySelector('.hero-portrait')!.append(level);
 const xp=document.createElement('progress');xp.id='champion-xp';xp.className='champion-xp';xp.setAttribute('aria-label','升级经验');hud.append(xp);
 const stats=document.createElement('section');stats.id='champion-stats';stats.className='champion-stats-panel';stats.setAttribute('aria-label','英雄属性');
 const body=document.createElement('div');body.id='champion-stats-body';
 const icons=['M3 21 19 5l2-3-3 2L2 20m1-5 6 6','M12 2 21 6v7l-9 9-9-9V6Z','m12 2 9 7-4 12H7L3 9Zm0 5 4 6-4 5-4-5Z','m13 2-8 12h6l-1 8 9-13h-6Z','m3 6 5 2 4-5 4 5 5-2-3 13H6Z','M4 18h12l5-6-5-2-4 5H4Zm0-7h5M2 7h8'];
 for(const [i,name] of ['攻击力','护甲','魔法抗性','攻击速度','暴击几率','移动速度'].entries()){
  const row=document.createElement('div');row.className=`champion-stat stat-${i}`;row.title=name;
  row.innerHTML=`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${icons[i]}"/></svg><span class="stat-label">${name}</span><b id="champion-stat-${i}"></b>`;body.append(row);
 }
 stats.append(body);hud.prepend(stats);
 const points=document.createElement('span');points.id='champion-skill-points';points.className='champion-skill-points';hud.append(points);
 const bar=document.querySelector<HTMLElement>('.ability-bar')!;
 for(const key of ['q','w','e','r'] as const){
  const button=document.createElement('button');button.type='button';button.id=`upgrade-${key}`;button.className='skill-upgrade';
  button.innerHTML='<span aria-hidden="true">＋</span>';
  button.setAttribute('aria-label',`升级 ${key.toUpperCase()}`);button.title=`升级 ${key.toUpperCase()} · Ctrl+${key.toUpperCase()}`;
  button.onclick=event=>{event.stopPropagation();upgrade(key);document.querySelector<HTMLElement>('#viewport,#arena')?.focus({preventScroll:true});};
  const rank=document.createElement('span');rank.id=`skill-rank-${key}`;rank.className='skill-rank';
  for(let n=0;n<(key==='r'?3:5);n++){const pip=document.createElement('i');rank.append(pip);}
  const slot=document.createElement('div');slot.className='champion-ability-slot';
  const ability=document.getElementById(`ability-${key}`)!;bar.append(slot);slot.append(button,ability,rank);
 }
}

export function updateChampionHud(match:Match,hero:Entity):void {
 updateHeroStatusHud(match,hero);
 updateEquipmentHud(match,hero);
 const node=(id:string)=>document.getElementById(id)!;
 if(!node('champion-level'))return;
 const active=match.leagueRules,level=championLevel(hero),progress=experienceProgress(hero);
 node('champion-level').hidden=!active;node('champion-level').textContent=String(level);
 const xp=node('champion-xp') as HTMLProgressElement;xp.hidden=!active;
 xp.max=progress.required||1;xp.value=progress.required?progress.current:1;
 xp.title=level===18?'已达 18 级':`经验 ${Math.floor(progress.current)} / ${progress.required}`;
 const values=[hero.damage.toFixed(0),(hero.armor??0).toFixed(0),(hero.magicResist??0).toFixed(0),
  (1/hero.attackInterval).toFixed(2),`${(yasuoCritStats(hero).chance*100).toFixed(0)}%`,(hero.speed/(active?LEAGUE_RULES.worldScale:1)).toFixed(0)];
 values.forEach((value,i)=>{node(`champion-stat-${i}`).textContent=value;});
 node('champion-stats').hidden=false;
 node('champion-stats').title=`法术强度 ${(hero.abilityPower??0).toFixed(0)} · 技能急速 ${(hero.abilityHaste??0).toFixed(0)} · 装备法力 ${(hero.bonusMana??0).toFixed(0)}（亚索无法力资源）`;
 const points=node('champion-skill-points');points.hidden=!active||!hero.skillPoints;
 points.textContent=`升级！ +${hero.skillPoints??0}`;points.title=`剩余 ${hero.skillPoints??0} 个技能点 · 点击技能上方的 + 或按 Ctrl + Q / W / E / R`;
 document.querySelector('.player-hud')!.classList.toggle('has-skill-points',active&&!!hero.skillPoints);
 for(const key of ['q','w','e','r'] as const){
  const rank=hero.skillRanks?.[key]??0,ability=node(`ability-${key}`);
  const upgrade=node(`upgrade-${key}`) as HTMLButtonElement;
  upgrade.hidden=!active||!canUpgradeSkill(hero,key);
  upgrade.disabled=match.phase!=='playing';
  node(`skill-rank-${key}`).hidden=!active;
  node(`skill-rank-${key}`).setAttribute('aria-label',`技能等级 ${rank} / ${key==='r'?3:5}`);
  node(`skill-rank-${key}`).querySelectorAll('i').forEach((pip,i)=>pip.classList.toggle('learned',i<rank));
  ability.classList.toggle('unlearned',active&&!rank);
  const tooltip=node(`skill-description-${key}`);
  let value=tooltip.querySelector<HTMLElement>('.skill-values');
  if(!value){value=document.createElement('p');value.className='skill-values';tooltip.append(value);}
  value.hidden=!active;
  value.textContent=rank?`等级 ${rank} · 冷却 ${skillCooldown(hero,key).toFixed(2)} 秒${key==='w'?'':` · ${key==='e'?'魔法':'物理'}伤害 ${skillDamage(hero,key).toFixed(1)}`}`
   :`尚未学习${key==='r'?' · 6 / 11 / 16 级可升级':''} · Ctrl+${key.toUpperCase()} 加点`;
 }
}
