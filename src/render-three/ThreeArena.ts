import {
  AmbientLight, BufferGeometry, ConeGeometry, CylinderGeometry, DirectionalLight,
  Group, Line, LineBasicMaterial, Mesh, MeshLambertMaterial, Raycaster,
  Scene, SphereGeometry, Vector3, WebGLRenderer, Fog, BasicShadowMap, PCFShadowMap, ACESFilmicToneMapping, NoToneMapping, SRGBColorSpace, MeshBasicMaterial, Texture,
} from 'three';
import type { PrototypeFrame, PrototypeView } from '../presentation/PrototypeHost';
import type { AbilityKey, Entity, Point, Team } from '../game/types';
import { skillPreview } from '../presentation/SkillPreview';
import { SkillIndicator } from './SkillIndicator';
import { ABILITIES } from '../game/config';
import { BRIDGE_SLOTS, bridgePoint } from '../game/Bridge';
import { TeamVision } from '../presentation/TeamVision';
import { brushAt } from './BrushConcealment';
import { WarFog } from './WarFog';
import { UNIT_METRICS } from '../game/UnitMetrics';
import { YASUO_Q_CAST_SECONDS } from '../game/YasuoQ';
import { wallEnds } from '../game/WindWall';
import { createBridgeBlockout, pixelGrid } from './BridgeBlockout';
import { ThreeCamera, toThree } from './Coordinates';
import { pickActorId } from './InputPicking';
import { disposeSceneResources } from './SceneResources';
import { S01Environment } from './S01Environment';
import { ActorSprites } from './ActorSprites';
import { CentralBridgeArt } from './CentralBridgeArt';
import { PaintedBridgeSample } from './PaintedBridgeSample';
import { MapLayoutOverlay } from './MapLayoutOverlay';
import { ArchitecturalIce } from './ArchitecturalIce';
import { MapPoros } from './MapPoros';
import { MapRavens } from './MapRavens';
import { BridgeAtmosphere } from './BridgeAtmosphere';
import { GroundSnow } from './GroundSnow';
import { PaintedSmallDetails } from './PaintedSmallDetails';
import { PaintedDetails } from './PaintedDetails';
import { PaintedMapLandmarks, PAINTED_TOWER_BODY, PAINTED_TOWER_CROWN_LIFT } from './PaintedMapLandmarks';
import { CombatEffects } from './CombatEffects';
import { QualitySettings, type QualityEffect } from './QualitySettings';
import { ContactOcclusion } from './ContactOcclusion';
import { ShadowFocus } from './ShadowFocus';
import { ArchitecturalGlow } from './ArchitecturalGlow';
import { environmentSurfaceRole, surfaceResponse } from './SurfaceResponse';
import { ActorLightField } from './ActorLightField';
import { EnvironmentIllumination } from './EnvironmentIllumination';
import { PavingShadows } from './PavingShadows';
import { WorldHealthBars } from './WorldHealthBars';
import { TargetCooldownRings } from './TargetCooldownRings';
import { TowerRangeIndicator } from './TowerRangeIndicator';
import { CrystalMotes } from './CrystalMotes';
import { basicAttackRadius } from '../game/UnitMetrics';
import { trackHeroCamera } from './CameraTracking';
import { WinterDressing } from './WinterDressing';
import { SnowBanks } from './SnowBanks';
import { Match } from '../game/Match';
import { RenderPositions } from '../render/RenderPositions';
import {SanctuaryShop} from './SanctuaryShop';
import {pickSanctuaryShop} from './SanctuaryShopPicking';
type RenderWidth = 640 | 960 | 1280 | 1920;

/** P2 art sample with a retained P1 diagnostic mode. Visual approval is separate. */
export class ThreeArena implements PrototypeView {
  fogEnabled = false;
  localTeam: Team = 'blue';
  vision = new TeamVision('blue', brushAt);
  readonly warFog = new WarFog();
  private readonly visibleIds = new Set<number>();
  private enemyTowerKnownAlive = true;
  private get baseVision() { return BRIDGE_SLOTS.filter(slot => slot.team === this.localTeam && /spawn|inner|nexus-tower/.test(slot.id)).map(slot => ({ ...bridgePoint(slot.u, slot.v), radius: 420 })); }
  get fogActive(): boolean { return this.fogEnabled && this.paintedArt && this.presentation === 'art'; }
  canSeeEntity(entity: Entity): boolean { return !this.fogActive || entity.team === this.localTeam || this.visibleIds.has(entity.id); }
  canSeePoint(point: Point): boolean { return !this.fogActive || this.vision.pointVisible(point); }
  perceivedFrame(frame: PrototypeFrame): PrototypeFrame { return this.fogActive ? { ...frame, events: frame.events.filter(event => this.vision.eventVisible(event)) } : frame; }
  readonly quality = new QualitySettings();
  readonly cameraRig = new ThreeCamera();
  readonly renderer: WebGLRenderer;
  readonly scene = new Scene();
  readonly blockout = createBridgeBlockout();
  readonly environment = new S01Environment({ centralArt: true });
  readonly central = new CentralBridgeArt();
  readonly painted = new PaintedBridgeSample(this.quality);
  readonly details = new PaintedDetails();
  readonly atmosphere = new BridgeAtmosphere(this.quality);
  readonly groundSnow = new GroundSnow(this.quality);
  readonly smallDetails = new PaintedSmallDetails();
  readonly architecturalIce = new ArchitecturalIce();
  readonly poros = new MapPoros();
  readonly ravens = new MapRavens();
  wildlifeEnabled = true;
  readonly layoutOverlay = new MapLayoutOverlay();
  showLayout = false;
  readonly landmarks = new PaintedMapLandmarks();
  readonly crystalMotes = new CrystalMotes([...this.landmarks.crystalEmitters, ...this.architecturalIce.crystalEmitters]);
  readonly illumination = new EnvironmentIllumination([this.painted.group, this.smallDetails.group]);
  readonly winterDressing: WinterDressing;
  readonly snowBanks: SnowBanks;
  readonly sanctuaryShop:SanctuaryShop;
  paintedArt = true;
  private readonly actorLighting = new ActorLightField([this.painted.group, this.landmarks.group]);
  readonly sprites = new ActorSprites(this.quality, this.actorLighting, this.illumination);
  readonly combat = new CombatEffects();
  readonly contacts = new ContactOcclusion(this.quality, [this.painted.group, this.landmarks.group]);
  readonly pavingShadows = new PavingShadows(this.quality, [this.landmarks.group]);
  readonly architecturalGlow = new ArchitecturalGlow(this.quality, [this.painted.group, this.landmarks.group]);
  private readonly shadowFocus = new ShadowFocus(this.painted.group.children.find(object => object instanceof DirectionalLight) as DirectionalLight);
  presentation: 'art' | 'gray' = 'art';
  centralOnly = true;
  following = false;
  recenterHeld = false;
  selectedId: number | null = null;
  attackSelecting = false;
  aim: Point | null = null;
  aimKey: AbilityKey | null = null;
  readonly skillIndicator = new SkillIndicator();
  readonly towerRangeIndicator = new TowerRangeIndicator();
  onFrame?: (value: PrototypeFrame) => void;
  private readonly actors = new Map<number, Mesh>();
  private readonly dynamic = new Group();
  private readonly hints = new Group();
  private readonly diagnosticLights = new Group();
  private readonly raycaster = new Raycaster();
  private readonly bodyGeometry = new CylinderGeometry(1, 1, 1, 8);
  private readonly shotGeometry = new SphereGeometry(3, 6, 4);
  private readonly blue = new MeshLambertMaterial({ color: 0x80c9dd });
  private readonly red = new MeshLambertMaterial({ color: 0xd88d8c });
  private readonly hintMaterial = new LineBasicMaterial({ color: 0xe0c184 });
  private readonly wallMaterial = new LineBasicMaterial({ color: 0xaeddf1 });
  private readonly selection: Line;
  private readonly range: Line;
  private readonly aimLine: Line;
  private disposed = false;
  private renderWidth: RenderWidth = 1920;
  private currentMatch: PrototypeFrame['match'] | null = null;
  private transientResources: { dispose(): void }[] = [];
  private readonly observer: ResizeObserver;
  readonly healthBars: WorldHealthBars;
  readonly targetCooldowns: TargetCooldownRings;
  private readonly shadowCasters: Mesh[] = [];
  private readonly qualityTextures = new Map<Texture, number>();

  constructor(private readonly container: HTMLElement, options: { smoothSampling?: boolean } = {}) {
    this.sanctuaryShop=new SanctuaryShop();this.scene.add(this.sanctuaryShop.group);
    this.combat.towerMuzzle = entity => this.paintedArt ? this.landmarks.towerMuzzle(entity) : null;
    const smoothSampling = options.smoothSampling ?? true;
    this.sprites.stableHealthBars = smoothSampling;
    this.sprites.heroHealthBarsVisible = false;
    this.renderer = new WebGLRenderer({ antialias: smoothSampling, alpha: false });
    this.renderer.domElement.style.imageRendering = smoothSampling ? 'auto' : 'pixelated';
    this.renderer.setPixelRatio(1); this.renderer.setClearColor(0x8293ad);
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = PCFShadowMap;
    this.renderer.outputColorSpace = SRGBColorSpace; this.renderer.toneMappingExposure = 1.05;
    this.renderer.domElement.setAttribute('aria-label', 'Three.js S01 画面样板画布');
    const edgeCoverage = this.renderer.getContext().getContextAttributes()?.antialias === true;
    this.renderer.domElement.dataset.antialias = edgeCoverage ? 'msaa' : 'unavailable';
    container.append(this.renderer.domElement);
    this.targetCooldowns = new TargetCooldownRings(container);
    this.healthBars = new WorldHealthBars(container);
    this.scene.add(this.atmosphere.group);
    this.scene.add(this.groundSnow.group);
    this.scene.add(this.crystalMotes.points);
    this.diagnosticLights.add(new AmbientLight(0xc3d4e5, 1.1));
    const sun = new DirectionalLight(0xffe4c2, 2.0); sun.position.set(-300, 600, 250); this.diagnosticLights.add(sun);
    this.scene.add(this.blockout.group, this.dynamic, this.hints, this.diagnosticLights, this.environment.group, this.central.group, this.painted.group, this.landmarks.group, this.details.group, this.smallDetails.group, this.architecturalIce.group, this.poros.group, this.ravens.group, this.layoutOverlay.group, this.sprites.group, this.combat.group);
    const circle = Array.from({ length: 65 }, (_, i) => ({ x: Math.cos(i * Math.PI / 32), y: Math.sin(i * Math.PI / 32) }));
    const circleGeometry = () => new BufferGeometry().setFromPoints(circle.map(p => new Vector3(p.x, 0, p.y)));
    this.selection = new Line(circleGeometry(), this.hintMaterial);
    this.range = new Line(circleGeometry(), this.hintMaterial);
    this.aimLine = new Line(new BufferGeometry().setFromPoints([new Vector3(), new Vector3(1, 0, 0)]), this.hintMaterial);
    this.aimLine.frustumCulled = false; // Endpoints change every frame; no stale bounding sphere.
    this.scene.add(this.selection, this.range, this.aimLine);
    this.scene.add(this.skillIndicator.group);
    this.scene.add(this.towerRangeIndicator.group);
    this.scene.add(this.contacts.group, this.pavingShadows.group, this.architecturalGlow.group);
    const treated = new Set<MeshBasicMaterial>();
    for (const root of [this.painted.group, this.landmarks.group, this.details.group, this.smallDetails.group, this.architecturalIce.group]) root.traverse(object => {
      if (!(object instanceof Mesh) || !(object.material instanceof MeshBasicMaterial)) return;
      // MSAA smooths mesh edges; alpha-to-coverage also smooths the painted
      // cutout silhouettes without blurring their interior texture details.
      object.material.userData.edgeCoverage = edgeCoverage;
      object.material.alphaToCoverage = edgeCoverage && object.material.alphaTest > 0 && !object.material.transparent;
      const role = environmentSurfaceRole(object.name);
      if (role && !treated.has(object.material)) { treated.add(object.material); surfaceResponse(object.material, role, this.quality, this.illumination); }
    });
    this.winterDressing = new WinterDressing(this.quality, [this.painted.group, this.landmarks.group], this.illumination);
    this.snowBanks = new SnowBanks(this.quality, this.illumination);
    this.scene.add(this.winterDressing.group, this.snowBanks.group);
    for (const root of [this.winterDressing.group, this.snowBanks.group]) root.traverse(object => {
      if (object instanceof Mesh && object.material instanceof MeshBasicMaterial) object.material.alphaToCoverage = edgeCoverage && object.material.alphaTest > 0 && !object.material.transparent;
    });
    // Adapt environmental anisotropy to the actual device; character atlases keep nearest sampling.
    const anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    for (const material of treated) if (material.map && !this.qualityTextures.has(material.map)) { this.qualityTextures.set(material.map, material.map.anisotropy); material.map.anisotropy = anisotropy; }
    // Forward arrow is a visible diagnostic of each actor's simulation heading.
    for (const root of [this.painted.group, this.landmarks.group, this.details.group]) root.traverse(object => { if (object instanceof Mesh && object.castShadow) this.shadowCasters.push(object); });
    this.observer = new ResizeObserver(() => this.resize()); this.observer.observe(container); this.resize();
  }
  resize(): void {
    const width = this.container.clientWidth, height = this.container.clientHeight;
    if (!width || !height || this.disposed) return;
    this.cameraRig.resize(width, height);
    const renderHeight = Math.abs(width / height - 16 / 9) < .01
      ? this.renderWidth * 9 / 16 : Math.max(1, Math.round(this.renderWidth * height / width));
    this.renderer.setSize(this.renderWidth, renderHeight, false);
  }
  setResolution(width: RenderWidth): void { this.renderWidth = width; this.resize(); }
  async prepareAssets(target: Match): Promise<void> {
    if (this.disposed) return;
    const textures = new Set<Texture>();
    this.scene.traverse(object => {
      if (!(object instanceof Mesh)) return;
      for (const material of [...(Array.isArray(object.material) ? object.material : [object.material]), object.customDepthMaterial].filter(value => !!value))
        for (const value of Object.values(material)) if (value instanceof Texture) textures.add(value);
    });
    for (const texture of textures) this.renderer.initTexture(texture);
    this.sprites.upload(this.renderer);
    // Build actual actor/material variants behind the loading screen, without ticking a match.
    const warmup = new Match({ ai: false, waves: false });
    for (const team of ['blue', 'red'] as const) for (const kind of ['melee', 'ranged'] as const)
      warmup.spawnMinion(team, kind, warmup.hero(team));
    const fog = this.fogEnabled, callback = this.onFrame;
    this.fogEnabled = false; this.onFrame = undefined;
    try {
      this.frame({ match: warmup, alpha: 1, positions: new RenderPositions(), events: [], localTeam: this.localTeam });
      this.combat.sprites.warmup(this.renderer, this.cameraRig);
      await this.renderer.compileAsync(this.scene, this.cameraRig.camera);
      this.combat.sprites.reset();
      this.currentMatch = target;
    } finally { this.fogEnabled = fog; this.onFrame = callback; }
  }
  setQuality(reduced: boolean): void {
    this.quality.reduced = reduced;
    this.atmosphere.setQuality(reduced); this.renderer.shadowMap.enabled = !reduced;
    this.scene.traverse(object => { if (object instanceof Mesh) for (const material of Array.isArray(object.material) ? object.material : [object.material]) material.needsUpdate = true; });
  }
  setEnhanced(enabled: boolean): void {
    this.quality.setEnhanced(enabled); this.renderer.shadowMap.type = enabled ? PCFShadowMap : BasicShadowMap;
    for (const [texture, original] of this.qualityTextures) {
      const anisotropy = enabled ? Math.min(8, this.renderer.capabilities.getMaxAnisotropy()) : original;
      if (texture.anisotropy !== anisotropy) { texture.anisotropy = anisotropy; texture.needsUpdate = true; }
    }
    this.scene.traverse(object => { if (object instanceof Mesh) for (const material of Array.isArray(object.material) ? object.material : [object.material]) material.needsUpdate = true; });
  }
  setQualityEffect(effect: QualityEffect, enabled: boolean): void { this.quality[effect].value = enabled ? 1 : 0; }
  setTexture(size: 32 | 64): void {
    this.blockout.material.map?.dispose(); this.blockout.material.map = pixelGrid(size); this.blockout.material.needsUpdate = true;
  }
  ground(client: Point): Point | null { return this.cameraRig.pick(client, this.renderer.domElement.getBoundingClientRect()); }
  pickActor(client: Point): number | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    return pickActorId(this.cameraRig, rect, client, [...this.actors.values()].filter(actor => !this.fogActive || this.visibleIds.has(actor.userData.entityId)), this.raycaster, { preferredTeam: this.localTeam === 'blue' ? 'red' : 'blue', paddingCss: 5 });
  }
  pickShop(client:Point):boolean {
    if(!this.currentMatch?.leagueRules||!this.paintedArt||this.presentation!=='art')return false;
    const targets=[...this.sanctuaryShop.targets,...this.landmarks.group.children.filter((mesh):mesh is Mesh=>mesh instanceof Mesh&&mesh.name==='painted-nexus')];
    return pickSanctuaryShop(this.cameraRig,this.renderer.domElement.getBoundingClientRect(),client,targets,this.localTeam,this.raycaster);
  }
  pan(dx: number, dy: number): void {
    this.following = false;
    this.cameraRig.panScreen(dx, dy);
  }
  frame(value: PrototypeFrame): void {
    if (this.disposed) return;
    if (this.localTeam !== (value.localTeam ?? 'blue')) { this.localTeam = value.localTeam ?? 'blue'; this.vision = new TeamVision(this.localTeam, brushAt); this.warFog.reset(); this.enemyTowerKnownAlive = true; }
    this.sprites.localTeam = this.localTeam;
    if (this.currentMatch !== value.match) { this.clearActors(); this.sprites.reset(); this.currentMatch = value.match; this.selectedId = null; this.vision.reset(); this.warFog.reset(); this.enemyTowerKnownAlive = true; }
    const { match, positions, alpha } = value;
    const renderedEntities = match.entities.map(entity => positions.sample(entity, alpha));
    this.visibleIds.clear();
    if (this.fogActive) {
      const wards=match.entities.filter(e=>e.kind==='hero'&&e.team===this.localTeam).flatMap(hero=>(hero.itemWards??[]).filter(ward=>ward.until>match.time));
      this.vision.update(match.time, renderedEntities, value.events, [...this.baseVision,...wards]);
      this.warFog.update(match.time, this.vision);
      for (const entity of renderedEntities) if (this.vision.entityVisible(entity)) this.visibleIds.add(entity.id);
      const enemy = this.localTeam === 'blue' ? 'red' : 'blue';
      if (this.canSeeEntity(match.tower(enemy))) this.enemyTowerKnownAlive = match.tower(enemy).hp > 0;
      if (this.selectedId !== null && !this.visibleIds.has(this.selectedId)) this.selectedId = null;
    }
    this.combat.canSeeEntity = entity => this.canSeeEntity(entity);
    this.combat.canSeePoint = point => this.canSeePoint(point);
    this.combat.consume(this.perceivedFrame(value), this.sprites);
    const art = this.presentation === 'art';
    this.renderer.toneMapping = art ? ACESFilmicToneMapping : NoToneMapping;
    this.blockout.group.visible = this.diagnosticLights.visible = !art;
    this.environment.group.visible = art && !this.centralOnly && !this.paintedArt;
    this.central.group.visible = art && this.centralOnly && !this.paintedArt;
    this.painted.group.visible = this.landmarks.group.visible = this.details.group.visible = this.smallDetails.group.visible = this.architecturalIce.group.visible = art && this.paintedArt;
    this.poros.group.visible = this.ravens.group.visible = art && this.paintedArt && this.wildlifeEnabled;
    this.sprites.group.visible = art;
    this.combat.group.visible = art;
    this.atmosphere.group.visible = art && this.paintedArt;
    this.layoutOverlay.group.visible = art && this.paintedArt && this.showLayout;
    if (this.showLayout) this.layoutOverlay.update(this.cameraRig.zoom);
    this.scene.fog = art ? this.sampleFog : null;
    const hero = trackHeroCamera(this.cameraRig, value, this.following, this.recenterHeld);
    if (art) {
      if (!this.paintedArt && !this.centralOnly) this.environment.update(match.time, match.tower('blue').hp > 0, { point: hero, height: UNIT_METRICS.hero.height, camera: this.cameraRig });
      if (this.paintedArt) {
        this.painted.update(match.time, hero, this.cameraRig);
        this.details.update(match.time); this.smallDetails.update(match.time); this.architecturalIce.update(match.time);
        this.atmosphere.update(match.time, this.cameraRig);
        this.groundSnow.update(match.time);
        const scenicHeroes = renderedEntities.filter(e => e.kind === 'hero' && e.hp > 0 && this.canSeeEntity(e));
        if (this.wildlifeEnabled) {
          this.poros.update(match.time, this.cameraRig, scenicHeroes);
          this.ravens.update(match.time, this.cameraRig, scenicHeroes);
        }
        this.landmarks.update(match.time, hero, this.cameraRig, { blue: this.fogActive && this.localTeam === 'red' ? this.enemyTowerKnownAlive : match.tower('blue').hp > 0, red: this.fogActive && this.localTeam === 'blue' ? this.enemyTowerKnownAlive : match.tower('red').hp > 0 }, [match.tower('blue'), match.tower('red')].filter(entity => this.canSeeEntity(entity)));
        this.contacts.update();
        this.pavingShadows.update();
        this.illumination.update(match.time);
        this.winterDressing.update();
        this.snowBanks.update();
        this.crystalMotes.update(match.time, this.cameraRig, this.renderer.domElement.height);
        const casterState: string[] = [];
        for (const object of this.shadowCasters) {
          if (object.castShadow) {
            object.updateWorldMatrix(true, false);
            casterState.push([object.id, object.visible, object.parent?.visible, ...object.matrixWorld.elements].join(':'));
          }
        }
        this.shadowFocus.update(this.cameraRig, this.quality.enhanced, casterState.join('|'));
        this.architecturalGlow.update();
        this.actorLighting.update();
      }
      else this.central.update(match.time, hero, this.cameraRig);
      this.sprites.update(renderedEntities.filter(entity => this.canSeeEntity(entity)), match.time, this.cameraRig, this.combat.feel, this.paintedArt);
      this.combat.update(value, this.cameraRig, this.sprites);
    }
    this.contacts.group.visible = art && this.paintedArt && this.quality.contact.value > 0;
    this.groundSnow.group.visible &&= art && this.paintedArt;
    this.winterDressing.group.visible &&= art && this.paintedArt;
    this.snowBanks.group.visible &&= art && this.paintedArt;
    this.crystalMotes.points.visible = art && this.paintedArt && !this.quality.reduced;
    this.pavingShadows.group.visible &&= art && this.paintedArt;
    this.architecturalGlow.group.visible = art && this.paintedArt && this.quality.glow.value > 0 && !this.quality.reduced;
    const active = new Set<number>();
    for (const entity of match.entities) {
      if (entity.hp <= 0) continue;
      if (!this.canSeeEntity(entity)) continue;
      active.add(entity.id);
      let mesh = this.actors.get(entity.id);
      const metrics = UNIT_METRICS[entity.kind];
      if (!mesh) {
        mesh = new Mesh(this.bodyGeometry, entity.team === 'blue' ? this.blue : this.red);
        mesh.scale.set(entity.radius, metrics.height, entity.radius); mesh.userData.entityId = entity.id;
        this.actors.set(entity.id, mesh); this.scene.add(mesh);
      }
      const p = positions.sample(entity, alpha);
      const lift = (entity.airborneUntil ?? 0) > match.time ? 30 : 0;
      const body = art && this.paintedArt && entity.kind === 'tower' ? PAINTED_TOWER_BODY : { radius: entity.radius, height: metrics.height };
      mesh.scale.set(body.radius, body.height, body.radius);
      mesh.userData.entityTeam = entity.team;
      mesh.position.copy(toThree(p, body.height / 2 + lift));
      // Picking proxies are never visible in the art presentation, even on load failure.
      mesh.visible = !art || (entity.kind === 'tower' && !this.paintedArt && entity.team !== 'blue');
      // Invisible selection proxies follow torso width, independently of the
      // much smaller simulation collision radius. Weapons never enlarge them.
      if (!mesh.visible && entity.kind !== 'tower') mesh.scale.x = metrics.halfWidth;
    }
    for (const [id, mesh] of this.actors) if (!active.has(id)) { this.scene.remove(mesh); this.actors.delete(id); }
    const selected = match.entity(this.selectedId);
    this.selection.visible = !!selected && selected.hp > 0 && this.canSeeEntity(selected);
    if (selected) { this.selection.position.copy(toThree(positions.sample(selected, alpha), 1.5)); this.selection.scale.setScalar(selected.radius + 6); }
    this.range.position.copy(toThree(hero, 1.5)); this.range.scale.setScalar(ABILITIES.q.range);
    this.range.visible = !this.attackSelecting && !art && match.phase === 'playing' && hero.hp > 0;
    const attackRange = this.attackSelecting ? Array.from({length:65},(_,i)=>({
      x:hero.x+Math.cos(i*Math.PI/32)*basicAttackRadius(hero),
      y:hero.y+Math.sin(i*Math.PI/32)*basicAttackRadius(hero),
    })) : [];
    this.skillIndicator.update(match.phase === 'playing' && hero.hp > 0
      ? this.aimKey && this.aim ? skillPreview(match,this.localTeam,this.aimKey,this.aim,entity=>this.canSeeEntity(entity))
        : this.attackSelecting ? {valid:true,range:attackRange,paths:[],fills:[]} : null : null,
      this.cameraRig.size.width,this.cameraRig.size.height);
    this.aimLine.visible = !art && !!this.aim;
    if (this.aim) {
      this.aimLine.geometry.setFromPoints([toThree(hero, 2), toThree(this.aim, 2)]);
    }
    this.clearTransients();
    if (!art) for (const entity of match.entities) if (entity.hp > 0) this.headingHint(entity);
    if (!art) for (const shot of match.projectiles) {
      const mesh = new Mesh(this.shotGeometry, shot.team === 'blue' ? this.blue : this.red);
      mesh.position.copy(toThree(shot, 16)); this.dynamic.add(mesh);
    }
    if (!art) for (const wall of match.windWalls) {
      const line = new Line(new BufferGeometry().setFromPoints(wallEnds(wall).map(p => toThree(p, 32))), this.wallMaterial);
      this.transientResources.push(line.geometry); this.dynamic.add(line);
    }
    if (!art) for (const entity of match.entities) {
      if (!entity.qCast || match.time - entity.qCast.startedAt >= YASUO_Q_CAST_SECONDS) continue;
      const heading = entity.qCast.facing;
      const end = { x: entity.x + Math.cos(heading) * ABILITIES.q.range, y: entity.y + Math.sin(heading) * ABILITIES.q.range };
      const line = new Line(new BufferGeometry().setFromPoints([toThree(entity, 12), toThree(end, 12)]), this.hintMaterial);
      this.transientResources.push(line.geometry); this.dynamic.add(line);
    }
    this.healthBars.update(value, this.cameraRig, art, this.paintedArt, entity => this.canSeeEntity(entity), this.landmarks.towerFloatEnabled ? PAINTED_TOWER_CROWN_LIFT : 0);
    this.towerRangeIndicator.update(value, this.cameraRig, entity => this.canSeeEntity(entity));
    this.targetCooldowns.update(value, this.cameraRig, art, entity => this.canSeeEntity(entity));
    this.sanctuaryShop.update(this.localTeam,art&&this.paintedArt,match.time);
    if (this.fogActive) this.warFog.render(this.renderer, this.scene, this.cameraRig);
    else this.renderer.render(this.scene, this.cameraRig.camera);
    this.onFrame?.(value);
  }
  private readonly sampleFog = new Fog(0x8293ad, 5050, 7100);
  private readonly headingGeometry = new ConeGeometry(3, 12, 3);
  private headingHint(entity: Entity): void {
    const arrow = new Mesh(this.headingGeometry, entity.team === 'blue' ? this.blue : this.red);
    arrow.rotation.z = -Math.PI / 2; arrow.rotation.y = -entity.facing;
    arrow.position.copy(toThree({ x: entity.x + Math.cos(entity.facing) * (entity.radius + 6), y: entity.y + Math.sin(entity.facing) * (entity.radius + 6) }, 4));
    this.hints.add(arrow);
  }
  private clearTransients(): void {
    this.dynamic.clear(); this.hints.clear();
    for (const resource of this.transientResources) resource.dispose(); this.transientResources = [];
  }
  private clearActors(): void {
    for (const mesh of this.actors.values()) this.scene.remove(mesh); this.actors.clear(); this.clearTransients();
  }
  dispose(): void {
    if (this.disposed) return; this.disposed = true; this.observer.disconnect(); this.clearActors();
    this.healthBars.dispose();
    this.warFog.dispose();
    this.targetCooldowns.dispose();
    this.towerRangeIndicator.dispose();
    this.sanctuaryShop.dispose();
    this.crystalMotes.dispose();
    this.winterDressing.dispose();
    this.snowBanks.dispose();
    this.qualityTextures.clear(); this.pavingShadows.dispose(); this.architecturalGlow.dispose(); this.contacts.dispose(); this.combat.dispose(); this.sprites.dispose(); this.environment.dispose(); this.central.dispose(); this.painted.dispose(); this.landmarks.dispose(); this.details.dispose(); this.smallDetails.dispose(); this.architecturalIce.dispose(); this.poros.dispose(); this.ravens.dispose(); this.layoutOverlay.dispose();
    // Include resources of removed/shared actors in the same ownership tree.
    const owned = new Group();
    owned.add(new Mesh(this.bodyGeometry, this.blue), new Mesh(this.shotGeometry, this.red), new Mesh(this.headingGeometry, this.blue));
    owned.add(new Line(new BufferGeometry(), this.wallMaterial)); this.scene.add(owned);
    this.atmosphere.dispose();
    this.groundSnow.dispose();
    disposeSceneResources(this.scene);
    this.scene.clear(); this.renderer.dispose(); this.renderer.forceContextLoss(); this.renderer.domElement.remove();
  }
}
