import { Group, Mesh, MeshBasicMaterial, NearestFilter, PlaneGeometry, SRGBColorSpace, TextureLoader, type Texture, type WebGLRenderer } from 'three';
import type { Entity } from '../game/types';
import { YasuoAnimator, flipYasuoAttack, attackFrameAt } from '../render/YasuoAnimation';
import type { CombatFeel } from '../render/CombatFeel';
import { COMBAT_ART, combatBodyPose } from './CombatArt';
import { airborneMotion } from '../render/AirborneMotion';
import { Q_FLASH_START } from '../render/YasuoQDraw';
import { YASUO_Q_CAST_SECONDS } from '../game/YasuoQ';
import { YASUO_TEXTURES } from '../render/YasuoAssets';
import { HERO_VISUAL_SCALE } from '../render/Presentation';
import { MINION_CLIPS, MINION_URLS, MinionAnimator } from '../render/MinionAnimation';
import { UNIT_METRICS } from '../game/UnitMetrics';
import { ThreeCamera, toThree } from './Coordinates';
import { actorEnvironmentTint, contactShadowTexture, paintedShadowFactor } from './S01Look';
import { QualitySettings, QUALITY_TUNING, actorGrounding } from './QualitySettings';
import type { ActorLightField } from './ActorLightField';
import type { EnvironmentIllumination } from './EnvironmentIllumination';
import { projectActorShadow } from './ActorShadow';
import { HeroHealthBar } from './HeroHealthBar';
import heroHealthFrame from '../../assets/ui/riot-healthbars-2026-10-15/runtime/hero-frame.png?url';
import { brushAt } from './BrushConcealment';
import { installClassicQBody } from './ClassicQMaterial';
const heroAssets = new Map(YASUO_TEXTURES.map(asset => [asset.clip.key, asset]));
const minionAssets = new Map(Object.entries(MINION_URLS).map(([path, url]) => [`minion-${path.split('/').pop()!.replace('.png', '')}`, url]));

export function atlasRect(frame: number, cellWidth: number, cellHeight: number, sheetWidth: number, sheetHeight: number) {
  if (!Number.isInteger(frame) || ![cellWidth, cellHeight, sheetWidth, sheetHeight].every(value => Number.isInteger(value) && value > 0)) throw new RangeError('Invalid atlas dimensions');
  const columns = sheetWidth / cellWidth, rows = sheetHeight / cellHeight;
  if (!Number.isInteger(columns) || !Number.isInteger(rows) || frame < 0 || frame >= columns * rows) throw new RangeError('Invalid atlas frame');
  return { left: frame % columns / columns, right: (frame % columns + 1) / columns,
    top: 1 - Math.floor(frame / columns) / rows, bottom: 1 - (Math.floor(frame / columns) + 1) / rows };
}

interface ActorView {
  body: Mesh<PlaneGeometry, MeshBasicMaterial>; shadow: Mesh<PlaneGeometry, MeshBasicMaterial>; contact: Mesh<PlaneGeometry, MeshBasicMaterial>;
  bar: Group; fill: Mesh<PlaneGeometry, MeshBasicMaterial>; animator: YasuoAnimator;
}

/** Existing pixels and animation times, placed on camera-facing foot-anchored cards. */
export class ActorSprites {
  localTeam: import('../game/types').Team = 'blue';
  /** Retain the former presentation for controlled performance comparisons. */
  stableHealthBars = true;
  heroHealthBarsVisible = true;
  readonly group = new Group();
  readonly errors: string[] = [];
  private readonly actors = new Map<number, ActorView>();
  private readonly textures = new Map<string, { texture: Texture; ready: boolean }>();
  private readonly loader = new TextureLoader();
  private readonly minions = new MinionAnimator();
  private readonly shadowMap = contactShadowTexture();
  private readonly environmentEnabled = { value: 1 };
  private disposed = false;
  constructor(private readonly quality = new QualitySettings(), private readonly lighting?: ActorLightField, private readonly illumination?: EnvironmentIllumination) { for (const key of ['qBody', 'cast', 'ultimate'] as const) this.texture(key, COMBAT_ART[key].url); }
  preload(): void {
    for (const asset of YASUO_TEXTURES) this.texture(asset.clip.key, asset.url);
    for (const [key, url] of minionAssets) this.texture(key, url);
    this.texture('hero-health-frame', heroHealthFrame);
  }
  upload(renderer: WebGLRenderer): void { for (const entry of this.textures.values()) renderer.initTexture(entry.texture); }
  hasVisibleBody(id: number): boolean { return this.actors.get(id)?.body.visible ?? false; }
  body(id: number) { return this.actors.get(id)?.body; }
  snapshot(id: number) {
    const body = this.actors.get(id)?.body;
    if (!body?.visible) return null;
    const copy = new Mesh(body.geometry.clone(), body.material.clone());
    copy.position.copy(body.position); copy.quaternion.copy(body.quaternion); copy.frustumCulled = false;
    copy.material.transparent = true; copy.material.depthWrite = false; copy.material.alphaTest = .025;
    return copy;
  }
  update(entities: Entity[], time: number, camera: ThreeCamera, feel?: CombatFeel, painted = true): void {
    this.environmentEnabled.value = painted ? 1 : 0;
    const active = new Set<number>();
    for (const entity of entities) {
      if (entity.kind === 'tower' || entity.hp <= 0) continue;
      active.add(entity.id);
      let view = this.actors.get(entity.id);
      if (!view) { view = this.create(entity); this.actors.set(entity.id, view); }
      const facing = camera.screenHeading(entity, entity.facing);
      const motion = airborneMotion(entity, time), suspended = motion.airborne && entity.airborneStartedAt !== undefined;
      const visual = suspended ? { ...entity, qCast: null, q3Cast: null, wCast: null, eCast: null, eqCast: null, rCast: null,
        attackStartedAt: null, attackReleasedAt: null, windup: 0, fluteAt: null, emote: null } : entity;
      const direction = entity.airborneDirection ?? { x: 0, y: 0 };
      const heading = camera.screenHeading(entity, Math.atan2(direction.y, direction.x));
      const tilt = motion.lean * Math.cos(heading) * (Math.hypot(direction.x, direction.y) > 0 ? 1 : 0);
      let key: string, url: string, frame: number, width: number, height: number, ax: number, ay: number, scale: number, flip: boolean;
      if (entity.kind === 'hero') {
        const qPresentation = suspended ? null : feel ? feel.qPresentation(entity, time) : entity.qCast;
        const displayed = qPresentation === visual.qCast ? visual : { ...visual, qCast: qPresentation };
        const mapped = { ...visual, facing,
          qCast: qPresentation ? { ...qPresentation, facing: camera.screenHeading(entity, qPresentation.facing) } : null,
          eCast: visual.eCast ? { ...visual.eCast, facing: camera.screenHeading(entity, visual.eCast.facing) } : visual.eCast,
          eqCast: visual.eqCast ? { ...visual.eqCast, facing: camera.screenHeading(entity, visual.eqCast.facing) } : visual.eqCast,
        };
        const sample = view.animator.sample(mapped, time), clip = sample.clip;
        const asset = heroAssets.get(clip.key);
        if (!asset) { view.body.visible = false; continue; }
        key = clip.key; url = asset.url; frame = sample.frame; width = clip.width; height = clip.height;
        ax = clip.anchor[0] / width; ay = clip.anchor[1] / height; scale = sample.scale * HERO_VISUAL_SCALE;
        flip = (sample.state === 'A' || sample.state === 'B') && flipYasuoAttack(facing);
        if ((sample.state === 'A' || sample.state === 'B') && 'impact_frame' in clip && feel)
          frame = attackFrameAt(entity, feel.actionTime(entity.id, time), clip);
        const qAge = qPresentation && feel ? feel.qAge(entity.id, qPresentation.startedAt, time, Q_FLASH_START, YASUO_Q_CAST_SECONDS) : undefined;
        const override = combatBodyPose(displayed, time, angle => camera.screenHeading(entity, angle), qAge);
        if (override) {
          const art = COMBAT_ART[override.key]; key = override.key; url = art.url;
          width = art.width; height = art.height; frame = override.frame; ax = override.ax; ay = override.ay; scale = override.scale; flip = override.flip;
        }
      } else {
        const pose = this.minions.sample({ ...visual, facing }, time), clip = MINION_CLIPS[pose.key.replace('minion-', '') as keyof typeof MINION_CLIPS];
        key = pose.key; url = minionAssets.get(key)!;
        frame = pose.frame; width = clip.width; height = clip.height; ax = pose.originX; ay = pose.originY;
        scale = pose.scale; flip = pose.flip;
      }
      const entry = this.texture(key, url), image = entry.texture.image as HTMLImageElement | undefined;
      view.body.material.userData.classicQBody.value = key === 'qBody' ? 1 : key === 'cast' && entity.q3Cast ? 2 : 0;
      if (key === 'qBody' && image) {
        view.body.material.userData.classicQGrid.value.x = image.width / 64;
        view.body.material.userData.classicQGrid.value.y = image.height / 113;
      }
      view.body.visible = entry.ready;
      if (entry.ready && image) {
        const uv = atlasRect(frame, width, height, image.width, image.height);
        if (view.body.material.map !== entry.texture) { view.body.material.map = entry.texture; view.body.material.needsUpdate = true; }
        // Minion origin already incorporates its mirror anchor in MinionAnimator.
        const anchorX = entity.kind === 'hero' && flip ? 1 - ax : ax;
        const x0 = -anchorX * width * scale, x1 = (1 - anchorX) * width * scale;
        const y0 = -(1 - ay) * height * scale, y1 = ay * height * scale;
        const vertices = view.body.geometry.getAttribute('position');
        // Shear along the view ray: retain every screen pixel, but keep the
        // entire body upright over its feet in world space. A flat billboard
        // tips the head behind a nearby building and slices the actor in half.
        const depthSlope = Math.tan(camera.elevation * Math.PI / 180);
        const pivot = motion.landing ? 0 : UNIT_METRICS[entity.kind].height * .45;
        for (const [index, x, y] of [[0, x0, y1], [1, x1, y1], [2, x0, y0], [3, x1, y0]]) {
          const sx = x * motion.scaleX, sy = (y - pivot) * motion.scaleY;
          const px = sx * Math.cos(tilt) - sy * Math.sin(tilt), py = pivot + sx * Math.sin(tilt) + sy * Math.cos(tilt);
          vertices.setXYZ(index, px, py, py * depthSlope);
        }
        vertices.needsUpdate = true;
        const coords = view.body.geometry.getAttribute('uv'), left = flip ? uv.right : uv.left, right = flip ? uv.left : uv.right;
        coords.setXY(0, left, uv.top); coords.setXY(1, right, uv.top); coords.setXY(2, left, uv.bottom); coords.setXY(3, right, uv.bottom); coords.needsUpdate = true;
      }
      const lift = motion.lift, reaction = feel?.reaction(entity.id, time), recoil = suspended ? 0 : 1;
      view.body.position.copy(toThree({ x: entity.x + direction.x * motion.offset + (reaction?.x ?? 0) * recoil,
        y: entity.y + direction.y * motion.offset + (reaction?.y ?? 0) * recoil }, lift + 0.7)); view.body.quaternion.copy(camera.camera.quaternion);
      if (painted && this.quality.enhanced && this.quality.materials.value > 0 && this.illumination) {
        // The shared GPU field supplies warmth at the actual body height.
        // Do not stack the legacy whole-sprite fire tint on top of it.
        view.body.material.color.setHex(entity.team === 'blue' ? 0xd7e1e5 : 0xe4d5d0)
          .multiplyScalar(this.lighting?.shade(entity) ?? paintedShadowFactor(entity));
      } else {
        actorEnvironmentTint(entity, time, entity.team, view.body.material.color, painted);
        if (painted && this.quality.enhanced && this.lighting) view.body.material.color.multiplyScalar(this.lighting.shade(entity) / paintedShadowFactor(entity));
      }
      if (view.body.material.userData.environmentReaction) view.body.material.userData.environmentReaction.value = reaction?.flash ? 0 : 1;
      if (reaction?.flash) view.body.material.color.setHex(0xeafff6);
      const grounding = actorGrounding(lift);
      view.shadow.visible = view.body.visible;
      if (this.quality.contact.value > 0 && view.body.material.map) {
        if (view.shadow.material.map !== view.body.material.map) { view.shadow.material.map = view.body.material.map; view.shadow.material.needsUpdate = true; }
        view.shadow.position.copy(toThree(entity, QUALITY_TUNING.actorShadowHeight)); view.shadow.rotation.set(0, 0, 0); view.shadow.scale.set(1, 1, 1);
        view.shadow.material.opacity = grounding.outerOpacity; view.shadow.material.alphaTest = .01;
        projectActorShadow(view.body.geometry, view.shadow.geometry, lift);
      } else {
        if (view.shadow.material.map !== this.shadowMap) { view.shadow.material.map = this.shadowMap; view.shadow.material.needsUpdate = true; }
        // Restore the original square and UVs after switching out of projection.
        const p = view.shadow.geometry.getAttribute('position'), uv = view.shadow.geometry.getAttribute('uv');
        for (let i = 0; i < 4; i++) { p.setXYZ(i, i % 2 ? .5 : -.5, i < 2 ? .5 : -.5, 0); uv.setXY(i, i % 2, i < 2 ? 1 : 0); }
        p.needsUpdate = uv.needsUpdate = true;
        view.shadow.position.copy(toThree(entity, .69)); view.shadow.rotation.set(-Math.PI / 2, 0, 0);
        view.shadow.material.opacity = .60 / (1 + lift / 24); view.shadow.material.alphaTest = 0;
        view.shadow.scale.set(entity.radius * 4 * grounding.spread, entity.radius * 2.4 * grounding.spread, 1);
      }
      // A changing atlas silhouette needs fresh bounds for correct culling.
      view.shadow.geometry.computeBoundingSphere();
      view.contact.visible = view.body.visible && this.quality.contact.value > 0;
      view.contact.position.copy(toThree(entity, QUALITY_TUNING.actorContactHeight)); view.contact.material.opacity = grounding.contactOpacity;
      view.contact.scale.set(entity.radius * 2.1, entity.radius * 1.3, 1);
      // Keep the player's own concealed silhouette readable through the grass.
      // Other map geometry and actors retain their ordinary depth behavior.
      const concealed = painted && entity.kind === 'hero' && entity.team === this.localTeam && brushAt(entity) !== null;
      if (view.body.material.transparent !== concealed) {
        view.body.material.transparent = concealed; view.body.material.needsUpdate = true;
      }
      view.body.material.opacity = concealed ? .45 : 1;
      view.body.material.alphaTest = concealed ? .025 : .35;
      view.body.material.depthTest = !concealed; view.body.material.depthWrite = !concealed;
      view.body.renderOrder = concealed ? 10 : 0;
      if (concealed) { view.shadow.material.opacity *= .4; view.contact.material.opacity *= .4; }
      const pixelScale = (camera.camera.top - camera.camera.bottom) / camera.size.height;
      const elevationCos = Math.cos(camera.elevation * Math.PI / 180);
      let barHeight = entity.kind === 'hero' ? 33 * HERO_VISUAL_SCALE / elevationCos : UNIT_METRICS[entity.kind].height + 10;
      if (entity.kind === 'hero' && entity.team !== this.localTeam) {
        const player = entities.find(e => e.kind === 'hero' && e.team === this.localTeam && e.hp > 0);
        if (player) {
          const a = camera.project(entity), b = camera.project(player);
          if (Math.abs(a.x - b.x) < 74 && Math.abs(a.y - b.y) < 18) barHeight += 18 * pixelScale / elevationCos;
        }
      }
      view.bar.position.copy(toThree(entity, barHeight + lift)); view.bar.quaternion.copy(camera.camera.quaternion);
      // Keep the 2px fill and 5px backing at stable CSS-pixel heights. Their
      // anchor still follows interpolated movement continuously, without
      // integer snapping or delayed smoothing that makes the bar lag behind.
      if (view.bar instanceof HeroHealthBar) {
        view.bar.visible = this.heroHealthBarsVisible;
        view.bar.scale.set(pixelScale, pixelScale, 1);
        view.bar.update(entity, time);
      } else {
        view.bar.scale.y = this.stableHealthBars ? pixelScale : 1;
        view.fill.scale.x = Math.max(0, entity.hp / entity.maxHp); view.fill.position.x = -15 * (1 - view.fill.scale.x);
      }
    }
    for (const [id, view] of this.actors) if (!active.has(id)) { this.remove(view); this.actors.delete(id); }
    this.minions.retain(active);
  }
  private texture(key: string, url: string) {
    let entry = this.textures.get(key);
    if (!entry) {
      const value = { texture: this.loader.load(url, texture => { if (this.disposed) texture.dispose(); else value.ready = true; }, undefined, () => this.errors.push(key)), ready: false };
      value.texture.colorSpace = SRGBColorSpace; value.texture.magFilter = value.texture.minFilter = NearestFilter;
      value.texture.generateMipmaps = false; this.textures.set(key, value); entry = value;
    } return entry;
  }
  private create(entity: Entity): ActorView {
    const body = new Mesh(new PlaneGeometry(1, 1), new MeshBasicMaterial({ alphaTest: 0.35, toneMapped: false }));
    if (this.illumination) {
      const field = this.illumination, reaction = { value: 1 };
      body.material.userData.environmentReaction = reaction;
      body.material.onBeforeCompile = shader => {
        field.bind(shader); shader.uniforms.actorMaterialQuality = this.quality.materials;
        shader.uniforms.actorEnvironmentEnabled = this.environmentEnabled; shader.uniforms.actorEnvironmentReaction = reaction;
        shader.vertexShader = 'varying vec3 actorLightPosition;\n' + shader.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\nactorLightPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;');
        shader.fragmentShader = field.glsl() + '\nvarying vec3 actorLightPosition;\nuniform float actorMaterialQuality;\nuniform float actorEnvironmentEnabled;\nuniform float actorEnvironmentReaction;\n' + shader.fragmentShader.replace('#include <color_fragment>', `
          #include <color_fragment>
          float actorLightEnabled = actorMaterialQuality * actorEnvironmentEnabled * actorEnvironmentReaction;
          if (actorLightEnabled > 0.0) {
            float warmth = environmentLightAt(actorLightPosition) * actorLightEnabled * ${QUALITY_TUNING.actorLightStrength};
            diffuseColor.rgb += (diffuseColor.rgb + vec3(0.10, 0.035, 0.005)) * vec3(1.0, 0.42, 0.08) * warmth;
          }
        `);
      };
      body.material.customProgramCacheKey = () => `actor-shared-environment-v1-${field.sources.length}`;
    }
    installClassicQBody(body.material);
    body.frustumCulled = false; // Atlas frame bounds change during attacks.
    const shadow = new Mesh(new PlaneGeometry(1, 1), new MeshBasicMaterial({ map: this.shadowMap, color: 0x091923, transparent: true, opacity: 0.60, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2; shadow.name = `actor-sun-shadow-${entity.id}`;
    const contact = new Mesh(new PlaneGeometry(1, 1), shadow.material.clone()); contact.rotation.x = -Math.PI / 2;
    contact.name = `actor-foot-contact-${entity.id}`;
    if (entity.kind === 'hero') {
      const bar = new HeroHealthBar(entity, this.texture('hero-health-frame', heroHealthFrame).texture);
      this.group.add(body, shadow, contact, bar);
      return { body, shadow, contact, bar, fill: bar.fill, animator: new YasuoAnimator() };
    }
    const bar = new Group(); bar.name = `actor-health-${entity.id}`;
    const back = new Mesh(new PlaneGeometry(33, 5), new MeshBasicMaterial({ color: 0x0a121c, depthTest: false, depthWrite: !this.stableHealthBars, toneMapped: false }));
    const fill = new Mesh(new PlaneGeometry(30, 2), new MeshBasicMaterial({ color: entity.team === 'blue' ? 0x8cc9b5 : 0xc97f7a, depthTest: false, depthWrite: !this.stableHealthBars, toneMapped: false }));
    back.renderOrder = 100; fill.renderOrder = 101; fill.position.z = 0.01; bar.add(back, fill);
    this.group.add(body, shadow, contact, bar); return { body, shadow, contact, bar, fill, animator: new YasuoAnimator() };
  }
  private remove(view: ActorView): void {
    for (const mesh of [view.body, view.shadow, view.contact]) { mesh.removeFromParent(); mesh.geometry.dispose(); mesh.material.dispose(); }
    view.bar.traverse(object => { if (object instanceof Mesh) { object.geometry.dispose(); object.material.dispose(); } });
    view.bar.removeFromParent(); view.bar.clear();
  }
  reset(): void { for (const view of this.actors.values()) this.remove(view); this.actors.clear(); this.minions.reset(); }
  dispose(): void {
    if (this.disposed) return; this.disposed = true; this.reset();
    for (const entry of this.textures.values()) entry.texture.dispose(); this.textures.clear();
    this.shadowMap.dispose();
    this.group.removeFromParent();
  }
}
