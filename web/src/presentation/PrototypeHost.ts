import type { Match } from '../game/Match';
import { WORLD } from '../game/config';
import type { AbilityKey, GameEvent, Point, Team } from '../game/types';
import { RenderPositions } from '../render/RenderPositions';

export type PrototypeCommand = { kind: 'move'; point: Point } | { kind: 'attack'; id: number } | { kind: 'attack-move'; point: Point }
  | { kind: 'cast'; ability: AbilityKey; point: Point } | {kind:'upgrade';ability:AbilityKey} | {kind:'buy';itemId:number} | {kind:'sell';slot:number} | {kind:'use-item';slot:number;point:Point} | { kind: 'stop' }
  | { kind: 'summoner'; key: 'd' | 'f'; point: Point; targetId: number | null } | { kind: 'flute' } | {kind:'emote';action:import('../game/YasuoEmote').YasuoEmote};
export interface PrototypeFrame { match: Match; alpha: number; positions: RenderPositions; events: readonly GameEvent[]; localTeam?: Team }
export interface PrototypeView { frame(value: PrototypeFrame): void; dispose(): void }

/** One simulation clock and one event drain. Views never run a second simulation. */
export class PrototypeHost {
  match: Match;
  private accumulator = 0;
  private readonly positions = new RenderPositions();
  private disposed = false;
  constructor(private readonly createMatch: () => Match, private readonly view: PrototypeView) {
    this.match = createMatch(); this.match.start();
  }
  command(command: PrototypeCommand): boolean {
    if (this.disposed || this.match.phase !== 'playing') return false;
    switch (command.kind) {
      case 'move': this.match.orderMove('blue', command.point); return true;
      case 'attack': this.match.orderAttack('blue', command.id); return true;
      case 'attack-move': this.match.orderAttackMove('blue', command.point); return true;
      case 'cast': return this.match.cast('blue', command.ability, command.point);
      case 'upgrade': return this.match.upgradeSkill('blue',command.ability);
      case 'buy': return this.match.buyItem('blue',command.itemId);
      case 'sell': return this.match.sellItem('blue',command.slot);
      case 'use-item': return this.match.useItem('blue',command.slot,command.point);
      case 'stop': this.match.stop('blue'); return true;
      case 'summoner': return this.match.castSummoner('blue', command.key, command.point, command.targetId);
      case 'emote': return this.match.startEmote(command.action,'blue');
      case 'flute': return this.match.startFlute('blue');
    }
  }
  update(seconds: number): void {
    if (this.disposed) return;
    if (!Number.isFinite(seconds) || seconds < 0) throw new RangeError('Invalid elapsed time');
    if (this.match.phase === 'playing') {
      this.accumulator += Math.min(seconds, 0.25);
      while (this.accumulator + 1e-12 >= WORLD.step) {
        this.positions.capture(this.match.entities);
        this.match.step(WORLD.step); this.accumulator = Math.max(0, this.accumulator - WORLD.step);
        if (this.match.phase !== 'playing') { this.accumulator = 0; break; }
      }
    } else this.accumulator = 0;
    this.view.frame({ match: this.match, alpha: this.match.phase === 'playing' ? this.accumulator / WORLD.step : 1,
      positions: this.positions, events: this.match.drainEvents() });
  }
  pause(): void { if (!this.disposed) { this.match.togglePause(); this.accumulator = 0; } }
  restart(): void {
    if (this.disposed) return;
    this.match = this.createMatch(); this.match.start(); this.accumulator = 0; this.positions.reset();
  }
  dispose(): void { if (this.disposed) return; this.disposed = true; this.view.dispose(); }
}
