import qIcon from '../../assets/ui/pixel-hud-v2-2026-10-15/runtime/q.png?url';
import wIcon from '../../assets/ui/pixel-hud-v2-2026-10-15/runtime/w.png?url';
import eIcon from '../../assets/ui/pixel-hud-v2-2026-10-15/runtime/e.png?url';
import rIcon from '../../assets/ui/yasuo-r-icon-2026-10-15/runtime/r.png?url';
import portrait from '../../assets/ui/pixel-hud-v2-2026-10-15/runtime/portrait.png?url';
import passiveIcon from '../../assets/ui/yasuo-passive-icon-2026-10-15/runtime/passive.png?url';
import dIcon from '../../assets/ui/pixel-hud-v2-2026-10-15/runtime/d.png?url';
import fIcon from '../../assets/ui/pixel-hud-v2-2026-10-15/runtime/f.png?url';
import {HOWLING_MAP} from '../game/config';
import {SUMMONERS,type SummonerKey} from '../game/SummonerSpells';
import './league-hud.css';
import './pixel-hud.css';
import { mountOperationGuide } from './OperationGuide';
import { mountPlayerSettings } from './PlayerSettings';
import {mountChampionHud} from './ChampionHud';
import {mountEquipmentHud} from './EquipmentHud';
import {mountTargetHud} from './TargetHud';
import type {AbilityKey} from '../game/types';

/** Move existing controls, retaining their ids, listeners and live game state. */
export function mountLeagueHud(practice:boolean,actions:{flute:()=>void;stop:()=>void;summoner:(key:SummonerKey)=>void;focusTarget?:HTMLElement;upgrade?:(key:AbilityKey)=>void;buy:(id:number)=>void;sell:(slot:number)=>void;use:(slot:number)=>void;signal?:AbortSignal}):void {
 const shell=document.querySelector<HTMLElement>('.match-shell')!;
 if(practice||!HOWLING_MAP){
  const back=document.createElement('a');back.href='/?map=howling';back.textContent='← 返回冰桥对局';
  back.title='进入嚎哭深渊正常对局（重新开局）';
  back.style.cssText='position:absolute;right:14px;top:94px;z-index:7;padding:7px 12px;background:#0a151be8;border:1px solid #806b45;color:#dfd1ad;font-size:11px;text-decoration:none';
  shell.append(back);
 }
 document.body.classList.add('league-ui','pixel-hud');
 mountOperationGuide(shell, practice);
 mountTargetHud();
 for(const [key,url] of Object.entries({q:qIcon,w:wIcon,e:eIcon,r:rIcon})){
  const image=document.createElement('img');image.src=url;image.alt='';image.draggable=false;
  document.querySelector(`#ability-${key} .ability-glyph`)!.replaceChildren(image);
 }
 const face=document.createElement('img');face.src=portrait;face.alt='亚索';face.draggable=false;
 document.querySelector('.hero-portrait')!.replaceChildren(face);
 mountChampionHud(key=>actions.upgrade?.(key));
 mountEquipmentHud(actions);
 mountPlayerSettings(shell);
 const panels=Array.from(document.querySelectorAll<HTMLElement>('main > section:not(.match-shell)'));
 if(practice&&panels.length){const tools=document.createElement('details');tools.className='hud-practice';const s=document.createElement('summary');s.textContent='训练工具';tools.append(s);for(const panel of panels){panel.removeAttribute('style');tools.append(panel);}shell.append(tools);}
 const hud=document.querySelector<HTMLElement>('.player-hud')!;
 const passive=document.createElement('div');passive.className='passive-slot';passive.title='浪客之道 · 被动技能';passive.setAttribute('aria-label','浪客之道 · 被动技能');
 const passiveImage=document.createElement('img');passiveImage.src=passiveIcon;passiveImage.alt='';passiveImage.draggable=false;passive.append(passiveImage);
 document.querySelector('.ability-bar')!.prepend(passive);
 const spells=document.createElement('div');spells.className='summoner-slots';
 for(const [key,url] of [['D',dIcon],['F',fIcon]]){
  const skill=key.toLowerCase() as SummonerKey;
  const slot=document.createElement('button');slot.type='button';slot.id=`summoner-${skill}`;slot.className='summoner-slot';slot.title=`${key} · ${SUMMONERS[skill].name}`;slot.setAttribute('aria-label',slot.title);
  slot.onclick=()=>{actions.summoner(skill);(actions.focusTarget??document.querySelector<HTMLElement>('#arena'))!.focus({preventScroll:true});};
  const image=document.createElement('img');image.src=url;image.alt='';image.draggable=false;const label=document.createElement('kbd');label.textContent=key;
  const cooldown=document.createElement('span');cooldown.className='summoner-cooldown';cooldown.id=`summoner-cooldown-${skill}`;slot.append(image,label,cooldown);spells.append(slot);
 }
 hud.append(spells);
 document.querySelector('.team-score.blue .team-label')!.textContent='我方补刀';
 document.querySelector('.team-score.red .team-label')!.textContent=practice?'练习靶':'敌方补刀';
 const caption=document.createElement('span');caption.className='hud-mode';caption.textContent=practice?'练习模式':'中路 SOLO · 1 对 1';shell.append(caption);
}
