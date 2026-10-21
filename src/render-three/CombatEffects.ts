import { AdditiveBlending, CanvasTexture, Group, LinearFilter, Mesh, MeshBasicMaterial, NearestFilter, PlaneGeometry, SRGBColorSpace, Vector3 } from 'three';
import type { Entity, GameEvent, Point } from '../game/types';
import type { PrototypeFrame } from '../presentation/PrototypeHost';
import { CombatFeel, impactDirection, impactProfile } from '../render/CombatFeel';
import { airborneLift } from '../render/SkillPresentation';
import { meowaEQPose } from '../render/MeowaEQPresentation';
import { towerBoltPose, towerImpactPose } from './TowerAttackPresentation';
import { minionBoltPose, minionImpactPose } from './MinionAttackPresentation';
import { Q_FLASH_START } from '../render/YasuoQDraw';
import { meowaQPose, meowaQHitPose } from '../render/MeowaQPresentation';
import { meowaStormPose, meowaStormHitPose } from '../render/MeowaStormPresentation';
import { YASUO_Q_CAST_SECONDS, YASUO_Q_HIT_SECONDS } from '../game/YasuoQ';
import { E } from '../game/YasuoE';
import { stormReady } from '../game/YasuoStorm';
import { windWallAxes, windWallPose } from '../render/WindWallAnimation';
import { WIND_WALL } from '../game/WindWall';
import { BASES, BALANCE } from '../game/config';
import { shieldRemaining } from '../game/YasuoPassive';
import { drawClassicReady, drawClassicShield, drawClassicFlash, drawClassicIgnite, type SpellBrush } from '../render/ClassicSpellVfx';
import { homeguardActive } from '../game/Homeguard';
import { CombatSprites } from './CombatSprites';
import { CombatInk } from './CombatInk';
import { toThree, toSimulation, WORLD_ORIGIN, type ThreeCamera } from './Coordinates';
import type { ActorSprites } from './ActorSprites';

interface Burst { event: GameEvent; at: number }
interface Echo { mesh: Mesh<PlaneGeometry, MeshBasicMaterial>; at: number; origin: Vector3; dx: number; dy: number }
interface Label { mesh: Mesh<PlaneGeometry, MeshBasicMaterial>; at: number; point: Point; height: number; duration: number }

/** Port of the approved Phaser presentation, using the same art and pure timing helpers. */
export class CombatEffects {
  canSeeEntity: (entity: Entity) => boolean = () => true;
  canSeePoint: (point: Point) => boolean = () => true;
  towerMuzzle: (entity: Entity) => Vector3 | null = () => null;
  readonly group = new Group();
  readonly feel = new CombatFeel();
  readonly sprites = new CombatSprites();
  private readonly ink = new CombatInk();
  private readonly contactInk = new CombatInk(true);
  private bursts: Burst[] = [];
  private echoes: Echo[] = [];
  private labels: Label[] = [];
  private shields = new Map<number, { startedAt: number; brokenAt?: number }>();
  private towerFlights = new Map<number, { muzzle: Vector3; progress: number }>();
  private click: { point: Point; at: number; attack: boolean } | null = null;
  private lastMatch: PrototypeFrame['match'] | null = null;
  private disposed = false;
  private glowMap: CanvasTexture | null = null;
  private glows: Mesh<PlaneGeometry, MeshBasicMaterial>[] = [];
  private glowUsed = 0;
  constructor() { this.group.name = 'combat-presentation'; this.group.add(this.sprites.group, this.ink.mesh, this.contactInk.mesh); this.contactInk.mesh.name = 'combat-foreground-contact-batch'; }
  showMove(point: Point, time: number, attack = false) { this.click = { point: { ...point }, at: time, attack }; }
  consume(frame: PrototypeFrame, actors: ActorSprites): void {
    if (frame.match !== this.lastMatch) { this.reset(); this.lastMatch = frame.match; }
    this.feel.update(frame.match.time);
    for (const event of frame.events) {
      const time = event.at ?? frame.match.time;
      if (event.type === 'cast' && event.ability === 'q') {
        const hero = frame.match.hero(event.team);
        if (hero.qCast) this.feel.beginQ(hero.id, hero.qCast.startedAt, YASUO_Q_HIT_SECONDS, hero.qCast.facing);
      }
      if (event.impact !== 'ignite') this.feel.event(event, frame.match.time);
      if (event.type === 'hit' || event.type === 'last-hit') {
        this.bursts.push({ event, at: time });
        if ((event.sourceKind === 'hero' || event.targetKind === 'hero') && (event.type === 'last-hit' || (event.amount ?? 0) > 0 || (event.absorbed ?? 0) > 0)) this.label(event, time, frame.match.entity(event.targetId ?? null));
      }
      if (event.type === 'kill' && event.targetId !== undefined && (event.targetKind === 'melee' || event.targetKind === 'ranged')) {
        const mesh = actors.snapshot(event.targetId);
        if (mesh) { const d = impactDirection(event); mesh.material.color.setHex(0xa7bdc4); this.group.add(mesh); this.echoes.push({ mesh, at: time, origin: mesh.position.clone(), dx: d.x, dy: d.y }); }
      }
    }
    this.bursts = this.bursts.slice(-32);
    while (this.echoes.length > 12) this.releaseEcho(this.echoes.shift()!);
    while (this.labels.length > 32) this.releaseLabel(this.labels.shift()!);
  }
  private label(event: GameEvent, at: number, target?: Entity) {
    const cs = event.type === 'last-hit';
    const canvas = document.createElement('canvas'); canvas.width = 192; canvas.height = 32;
    const context = canvas.getContext('2d'); if (!context) return;
    context.font = 'bold 18px Consolas, monospace'; context.textAlign = 'center'; context.textBaseline = 'middle'; context.lineWidth = 3;
    const text = cs ? '+1 CS' : event.amount === 0 ? `吸收 ${Math.round(event.absorbed ?? 0)}` : `${event.amount}${event.critical ? '!' : ''}`;
    context.strokeStyle = '#10212b'; context.strokeText(text, 96, 16);
    context.fillStyle = cs ? '#ffe0a0' : event.team === 'blue' ? '#b5eee3' : '#f0b0a3'; context.fillText(text, 96, 16);
    const map = new CanvasTexture(canvas); map.colorSpace = SRGBColorSpace; map.magFilter = map.minFilter = NearestFilter; map.generateMipmaps = false;
    const mesh = new Mesh(new PlaneGeometry(96, 16), new MeshBasicMaterial({ map, transparent: true, depthTest: false, depthWrite: false, toneMapped: false }));
    mesh.renderOrder = 110; this.group.add(mesh);
    this.labels.push({ mesh, at, point: { x: event.x, y: event.y }, height: 35 + (target ? airborneLift(target, at) : 0), duration: cs ? .85 : .55 });
  }
  update(frame: PrototypeFrame, camera: ThreeCamera, actors: ActorSprites): void {
    const { match } = frame, time = match.time;
    this.sprites.begin(); this.ink.begin(camera); this.contactInk.begin(camera);
    this.glowUsed = 0;
    const entities = match.entities.map(entity => frame.positions.sample(entity, frame.alpha)).filter(entity => this.canSeeEntity(entity));
    for (const entity of entities) {
      if (entity.hp <= 0) continue;
      if (entity.kind === 'tower') {
        const age = time - (entity.attackReleasedAt ?? -10);
        if (entity.windup > 0 || (age >= 0 && age < .14)) {
          const muzzle = this.towerMuzzle(entity) ?? toThree(entity, 110), point = toSimulation(muzzle);
          this.sprites.draw('towerEnergy', entity.team === 'blue' ? 8 : 12, point, 42, 42, camera,
            { ay: .5, height: muzzle.y, alpha: entity.windup > 0 ? .25 : (1 - age / .14) * .9 }).name = 'tower-muzzle-flash';
        }
        continue;
      }
      if (entity.kind === 'ranged') {
        const age = time - (entity.attackReleasedAt ?? -10);
        if (age >= 0 && age < .09) this.sprites.draw('minionAttack', 12,
          { x: entity.x + Math.cos(entity.facing) * 8, y: entity.y + Math.sin(entity.facing) * 8 }, 24, 24, camera,
          { ay: .5, height: 29, alpha: (1 - age / .09) * .7, color: entity.team === 'blue' ? 0x94d9ff : 0xffa2ae }).name = 'minion-caster-release';
      }
      if (entity.kind !== 'hero') continue;
      const lift = airborneLift(entity, time);
      if (entity.hp < entity.maxHp && Math.hypot(entity.x - BASES[entity.team].x, entity.y - BASES[entity.team].y) <= BALANCE.fountainRadius) {
        const phase = time * 1.5 % 1;
        this.ink.ring(entity, 12 + phase * 13, entity.team === 'blue' ? 0x9edbd1 : 0xe5adad, (1 - phase) * .45, 0, Math.PI * 2, 1, 1.2);
      }
      const qPresentation = this.feel.qPresentation(entity, time);
      if (qPresentation) {
        const age = this.feel.qAge(entity.id, qPresentation.startedAt, time, Q_FLASH_START, YASUO_Q_CAST_SECONDS);
        const facing = camera.screenHeading(entity, qPresentation.facing), pose = meowaQPose(age, facing);
        if (pose.visible) {
          this.sprites.draw('qWind', pose.frame, { x: entity.x + pose.hand.x, y: entity.y }, pose.width, pose.height, camera,
            { ax: pose.ax, ay: pose.ay, height: lift - pose.hand.y / Math.max(.1, Math.sin(camera.elevation * Math.PI / 180)), angle: -facing, alpha: pose.alpha, depth: 1 });
        }
      }
      if (stormReady(entity, time)) {
        const age = Math.max(0, time - (entity.qReadyAt ?? time)), fade = Math.min(1, age / .15, Math.max(0, (entity.qStacksUntil ?? time) - time) / .25);
        drawClassicReady(this.spellBrush(entity, lift), age, fade);
      }
      if (entity.eqCast) {
        const pose = meowaEQPose(entity.eqCast, time);
        if (pose.visible) {
          // A world-space circle keeps the cutting rim on the damage radius at every camera angle.
          this.sprites.draw('eqSlash', pose.frame, entity, pose.width, pose.height, camera,
            { flat: true, ax: pose.ax, ay: pose.ay, angle: -entity.eqCast.facing,
              alpha: pose.alpha * (pose.empowered ? .65 : 1), height: 1.1 }).name = 'meowa-eq-cutting-rim';
          if (pose.empowered) for (let i = 0; i < 2; i++) {
            // Upper wind passes behind the swordsman; the near ground arc wraps over his feet.
            this.sprites.draw('eqStorm', pose.frame, entity, pose.stormWidth, pose.stormHeight, camera,
              { alpha: pose.alpha * .9, ax: .5, ay: pose.stormAy, depth: i ? 1 : -1,
                crop: [0, i ? pose.stormAy : 0, 1, i ? 1 - pose.stormAy : pose.stormAy] }).name = i ? 'meowa-eq3-front' : 'meowa-eq3-rear';
          }
        }
      }
      if (entity.eCast) {
        const cast = entity.eCast, age = time - cast.startedAt, p = Math.max(0, Math.min(1, (age - E.startup) / E.dash));
        if (age > E.startup && age < E.duration) {
          const current = actors.body(entity.id);
          if (current) {
            const fade = 1 - Math.min(1, Math.max(0, (age - E.startup - E.dash) / E.recovery));
            for (let i = 0; i < 3; i++) {
              const previous = Math.max(0, p - (i + 1) * .12);
              this.ghost(current, { x: cast.start.x + (cast.end.x - cast.start.x) * previous, y: cast.start.y + (cast.end.y - cast.start.y) * previous }, (.22 - i * .06) * fade, camera);
            }
            const tail = Math.max(0, p - .36);
            this.ink.line(toThree({ x: cast.start.x + (cast.end.x - cast.start.x) * tail, y: cast.start.y + (cast.end.y - cast.start.y) * tail }, 8), toThree(entity, 8), 0xb7eeec, .45 * fade, 2);
          }
        }
      }
      if (entity.passiveShieldAt !== undefined) {
        let state = this.shields.get(entity.id);
        if (!state || state.startedAt !== entity.passiveShieldAt) { state = { startedAt: entity.passiveShieldAt }; this.shields.set(entity.id, state); }
        const until = entity.passiveShieldUntil ?? state.startedAt + 1;
        if (state.brokenAt === undefined && time < until && shieldRemaining(entity, time) <= 0) state.brokenAt = time;
        const releaseAt = state.brokenAt ?? until;
        drawClassicShield(this.spellBrush(entity, lift), time - state.startedAt, time >= releaseAt ? time - releaseAt : null, 1);
      }
      if (homeguardActive(entity, time) && entity.destination) for (let i = 0; i < 2; i++) {
        const phase = (time * 2.4 + i * .5) % 1, back = 10 + phase * 28, side = i ? 9 : -9, c = Math.cos(entity.facing), s = Math.sin(entity.facing);
        this.sprites.draw('homeguard', 0, { x: entity.x - c * back - s * side, y: entity.y - s * back + c * side }, 72 + phase * 22, 45, camera,
          { flat: true, angle: -entity.facing, ax: .5, ay: .5, alpha: Math.sin(phase * Math.PI) * .7, additive: true });
      }
    }
    const activeTowerShots = new Set<number>();
    for (const shot of match.projectiles) {
      if (shot.team !== (frame.localTeam ?? 'blue') && !this.canSeePoint(shot)) continue;
      if (shot.empowered) {
        const age = Math.max(0, time - (shot.startedAt ?? time));
        const pose = meowaStormPose(age, shot.remaining);
        if (pose.visible) this.sprites.draw('tornado', pose.frame, shot, pose.width, pose.height, camera, { ax: pose.ax, ay: pose.ay, alpha: pose.alpha });
        this.stormWake(shot, camera, age);
      } else if (shot.kind !== 'q') {
        const target = match.entity(shot.targetId), source = match.entity(shot.sourceId);
        if (source?.kind === 'tower' && target && target.hp > 0) {
          activeTowerShots.add(shot.id);
          let flight = this.towerFlights.get(shot.id);
          if (!flight) { flight = { muzzle: this.towerMuzzle(source) ?? toThree(source, 110), progress: 0 }; this.towerFlights.set(shot.id, flight); }
          const pose = towerBoltPose(shot, source, target, flight.muzzle, camera, time, flight.progress);
          flight.progress = pose.progress;
          this.sprites.draw('towerEnergy', pose.frame, toSimulation(pose.position), pose.width, pose.height, camera,
            { ax: pose.ax, ay: pose.ay, height: pose.position.y, angle: pose.angle }).name = 'tower-energy-bolt';
          continue;
        }
        if (source?.kind === 'ranged' && target && target.hp > 0) {
          const pose = minionBoltPose(shot, source, target, camera, time);
          this.sprites.draw('minionAttack', pose.frame, pose.point, pose.width, pose.tall, camera,
            { ax: pose.ax, ay: pose.ay, height: pose.height, angle: pose.angle }).name = 'minion-caster-bolt';
          continue;
        }
        const distance = source ? Math.hypot(shot.x - source.x, shot.y - source.y) : 0;
        const progress = source && target ? Math.min(1, distance / Math.max(1, Math.hypot(source.x - target.x, source.y - target.y))) : 0;
        const height = 17 + (target ? (target.kind === 'hero' ? 35 : 17) + airborneLift(target, time) - 17 : 0) * progress;
        this.ink.line(toThree(shot, height), toThree({ x: shot.x - shot.vx * 6, y: shot.y - shot.vy * 6 }, height), shot.team === 'blue' ? 0x6de5db : 0xee8582, .9, Math.max(2, shot.radius * 2));
      }
    }
    for (const id of this.towerFlights.keys()) if (!activeTowerShots.has(id)) this.towerFlights.delete(id);
    for (const wall of match.windWalls) {
      if (!this.canSeePoint(wall)) continue;
      const pose = windWallPose(time - wall.startsAt); if (!pose.active) continue;
      const width = WIND_WALL.width * (.35 + .65 * pose.grow), height = WIND_WALL.height * pose.grow;
      const axis = windWallAxes(wall.angle);
      for (const side of [-1, 1]) {
        const card = this.sprites.draw('wall', pose.frame, { x: wall.x + Math.cos(wall.angle) * WIND_WALL.thickness * side * .35, y: wall.y + Math.sin(wall.angle) * WIND_WALL.thickness * side * .35 }, width, height, camera, { alpha: pose.alpha * (side < 0 ? .28 : .85) });
        card.rotation.set(0, -Math.atan2(axis.y, axis.x), 0);
      }
    }
    for (const effect of match.summonerEffects) {
      const age = time - effect.startedAt; if (age < 0 || time >= effect.endsAt) continue;
      if (effect.kind === 'flash') {
        for (const [i, point] of [effect.from, effect.to].entries()) if (this.canSeePoint(point)) {
          drawClassicFlash(this.spellBrush(point, 0), age, i === 1);
          if (age < .24) this.glow(point, 29, i ? 49 : 39, i ? 68 : 53, 0xffce56, (1 - age / .24) ** 2 * .95, camera);
        }
      } else {
        const target = entities.find(e => e.id === effect.targetId); if (!target || target.hp <= 0) continue;
        drawClassicIgnite(this.spellBrush(target, airborneLift(target, time)), age, effect.endsAt - time, target.kind === 'hero' ? 1 : .65);
        this.glow(target, 23 + airborneLift(target, time), 32, 43, 0xff6d20, Math.min(1, age / .08, (effect.endsAt - time) / .25) * .18, camera);
      }
    }
    for (const zone of match.zones) {
      if (!this.canSeePoint(zone)) continue;
      this.ink.ring(zone, zone.radius, zone.team === 'blue' ? 0x6de5db : 0xee8582, .65);
      this.ink.ring(zone, zone.radius * Math.max(0, Math.min(1, 1 - (zone.triggerAt - time) / .55)), 0xd3ffff, .4);
    }
    if (this.click) {
      const age = time - this.click.at;
      if (age >= 0 && age < .4) this.sprites.draw(this.click.attack ? 'attack' : 'move', Math.min(23, Math.floor(age * 60)), this.click.point, 128 * .45, 128 * .45, camera, { flat: true, ay: .5 });
      else this.click = null;
    }
    this.drawContacts(time, entities, camera);
    this.echoes = this.echoes.filter(echo => {
      const age = time - echo.at; if (age >= .55) { this.releaseEcho(echo); return false; }
      echo.mesh.visible = this.canSeePoint({ x: echo.origin.x + WORLD_ORIGIN.x, y: echo.origin.z + WORLD_ORIGIN.y });
      const fall = Math.min(1, Math.max(0, age / .22)); echo.mesh.position.copy(echo.origin).add(new Vector3(echo.dx * fall * 5, 0, echo.dy * fall * 3));
      echo.mesh.scale.set(1 - fall * .12, 1 - fall * .6, 1); echo.mesh.material.opacity = .85 * (1 - Math.max(0, (age - .18) / .37)); return true;
    });
    this.labels = this.labels.filter(label => {
      const age = time - label.at; if (age >= label.duration) { this.releaseLabel(label); return false; }
      label.mesh.visible = this.canSeePoint(label.point);
      label.mesh.position.copy(toThree(label.point, label.height + age / label.duration * 18)); label.mesh.quaternion.copy(camera.camera.quaternion); label.mesh.material.opacity = Math.max(0, 1 - age / label.duration); return true;
    });
    this.sprites.end(); this.ink.end(); this.contactInk.end();
    for (let i = this.glowUsed; i < this.glows.length; i++) this.glows[i].visible = false;
    for (let i = this.ghostUsed; i < this.ghosts.length; i++) this.ghosts[i].visible = false; this.ghostUsed = 0;
  }
  private spellBrush(point: Point, height: number): SpellBrush {
    return { stroke: (a, b, color, alpha, width, front) => (front ? this.contactInk : this.ink).cut(point, height + .8, a, b, color, alpha, width) };
  }
  private glow(point: Point, height: number, width: number, tall: number, color: number, alpha: number, camera: ThreeCamera) {
    if (typeof document === 'undefined') return;
    if (!this.glowMap) {
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64;
      const ctx = canvas.getContext('2d'); if (!ctx) return;
      const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      gradient.addColorStop(0, '#fffde9'); gradient.addColorStop(.13, '#fff4bc'); gradient.addColorStop(.4, 'rgba(255,239,190,.28)'); gradient.addColorStop(1, 'rgba(255,230,160,0)');
      ctx.fillStyle = gradient; ctx.fillRect(0, 0, 64, 64);
      this.glowMap = new CanvasTexture(canvas); this.glowMap.colorSpace = SRGBColorSpace; this.glowMap.magFilter = this.glowMap.minFilter = LinearFilter; this.glowMap.generateMipmaps = false;
    }
    let mesh = this.glows[this.glowUsed++];
    if (!mesh) {
      mesh = new Mesh(new PlaneGeometry(1, 1), new MeshBasicMaterial({ map: this.glowMap, transparent: true, blending: AdditiveBlending, depthTest: false, depthWrite: false, toneMapped: false, fog: false }));
      mesh.name = 'summoner-soft-light'; mesh.renderOrder = 20; mesh.frustumCulled = false; this.group.add(mesh); this.glows.push(mesh);
    }
    mesh.position.copy(toThree(point, height)); mesh.quaternion.copy(camera.camera.quaternion); mesh.scale.set(width, tall, 1); mesh.material.color.setHex(color); mesh.material.opacity = alpha; mesh.visible = alpha > 0;
  }
  private ghosts: Mesh<PlaneGeometry, MeshBasicMaterial>[] = [];
  private ghostUsed = 0;
  private ghost(source: Mesh<PlaneGeometry, MeshBasicMaterial>, point: Point, alpha: number, camera: ThreeCamera) {
    let mesh = this.ghosts[this.ghostUsed++];
    if (!mesh) { mesh = new Mesh(new PlaneGeometry(1, 1), source.material.clone()); mesh.frustumCulled = false; this.ghosts.push(mesh); this.group.add(mesh); }
    const positions = mesh.geometry.getAttribute('position'), uv = mesh.geometry.getAttribute('uv');
    const sourcePositions = source.geometry.getAttribute('position'), sourceUV = source.geometry.getAttribute('uv');
    for (let i = 0; i < positions.count; i++) positions.setXYZ(i, sourcePositions.getX(i), sourcePositions.getY(i), sourcePositions.getZ(i)); positions.needsUpdate = true;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, sourceUV.getX(i), sourceUV.getY(i)); uv.needsUpdate = true;
    if (mesh.material.map !== source.material.map) { mesh.material.map = source.material.map; mesh.material.needsUpdate = true; }
    mesh.material.transparent = true; mesh.material.depthWrite = false; mesh.material.alphaTest = .025;
    mesh.material.color.setHex(0xafece8); mesh.material.opacity = alpha; mesh.position.copy(toThree(point, .8)); mesh.quaternion.copy(camera.camera.quaternion); mesh.visible = alpha > 0;
  }
  private stormWake(shot: PrototypeFrame['match']['projectiles'][number], camera: ThreeCamera, age: number) {
    const heading = camera.screenHeading(shot, Math.atan2(shot.vy, shot.vx));
    const c = Math.cos(heading), s = Math.sin(heading), alpha = meowaStormPose(age, shot.remaining).alpha;
    for (let strand = 0; strand < 2; strand++) for (let i = 0; i < 16; i++) {
      const point = (t: number) => { const distance = t * Math.min(28, age * 120), side = Math.sin(t * 6 - age * 14 + strand * Math.PI) * 3 * (1 - t); return { x: -c * distance - s * side, y: -s * distance + c * side }; };
      this.ink.cut(shot, 1, point(i / 16), point((i + 1) / 16), 0xb4c7c4, Math.sin(i / 16 * Math.PI) * alpha * .2, .8);
    }
  }
  private drawContacts(time: number, entities: Entity[], camera: ThreeCamera) {
    this.bursts = this.bursts.filter(burst => time - burst.at < .45);
    for (const { event, at } of this.bursts) {
      const age = time - at; if (age < 0 || event.impact === 'ignite') continue;
      const profile = impactProfile(event.impact), target = entities.find(e => e.id === event.targetId);
      const point = target ?? event, height = (target?.kind === 'hero' ? 35 : 16) + (target ? airborneLift(target, time) : 0);
      if (!this.canSeePoint(point)) continue;
      if (event.sourceKind === 'tower') {
        const pose = towerImpactPose(event.team, age), size = target?.kind === 'hero' ? 52 : 38;
        if (pose.visible) this.sprites.draw('towerEnergy', pose.frame, point, size, size, camera,
          { ax: .5, ay: .5, height, alpha: pose.alpha, depth: 2 }).name = 'tower-energy-impact';
        continue;
      }
      if (event.sourceKind === 'melee' || event.sourceKind === 'ranged') {
        const pose = minionImpactPose(event.sourceKind, event.team, age);
        const direction = impactDirection(event), heading = camera.screenHeading(point, Math.atan2(direction.y, direction.x));
        if (pose.visible) this.sprites.draw('minionAttack', pose.frame, point, pose.size, pose.size, camera,
          { ax: .5, ay: .5, height: height - 3, alpha: pose.alpha, color: pose.color,
            angle: event.sourceKind === 'melee' ? -heading : 0, depth: 2 }).name = event.sourceKind === 'melee' ? 'minion-melee-contact' : 'minion-caster-contact';
        continue;
      }
      const direction = impactDirection(event), heading = camera.screenHeading(point, Math.atan2(direction.y, direction.x)), d = { x: Math.cos(heading), y: Math.sin(heading) }, side = { x: -d.y, y: d.x };
      if ((event.impact === 'q3' || event.impact === 'eq3') && event.type !== 'last-hit') {
        const pose = meowaStormHitPose(age), lift = target ? airborneLift(target, time) : 0;
        const scale = event.impact === 'eq3' ? .65 : 1;
        if (pose.visible) this.sprites.draw('stormHit', pose.frame, point, pose.width * scale, pose.height * scale, camera,
          { ax: pose.ax, ay: pose.ay, alpha: pose.alpha * (event.impact === 'eq3' ? .75 : 1), height: lift, depth: 2 });
        continue;
      }
      if ((event.impact === 'q' || event.impact === 'eq') && event.type !== 'last-hit') {
        const pose = meowaQHitPose(age);
        if (pose.visible) this.sprites.draw('qWindHit', pose.frame, point, pose.width, pose.height, camera,
          { ax: .5, ay: .5, height: height - 9, angle: -heading, alpha: pose.alpha, depth: 2 });
        continue;
      }
      if (event.type === 'last-hit') {
        const t = age / .4;
        for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5 - .6, r = 6 + t * 20, x = Math.cos(a) * r, y = Math.sin(a) * r - t * 9; this.contactInk.cut(point, height, { x, y }, { x: x + 2, y }, 0xffdf8e, Math.max(0, 1 - t), 2); }
        continue;
      }
      if (age > profile.duration) continue;
      const t = age / profile.duration, fade = (1 - t) ** 2, color = event.team === 'blue' ? 0xa5ffe9 : 0xffb699;
      if (age < .085) {
        const flash = 1 - age / .085, length = profile.length * (.65 + .35 * Math.min(1, age / .02));
        const sx = d.x * .8 + side.x * .6, sy = d.y * .8 + side.y * .6;
        const a = { x: -sx * length * .45, y: -sy * length * .45 }, b = { x: sx * length, y: sy * length };
        this.contactInk.cut(point, height, a, b, 0x102c3b, flash * .85, profile.heavy ? 6 : 4);
        this.contactInk.cut(point, height + .1, a, b, 0xf0fff6, flash, profile.heavy ? 3 : 2);
        this.contactInk.cut(point, height + .2, { x: -side.x * 9, y: -side.y * 9 }, { x: side.x * 9, y: side.y * 9 }, color, flash);
      }
      const count = profile.heavy ? 9 : 5;
      for (let i = 0; i < count; i++) {
        const angle = heading + (i - (count - 1) / 2) * .3, travel = (profile.heavy ? 43 : 27) * Math.sqrt(t) * (1 + i % 3 * .13), tail = (1 - t) * (i % 2 ? 5 : 8);
        const x = Math.cos(angle) * travel, y = Math.sin(angle) * travel + t * t * 7;
        this.contactInk.cut(point, height, { x, y }, { x: x - Math.cos(angle) * tail, y: y - Math.sin(angle) * tail }, i % 2 ? color : 0xeafff7, fade, i % 3 ? 1 : 2);
      }
      if (profile.heavy && age < .18) this.contactInk.ring(point, 6 + age * 105, color, (1 - age / .18) * .65);
    }
  }
  private releaseEcho(echo: Echo) { echo.mesh.removeFromParent(); echo.mesh.geometry.dispose(); echo.mesh.material.dispose(); }
  private releaseLabel(label: Label) { label.mesh.removeFromParent(); label.mesh.geometry.dispose(); label.mesh.material.map?.dispose(); label.mesh.material.dispose(); }
  reset() {
    this.feel.reset(); this.bursts = []; this.shields.clear(); this.towerFlights.clear(); this.click = null;
    this.glows.forEach(mesh => { mesh.visible = false; }); this.glowUsed = 0;
    this.echoes.forEach(e => this.releaseEcho(e)); this.echoes = []; this.labels.forEach(e => this.releaseLabel(e)); this.labels = [];
    this.ghosts.forEach(mesh => { mesh.visible = false; }); this.ghostUsed = 0; this.sprites.reset(); this.ink.reset(); this.contactInk.reset();
  }
  dispose() {
    if (this.disposed) return; this.disposed = true; this.reset(); this.sprites.dispose(); this.ink.dispose(); this.contactInk.dispose();
    this.ghosts.forEach(mesh => { mesh.geometry.dispose(); mesh.material.dispose(); }); this.ghosts = []; this.group.clear(); this.group.removeFromParent();
    this.glows.forEach(mesh => { mesh.geometry.dispose(); mesh.material.dispose(); }); this.glows = []; this.glowMap?.dispose(); this.glowMap = null;
  }
}
