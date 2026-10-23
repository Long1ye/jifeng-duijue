import stablePage from '../../index.html?raw';
import { mountLeagueHud } from './LeagueHud';
import type { Match } from '../game/Match';
import type { AbilityKey, Entity, Team } from '../game/types';
import type { SummonerKey } from '../game/SummonerSpells';
import { shieldRemaining } from '../game/YasuoPassive';
import {itemShieldRemaining} from '../game/EquipmentEffects';
import { stormReady } from '../game/YasuoStorm';
import {updateChampionHud} from './ChampionHud';
import {updateTargetHud} from './TargetHud';

const clock = (time: number) => `${Math.floor(time / 60).toString().padStart(2, '0')}:${Math.floor(time % 60).toString().padStart(2, '0')}`;

/** Reuse the stable entry's markup, icons and styles with the current simulation. */
export function mountThreeHud(actions: {
  cast: (key: AbilityKey) => void;
  upgrade: (key:AbilityKey)=>void;
  buy:(id:number)=>void;
  sell:(slot:number)=>void;
  use:(slot:number)=>void;
  summoner: (key: SummonerKey) => void;
  stop: () => void;
  flute: () => void;
  resume: () => void;
  canSee?: (entity: Entity) => boolean;
}, signal: AbortSignal): { update: (match: Match, selected: number | null, team?: Team) => void } {
  const shell = document.querySelector<HTMLElement>('main.match-shell')!;
  const viewport = document.querySelector<HTMLElement>('#viewport')!;
  const template = new DOMParser().parseFromString(stablePage, 'text/html');
  shell.classList.add('match-shell');
  viewport.classList.add('arena');
  document.body.classList.add('three-ui');
  for (const selector of ['.scoreboard', '.player-hud', '.target-readout', '.match-overlay']) {
    const node = template.querySelector<HTMLElement>(selector)!;
    node.querySelector('.match-actions')?.remove();
    shell.append(document.importNode(node, true));
  }
  document.querySelector('nav')!.classList.add('match-actions');
  const controls = document.querySelector('#status')!.nextElementSibling!;
  controls.classList.add('controls-strip');
  mountLeagueHud(false, { ...actions, focusTarget: viewport,signal });
  const diagnostics = document.querySelector('.settings-internal')!;
  document.getElementById('graphics-settings')!.append(document.querySelector('#quality-options .quality-controls')!);
  for (const selector of ['header', '.notice', '#quality-options', '#combat-hud', '#status', '#selection']) {
    diagnostics.append(shell.querySelector(selector)!);
  }
  const node = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
  node('hero-animation-state').hidden = true;
  node('match-overlay').hidden = true;
  for (const key of ['q', 'w', 'e', 'r'] as const) {
    node(`ability-${key}`).addEventListener('click', () => { actions.cast(key); viewport.focus({ preventScroll: true }); }, { signal });
  }
  node('start-button').addEventListener('click', () => { actions.resume(); viewport.focus({ preventScroll: true }); }, { signal });

  return { update(match, selected, team = 'blue') {
    const hero = match.hero(team), shield = shieldRemaining(hero, match.time)+itemShieldRemaining(hero,match.time), flow = hero.flow ?? 0;
    updateChampionHud(match,hero);
    node<HTMLProgressElement>('hero-health').max = hero.maxHp;
    node<HTMLProgressElement>('hero-health').value = hero.hp;
    node<HTMLProgressElement>('hero-flow').value = flow;
    node('health-text').textContent = `${Math.ceil(hero.hp)} / ${Math.ceil(hero.maxHp)}${shield > 0 ? ` +${Math.ceil(shield)}盾` : ''}`;
    node('flow-text').textContent = `${Math.floor(flow)} / 100`;
    node('hero-flow').classList.toggle('flow-ready', flow >= 100);
    const passive = document.querySelector('.passive-slot')!;
    passive.classList.toggle('passive-ready', flow >= 100); passive.classList.toggle('passive-shielded', shield > 0);
    node('match-time').textContent = clock(match.time);
    node('blue-kills').textContent = String(match.deaths.red); node('red-kills').textContent = String(match.deaths.blue);
    node('player-kda').textContent = `${match.kills[team]}/${match.deaths[team]}/0`; node('player-cs').textContent = String(match.cs[team]);
    for (const key of ['q', 'w', 'e', 'r'] as const) {
      const remaining = Math.max(0, hero.abilities[key] - match.time);
      node(`ability-${key}`).classList.toggle('cooling', remaining > 0);
      node(`cooldown-${key}`).textContent = remaining > 0 ? (remaining < 10 ? remaining.toFixed(1) : String(Math.ceil(remaining))) : '';
    }
    node('ability-q').querySelector('.ability-name')!.textContent = stormReady(hero, match.time) ? 'Q3 · 旋风' : '斩钢闪';
    const rTarget = match.rTarget(team);
    node('ability-r').classList.toggle('followup-ready', !!rTarget && (actions.canSee?.(rTarget) ?? true));
    for (const key of ['d', 'f'] as const) {
      const remaining = Math.max(0, match.summonerCooldowns[team][key] - match.time);
      node(`summoner-${key}`).classList.toggle('cooling', remaining > 0);
      node(`summoner-cooldown-${key}`).textContent = remaining > 0 ? String(Math.ceil(remaining)) : '';
    }
    const target = match.entity(selected);
    updateTargetHud(match,target,team);
    node('match-overlay').hidden = match.phase === 'playing';
    const ended = match.phase === 'ended', won = match.result?.winner === team;
    node('overlay-kicker').textContent = ended ? (won ? 'VICTORY' : 'MATCH COMPLETE') : 'TAKE A BREATH';
    node('overlay-symbol').textContent = ended ? '✦' : 'Ⅱ';
    node('overlay-title').textContent = ended ? (won ? '这条中路，属于你。' : '对局结束') : '稍作休息';
    node('overlay-description').textContent = ended ? `对局用时 ${clock(match.time)} · 补刀 ${match.cs[team]} : ${match.cs[team === 'blue' ? 'red' : 'blue']}` : '比赛时间、兵线和技能冷却已暂停。';
    node('start-button').textContent = ended ? '再来一局 ↻' : '继续对线 →';
    node('pause').textContent = match.phase === 'paused' ? '继续 · Esc' : '暂停 · Esc';
    node<HTMLButtonElement>('pause').disabled = ended;
  } };
}
