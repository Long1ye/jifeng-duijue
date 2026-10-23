import type {Match} from '../game/Match';
import type {Entity} from '../game/types';
import {heroStatuses,type HeroStatus} from '../presentation/HeroStatuses';
import {equipmentIconUrl} from './EquipmentIcons';
import passive from '../../assets/ui/yasuo-passive-icon-2026-10-15/runtime/passive.png?url';
import q from '../../assets/ui/pixel-hud-v2-2026-10-15/runtime/q.png?url';
import e from '../../assets/ui/pixel-hud-v2-2026-10-15/runtime/e.png?url';
import ignite from '../../assets/ui/pixel-hud-v2-2026-10-15/runtime/f.png?url';
import './hero-status-hud.css';

const images:Record<string,string>={passive,q,e,ignite};
const symbols:Record<string,string>={speed:'M3 6h10M1 11h10M3 16h6m8-13-6 10h5l-2 8 9-12h-6l2-6',shield:'M12 2 21 6v7l-9 9-9-9V6Z',slow:'M12 2v20M3 7l18 10M3 17 21 7M8 4l4 4 4-4m-8 16 4-4 4 4',airborne:'m4 12 8-8 8 8M12 4v17',control:'M5 5l14 14M19 5 5 19M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20',wound:'m5 2 4 7-6 3 6 2-3 8 8-7 7 3-4-8 4-5-9 2Z'};
interface Entry {node:HTMLButtonElement;timer:HTMLElement;count:HTMLElement;status:HeroStatus;duration:number;until?:number}
let render:((match:Match,hero:Entity)=>void)|undefined;
export const updateHeroStatusHud=(match:Match,hero:Entity)=>render?.(match,hero);

export function mountHeroStatusHud():void {
 const hud=document.querySelector<HTMLElement>('.player-hud')!,root=document.createElement('section');
 root.className='hero-statuses';root.setAttribute('aria-label','英雄增益与减益');root.hidden=true;
 const buffs=document.createElement('div'),debuffs=document.createElement('div');
 buffs.className='status-row status-buffs';buffs.setAttribute('aria-label','增益与被动');
 debuffs.className='status-row status-debuffs';debuffs.setAttribute('aria-label','减益与控制');root.append(buffs,debuffs);hud.append(root);
 const tooltip=document.createElement('div');tooltip.className='status-tooltip';tooltip.hidden=true;tooltip.role='tooltip';
 document.querySelector('.match-shell')!.append(tooltip);
 const title=document.createElement('strong'),description=document.createElement('p'),remaining=document.createElement('small');tooltip.append(title,description,remaining);
 const entries=new Map<string,Entry>();let current:Entry|undefined,lastMatch:Match|undefined,heroId=0,layoutKey='';
 const hide=()=>{current=undefined;tooltip.hidden=true;};
 const show=(entry:Entry)=>{
  current=entry;tooltip.hidden=false;title.textContent=entry.status.name;description.textContent=entry.status.description;
  remaining.textContent=`${entry.status.stacks===undefined?'':`${entry.status.stacks} 层 · `}${entry.status.until===undefined?'持续生效':`剩余 ${Math.max(0,entry.status.until-(lastMatch?.time??0)).toFixed(1)} 秒`}`;
  const rect=entry.node.getBoundingClientRect();tooltip.style.left=`${Math.max(8,Math.min(window.innerWidth-tooltip.offsetWidth-8,rect.left))}px`;
  tooltip.style.top=`${Math.max(8,rect.top-tooltip.offsetHeight-12)}px`;
 };
 const reset=()=>{entries.forEach(entry=>entry.node.remove());entries.clear();hide();};
 render=(match,hero)=>{
  if(lastMatch!==match||heroId!==hero.id){reset();lastMatch=match;heroId=hero.id;}
  const statuses=heroStatuses(match,hero),active=new Set(statuses.map(status=>status.id));root.hidden=statuses.length===0;
  for(const [id,entry] of entries)if(!active.has(id)){if(current===entry)hide();entry.node.remove();entries.delete(id);}
  for(const status of statuses){
   let entry=entries.get(status.id);
   if(!entry){
    const node=document.createElement('button');node.type='button';node.className=`hero-status ${status.kind}`;node.dataset.statusId=status.id;
    const icon=typeof status.icon==='number'?equipmentIconUrl(status.icon):images[status.icon];
    if(icon){const image=document.createElement('img');image.src=icon;image.alt='';image.draggable=false;node.append(image);}
    else node.innerHTML=`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${symbols[status.icon]??symbols.shield}"/></svg>`;
    const wipe=document.createElement('i');wipe.className='status-expiry';
    const timer=document.createElement('span');timer.className='status-timer';
    const count=document.createElement('b');count.className='status-stacks';node.append(wipe,timer,count);
    entry={node,timer,count,status,duration:0};entries.set(status.id,entry);(status.kind==='debuff'?debuffs:buffs).append(node);
    const added=entry;node.onpointerenter=()=>show(added);node.onpointerleave=()=>{if(document.activeElement!==node)hide();};
    node.onfocus=()=>show(added);node.onblur=hide;node.onclick=event=>event.stopPropagation();node.onpointerdown=event=>event.stopPropagation();
   }
   if(entry.until!==status.until)entry.duration=status.duration??Math.max(.001,(status.until??match.time)-match.time);
   entry.until=status.until;entry.status=status;
   const seconds=Math.max(0,(status.until??match.time)-match.time);
   entry.node.style.setProperty('--status-remaining',`${status.until===undefined?360:Math.min(1,seconds/Math.max(.001,entry.duration))*360}deg`);
   entry.timer.textContent=status.until===undefined?'':seconds<1?seconds.toFixed(1):String(Math.ceil(seconds));
   entry.count.textContent=status.stacks===undefined?'':String(status.stacks);entry.count.hidden=status.stacks===undefined;
   entry.node.setAttribute('aria-label',`${status.name}${status.stacks===undefined?'':`，${status.stacks} 层`}${status.until===undefined?'':`，剩余 ${seconds.toFixed(1)} 秒`}`);
   if(current===entry){title.textContent=status.name;description.textContent=status.description;remaining.textContent=`${status.stacks===undefined?'':`${status.stacks} 层 · `}${status.until===undefined?'持续生效':`剩余 ${seconds.toFixed(1)} 秒`}`;show(entry);}
  }
  const guide=document.querySelector<HTMLDetailsElement>('.operation-guide');
  const upgradesVisible=!!hud.querySelector('.skill-upgrade:not([hidden]),.champion-skill-points:not([hidden])');
  const nextLayout=`${statuses.map(status=>status.id).join(',')}:${window.innerWidth}:${window.innerHeight}:${guide?.open}:${document.getElementById('target-readout')?.hidden}:${upgradesVisible}`;
  if(nextLayout!==layoutKey&&guide){
   layoutKey=nextLayout;
   if(statuses.length){const top=root.getBoundingClientRect().top,g=guide.getBoundingClientRect();
    guide.style.setProperty('--status-clearance',`${Math.max(60,top-g.top-58)}px`);
   }else guide.style.removeProperty('--status-clearance');
  }
 };
 document.addEventListener('midline:dispose',()=>{reset();root.remove();tooltip.remove();render=undefined;},{once:true});
}
