import {emoteShortcut} from './game/YasuoEmote';
import {updateHeroStatusHud} from './ui/HeroStatusHud';
import './style.css';
import { mountThreeHud } from './ui/ThreeHud';
import {preloadEquipmentIcons} from './ui/EquipmentHud';
import { SkillCasting } from './presentation/SkillCasting';
import { mountCastSettings } from './ui/CastSettings';
import './render-three/prototype.css';
import { Match } from './game/Match';
import { createNailongPractice } from './game/NailongPractice';
import { ABILITIES, HOWLING_MAP } from './game/config';
import { bridgePoint } from './game/Bridge';
import { createCombatPractice } from './game/CombatPractice';
import { ThreeArena } from './render-three/ThreeArena';
import { PrototypeHost } from './presentation/PrototypeHost';
import type { AbilityKey, Point } from './game/types';
import { createS01Match } from './presentation/S01Match';
import { CENTRAL_BRIDGE } from './render-three/CentralBridgeLayout';
import { PAINTED_MAP } from './render-three/PaintedBridgeSample';
import { ART_VIEWS, ART_OUTER_U } from './render-three/PaintedMapLayout';
import overviewReference from '../assets/map-concepts/howling-abyss-target-v1/01-overview.png?url';
import sanctuaryReference from '../assets/map-concepts/howling-abyss-target-v1/02-sanctuary.png?url';
import towerReference from '../assets/map-concepts/howling-abyss-target-v1/03-outer-tower.png?url';
import centralReference from '../assets/map-concepts/howling-abyss-target-v1/04-central-bridge.png?url';
import { MapDrag } from './presentation/MapDrag';
import { GAMEPLAY_VIEW } from './render-three/Coordinates';
import { ThreeAudio } from './presentation/ThreeAudio';
import { NetworkHost } from './network/NetworkHost';
import { mountLobby } from './network/Lobby';
import { AssetLoadGate } from './presentation/AssetLoadGate';
import { mountAssetLoading } from './ui/AssetLoading';
import type { QualityEffect } from './render-three/QualitySettings';
import { AdaptiveGraphics, GRAPHICS_EFFECTS, GRAPHICS_PROFILES, GRAPHICS_STORAGE_KEY, readGraphicsPreferences, type GraphicsMode, type GraphicsPreferences, type GraphicsRenderWidth } from './render-three/GraphicsPerformance';
import { conservativeGraphicsTier, detectGraphicsHardware } from './render-three/GraphicsHardware';
import { soloOpponent } from './game/SoloOpponent';

function element<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id); if (!node) throw new Error(`Missing ${id}`); return node as T;
}
export function bootThree(lobbyHost?: NetworkHost): (preserveRoom?: boolean) => void {
  if (!HOWLING_MAP) throw new Error('冰桥地图尚未初始化');
  const viewport = element('viewport'), status = element('status');
  const online = new URLSearchParams(location.search).get('online') === '1';
  const scenario = element<HTMLSelectElement>('scenario');
  const requestedScene = new URLSearchParams(location.search).get('scene');
  if (requestedScene && requestedScene in ART_VIEWS) scenario.value = requestedScene;
  if (online) { scenario.value = 'match'; scenario.disabled = true; }
  const artView = () => ART_VIEWS[scenario.value as keyof typeof ART_VIEWS] ?? ART_VIEWS.central;
  const assets = new AssetLoadGate();
  const loading = mountAssetLoading(document.querySelector('.match-shell')!, assets);
  let assetsReady = false;
  let savedGraphics: string | null = null;
  try { savedGraphics = localStorage.getItem(GRAPHICS_STORAGE_KEY); } catch { /* Private browsing may disallow storage. */ }
  const preferences = readGraphicsPreferences(savedGraphics, 'low');
  const graphics = new AdaptiveGraphics(preferences.mode, preferences.tier);
  let view: ThreeArena;
  try { view = new ThreeArena(viewport, { smoothSampling: false }); }
  catch (cause) { assets.dispose(); loading.fail(cause); return () => loading.dispose(); }
  const hardware = detectGraphicsHardware(view.renderer.getContext(), navigator);
  if (graphics.mode === 'auto') {
    // First launch uses the GPU preset; saved auto reductions can only lower it.
    graphics.tier = conservativeGraphicsTier(readGraphicsPreferences(savedGraphics, hardware.tier).tier, hardware.tier);
  }
  view.sprites.preload();
  let fogWanted = true;
  const syncEnvironment = () => { view.showLayout = scenario.value === 'layout'; view.centralOnly = scenario.value === 'central' || scenario.value === 'combat'; view.fogEnabled = fogWanted && scenario.value === 'match'; view.cameraRig.setMapBounds(scenario.value === 'match' && view.paintedArt); };
  syncEnvironment();
  const fogButton = element<HTMLButtonElement>('war-fog');
  const detail = element<HTMLSelectElement>('detail');
  view.setGraphicsProfile(graphics.tier);
  if (preferences.mode === 'custom' && preferences.custom) {
    view.setResolution(preferences.custom.width); view.setQuality(preferences.custom.reduced); view.setEnhanced(preferences.custom.enhanced);
    for (const effect of GRAPHICS_EFFECTS) view.setQualityEffect(effect, preferences.custom.effects.includes(effect));
  }
  const lookSelect = element<HTMLSelectElement>('presentation');
  const requestedLook = new URLSearchParams(location.search).get('look');
  if (requestedLook === 'gray' || requestedLook === 'solid') lookSelect.value = requestedLook;
  if (online) { lookSelect.value = 'art'; lookSelect.disabled = true; fogButton.disabled = true; }
  view.paintedArt = lookSelect.value === 'art';
  syncEnvironment();
  view.presentation = lookSelect.value === 'gray' ? 'gray' : 'art';
  const reviewNailong=new URLSearchParams(location.search).get('review')==='nailong';
  const opponent = soloOpponent(new URLSearchParams(location.search).get('opponent'));
  const host = online ? lobbyHost ?? new NetworkHost(view) : new PrototypeHost(() => scenario.value === 'match' ? reviewNailong?createNailongPractice():new Match({league:true,enemyChampion:opponent}) : scenario.value === 'combat' ? createCombatPractice() : createS01Match(scenario.value === 'sanctuary' ? -659 : scenario.value === 'sample' ? -ART_OUTER_U + 50 : -10), view);
  const network = host instanceof NetworkHost ? host : null;
  network?.attachView(view);
  const localTeam = () => network?.team ?? 'blue';
  const abort = new AbortController(), signal = abort.signal;
  fogButton.addEventListener('click', () => {
    fogWanted = !fogWanted; syncEnvironment(); fogButton.textContent = `战争迷雾：${fogWanted ? '开' : '关'}`; fogButton.setAttribute('aria-pressed', String(fogWanted));
  }, { signal });
  const audio = new ThreeAudio();
  document.addEventListener('pointerdown', () => audio.unlock(), { signal, capture: true });
  document.addEventListener('keydown', () => audio.unlock(), { signal, capture: true });
  const sound = element<HTMLButtonElement>('sound'), music = element<HTMLButtonElement>('music'), ambience = element<HTMLButtonElement>('ambience');
  sound.addEventListener('click', () => { sound.textContent = `音效：${audio.combat.toggle() ? '开' : '关'}`; sound.setAttribute('aria-pressed', String(audio.combat.enabled)); }, { signal });
  music.addEventListener('click', () => { audio.music.enabled = !audio.music.enabled; music.textContent = `音乐：${audio.music.enabled ? '开' : '关'}`; music.setAttribute('aria-pressed', String(audio.music.enabled)); }, { signal });
  ambience.addEventListener('click', () => { audio.environment.enabled = !audio.environment.enabled; ambience.textContent = `环境声音：${audio.environment.enabled ? '开' : '关'}`; ambience.setAttribute('aria-pressed', String(audio.environment.enabled)); }, { signal });
  const modeSelect = element<HTMLSelectElement>('performance-mode');
  const qualitySelect = element<HTMLSelectElement>('quality');
  const persistGraphics = () => {
    const saved: GraphicsPreferences = { mode: graphics.mode, tier: graphics.tier };
    if (graphics.mode === 'custom') saved.custom = {
      width: Number(detail.value) as GraphicsRenderWidth, reduced: view.quality.reduced, enhanced: view.quality.enhanced,
      effects: GRAPHICS_EFFECTS.filter(effect => view.quality[effect].value > 0),
    };
    try { localStorage.setItem(GRAPHICS_STORAGE_KEY, JSON.stringify(saved)); } catch { /* Settings still work without storage. */ }
  };
  const compare = element<HTMLButtonElement>('quality-compare');
  const qualityInputs = [...document.querySelectorAll<HTMLInputElement>('[data-quality-effect]')];
  const syncQuality = () => {
    modeSelect.value = graphics.mode;
    detail.value = String(view.resolutionWidth);
    qualitySelect.value = view.quality.reduced ? 'low' : 'high';
    const profile = GRAPHICS_PROFILES[graphics.tier];
    element('performance-status').textContent = `${graphics.mode === 'auto' ? '自动 · ' : graphics.mode === 'custom' ? '自定义 · ' : ''}${profile.label} · 分辨率上限 ${detail.value} · 绘制上限 ${profile.fps} 帧。${hardware.description}。${graphics.mode === 'auto' ? '持续掉帧时自动降档；' : '当前使用手动画质；'}角色动画、技能与音效保留。`;
    const all = qualityInputs.every(input => view.quality[input.dataset.qualityEffect as QualityEffect].value > 0);
    compare.textContent = `画面增强：${view.quality.enhanced ? all ? '开' : '自定义' : '关'}`; compare.setAttribute('aria-pressed', String(view.quality.enhanced));
    for (const input of qualityInputs) { input.checked = view.quality[input.dataset.qualityEffect as QualityEffect].value > 0; input.disabled = !view.quality.enhanced; }
  };
  const customGraphics = () => { graphics.select('custom'); syncQuality(); persistGraphics(); };
  modeSelect.addEventListener('change', () => {
    const mode = modeSelect.value as GraphicsMode;
    if (mode === 'auto') graphics.tier = hardware.tier;
    graphics.select(mode); view.setGraphicsProfile(graphics.tier); syncQuality(); persistGraphics();
  }, { signal });
  detail.addEventListener('change', () => { view.setResolution(detail.value === '640' ? 640 : detail.value === '960' ? 960 : detail.value === '1280' ? 1280 : detail.value === '1600' ? 1600 : 1920); customGraphics(); }, { signal });
  qualitySelect.addEventListener('change', () => { view.setQuality(qualitySelect.value === 'low'); customGraphics(); }, { signal });
  compare.addEventListener('click', () => { view.setEnhanced(!view.quality.enhanced); customGraphics(); }, { signal });
  for (const input of qualityInputs) input.addEventListener('change', () => { view.setQualityEffect(input.dataset.qualityEffect as QualityEffect, input.checked); customGraphics(); }, { signal });
  syncQuality();
  let previous = performance.now(), raf = 0, lastStatus = -1, selected: number | null = null;
  const keys = new Set<string>();
  let pointer: Point | null = null;
  const followButton = element<HTMLButtonElement>('follow');
  function syncFollow(): void { followButton.textContent = `跟随英雄：${view.following ? '开' : '关'}`; }
  function focusScene(): void {
    const target = artView(), gameplay = scenario.value === 'match'; view.following = false;
    const frameWidth = scenario.value === 'ice' ? 680 : (scenario.value === 'overview' || scenario.value === 'layout') ? 6200 : scenario.value === 'central' || scenario.value === 'combat' ? 1770 : scenario.value === 'sanctuary' ? 1300 : 900;
    view.cameraRig.setZoom(gameplay ? GAMEPLAY_VIEW.zoom : Math.min(target.zoom, 270 * view.cameraRig.size.width / view.cameraRig.size.height / frameWidth));
    view.cameraRig.lookAt(gameplay ? host.match.hero(localTeam()) : bridgePoint(target.u, target.v)); syncFollow();
    const reference = element<HTMLAnchorElement>('art-reference');
    const sources: Record<string, string> = { '01-overview.png': overviewReference, '02-sanctuary.png': sanctuaryReference, '03-outer-tower.png': towerReference, '04-central-bridge.png': centralReference };
    reference.href = sources[target.source];
  }
  if (view.paintedArt) {
    focusScene();
  }
  function targetAim(point: Point): Point | null {
    const actor = host.match.entity(view.pickActor(point));
    return actor && actor.hp > 0 ? { x: actor.x, y: actor.y } : view.ground(point);
  }
  function cast(ability: AbilityKey): void {
    setAttackSelecting(false);
    const aim = pointer ? targetAim(pointer) : null;
    if (!aim) { element('selection').textContent = '先将鼠标移到地面或目标，再施放技能。'; return; }
    const targeted = ability === 'e' ? host.match.dashTarget(aim, localTeam()) : ability === 'r' ? host.match.rTarget(localTeam()) : undefined;
    if (targeted && !view.canSeeEntity(targeted)) { element('selection').textContent = '目标不在我方视野内。'; return; }
    const accepted = host.command({ kind: 'cast', ability, point: aim });
    element('selection').textContent = `${ability.toUpperCase()}：${accepted ? '已释放' : '检查冷却、目标、击飞或当前动作'}。`;
  }
  const castSummoner = (key: 'd' | 'f') => {
    casting.cancel();
    if (!pointer) return;
    const point = targetAim(pointer);
    if (point) host.command({ kind: 'summoner', key, point, targetId: view.pickActor(pointer) });
  };
  const casting = new SkillCasting(cast, key => {
    view.aimKey = key;
    viewport.dataset.skillSelecting = String(!!key);
    for (const ability of ['q','w','e','r']) document.getElementById(`ability-${ability}`)?.classList.toggle('cast-selected', ability === key);
    if (key) { cancelDrag(); setAttackSelecting(false); }
  });
  const hud = mountThreeHud({use:slot=>{host.command({kind:'use-item',slot,point:view.aim??host.match.hero(localTeam())});},buy:id=>{host.command({kind:'buy',itemId:id});},sell:slot=>{host.command({kind:'sell',slot});}, cast: key => { if (host.match.phase === 'playing') casting.select(key); },upgrade:key=>{host.command({kind:'upgrade',ability:key});}, summoner: castSummoner, canSee: entity => view.canSeeEntity(entity),
    stop: () => { casting.cancel(); setAttackSelecting(false); host.command({ kind: 'stop' }); }, flute: () => { casting.cancel(); host.command({ kind: 'flute' }); },
    resume: () => { if (host.match.phase === 'ended') restart(); else if (host.match.phase === 'paused') host.pause(); },
  }, signal);
  mountCastSettings(casting);
  view.onFrame = frame => {
    updateHeroStatusHud(frame.match,frame.match.hero(localTeam()));
    const { match } = frame;
    const selectedEntity = match.entity(selected);
    if (selectedEntity && !view.canSeeEntity(selectedEntity)) { selected = null; view.selectedId = null; element('target-readout').hidden = true; }
    const attackTarget = match.entity(match.hero(localTeam()).targetId);
    if (attackTarget && !view.canSeeEntity(attackTarget)) host.command({ kind: 'stop' });
    if (match.phase !== 'playing' || match.hero(localTeam()).hp <= 0) { setAttackSelecting(false); casting.cancel(); }
    audio.update(view.perceivedFrame(frame), view.cameraRig.focus, view.cameraRig.camera.right - view.cameraRig.camera.left, !document.hidden);
    if (performance.now() - lastStatus < 200) return; lastStatus = performance.now();
    hud.update(match, selected, localTeam());
    if (network) { document.getElementById('match-overlay')!.hidden = true; element<HTMLButtonElement>('pause').hidden = true; }
    const h = match.hero(localTeam()), target = match.entity(selected);
    const cooldowns = (['q', 'w', 'e', 'r'] as const).map(key => `${key.toUpperCase()} ${Math.max(0, h.abilities[key] - match.time).toFixed(1)}`).join(' / ');
    element('combat-hud').textContent = `生命 ${Math.ceil(h.hp)} / ${h.maxHp} · 剑意 ${Math.floor(h.flow ?? 0)} / 100 · ${cooldowns} · D 闪现 ${Math.ceil(Math.max(0, match.summonerCooldowns[localTeam()].d - match.time))} · F 点燃 ${Math.ceil(Math.max(0, match.summonerCooldowns[localTeam()].f - match.time))} · 补刀 ${match.cs[localTeam()]}`;
    status.textContent = `${view.presentation === 'art' ? (view.paintedArt ? artView().label : '旧 3D 样板') : 'P1 灰盒'} · ${match.phase} · ${match.time.toFixed(2)}s · HP ${Math.round(h.hp)}/${h.maxHp} · 缩放 ${view.cameraRig.zoom} · ${view.cameraRig.elevation}° · 内部 ${view.renderer.domElement.width}×${view.renderer.domElement.height} · 调用 ${view.renderer.info.render.calls} · 目标 ${target ? `${target.id} HP ${Math.round(target.hp)}` : '无'} · 冷却 ${cooldowns}${view.presentation === 'gray' ? ` · Q 范围 ${ABILITIES.q.range}` : ''}${view.environment.textureErrors.length || view.central.errors.length || view.painted.errors.length || view.landmarks.errors.length || view.details.errors.length || view.smallDetails.errors.length || view.architecturalIce.errors.length || view.poros.errors.length || view.sprites.errors.length ? ' · 部分素材加载失败，请检查本地服务' : ''}`;
    if (view.combat.sprites.errors.length || audio.combat.failed || audio.music.failed || audio.environment.failed) status.textContent += ' · 部分特效或音频加载失败，请刷新重试';
  };
  const listen = <K extends keyof HTMLElementEventMap>(node: HTMLElement, type: K, fn: (event: HTMLElementEventMap[K]) => void) => node.addEventListener(type, fn, { signal });
  const mapDrag = new MapDrag();
  function setAttackSelecting(enabled: boolean): void {
    view.attackSelecting = enabled;
    viewport.dataset.attackSelecting = String(enabled);
  }
  let capturedPointer: number | null = null;
  const cancelDrag = () => {
    mapDrag.cancel(); delete viewport.dataset.dragging;
    const id = capturedPointer; capturedPointer = null;
    if (id !== null && viewport.hasPointerCapture(id)) viewport.releasePointerCapture(id);
  };
  const panDrag = (delta: Point | null) => {
    if (!delta) return; view.pan(delta.x, delta.y); viewport.dataset.dragging = 'true'; syncFollow();
  };
  listen(viewport, 'contextmenu', event => event.preventDefault());
  listen(viewport, 'pointermove', event => {
    pointer = { x: event.clientX, y: event.clientY };
    if (mapDrag.active && !(event.buttons & 1)) cancelDrag();
    panDrag(mapDrag.move(event.pointerId, pointer)); view.aim = targetAim(pointer);
    const overShop=!mapDrag.dragging&&!casting.active&&!view.attackSelecting&&view.pickActor(pointer)===null&&view.pickShop(pointer);
    view.sanctuaryShop.hovered=overShop;viewport.dataset.shopHover=String(overShop);
  });
  listen(viewport, 'pointerdown', event => {
    viewport.focus(); pointer = { x: event.clientX, y: event.clientY };
    const id = view.pickActor(pointer), entity = host.match.entity(id);
    if (event.button === 0 && event.isPrimary) {
      if (casting.active) { event.preventDefault(); cancelDrag(); casting.confirm(); return; }
      if (view.attackSelecting && host.match.phase === 'playing') {
        event.preventDefault(); cancelDrag(); setAttackSelecting(false);
        if (entity && entity.team !== localTeam() && entity.hp > 0) {
          if (host.command({ kind: 'attack', id: entity.id })) view.combat.showMove(entity, host.match.time, true);
          selected = entity.id; view.selectedId = entity.id;
        } else {
          const point = view.ground(pointer);
          if (point && host.command({ kind: 'attack-move', point })) view.combat.showMove(point, host.match.time, true);
          selected = null; view.selectedId = null;
        }
        return;
      }
      event.preventDefault(); cancelDrag(); mapDrag.begin(event.pointerId, pointer, id);
      capturedPointer = event.pointerId; viewport.setPointerCapture(event.pointerId);
    }
    if (event.button === 2 && !mapDrag.active) {
      if (casting.cancel()) { event.preventDefault(); return; }
      setAttackSelecting(false);
      if (entity && entity.team !== localTeam() && entity.hp > 0) { if (host.command({ kind: 'attack', id: entity.id })) view.combat.showMove(entity, host.match.time, true); }
      else { const point = view.ground(pointer); if (point && host.command({ kind: 'move', point })) view.combat.showMove(point, host.match.time); }
    }
  });
  listen(viewport, 'pointerup', event => {
    if (event.button !== 0) return;
    const result = mapDrag.end(event.pointerId, { x: event.clientX, y: event.clientY });
    if (result) { panDrag(result.pan); if (result.click) {
      if(result.target===null&&view.pickShop({x:event.clientX,y:event.clientY}))document.dispatchEvent(new Event('midline:shop-request'));
      else {selected = result.target; view.selectedId = result.target;}
    } }
    delete viewport.dataset.dragging;
    capturedPointer = null;
    if (viewport.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId);
  });
  listen(viewport, 'pointercancel', cancelDrag); listen(viewport, 'lostpointercapture', cancelDrag);
  viewport.addEventListener('wheel', event => {
    event.preventDefault(); const levels = [.13, .25, .4, .5, .6, 1, 1.5];
    const current = view.cameraRig.zoom;
    const next = event.deltaY < 0 ? levels.find(level => level > current + .001) ?? levels[levels.length - 1] : [...levels].reverse().find(level => level < current - .001) ?? levels[0];
    view.cameraRig.setZoom(next);
  }, { signal, passive: false });
  document.addEventListener('midline:settings-open',()=>{casting.cancel();keys.clear();cancelDrag();setAttackSelecting(false);},{signal});
  document.addEventListener('midline:shop-open',()=>{casting.cancel();keys.clear();cancelDrag();setAttackSelecting(false);},{signal});
  window.addEventListener('keydown', event => {
    if (!assetsReady) return;
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement || event.target instanceof HTMLTextAreaElement) return;
    if(event.ctrlKey&&['q','w','e','r'].includes(event.key.toLowerCase())&&!event.metaKey&&!event.altKey){
      event.preventDefault();if(!event.repeat)host.command({kind:'upgrade',ability:event.key.toLowerCase() as AbilityKey});return;
    }
    if (event.metaKey || event.altKey) return;
    const key = event.key.toLowerCase();
    if (['a', 'escape', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) event.preventDefault();
    keys.add(key); if (event.repeat) return;
    if (key === 'escape' && casting.cancel()) return;
    if (key === 'escape' && view.attackSelecting) { setAttackSelecting(false); return; }
    if (key === 'a' && host.match.phase === 'playing' && host.match.hero(localTeam()).hp > 0) { casting.cancel(); cancelDrag(); setAttackSelecting(true); }
    if (['q', 'w', 'e', 'r'].includes(key) && host.match.phase === 'playing' && host.match.hero(localTeam()).hp > 0) { event.preventDefault(); casting.keyDown(key as AbilityKey); }
    if (key === 'd' || key === 'f') castSummoner(key);
    if (key === '3') { event.preventDefault(); host.command({ kind: 'flute' }); }
    const emote=emoteShortcut(event);
    if(emote){event.preventDefault();audio.combat.unlock();host.command({kind:'emote',action:emote});}
    if (key === 's') { casting.cancel(); setAttackSelecting(false); host.command({ kind: 'stop' }); }
    if (key === 'y') { view.following = !view.following; syncFollow(); }
  }, { signal });
  window.addEventListener('keyup', event => {
    const key = event.key.toLowerCase(); keys.delete(key);
    if (['q','w','e','r'].includes(key)) {
      if (host.match.phase !== 'playing' || host.match.hero(localTeam()).hp <= 0 || event.target instanceof HTMLElement && event.target.closest('input,select,textarea')) casting.cancel();
      else casting.keyUp(key as AbilityKey);
    }
  }, { signal });
  const pauseHidden = () => { casting.cancel(); keys.clear(); cancelDrag(); setAttackSelecting(false); if (!network && host.match.phase === 'playing') host.pause(); audio.stop(); previous = performance.now(); };
  window.addEventListener('blur', pauseHidden, { signal });
  document.addEventListener('visibilitychange', () => { if (document.hidden) pauseHidden(); previous = performance.now(); }, { signal });
  if (network) { element<HTMLButtonElement>('pause').hidden = true; element('restart').textContent = '准备再来一局'; }
  listen(element('pause'), 'click', () => host.pause());
  const restart = () => {
    casting.cancel();
    if (network) { network.ready(); return; }
    cancelDrag();
    setAttackSelecting(false);
    audio.stop(); syncEnvironment(); host.restart(); selected = null; view.selectedId = null;
    view.following = false;
    if (view.paintedArt) focusScene();
    previous = performance.now(); syncFollow();
  };
  listen(element('restart'), 'click', restart); listen(scenario, 'change', restart);
  listen(followButton, 'click', () => { view.following = !view.following; syncFollow(); });
  const look = (point: Point) => { view.following = false; view.cameraRig.lookAt(point); syncFollow(); };
  listen(element('sample'), 'click', () => { if (view.paintedArt) focusScene(); else look(bridgePoint(CENTRAL_BRIDGE.focusU, 0)); });
  listen(element('middle'), 'click', () => look(bridgePoint(0, 0)));
  const elevation = element<HTMLSelectElement>('elevation'), texture = element<HTMLSelectElement>('texture');
  if (view.presentation === 'art') {
    view.cameraRig.setElevation(CENTRAL_BRIDGE.cameraElevation); elevation.value = String(CENTRAL_BRIDGE.cameraElevation);
  }
  listen(elevation, 'change', () => view.cameraRig.setElevation(Number(elevation.value)));
  listen(texture, 'change', () => view.setTexture(Number(texture.value) as 32 | 64));
  listen(lookSelect, 'change', () => {
    view.presentation = lookSelect.value === 'gray' ? 'gray' : 'art';
    view.paintedArt = lookSelect.value === 'art';
    syncEnvironment();
    texture.disabled = view.presentation === 'art';
    elevation.disabled = view.paintedArt;
    if (view.presentation === 'art') { view.cameraRig.setElevation(CENTRAL_BRIDGE.cameraElevation); elevation.value = String(CENTRAL_BRIDGE.cameraElevation); }
    view.cameraRig.setZoom(view.paintedArt ? PAINTED_MAP.zoom : .6);
    if (view.paintedArt) focusScene();
  });
  texture.disabled = view.presentation === 'art';
  elevation.disabled = view.paintedArt;
  function frame(now: number): void {
    const elapsed = Math.max(0, now - previous) / 1000;
    const dt = Math.min(elapsed, 0.25); previous = now;
    if (!assetsReady) { raf = requestAnimationFrame(frame); return; }
    const lowerTier = graphics.sample(elapsed, !document.hidden && host.match.phase === 'playing');
    if (lowerTier) { view.setGraphicsProfile(lowerTier); syncQuality(); persistGraphics(); }
    const dx = Number(keys.has('arrowright')) - Number(keys.has('arrowleft'));
    const dy = Number(keys.has('arrowdown')) - Number(keys.has('arrowup'));
    if (dx || dy) { view.pan(dx * 280 * dt, dy * 280 * dt); syncFollow(); }
    view.recenterHeld = keys.has(' ');
    // Refresh ground aim after any camera motion; the pointer's client position is unchanged.
    if (pointer) view.aim = targetAim(pointer);
    host.update(dt); raf = requestAnimationFrame(frame);
  }
  if (network) {
    mountLobby(network, signal);
    network.onRound = () => { casting.cancel(); audio.stop(); selected = null; view.selectedId = null; focusScene(); view.following = true; syncFollow(); };
  }
  raf = requestAnimationFrame(frame);
  assets.track('血条界面', view.healthBars.preload());
  assets.track('界面图标', Promise.all([...document.images].filter(image => !!image.src).map(image => image.decode())));
  assets.track('装备图标',preloadEquipmentIcons());
  assets.track('战斗音频', audio.combat.preload());
  assets.track('环境音频', audio.environment.preload(audio.combat.audioContext!));
  assets.track('背景音乐', audio.music.preload());
  assets.seal();
  const loadingTimeout = setTimeout(() => { assets.dispose(); loading.fail(new Error('资源加载超时，请检查连接后刷新重试。')); }, 120_000);
  void assets.ready.then(async () => {
    loading.phase('资源已加载，正在准备图形与角色…');
    await view.prepareAssets(host.match);
    if (signal.aborted) return;
    assetsReady = true; network?.setAssetsReady(); previous = performance.now(); loading.complete(); clearTimeout(loadingTimeout);
  }).catch(cause => { clearTimeout(loadingTimeout); if (!signal.aborted) loading.fail(cause); });
  let disposed = false;
  const dispose = (preserveRoom = false) => { if (disposed) return; disposed = true; if (!preserveRoom) network?.leave(); clearTimeout(loadingTimeout); assets.dispose(); loading.dispose(); cancelAnimationFrame(raf); cancelDrag(); abort.abort(); audio.dispose(); host.dispose(); };
  window.addEventListener('pagehide', () => dispose(true), { once: true, signal });
  if (import.meta.hot) import.meta.hot.dispose(dispose);
  return dispose;
}
