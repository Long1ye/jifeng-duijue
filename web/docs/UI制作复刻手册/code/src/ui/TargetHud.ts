import type {Match} from '../game/Match';
import type {Entity,Team} from '../game/types';
import {LEAGUE_RULES,championLevel} from '../game/ChampionProgression';
import {shieldRemaining,yasuoCritStats} from '../game/YasuoPassive';
import {itemById,statLines} from '../game/ItemCatalog';
import {equipmentIconUrl} from './EquipmentIcons';
import portraitUrl from '../../assets/ui/pixel-hud-v2-2026-10-15/runtime/portrait.png?url';
import towerBlue from '../../assets/map-modules/howling-team-structures-v1/tower-blue.png?url';
import towerRed from '../../assets/map-modules/howling-team-structures-v1/tower-red.png?url';
import './target-hud.css';

const names={hero:'亚索',melee:'近战兵',ranged:'远程兵',tower:'防御塔'};
const stats=[
 ['攻击力','M3 21 19 5l2-3-3 2L2 20m1-5 6 6'],
 ['法术强度','m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z'],
 ['护甲','M12 2 21 6v7l-9 9-9-9V6Z'],
 ['魔法抗性','m12 2 9 7-4 12H7L3 9Zm0 5 4 6-4 5-4-5Z'],
 ['攻击速度','m13 2-8 12h6l-1 8 9-13h-6Z'],
 ['暴击几率','m3 6 5 2 4-5 4 5 5-2-3 13H6Z'],
 ['移动速度','M4 18h12l5-6-5-2-4 5H4Zm0-7h5M2 7h8'],
 ['攻击距离','M3 12h18m-5-5 5 5-5 5M3 7v10'],
] as const;

export function mountTargetHud():void {
 const panel=document.getElementById('target-readout')!;
 panel.classList.add('target-inspect');panel.setAttribute('aria-label','选中目标信息');
 panel.innerHTML=`<div class="target-heading"><span id="target-affiliation"></span><strong id="target-name"></strong><span id="target-kind"></span></div>
 <div class="target-vitals"><div class="target-portrait"><img id="target-portrait" alt=""><span id="target-unit-symbol"></span><b id="target-level"></b></div>
 <div class="target-meters"><div class="target-meter target-hp"><progress id="target-bar" max="100" value="100" aria-label="目标生命值"></progress><span id="target-health"></span></div>
 <div class="target-meter target-resource"><progress id="target-resource-bar" max="100" value="0" aria-label="目标资源"></progress><span id="target-resource-text"></span></div>
 <div id="target-status" class="target-status"></div></div></div>
 <div class="target-stats">${stats.map(([name,path],i)=>`<div class="target-stat target-stat-${i}" title="${name}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${path}"/></svg><span id="target-stat-${i}"></span></div>`).join('')}</div>
 <div class="target-inventory" aria-label="目标装备">${Array.from({length:7},(_,i)=>`<div class="target-item${i===6?' target-trinket':''}" data-target-slot="${i}"></div>`).join('')}</div>`;
}

export function updateTargetHud(match:Match,target:Entity|undefined,team:Team='blue'):void {
 const panel=document.getElementById('target-readout');if(!panel)return;
 panel.hidden=!target||target.hp<=0;if(!target||target.hp<=0)return;
 const node=<T extends HTMLElement=HTMLElement>(id:string)=>panel.querySelector<T>(`#${id}`)!;
 const hero=target.kind==='hero',friendly=target.team===team;
 panel.dataset.kind=target.kind;panel.dataset.relation=friendly?'ally':'enemy';
 node('target-affiliation').textContent=friendly?'友方':'敌方';node('target-name').textContent=names[target.kind];
 node('target-kind').textContent=hero?'英雄':target.kind==='tower'?'建筑':'小兵';
 node('target-level').hidden=!hero;node('target-level').textContent=hero?String(championLevel(target)):'';
 const portrait=node<HTMLImageElement>('target-portrait');portrait.hidden=!hero&&target.kind!=='tower';
 const url=hero?portraitUrl:target.team==='blue'?towerBlue:towerRed;
 if(portrait.getAttribute('src')!==url)portrait.src=url;
 portrait.alt=names[target.kind];node('target-unit-symbol').hidden=hero||target.kind==='tower';
 node('target-unit-symbol').textContent=target.kind==='melee'?'⚔':target.kind==='ranged'?'➶':'';
 node<HTMLProgressElement>('target-bar').value=target.hp/target.maxHp*100;
 node('target-health').textContent=`${Math.ceil(target.hp)} / ${Math.ceil(target.maxHp)}`;
 const resource=panel.querySelector<HTMLElement>('.target-resource')!;resource.hidden=!hero&&target.maxMana<=0;
 const flow=hero,maximum=flow?100:target.maxMana,current=flow?target.flow??0:target.mana;
 node<HTMLProgressElement>('target-resource-bar').value=maximum>0?current/maximum*100:0;
 node('target-resource-text').textContent=`${flow?'剑意':'法力'} ${Math.floor(current)} / ${maximum}`;
 const shield=shieldRemaining(target,match.time)+(target.itemShields??[]).filter(s=>s.until>match.time).reduce((sum,s)=>sum+s.amount,0);
 node('target-status').textContent=[shield>0?`护盾 ${Math.ceil(shield)}`:'',(target.airborneUntil??0)>match.time?'击飞':(target.stasisUntil??0)>match.time?'凝滞':(target.flinchUntil??0)>match.time?'硬直':''].filter(Boolean).join(' · ');
 const scale=match.leagueRules?LEAGUE_RULES.worldScale:1;
 const values=[target.damage.toFixed(0),(target.abilityPower??0).toFixed(0),(target.armor??0).toFixed(0),(target.magicResist??0).toFixed(0),
  (1/target.attackInterval).toFixed(2),`${((hero?yasuoCritStats(target).chance:target.critChance??0)*100).toFixed(0)}%`,
  (target.speed/(hero?scale:1)).toFixed(0),(target.range/scale).toFixed(0)];
 values.forEach((value,i)=>{node(`target-stat-${i}`).textContent=value;node(`target-stat-${i}`).parentElement!.setAttribute('aria-label',`${stats[i][0]} ${value}`);});
 const move=panel.querySelector<HTMLElement>('.target-stat-6')!;move.title=hero?'移动速度':`移动速度（世界单位/秒）`;
 const inventory=panel.querySelector<HTMLElement>('.target-inventory')!;inventory.hidden=!hero;
 panel.querySelectorAll<HTMLElement>('[data-target-slot]').forEach((slot,i)=>{
  const id=i===6?target.trinket:target.inventory?.[i],item=id?itemById(id):undefined;
  const signature=String(item?.id??'');if(slot.dataset.itemId!==signature){
   slot.dataset.itemId=signature;slot.replaceChildren();
   if(item){const image=document.createElement('img');image.src=equipmentIconUrl(item.id);image.alt=item.name;image.draggable=false;slot.append(image);}
  }
  slot.title=item?`${item.name}\n${statLines(item).join(' · ')}`:i===6?'饰品栏 · 空':'装备栏 · 空';
  slot.setAttribute('aria-label',slot.title);
 });
}
