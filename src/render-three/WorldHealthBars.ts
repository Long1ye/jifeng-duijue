import type { Entity } from '../game/types';
import {itemShieldRemaining} from '../game/EquipmentEffects';
import {shieldRemaining} from '../game/YasuoPassive';
import type { PrototypeFrame } from '../presentation/PrototypeHost';
import type { ThreeCamera } from './Coordinates';
import { HERO_VISUAL_SCALE } from '../render/Presentation';
import { airborneLift } from '../render/SkillPresentation';
import { HealthBarTrail } from '../render/HealthBarTrail';
import { LANDMARK_SPECS, PAINTED_TOWER_SCALE } from './PaintedMapLandmarks';
import heroFrameUrl from '../../assets/ui/riot-healthbars-2026-10-15/runtime/hero-frame.png?url';
import towerFrameUrl from '../../assets/ui/riot-healthbars-2026-10-15/runtime/tower-frame.png?url';

interface BarView { canvas: HTMLCanvasElement; context: CanvasRenderingContext2D; offset: number; separated: boolean; signature: string }

/** Rasterize thin UI once in CSS pixels, outside the rescaled world framebuffer.
 * Movement uses the same interpolated anchor as the actor, without pixel snaps. */
export class WorldHealthBars {
  readonly element = document.createElement('div');
  private readonly bars = new Map<number, BarView>();
  private readonly trail = new HealthBarTrail();
  private readonly heroFrame = new Image();
  private readonly towerFrame = new Image();
  private match: PrototypeFrame['match'] | null = null;
  private previous = performance.now();

  constructor(container: HTMLElement) {
    this.element.className = 'world-health-bars';
    this.element.setAttribute('aria-hidden', 'true');
    this.element.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:2';
    this.heroFrame.src = heroFrameUrl; this.towerFrame.src = towerFrameUrl;
    container.append(this.element);
  }

  preload(): Promise<void> { return Promise.all([this.heroFrame.decode(), this.towerFrame.decode()]).then(() => {}); }

  update(frame: PrototypeFrame, camera: ThreeCamera, visible: boolean, painted: boolean, canSee: (entity: Entity) => boolean = () => true, towerCrownLift = 0): void {
    this.element.hidden = !visible;
    if (this.match !== frame.match) { this.reset(); this.match = frame.match; }
    const now = performance.now(), dt = Math.min(.1, (now - this.previous) / 1000); this.previous = now;
    const { match, positions, alpha } = frame;
    const entities = match.entities.filter(e => e.hp > 0 && canSee(e) && (e.kind === 'hero' || e.kind === 'tower'));
    const alive = new Set(entities.map(e => e.id)); this.trail.retain(alive);
    const player = positions.sample(match.hero(frame.localTeam ?? 'blue'), alpha), playerScreen = camera.project(player);
    const pixelsPerUnit = camera.size.height / (camera.camera.top - camera.camera.bottom);
    for (const entity of entities) {
      let bar = this.bars.get(entity.id);
      const tower = entity.kind === 'tower', width = tower ? 86 : 64, height = tower ? 11 : 15;
      if (!bar) {
        const canvas = document.createElement('canvas'); canvas.className = 'world-health-bar';
        canvas.dataset.entityId = String(entity.id); canvas.dataset.kind = entity.kind;
        canvas.style.cssText = `position:absolute;left:0;top:0;width:${width + 4}px;height:${height}px;will-change:transform;image-rendering:auto;pointer-events:none`;
        const ratio = window.devicePixelRatio || 1;
        canvas.width = Math.round((width + 4) * ratio); canvas.height = Math.round(height * ratio);
        const context = canvas.getContext('2d')!;
        context.scale(canvas.width / (width + 4), canvas.height / height); context.imageSmoothingEnabled = false;
        bar = { canvas, context, offset: 0, separated: false, signature: '' }; this.bars.set(entity.id, bar); this.element.append(canvas);
      }
      const point = positions.sample(entity, alpha), screen = camera.project(point);
      const proximity = tower && entity.team !== (frame.localTeam ?? 'blue')
        ? Math.max(0, Math.min(1, (entity.range + player.radius + 85 - Math.hypot(player.x - entity.x, player.y - entity.y)) / 65)) : 1;
      bar.canvas.hidden = !visible || proximity === 0;
      bar.canvas.style.opacity = String(proximity);
      if (!tower && entity.team !== (frame.localTeam ?? 'blue')) {
        // Hysteresis prevents repeated switching when movement crosses the boundary.
        const dx = Math.abs(screen.x - playerScreen.x), dy = Math.abs(screen.y - playerScreen.y);
        bar.separated = bar.separated ? dx < 90 && dy < 26 : dx < 74 && dy < 18;
      }
      const desired = bar.separated ? 18 : 0;
      bar.offset += (desired - bar.offset) * (1 - Math.exp(-14 * dt));
      const offset = tower ? (painted ? LANDMARK_SPECS.tower.anchor[1] * LANDMARK_SPECS.tower.scale * PAINTED_TOWER_SCALE + 12 + towerCrownLift * Math.SQRT1_2 : 120) : 33 * HERO_VISUAL_SCALE;
      const anchor = camera.project(point, airborneLift(entity, match.time));
      bar.canvas.style.transform = `translate3d(${screen.x - (width + 4) / 2}px,${anchor.y - offset * pixelsPerUnit - bar.offset - 2}px,0)`;
      this.draw(bar, entity, match.time, width, height, entity.team === (frame.localTeam ?? 'blue'));
    }
    for (const [id, bar] of this.bars) if (!alive.has(id)) { bar.canvas.remove(); this.bars.delete(id); }
  }

  private draw(bar: BarView, entity: Entity, time: number, width: number, height: number, friendly: boolean): void {
    const context = bar.context, tower = entity.kind === 'tower', image = tower ? this.towerFrame : this.heroFrame;
    const health = Math.max(0, Math.min(1, entity.hp / entity.maxHp)), lag = this.trail.sample(entity.id, entity.hp, entity.maxHp, time);
    const shield=shieldRemaining(entity,time)+itemShieldRemaining(entity,time);
    const signature = [entity.hp, entity.maxHp, entity.flow,Math.ceil(shield), Math.ceil(width * lag), image.complete && image.naturalWidth].join(':');
    if (bar.signature === signature) return;
    bar.signature = signature;
    context.clearRect(0, 0, width + 4, height);
    if (image.complete && image.naturalWidth) context.drawImage(image, 0, 0, width + 4, height);
    const colors = !friendly ? ['#cf4b4d', '#ff9b8a', '#8c3039'] : tower ? ['#388edb', '#8ddcff', '#20528c'] : ['#67be4c', '#a5dd72', '#367238'];
    context.fillStyle = '#09141a'; context.fillRect(2, 2, width, 7);
    if (lag > health) { context.fillStyle = '#f0c48c'; context.fillRect(2, 2, Math.ceil(width * lag), 7); }
    const amount = Math.round(width * health);
    context.fillStyle = colors[0]; context.fillRect(2, 2, amount, 7);
    context.fillStyle = colors[1]; context.fillRect(2, 2, amount, 1);
    context.fillStyle = colors[2]; context.fillRect(2, 8, amount, 1);
    if(shield>0){const shieldWidth=Math.max(1,Math.min(width*.5,width*shield/entity.maxHp)),left=2+Math.min(width-shieldWidth,amount);context.fillStyle='#c2dce7';context.fillRect(left,2,shieldWidth,7);context.fillStyle='#edf9ff';context.fillRect(left,2,shieldWidth,1);}
    context.fillStyle = '#081115';
    if(tower&&entity.towerHasPlates){
      for(const ratio of [.3,.55,.75,.9])context.fillRect(2+Math.round(width*ratio),2,1,7);
    }else for (let hp = tower ? 250 : 100; hp < entity.maxHp; hp += tower ? 250 : 100) context.fillRect(2 + Math.round(width * hp / entity.maxHp), 2, 1, 7);
    if (!tower) {
      const flow = Math.max(0, Math.min(1, (entity.flow ?? 0) / 100));
      context.fillStyle = '#07121b'; context.fillRect(2, 11, width, 2);
      context.fillStyle = flow >= 1 ? '#f3f8fa' : '#7c8c98'; context.fillRect(2, 11, Math.round(width * flow), 2);
      context.fillStyle = flow >= 1 ? '#ffffff' : '#b6c6cd'; context.fillRect(2, 11, Math.round(width * flow), 1);
    }
  }

  reset(): void { this.element.replaceChildren(); this.bars.clear(); this.trail.reset(); }
  dispose(): void { this.reset(); this.element.remove(); }
}
