import type { Match } from '../game/Match';
import type { GameEvent, Team } from '../game/types';
import type { PrototypeCommand } from '../presentation/PrototypeHost';
import {itemById} from '../game/ItemCatalog';

export const PROTOCOL_VERSION = 6;
export const SNAPSHOT_MS = 50;
export const RECONNECT_MS = 30_000;
export type RoomPhase = 'waiting' | 'loading' | 'countdown' | 'playing' | 'ended' | 'reconnecting';
export interface RoomInfo {
  code: string;
  phase: RoomPhase;
  players: { team: Team; connected: boolean; ready: boolean; loaded: boolean }[];
  countdown: number;
  reconnectSeconds: number;
  round: number;
}
export type MatchState = Pick<Match, 'phase' | 'time' | 'wave' | 'cs' | 'kills' | 'deaths' | 'entities'
  | 'projectiles' | 'zones' | 'windWalls' | 'summonerEffects' | 'summonerCooldowns' | 'result' | 'hitStunEnabled' | 'leagueRules'>
  & { eLocks: [number, number][]; redELocks: [number, number][] };
export interface EventBatch { id: number; time: number; events: GameEvent[] }
export type ClientMessage =
  | { type: 'create'; version: number }
  | { type: 'join'; code: string; version: number }
  | { type: 'resume'; code: string; token: string; version: number }
  | { type: 'ready' }
  | { type: 'assets-ready' }
  | { type: 'leave' }
  | { type: 'ping'; at: number }
  | { type: 'command'; seq: number; command: PrototypeCommand };
export type ServerMessage =
  | { type: 'welcome'; code: string; token: string; team: Team }
  | { type: 'state'; room: RoomInfo; state: MatchState; events: GameEvent[]; ack: Record<Team, number>; eventBatches: EventBatch[] }
  | { type: 'error'; message: string; reset?: boolean }
  | { type: 'pong'; at: number };
export type StateMessage = Extract<ServerMessage, { type: 'state' }>;

export function matchState(match: Match): MatchState {
  return {
    phase: match.phase, time: match.time, wave: match.wave, cs: match.cs, kills: match.kills, deaths: match.deaths,
    entities: match.entities, projectiles: match.projectiles, zones: match.zones, windWalls: match.windWalls,
    summonerEffects: match.summonerEffects, summonerCooldowns: match.summonerCooldowns,
    result: match.result, hitStunEnabled: match.hitStunEnabled,leagueRules:match.leagueRules,
    eLocks: [...match.eTargetLocks], redELocks: [...match.redETargetLocks],
  };
}

export function applyState(match: Match, state: MatchState): void {
  const { eLocks, redELocks, ...fields } = state;
  Object.assign(match, fields);
  match.eTargetLocks = new Map(eLocks);
  match.redETargetLocks = new Map(redELocks);
}

/** Only commands cross the trust boundary; positions, damage and team are server owned. */
export function validCommand(value: unknown): value is PrototypeCommand {
  if (!value || typeof value !== 'object') return false;
  const c = value as Record<string, unknown>;
  const point = (p: unknown): boolean => !!p && typeof p === 'object'
    && ['x', 'y'].every(k => typeof (p as Record<string, unknown>)[k] === 'number'
      && Number.isFinite((p as Record<string, number>)[k]) && Math.abs((p as Record<string, number>)[k]) <= 1e6);
  const id = (v: unknown) => Number.isSafeInteger(v) && (v as number) > 0;
  switch (c.kind) {
    case 'move': case 'attack-move': return point(c.point);
    case 'attack': return id(c.id);
    case 'cast': return ['q', 'w', 'e', 'r'].includes(c.ability as string) && point(c.point);
    case 'upgrade': return ['q','w','e','r'].includes(c.ability as string);
    case 'buy': return Number.isSafeInteger(c.itemId)&&!!itemById(c.itemId as number);
    case 'sell': return Number.isInteger(c.slot)&&(c.slot as number)>=0&&(c.slot as number)<=6;
    case 'use-item': return Number.isInteger(c.slot)&&(c.slot as number)>=0&&(c.slot as number)<=6&&point(c.point);
    case 'summoner': return ['d', 'f'].includes(c.key as string) && point(c.point) && (c.targetId === null || id(c.targetId));
    case 'stop': case 'flute': return true;
    case 'emote': return ['joke', 'taunt', 'laugh'].includes(c.action as string);
    default: return false;
  }
}

export function executeCommand(match: Match, team: Team, command: PrototypeCommand): boolean {
  if (match.phase !== 'playing') return false;
  switch (command.kind) {
    case 'move': match.orderMove(team, command.point); return true;
    case 'attack-move': match.orderAttackMove(team, command.point); return true;
    case 'attack': match.orderAttack(team, command.id); return true;
    case 'cast': return match.cast(team, command.ability, command.point);
    case 'upgrade': return match.upgradeSkill(team,command.ability);
    case 'buy': return match.buyItem(team,command.itemId);
    case 'sell': return match.sellItem(team,command.slot);
    case 'use-item': return match.useItem(team,command.slot,command.point);
    case 'summoner': return match.castSummoner(team, command.key, command.point, command.targetId);
    case 'stop': match.stop(team); return true;
    case 'flute': return match.startFlute(team);
    case 'emote': return match.startEmote(command.action, team);
  }
}
