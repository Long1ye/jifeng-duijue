import type { PrototypeFrame } from '../presentation/PrototypeHost';
import type { ThreeCamera } from './Coordinates';
import { dashTargetTimer } from '../render/DashTargetTimerState';
import { airborneLift } from '../render/SkillPresentation';
import type { Entity } from '../game/types';

interface TimerView { canvas: HTMLCanvasElement; context: CanvasRenderingContext2D; size: string }

/** E's per-target lockout, rasterized above bodies and anchored to their feet. */
export class TargetCooldownRings {
  readonly element = document.createElement('div');
  private readonly timers = new Map<number, TimerView>();
  private match: PrototypeFrame['match'] | null = null;
  constructor(container: HTMLElement) {
    this.element.className = 'target-cooldown-rings'; this.element.setAttribute('aria-hidden', 'true');
    this.element.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:2';
    container.append(this.element);
  }
  update(frame: PrototypeFrame, camera: ThreeCamera, visible: boolean, canSee: (entity: Entity) => boolean = () => true): void {
    if (this.match !== frame.match) { this.reset(); this.match = frame.match; }
    this.element.hidden = !visible;
    const active = new Set<number>(), scale = camera.size.height / (camera.camera.top - camera.camera.bottom);
    for (const entity of frame.match.entities) {
      if (!canSee(entity)) continue;
      const point = frame.positions.sample(entity, frame.alpha);
      const state = dashTargetTimer(point, frame.match.targetLocks(frame.localTeam ?? 'blue').get(entity.id) ?? 0, frame.match.time);
      if (!state) continue;
      active.add(entity.id);
      let timer = this.timers.get(entity.id);
      if (!timer) {
        const canvas = document.createElement('canvas'); canvas.className = 'e-target-cooldown';
        canvas.dataset.entityId = String(entity.id); canvas.dataset.kind = entity.kind;
        canvas.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none;image-rendering:auto;will-change:transform';
        timer = { canvas, context: canvas.getContext('2d')!, size: '' }; this.timers.set(entity.id, timer); this.element.append(canvas);
      }
      const width = (state.radiusX + 5) * 2 * scale, height = (state.radiusY + 5) * 2 * scale;
      const ratio = window.devicePixelRatio || 1, size = `${width}:${height}:${ratio}`;
      if (timer.size !== size) {
        timer.canvas.width = Math.ceil(width * ratio); timer.canvas.height = Math.ceil(height * ratio);
        timer.canvas.style.width = `${width}px`; timer.canvas.style.height = `${height}px`;
        timer.context.setTransform(timer.canvas.width / width, 0, 0, timer.canvas.height / height, 0, 0); timer.size = size;
      }
      const foot = camera.project(point, airborneLift(point, frame.match.time));
      const bodyOffset = point.y - state.y - airborneLift(point, frame.match.time);
      timer.canvas.style.transform = `translate3d(${foot.x - width / 2}px,${foot.y - bodyOffset * scale - height / 2}px,0)`;
      timer.canvas.dataset.remaining = String(state.remaining);
      const context = timer.context, cx = width / 2, cy = height / 2, rx = state.radiusX * scale, ry = state.radiusY * scale;
      context.clearRect(0, 0, width, height);
      const arc = (start: number, end: number, color: string, thickness: number) => {
        context.beginPath(); context.ellipse(cx, cy, rx, ry, 0, start, end); context.strokeStyle = color; context.lineWidth = thickness * scale; context.stroke();
      };
      arc(-Math.PI / 2, Math.PI * 1.5, '#102331cc', 3.5);
      arc(-Math.PI / 2, Math.PI * 1.5, '#c0d5df55', 1);
      arc(state.start, state.end, '#a9d9ed44', 4.5);
      arc(state.start, state.end, '#f2fbff', 2);
      context.beginPath(); context.arc(cx + Math.cos(state.start) * rx, cy + Math.sin(state.start) * ry, 1.6 * scale, 0, Math.PI * 2);
      context.fillStyle = '#fff'; context.fill();
    }
    for (const [id, timer] of this.timers) if (!active.has(id)) { timer.canvas.remove(); this.timers.delete(id); }
  }
  reset(): void { this.element.replaceChildren(); this.timers.clear(); }
  dispose(): void { this.reset(); this.element.remove(); }
}
