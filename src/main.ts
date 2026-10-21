import {emoteShortcut} from './game/YasuoEmote';
import {updateTargetHud} from './ui/TargetHud';
import {fluteShortcut} from './game/YasuoFlute';
import Phaser from 'phaser';
import './style.css';
import { ABILITIES, BALANCE, VIEWPORT, WORLD } from './game/config';
import { Match } from './game/Match';
import type { AbilityKey, MatchPhase } from './game/types';
import { ArenaScene } from './render/ArenaScene';
import { AudioFeedback } from './ui/AudioFeedback';
import {EnvironmentAudio} from './ui/EnvironmentAudio';
import {MapMusic} from './ui/MapMusic';
import { createEPractice } from './game/EPractice';
import { createRPractice } from './game/RPractice';
import {createCombatPractice} from './game/CombatPractice';
import {createMinionPractice} from './game/MinionPractice';
import { clearStorm, grantStorm, stormReady } from './game/YasuoStorm';
import { mountLeagueHud } from './ui/LeagueHud';
import {updateChampionHud} from './ui/ChampionHud';
import { SkillCasting } from './presentation/SkillCasting';
import { mountCastSettings } from './ui/CastSettings';
import { RENDER_SCALE } from './render/Presentation';
import { HOWLING_MAP } from './game/config';
import type {SummonerKey} from './game/SummonerSpells';
import {shieldRemaining,passiveShieldStrength,yasuoCritStats} from './game/YasuoPassive';
import {itemShieldRemaining} from './game/EquipmentEffects';
import {pickUnit} from './game/UnitMetrics';

export function bootLegacy(): () => void {
const scope = new AbortController();
const listenWindow = <K extends keyof WindowEventMap>(type: K, listener: (event: WindowEventMap[K]) => void, options: AddEventListenerOptions = {}) => globalThis.window.addEventListener(type, listener, { ...options, signal: scope.signal });
const listenDocument = <K extends keyof DocumentEventMap>(type: K, listener: (event: DocumentEventMap[K]) => void, options: AddEventListenerOptions = {}) => globalThis.document.addEventListener(type, listener, { ...options, signal: scope.signal });
function element<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing UI element: ${id}`);
  return node as T;
}
const ui = {
  blueCs: element('blue-cs'), redCs: element('red-cs'), time: element('match-time'),
  phase: element('phase-label'), wave: element('wave-label'),
  hp: element<HTMLProgressElement>('hero-health'), flow: element<HTMLProgressElement>('hero-flow'),
  hpText: element('health-text'), flowText: element('flow-text'),
  blueTower: element<HTMLProgressElement>('blue-tower'), redTower: element<HTMLProgressElement>('red-tower'),
  overlay: element('match-overlay'), title: element('overlay-title'), description: element('overlay-description'),
  kicker: element('overlay-kicker'), symbol: element('overlay-symbol'), stats: element('result-stats'),
  start: element<HTMLButtonElement>('start-button'), pause: element<HTMLButtonElement>('pause-button'),
  restart: element<HTMLButtonElement>('restart-button'), sound: element<HTMLButtonElement>('sound-button'),
  toast: element('toast'), arena: element('arena'),
  camera: element<HTMLButtonElement>('camera-button'), cameraLabel: element('camera-label'),
  heroAnimation: element('hero-animation-state'),
};
const audio = new AudioFeedback();
const environmentAudio=new EnvironmentAudio();
environmentAudio.enabled=false;
const unlockSound=(event:Event)=>{if(event.target instanceof Element&&event.target.closest('#sound-button'))return;audio.unlock();};
listenDocument('pointerdown',unlockSound,{capture:true});
listenDocument('keydown',unlockSound,{capture:true});
const mapMusic=new MapMusic();
listenWindow('pagehide',()=>{environmentAudio.dispose();audio.dispose();mapMusic.dispose();});
listenDocument('visibilitychange',()=>{if(document.hidden){audio.stop();mapMusic.update(match.time,match.phase,false,false);environmentAudio.update(match,scene.cameraRig.center,scene.cameraRig.bounds.width,audio.audioContext,false);}});
if(HOWLING_MAP){
  const atmosphereToggle=document.createElement('button');
  atmosphereToggle.dataset.settingGroup='graphics';
  atmosphereToggle.textContent='风雪氛围：开';atmosphereToggle.setAttribute('aria-pressed','true');
  atmosphereToggle.onclick=()=>{scene.atmosphereEnabled=!scene.atmosphereEnabled;atmosphereToggle.textContent=scene.atmosphereEnabled?'风雪氛围：开':'风雪氛围：关';atmosphereToggle.setAttribute('aria-pressed',String(scene.atmosphereEnabled));};
  document.querySelector('.match-actions')!.append(atmosphereToggle);
  const snowContactToggle=document.createElement('button');
  snowContactToggle.dataset.settingGroup='graphics';
  snowContactToggle.textContent='踩雪反馈：开';snowContactToggle.setAttribute('aria-pressed','true');
  snowContactToggle.onclick=()=>{scene.snowContactEnabled=!scene.snowContactEnabled;snowContactToggle.textContent=scene.snowContactEnabled?'踩雪反馈：开':'踩雪反馈：关';snowContactToggle.setAttribute('aria-pressed',String(scene.snowContactEnabled));};
  document.querySelector('.match-actions')!.append(snowContactToggle);
  const buildingToggle=document.createElement('button');
  buildingToggle.dataset.settingGroup='graphics';
  buildingToggle.textContent='建筑动态：开';buildingToggle.setAttribute('aria-pressed','true');
  buildingToggle.title='水晶浮动、环绕碎片、塔纹流光和火焰伸缩';
  buildingToggle.onclick=()=>{scene.buildingMotionEnabled=!scene.buildingMotionEnabled;buildingToggle.textContent=scene.buildingMotionEnabled?'建筑动态：开':'建筑动态：关';buildingToggle.setAttribute('aria-pressed',String(scene.buildingMotionEnabled));};
  document.querySelector('.match-actions')!.append(buildingToggle);
  for(const [property,label] of [['combatFeedbackEnabled','战斗反馈'],['livingBrushEnabled','草丛灵动'],['battlefieldEnabled','兵线与战场痕迹'],['abyssLifeEnabled','桥边落雪'],['wildlifeEnabled','小雪兽']] as const){
    const toggle=document.createElement('button');toggle.textContent=`${label}：开`;toggle.setAttribute('aria-pressed','true');
    toggle.dataset.settingGroup='graphics';
    if(property==='combatFeedbackEnabled'){toggle.dataset.combatFeedback='true';toggle.title='控制命中刀光、受击回弹与动作顿挫；声音由音效开关控制';}
    toggle.onclick=()=>{scene[property]=!scene[property];toggle.textContent=`${label}：${scene[property]?'开':'关'}`;toggle.setAttribute('aria-pressed',String(scene[property]));if(property==='combatFeedbackEnabled')syncCombatFeedback();};
    document.querySelector('.match-actions')!.append(toggle);
  }
  const ambienceToggle=document.createElement('button');ambienceToggle.textContent='环境声音：关';ambienceToggle.setAttribute('aria-pressed','false');
  ambienceToggle.dataset.settingGroup='operation';
  ambienceToggle.title='跟随音效总开关；风、火盆与远处冰裂';
  ambienceToggle.onclick=()=>{environmentAudio.enabled=!environmentAudio.enabled;ambienceToggle.textContent=environmentAudio.enabled?'环境声音：开':'环境声音：关';ambienceToggle.setAttribute('aria-pressed',String(environmentAudio.enabled));syncHud(match);};
  document.querySelector('.match-actions')!.append(ambienceToggle);

}
const ePractice = new URLSearchParams(location.search).get('practice') === 'e';
const rPractice = new URLSearchParams(location.search).get('practice') === 'r';
const qPractice = new URLSearchParams(location.search).get('practice') === 'q';
const combatPractice=new URLSearchParams(location.search).get('practice')==='combat';
const minionPractice=new URLSearchParams(location.search).get('practice')==='minions';
if(combatPractice){document.querySelector('h1')!.textContent='刀剑交锋 · 战斗手感练习';document.querySelector('.team-score.red .team-label')!.textContent='固定靶 · 无 AI';}
if(qPractice){document.querySelector('h1')!.textContent='斩钢闪 · 蓄风与 Q3 测试场';document.querySelector('.team-score.red .team-label')!.textContent='固定靶 · 无 AI';document.querySelector('.heading-description')!.textContent='Q 命中两次蓄风，右键移动观察独立风层；下一次 Q 发射龙卷风。命中击飞英雄后可接 R。测试按钮可清冷却或直接准备蓄风。';}
if(rPractice){document.querySelector('h1')!.textContent='狂风绝息斩 · 原版 R 测试场';document.querySelector('.heading-description')!.textContent='先击飞测试英雄，再指向目标按 R；也可通过 Q3 击飞后接 R。采用保留的原版 16 帧，暂不包含剑意及暴击穿甲。';}
if (ePractice) {
  document.querySelector('h1')!.textContent='踏前斩 · 八向测试场';
  document.querySelector('.team-score.red .team-label')!.textContent='固定靶 · 无 AI';
  document.querySelector('.heading-description')!.textContent='八向固定靶 · 指向小兵按 E，滑行期间按 Q 接环斩 · 右键移动。方向按钮默认复位并试放 EQ，可取消勾选对照普通 E。';
}
function createMatch(): Match {
  return minionPractice?createMinionPractice():combatPractice?createCombatPractice():rPractice || qPractice ? createRPractice() : ePractice ? createEPractice() : new Match({league:true});
}
let match = createMatch();
let displayedPhase: MatchPhase | null = null;
let toastTimer = 0;

function clock(seconds: number): string {
  return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;
}

function toast(message: string): void {
  window.clearTimeout(toastTimer);
  ui.toast.textContent = message;
  ui.toast.classList.add('visible');
  toastTimer = window.setTimeout(() => ui.toast.classList.remove('visible'), 1700);
}

function syncHud(state: Match): void {
  audio.updateMovement(state,!document.hidden);
  if(audio.movementPlaying)mapMusic.noticeCombat(state.time);
  mapMusic.update(state.time,state.phase,audio.enabled,!document.hidden);
  if(HOWLING_MAP)environmentAudio.update(state,scene.cameraRig.center,scene.cameraRig.bounds.width,audio.audioContext,audio.enabled,!document.hidden&&scene.iceMap);
  const hero = state.hero('blue');
  updateChampionHud(state,hero);
  ui.heroAnimation.textContent = scene.heroAnimationLabel;
  const buffered=state.bufferedOrder('blue');
  if((hero.flinchUntil??0)>state.time)ui.heroAnimation.textContent+=' · 受击硬直';
  else if((hero.flinchProtectedUntil??0)>state.time)ui.heroAnimation.textContent+=' · 硬直保护';
  if(buffered)ui.heroAnimation.textContent+=` · 已缓冲${buffered.kind==='cast'?buffered.ability.toUpperCase():buffered.kind==='move'?'移动':buffered.kind==='attack'?'攻击':'停止'}`;
  const ready=stormReady(hero,state.time),stacks=(hero.qStacksUntil??0)>state.time?(hero.qStacks??0):0;
  element('ability-q').querySelector('.ability-name')!.textContent=ready?'Q3 · 旋风':`斩钢闪${stacks?' · 1层':''}`;
  element('ability-q').style.boxShadow=ready?'inset 0 0 0 2px #a5e5f5':'';
  if(stacks)ui.heroAnimation.textContent+=` · 蓄风 ${stacks}/2 · ${Math.max(0,(hero.qStacksUntil??0)-state.time).toFixed(1)}s`;
  const rig = scene.cameraRig;
  ui.camera.setAttribute('aria-pressed', `${rig.following}`);
  ui.camera.textContent = rig.following ? '跟随镜头 · Y' : '自由镜头 · Y';
  ui.cameraLabel.textContent = `${rig.zoom}× ${rig.zoom < 1 ? '高位视角' : '局部视角'}`;
  element('blue-kills').textContent=String(state.deaths.red);
  element('red-kills').textContent=String(state.deaths.blue);
  element('player-kda').textContent=`${state.kills.blue}/${state.deaths.blue}/0`;
  element('player-cs').textContent=String(state.cs.blue);
  ui.blueCs.textContent = `${state.cs.blue}`;
  ui.redCs.textContent = `${state.cs.red}`;
  ui.time.textContent = clock(state.time);
  ui.wave.textContent = state.wave ? `第 ${state.wave} 波兵线 · 下一波 ${Math.max(0, Math.ceil(BALANCE.firstWaveAt + state.wave * BALANCE.waveInterval - state.time))}s` : '等待第一波兵线';
  if (ePractice) ui.wave.textContent = `E 测试 · 八向固定靶 · ${scene.simulationSpeed}× 速度`;
  if(rPractice) ui.wave.textContent=`R 原版测试 · ${scene.simulationSpeed}× 速度 · 先击飞再按 R`;
  if(qPractice)ui.wave.textContent=`Q 测试 · ${scene.simulationSpeed}× · 独立蓄风 / 横斩 / 龙卷风`;
  ui.hp.max=hero.maxHp;ui.hp.value = hero.hp; ui.flow.value = hero.flow??0;
  ui.hpText.textContent = `${Math.ceil(hero.hp)} / ${Math.ceil(hero.maxHp)}`;
  ui.flowText.textContent = `${Math.floor(hero.flow??0)} / 100`;
  const passiveShield=shieldRemaining(hero,state.time),flowReady=(hero.flow??0)>=100;
  ui.flow.classList.toggle('flow-ready',flowReady);
  const totalShield=passiveShield+itemShieldRemaining(hero,state.time);ui.hpText.textContent+=totalShield>0?` +${Math.ceil(totalShield)}盾`:'';
  const passiveSlot=document.querySelector<HTMLElement>('.passive-slot');
  if(passiveSlot){
    const stats=yasuoCritStats(hero);
    passiveSlot.classList.toggle('passive-ready',flowReady);
    passiveSlot.classList.toggle('passive-shielded',passiveShield>0);
    passiveSlot.title=`浪客之道 · 剑意 ${Math.floor(hero.flow??0)}/100\n移动积攒；满剑意受英雄伤害触发 ${Math.round(passiveShieldStrength(hero))} 护盾，持续1秒。\n暴击率翻倍；当前 ${(stats.chance*100).toFixed(0)}%，溢出提供 ${stats.bonusAD.toFixed(0)} 攻击力。${passiveShield>0?`\n剩余护盾 ${Math.ceil(passiveShield)}`:''}`;
  }
  ui.blueTower.max=state.tower('blue').maxHp;ui.blueTower.value = state.tower('blue').hp;
  ui.redTower.max=state.tower('red').maxHp;ui.redTower.value = state.tower('red').hp;
  const target = state.entity(scene.selectedId);
  updateTargetHud(state,target);
  for (const key of ['q', 'w', 'e', 'r'] as const) {
    const remaining = Math.max(0, hero.abilities[key] - state.time);
    element(`ability-${key}`).classList.toggle('cooling', remaining > 0);
    element(`ability-${key}`).classList.remove('unaffordable');
    element(`cooldown-${key}`).textContent = remaining > 0 ? `${Math.ceil(remaining)}` : '';
  }
  element('ability-r').classList.toggle('followup-ready',!!state.rTarget('blue'));
  for(const key of ['d','f'] as const){
    const remaining=Math.max(0,state.summonerCooldowns.blue[key]-state.time);
    const slot=document.getElementById(`summoner-${key}`);
    slot?.classList.toggle('cooling',remaining>0);
    const label=document.getElementById(`summoner-cooldown-${key}`);
    if(label)label.textContent=remaining>0?String(Math.ceil(remaining)):'';
  }
  if (state.phase === displayedPhase) return;
  displayedPhase = state.phase;
  ui.phase.textContent = { ready: '准备就绪', playing: '对线进行中', paused: '比赛已暂停', ended: '比赛结束' }[state.phase];
  ui.pause.disabled = state.phase === 'ready' || state.phase === 'ended';
  ui.pause.textContent = state.phase === 'paused' ? '继续 Esc' : '暂停 Esc';
  ui.overlay.hidden = state.phase === 'playing' || ((ePractice||rPractice||qPractice) && state.phase === 'paused');
  ui.stats.hidden = state.phase !== 'ended';
  ui.symbol.style.color = '';
  if (state.phase === 'ready') {
    ui.kicker.textContent = 'THE MIDLINE TRIAL';
    ui.symbol.textContent = '◈';
    ui.title.textContent = HOWLING_MAP?'嚎哭深渊 · 冰桥对线':'赢下这条中路';
    ui.description.textContent = '补好每一刀，找准出手的时机。一血、一塔、一百刀，任意一项即可获胜。';
    ui.start.textContent = '进入对线 →';
    if (ePractice) {
      ui.kicker.textContent='YASUO E LAB'; ui.title.textContent='测试八向踏前斩';
      ui.description.textContent='指向固定靶按 E 穿过目标。上方方向按钮可复位试放；支持慢放与清除冷却。';
      ui.start.textContent='进入测试 →';
    }
    if(rPractice){ui.kicker.textContent='YASUO R LAB';ui.title.textContent='测试原版狂风绝息斩';ui.description.textContent='使用上方一键试放，或先用 Q3 / EQ3 击飞目标再按 R。';ui.start.textContent='进入测试 →';}
    if(qPractice){ui.kicker.textContent='YASUO Q LAB';ui.title.textContent='测试蓄风与龙卷风';ui.description.textContent='点上方“蓄风并行走”查看效果，或连续使用“Q 命中靶”测试叠层和 Q3。';ui.start.textContent='进入测试 →';}
    if(combatPractice){ui.kicker.textContent='BLADE CONTACT';ui.title.textContent='刀剑交锋 · 手感练习';ui.description.textContent='右键攻击固定靶，Q 戳刺、E 穿身。展开训练工具可重置、慢放或对比命中反馈。音效默认开启，可在选项中调整。';ui.start.textContent='进入练习 →';}
    if(minionPractice){ui.kicker.textContent='LANE & DASH';ui.title.textContent='穿兵进退 · 兵线练习';ui.description.textContent='小兵提供补刀机会与 E 的进退路线。敌方英雄在兵线后方，可尝试穿前排、接近英雄，再借另一只小兵撤退。选项中可重新开始。';ui.start.textContent='进入兵线练习 →';}
  } else if (state.phase === 'paused') {
    ui.kicker.textContent = 'TAKE A BREATH';
    ui.symbol.textContent = 'Ⅱ';
    ui.title.textContent = '稍作休息';
    ui.description.textContent = '比赛时间、兵线和技能冷却已暂停。';
    ui.start.textContent = '继续对线 →';
  } else if (state.result) {
    const won = state.result.winner === 'blue', draw = state.result.winner === null;
    const reasons = { 'first-blood': '一血', 'first-tower': '一塔', '100-cs': '一百刀', draw: '同时达成胜利条件' };
    ui.kicker.textContent = draw ? 'A CLOSE CONTEST' : won ? 'VICTORY' : 'TRY ANOTHER LINE';
    ui.symbol.textContent = won ? '✦' : draw ? '◇' : '◈';
    ui.symbol.style.color = won || draw ? '#6de5db' : '#ee8582';
    ui.title.textContent = draw ? '势均力敌' : won ? '这条中路，属于你。' : '下一次，找准时机。';
    ui.description.textContent = draw ? '双方在同一逻辑步达成胜利条件，本局平局。' : `${won ? '你' : '训练对手'}通过「${reasons[state.result.reason]}」赢得了本局对线。`;
    const time = document.createElement('span'), cs = document.createElement('span');
    time.textContent = `用时 ${clock(state.result.time)}`;
    cs.textContent = `补刀 ${state.cs.blue} : ${state.cs.red}`;
    ui.stats.replaceChildren(time, cs);
    ui.start.textContent = '再来一局 ↻';
  }
}

const scene = new ArenaScene(match, {
  frame: state => { if (state.phase !== 'playing' || state.hero('blue').hp <= 0) casting.cancel(); syncHud(state); },
  event: event => {
    audio.play(event);
    if(event.type==='hit'||event.type==='cast'){
      environmentAudio.noticeCombat(match.time);
      if(event.type==='cast'||event.sourceKind==='hero'||event.targetKind==='hero')mapMusic.noticeCombat(match.time);
    }
    if (event.type === 'wave' && match.wave === 1) toast('兵线出发。靠近残血小兵，完成最后一击。');
    if (event.type === 'last-hit' && event.team === 'blue' && match.cs.blue === 1) toast('补刀 +1。先到 100 刀也能获胜。');
  },
});
const casting = new SkillCasting(cast, key => {
  scene.aimKey = key;
  if(key)scene.attackSelecting=false;
  for(const ability of ['q','w','e','r'])document.getElementById(`ability-${ability}`)?.classList.toggle('cast-selected',ability===key);
});
scene.confirmSkill=()=>casting.confirm();
scene.cancelSkill=()=>casting.cancel();
const game = new Phaser.Game({
  type: Phaser.AUTO, parent: 'game', width: VIEWPORT.width * RENDER_SCALE, height: VIEWPORT.height * RENDER_SCALE,
  backgroundColor: '#142b28', pixelArt: true, roundPixels: true,
  render: { antialias: false, pixelArt: true, roundPixels: true },
  // No application FPS cap; rAF follows the display, simulation stays at 60 Hz.
  fps: { limit: 0, forceSetTimeOut: false, smoothStep: false },
  scale: { mode: Phaser.Scale.NONE, autoCenter: Phaser.Scale.NO_CENTER },
  scene: [scene], audio: { noAudio: true },
});

const fpsReadout = document.createElement('span');
fpsReadout.className = 'fps-readout';
fpsReadout.hidden = !combatPractice;
ui.heroAnimation.hidden = !combatPractice;
fpsReadout.textContent = 'FPS —';
fpsReadout.title = '实际渲染帧率 · 每 0.5 秒更新 · 未设置帧率上限';
document.querySelector('.match-shell')!.append(fpsReadout);
let fpsSampleAt = performance.now(), fpsFrames = 0;
const resetFpsSample = () => {
  fpsSampleAt = performance.now(); fpsFrames = 0;
  fpsReadout.textContent = 'FPS —';
};
game.events.on(Phaser.Core.Events.POST_RENDER, () => {
  if (document.hidden) return;
  const now = performance.now();
  fpsFrames++;
  const elapsed = now - fpsSampleAt;
  if (elapsed < 500) return;
  fpsReadout.textContent = `FPS ${Math.round(fpsFrames * 1000 / elapsed)}`;
  fpsSampleAt = now; fpsFrames = 0;
});
listenDocument('visibilitychange', resetFpsSample);
game.events.once(Phaser.Core.Events.DESTROY, () => {
  document.removeEventListener('visibilitychange', resetFpsSample);
  fpsReadout.remove();
});

function reset(start = true): void {
  casting.cancel();
  audio.stop();
  const hitStunEnabled=match.hitStunEnabled;
  match = createMatch();
  match.setHitStunEnabled(hitStunEnabled);
  scene.setMatch(match);
  window.clearTimeout(toastTimer);
  ui.toast.classList.remove('visible');
  displayedPhase = null;
  if (start) match.start();
  syncHud(match);
  ui.arena.focus({ preventScroll: true });
}
async function begin(): Promise<void> {
  audio.unlock();
  ui.start.disabled=true;
  try { await audio.preload(); }
  catch { if(!scope.signal.aborted){ui.start.disabled=false;toast('音频资源加载失败，请刷新重试。');} return; }
  if(scope.signal.aborted)return;
  ui.start.disabled=false;
  if (match.phase === 'ended') reset();
  else if (match.phase === 'paused') match.togglePause();
  else match.start();
  syncHud(match);
  ui.arena.focus({ preventScroll: true });
}
function castSummoner(key:SummonerKey):void {
  casting.cancel();
  if(match.phase!=='playing')return;
  scene.attackSelecting=false;
  const hovered=pickUnit(match.entities,scene.aim);
    const selected=match.entity(scene.selectedId);
    const target=hovered&&hovered.team!=='blue'&&hovered.hp>0?hovered:selected&&selected.team!=='blue'&&selected.hp>0?selected:undefined;
  if(!match.castSummoner('blue',key,scene.aim,target?.id??null))
    toast(key==='f'?'指向附近敌人后按 F 点燃，或等待冷却和当前动作结束。':'指向落点后按 D 闪现，或等待冷却和当前动作结束。');
  syncHud(match);
}
function cast(key: AbilityKey): void {
  if (match.phase !== 'playing') return;
  if (!match.cast('blue', key, scene.abilityAim(key))) {
    if(key==='r'){toast(`R 会自动接范围 ${ABILITIES.r.range} 内被击飞的敌方英雄，需等待击飞与冷却就绪。`);return;}
    const hero = match.hero('blue');
    if(hero.eCast) { toast(key==='q'?'Q 尚未就绪，或本次 E 已触发 EQ。':'正在踏前斩，可按 Q 接环斩。'); return; }
    if(key==='e' && match.dashError(scene.aim)) { toast(match.dashError(scene.aim)!); return; }
    toast(hero.wCast && match.time < hero.wCast.startedAt + 0.8 ? '正在释放风墙，请等待收招。' : '技能尚未冷却。');
  }
  syncHud(match);
}
const practiceLink = document.createElement('a');
const musicToggle=document.createElement('button');musicToggle.textContent='背景音乐：开';musicToggle.setAttribute('aria-pressed','true');
musicToggle.dataset.settingGroup='operation';
musicToggle.title='嚎哭深渊官方 Early Game 原声；跟随音效总开关，交战时自动降低音量';
musicToggle.onclick=()=>{mapMusic.enabled=!mapMusic.enabled;musicToggle.textContent=mapMusic.enabled?'背景音乐：开':'背景音乐：关';musicToggle.setAttribute('aria-pressed',String(mapMusic.enabled));syncHud(match);};
const musicLabel=document.createElement('label');musicLabel.textContent='音乐音量 ';
musicLabel.dataset.settingGroup='operation';
const musicVolume=document.createElement('input');musicVolume.type='range';musicVolume.min='0';musicVolume.max='50';musicVolume.value='16';musicVolume.setAttribute('aria-label','背景音乐音量');musicVolume.oninput=()=>{mapMusic.volume=Number(musicVolume.value)/100;syncHud(match);};musicLabel.append(musicVolume);
document.querySelector('.match-actions')!.append(musicToggle,musicLabel);
function syncCombatFeedback(){
 document.querySelectorAll<HTMLButtonElement>('[data-combat-feedback]').forEach(button=>{button.textContent=`战斗反馈：${scene.combatFeedbackEnabled?'开':'关'}`;button.setAttribute('aria-pressed',String(scene.combatFeedbackEnabled));});
}
const accentsToggle=document.createElement('button');
accentsToggle.dataset.settingGroup='graphics';
accentsToggle.textContent='场景与命中特效：开';accentsToggle.setAttribute('aria-pressed','true');
accentsToggle.onclick=()=>{scene.accentsEnabled=!scene.accentsEnabled;accentsToggle.textContent=scene.accentsEnabled?'场景与命中特效：开':'场景与命中特效：关';accentsToggle.setAttribute('aria-pressed',String(scene.accentsEnabled));};
document.querySelector('.match-actions')!.append(accentsToggle);
if(HOWLING_MAP){
  const lightToggle=document.createElement('button');
  const firelightToggle=document.createElement('button');
  const materialToggle=document.createElement('button');
  for(const toggle of [lightToggle,firelightToggle,materialToggle])toggle.dataset.settingGroup='graphics';
  materialToggle.textContent='石砖凹凸受光：开';materialToggle.setAttribute('aria-pressed','true');
  materialToggle.title='需要开启引擎光影；使用程序生成的浅浮雕法线，不改变地形';
  materialToggle.onclick=()=>{scene.materialLightingEnabled=!scene.materialLightingEnabled;materialToggle.textContent=scene.materialLightingEnabled?'石砖凹凸受光：开':'石砖凹凸受光：关';materialToggle.setAttribute('aria-pressed',String(scene.materialLightingEnabled));};
  document.querySelector('.match-actions')!.append(materialToggle);
  lightToggle.textContent='引擎光影：开';lightToggle.setAttribute('aria-pressed','true');
  lightToggle.onclick=()=>{scene.lightingEnabled=!scene.lightingEnabled;lightToggle.textContent=scene.lightingEnabled?'引擎光影：开':'引擎光影：关';lightToggle.setAttribute('aria-pressed',String(scene.lightingEnabled));};
  document.querySelector('.match-actions')!.append(lightToggle);
  firelightToggle.textContent='动态火光：开';firelightToggle.setAttribute('aria-pressed','true');
  firelightToggle.title='控制环境火盆的动态受光；关闭后保留原有静态照明，不影响技能特效';
  firelightToggle.onclick=()=>{scene.firelightMotionEnabled=!scene.firelightMotionEnabled;firelightToggle.textContent=scene.firelightMotionEnabled?'动态火光：开':'动态火光：关';firelightToggle.setAttribute('aria-pressed',String(scene.firelightMotionEnabled));};
  document.querySelector('.match-actions')!.append(firelightToggle);
}
const mapToggle=document.createElement('button');
mapToggle.dataset.settingGroup='graphics';
const iceToggle=document.createElement('button');
iceToggle.textContent='地面：新版石砖＋积雪';iceToggle.setAttribute('aria-pressed','true');
iceToggle.onclick=()=>{scene.iceMap=!scene.iceMap;iceToggle.textContent=scene.iceMap?'地面：新版石砖＋积雪':'地面：原森林';iceToggle.setAttribute('aria-pressed',String(scene.iceMap));mapToggle.disabled=scene.iceMap;};
document.querySelector('.match-actions')!.append(iceToggle);
if(HOWLING_MAP){iceToggle.disabled=true;iceToggle.textContent='地图：嚎哭深渊冰桥';}
mapToggle.textContent='动态地图：开';mapToggle.setAttribute('aria-pressed','true');
mapToggle.disabled=scene.iceMap&&!HOWLING_MAP;
mapToggle.title=HOWLING_MAP?'控制建筑动态、草丛风摆、飘雪运动、桥边雪流和踩雪反馈；火光保留独立开关':'仅控制原森林的动态层；石砖和积雪是静态地面材质';
mapToggle.onclick=()=>{scene.dynamicMap=!scene.dynamicMap;mapToggle.textContent=scene.dynamicMap?'动态地图：开':HOWLING_MAP?'动态地图：关':'动态地图：关（原图）';mapToggle.setAttribute('aria-pressed',String(scene.dynamicMap));};
document.querySelector('.match-actions')!.append(mapToggle);
practiceLink.href = ePractice ? '/?map=howling' : '/?practice=e';
practiceLink.textContent = ePractice ? '返回冰桥对局' : 'E 技能测试场';
practiceLink.style.cssText = 'color:#9fe8db;margin:8px;display:inline-block';
document.querySelector('.match-actions')!.append(practiceLink);
const combatLink=document.createElement('a');combatLink.href='/?map=howling&practice=combat';combatLink.textContent='战斗手感练习';combatLink.style.cssText=practiceLink.style.cssText;document.querySelector('.match-actions')!.append(combatLink);
const minionLink=document.createElement('a');minionLink.href='/?map=howling&practice=minions';minionLink.textContent='小兵交战练习';minionLink.style.cssText=practiceLink.style.cssText;document.querySelector('.match-actions')!.append(minionLink);
if(combatPractice){
 const panel=document.createElement('section');panel.setAttribute('aria-label','战斗手感练习');
 const control=(label:string,action:()=>void)=>{const button=document.createElement('button');button.textContent=label;button.onclick=action;panel.append(button);return button;};
 const prepare=()=>{reset();scene.aim={...match.hero('red')};scene.selectedId=match.hero('red').id;};
 control('连续普攻',()=>{prepare();match.orderAttack('blue',match.hero('red').id);});
 control('试放 Q',()=>{prepare();cast('q');});
 control('试放 E',()=>{prepare();cast('e');});
 control('试放 W',()=>{prepare();cast('w');});
 control('风墙朝上',()=>{prepare();const h=match.hero('blue');scene.aim={x:h.x,y:h.y-100};cast('w');});
 control('试放 EQ',()=>{prepare();cast('e');cast('q');});
 control('试放 EQ3',()=>{prepare();const h=match.hero('blue');grantStorm(h,match.time);grantStorm(h,match.time);cast('e');cast('q');});
 control('试放 Q3',()=>{prepare();const h=match.hero('blue');grantStorm(h,match.time);grantStorm(h,match.time);cast('q');});
 control('预览 Q3 蓄风',()=>{prepare();const h=match.hero('blue');grantStorm(h,match.time);grantStorm(h,match.time);});
 control('试放闪现 D',()=>{prepare();const h=match.hero('blue');scene.aim={x:h.x-100,y:h.y};castSummoner('d');});
 control('试放点燃 F',()=>{prepare();castSummoner('f');});
 control('充满剑意',()=>{prepare();match.hero('blue').flow=100;syncHud(match);});
 control('测试被动护盾',()=>{prepare();match.hero('blue').flow=100;match.damage(match.hero('red'),match.hero('blue'),43);syncHud(match);});
 const dodgeTrial=(empowered:boolean)=>{prepare();const h=match.hero('blue'),enemy=match.hero('red');enemy.x=h.x+110;enemy.y=h.y;if(empowered){grantStorm(enemy,match.time);grantStorm(enemy,match.time);}match.cast('red','q',h);};
 control('躲避 Q',()=>dodgeTrial(false));
 control('躲避 Q3',()=>dodgeTrial(true));
 control('试放 R',()=>{prepare();match.hero('red').airborneUntil=match.time+3;cast('r');});
 control('靶攻击我',()=>{prepare();match.hero('red').damage=10;match.orderAttack('red',match.hero('blue').id);});
 control('高频受击测试',()=>{prepare();const target=match.hero('red');target.damage=3;target.attackInterval=.04;match.orderAttack('red',match.hero('blue').id);});
 const stun=control('受击硬直：开',()=>{match.setHitStunEnabled(!match.hitStunEnabled);stun.textContent=match.hitStunEnabled?'受击硬直：开':'受击硬直：关';stun.setAttribute('aria-pressed',String(match.hitStunEnabled));});stun.setAttribute('aria-pressed','true');
 const feedback=control('战斗反馈：开',()=>{scene.combatFeedbackEnabled=!scene.combatFeedbackEnabled;syncCombatFeedback();});feedback.dataset.combatFeedback='true';feedback.setAttribute('aria-pressed','true');
 const slow=control('慢放 ×0.25',()=>{scene.simulationSpeed=scene.simulationSpeed===1?.25:1;slow.textContent=scene.simulationSpeed===1?'慢放 ×0.25':'恢复原速';});
 control('重置靶场',prepare);document.querySelector('.page-heading')!.after(panel);
}
const rLink=document.createElement('a');rLink.href=rPractice?'/?map=howling':'/?practice=r';rLink.textContent=rPractice?'返回冰桥对局':'R 大招测试场';rLink.style.cssText=practiceLink.style.cssText;document.querySelector('.match-actions')!.append(rLink);
const qLink=document.createElement('a');qLink.href=qPractice?'/?map=howling':'/?practice=q';qLink.textContent=qPractice?'返回冰桥对局':'Q 蓄风测试场';qLink.style.cssText=practiceLink.style.cssText;document.querySelector('.match-actions')!.append(qLink);
if(qPractice){
 const panel=document.createElement('section');panel.setAttribute('aria-label','Q 测试控制');panel.style.cssText='display:flex;gap:8px;flex-wrap:wrap;padding:12px;background:#18332f;color:#d4eee7';
 const ready=()=>{reset();const h=match.hero('blue');grantStorm(h,match.time);grantStorm(h,match.time);};
 const walk=document.createElement('button');walk.textContent='蓄风并行走';walk.onclick=()=>{ready();match.orderMove('blue',{x:445,y:390});syncHud(match);};
 const hit=document.createElement('button');hit.textContent='Q 命中靶（清冷却）';hit.onclick=()=>{if(match.phase!=='playing')begin();const h=match.hero('blue');h.abilities.q=match.time;h.mana=h.maxMana;scene.aim={...match.hero('red')};scene.selectedId=match.hero('red').id;cast('q');};
 const clear=document.createElement('button');clear.textContent='清除蓄风';clear.onclick=()=>{clearStorm(match.hero('blue'));syncHud(match);};
 const slow=document.createElement('button');slow.textContent='慢放 ×0.25';slow.onclick=()=>{scene.simulationSpeed=scene.simulationSpeed===1?.25:1;slow.textContent=scene.simulationSpeed===1?'慢放 ×0.25':'恢复原速';};
 panel.append(walk,hit,clear,slow);
 ['正右','右下','正下','左下','正左','左上','正上','右上'].forEach((name,i)=>{const button=document.createElement('button');button.textContent=`Q3 ${name}`;button.onclick=()=>{ready();const h=match.hero('blue');scene.aim={x:h.x+Math.cos(i*Math.PI/4)*100,y:h.y+Math.sin(i*Math.PI/4)*100};cast('q');};panel.append(button);});
 document.querySelector('.page-heading')!.after(panel);
}
if(rPractice){
 const panel=document.createElement('section');panel.style.cssText='display:flex;gap:8px;flex-wrap:wrap;padding:12px;background:#18332f;color:#d4eee7';
 const prepare=()=>{reset();const target=match.hero('red');target.airborneUntil=match.time+3;scene.aim={x:target.x,y:target.y};scene.selectedId=target.id;};
 const air=document.createElement('button');air.textContent='复位并击飞目标';air.onclick=prepare;
 const trial=document.createElement('button');trial.textContent='一键试放原版 R';trial.onclick=()=>{prepare();cast('r');};
 const slow=document.createElement('button');slow.textContent='慢放 ×0.25';slow.onclick=()=>{scene.simulationSpeed=scene.simulationSpeed===1?.25:1;slow.textContent=scene.simulationSpeed===1?'慢放 ×0.25':'恢复原速';};
 panel.append(air,trial,slow);document.querySelector('.page-heading')!.after(panel);
}
if (ePractice) {
  const panel = document.createElement('section');
  panel.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;padding:12px;background:#18332f;color:#d4eee7';
  panel.setAttribute('aria-label', 'E 测试控制');
  const label = document.createElement('span'); label.textContent = '复位并试放：'; panel.append(label);
  const eqMode=document.createElement('input');eqMode.type='checkbox';eqMode.checked=true;
  const eqLabel=document.createElement('label');eqLabel.append(eqMode,' EQ 连招（E 后接 Q）');panel.append(eqLabel);
  const eq3Mode=document.createElement('input');eq3Mode.type='checkbox';
  const eq3Label=document.createElement('label');eq3Label.append(eq3Mode,' EQ3 蓄风多层环斩');panel.append(eq3Label);
  eq3Mode.onchange=()=>{if(eq3Mode.checked)eqMode.checked=true;};
  eqMode.onchange=()=>{if(!eqMode.checked)eq3Mode.checked=false;};
  ['正右','右下','正下','左下','正左','左上','正上','右上'].forEach((name, index) => {
    const button = document.createElement('button'); button.textContent = name;
    button.addEventListener('click', () => {
      reset();
      const target = match.entities.filter(e => e.team === 'red' && e.kind === 'melee')[index];
      scene.aim = { x: target.x, y: target.y }; scene.selectedId = target.id;
      if(eq3Mode.checked){grantStorm(match.hero('blue'),match.time);grantStorm(match.hero('blue'),match.time);}
      cast('e');
      if(eqMode.checked) cast('q');
    }); panel.append(button);
  });
  const slow = document.createElement('button'); slow.textContent = '慢放 ×0.25'; slow.setAttribute('aria-pressed','false');
  slow.onclick = () => { scene.simulationSpeed = scene.simulationSpeed === 1 ? 0.25 : 1; slow.setAttribute('aria-pressed',String(scene.simulationSpeed !== 1)); slow.textContent=scene.simulationSpeed===1?'慢放 ×0.25':'恢复原速'; };
  const clear = document.createElement('button'); clear.textContent='清除 E / Q 冷却';
  clear.onclick = () => { match.eTargetLocks.clear(); match.hero('blue').abilities.e=match.time; match.hero('blue').abilities.q=match.time; syncHud(match); };
  panel.append(slow,clear); document.querySelector('.page-heading')!.after(panel);
}
mountLeagueHud(ePractice || rPractice || qPractice || combatPractice,{signal:scope.signal,use:slot=>{match.useItem('blue',slot,match.hero('blue'));syncHud(match);},buy:id=>{match.buyItem('blue',id);syncHud(match);},sell:slot=>{match.sellItem('blue',slot);syncHud(match);},upgrade:key=>{match.upgradeSkill('blue',key);syncHud(match);},flute:playFlute,summoner:castSummoner,stop:()=>{casting.cancel();if(match.phase==='playing'){match.stop('blue');syncHud(match);}}});
listenDocument('midline:shop-open' as keyof DocumentEventMap,()=>{casting.cancel();scene.attackSelecting=false;scene.recenterHeld=false;});
mountCastSettings(casting);
ui.start.addEventListener('click', begin);
ui.restart.addEventListener('click', () => reset());
ui.pause.addEventListener('click', () => { match.togglePause(); syncHud(match); });
ui.sound.addEventListener('click', () => {
  const enabled = audio.toggle();
  ui.sound.textContent = enabled ? '音效开启 ♪' : '音效关闭 ♪';
  ui.sound.setAttribute('aria-pressed', `${enabled}`);
  syncHud(match);
});
function toggleCamera(): void {
  scene.cameraRig.toggleFollow(match.hero('blue'));
  syncHud(match);
}
ui.camera.addEventListener('click', toggleCamera);
for (const key of ['q', 'w', 'e', 'r'] as const) {
  const button = element(`ability-${key}`);
  if (!button.hasAttribute('aria-describedby')) button.title = `${key.toUpperCase()} ${key === 'q' ? '斩钢闪（八向动画）' : ABILITIES[key].name} · 无消耗 · ${ABILITIES[key].cooldown}s 冷却${key==='r'?` · 范围 ${ABILITIES.r.range} · 按键自动接击飞`:''}`;
  button.addEventListener('click', () => { if(match.phase==='playing'&&match.hero('blue').hp>0)casting.select(key); ui.arena.focus({preventScroll:true}); });
}
function playFlute():void {
  casting.cancel();
  if(match.phase!=='playing'){toast('请先进入或继续对线，再按 3 吹箫。');return;}
  audio.unlock();
  if(!match.startFlute())toast('当前动作结束后可吹箫。');
  syncHud(match);
}
const fluteButton=document.createElement('button');
fluteButton.textContent='吹箫 · 3';fluteButton.title='按 3 吹箫；Ctrl+3 在部分浏览器中会切换标签页';
fluteButton.onclick=()=>{playFlute();ui.arena.focus({preventScroll:true});};
document.querySelector('.match-actions')!.append(fluteButton);
// Capture early when the host forwards the chord; host-level tab shortcuts still need the plain-3 fallback.
listenWindow('keydown',event=>{
  if((!fluteShortcut(event)&&!emoteShortcut(event))||event.target instanceof HTMLElement&&event.target.closest('input,textarea,select,[contenteditable]'))return;
  event.preventDefault();event.stopImmediatePropagation();
  if(!event.repeat){const action=emoteShortcut(event);if(action){audio.unlock();match.startEmote(action);}else playFlute();}
},{capture:true});
document.addEventListener('midline:settings-open',()=>{casting.cancel();scene.attackSelecting=false;scene.recenterHeld=false;},{signal:scope.signal});
listenWindow('keydown', event => {
  if(event.ctrlKey&&!event.metaKey&&!event.altKey&&['q','w','e','r'].includes(event.key.toLowerCase())&&!(event.target instanceof HTMLElement&&event.target.closest('input,textarea,select,[contenteditable]'))){
    event.preventDefault();if(!event.repeat){match.upgradeSkill('blue',event.key.toLowerCase() as AbilityKey);syncHud(match);}return;
  }
  if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
  if(event.target instanceof HTMLElement&&event.target.closest('input,textarea,select,[contenteditable]'))return;
  const key = event.key.toLowerCase();
  if (['a', 'q', 'w', 'e', 's', 'y', ' ', 'escape', 'enter', 'arrowleft', 'arrowright', 'arrowup', 'arrowdown'].includes(key)) event.preventDefault();
  if(['q','w','e','r','s'].includes(key))scene.attackSelecting=false;
  if(key==='escape'&&casting.cancel())return;
  if(key==='escape'&&scene.attackSelecting){scene.attackSelecting=false;return;}
  if(key==='a'&&match.phase==='playing'){casting.cancel();scene.attackSelecting=true;scene.aimKey=null;}
  else if(key==='d'||key==='f')castSummoner(key);
  else if (key === 'q' || key === 'w' || key === 'e' || key === 'r') { if(match.phase==='playing'&&match.hero('blue').hp>0)casting.keyDown(key); }
  else if (key === 's' && match.phase === 'playing') { casting.cancel(); match.stop('blue'); }
  else if (key === 'enter' && match.phase !== 'playing') begin();
  else if (key === 'y') toggleCamera();
  else if (key === ' ' && match.phase === 'playing') {
    scene.recenterHeld = true;
    scene.cameraRig.lookAt(match.hero('blue'));
  }
});
listenWindow('keyup', event => {
  if (event.key === ' ') scene.recenterHeld = false;
  const key=event.key.toLowerCase();
  if(['q','w','e','r'].includes(key)) {
    if(match.phase!=='playing'||match.hero('blue').hp<=0||event.target instanceof HTMLElement&&event.target.closest('input,select,textarea'))casting.cancel();
    else casting.keyUp(key as AbilityKey);
  }
});
listenWindow('blur', () => {
  casting.cancel();
  scene.attackSelecting=false;
  scene.recenterHeld = false;
  if (match.phase === 'playing') { match.togglePause(); syncHud(match); }
});
listenDocument('visibilitychange',()=>{if(document.hidden)casting.cancel();});
function resize(): void {
  const width=ui.arena.clientWidth,height=ui.arena.clientHeight;
  if(!width||!height)return;
  // Resize the rendered view to the window instead of fitting a fixed 16:9 canvas.
  const scale=Math.max(Math.min(width/VIEWPORT.width,height/VIEWPORT.height),width/(WORLD.width*.6),height/(WORLD.height*.6));
  const logicalWidth=width/scale,logicalHeight=height/scale;
  scene.cameraRig.setViewport(logicalWidth,logicalHeight);
  game.scale.setZoom(scale/RENDER_SCALE);
  game.scale.resize(logicalWidth*RENDER_SCALE,logicalHeight*RENDER_SCALE);
  game.scale.updateBounds();
}
game.events.once(Phaser.Core.Events.READY, resize);
const observer = new ResizeObserver(resize);
observer.observe(ui.arena);
listenWindow('beforeunload', () => { observer.disconnect(); game.destroy(true); });
syncHud(match);
return () => {
  scope.abort(); observer.disconnect(); window.clearTimeout(toastTimer);
  casting.cancel(); environmentAudio.dispose(); audio.dispose(); mapMusic.dispose();
  game.destroy(true);
};
}
