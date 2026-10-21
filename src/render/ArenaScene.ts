import {HealthBars} from './HealthBars';
import {towerRangeHint} from './TowerRangeHint';
import {MoveClickIndicator} from './MoveClickIndicator';
import {minionHeroVisibility} from '../game/MinionLane';
import {DashTargetTimer} from './DashTargetTimer';
import Phaser from 'phaser';
import { skillPreview, SKILL_RANGE_COLOR } from '../presentation/SkillPreview';
import { actorDepth, RENDER_DEPTH } from './RenderDepth';
import { ArenaLighting } from './ArenaLighting';
import { ArenaAccents } from './ArenaAccents';
import {CombatFeedback} from './CombatFeedback';
import {attackFrameAt} from './YasuoAnimation';
import { YASUO_R, yasuoRFrame } from '../game/YasuoR';
import { HowlingAtmosphere } from './HowlingAtmosphere';
import {SnowContact} from './SnowContact';
import {pickUnit, UNIT_METRICS,basicAttackRadius} from '../game/UnitMetrics';
import homeguardUrl from '../../assets/effects/homeguard-v1/generated/Single_isolated_pixel_art_game_VFX_sprite_for_homeguard_movement_speed_boost_Three_delicate_icy_pale_blue_and_99487f23/result_images_0_url.png?url';
import { homeguardActive } from '../game/Homeguard';
import { LayeredForest } from './LayeredForest';
import { HERO_VISUAL_SCALE, HERO_EFFECT_SCALE, HERO_ATTACHMENT_SCALE, RENDER_SCALE, toLogicalPointer, snapCameraCoordinate } from './Presentation';
import {RenderPositions} from './RenderPositions';
import rOriginalUrl from '../../assets/hero-skills/2026-10-12/yasuo/r-v1-last-breath/media/e-atlas.png?url';
import eqRingUrl from '../../assets/hero-skills/2026-10-12/yasuo/eq-v2-ring-only/media/e-atlas.png?url';
import eq3RingUrl from '../../assets/hero-skills/2026-10-12/yasuo/eq3-v1-layered-ring/refined/media/e-atlas.png?url';
import { isFrontArc } from '../../assets/hero-skills/2026-10-12/yasuo/eq3-v1-layered-ring/depth';
import spellVfxUrl from '../../assets/effects/yasuo-aura-summoners-2026-10-15/runtime/vfx-atlas.png?url';
import {SummonerVfx} from './SummonerVfx';
import {PassiveShieldVfx} from './PassiveShieldVfx';
import passiveShieldUrl from '../../assets/effects/yasuo-passive-shield-2026-10-15/runtime/shield-atlas.png?url';
import passiveShieldLayout from '../../assets/effects/yasuo-passive-shield-2026-10-15/runtime/layout.json';
import tornadoUrl from '../../assets/hero-skills/2026-10-13/yasuo/q3-v3-pale-tornado/tornado-atlas.png?url';
import { stormReady } from '../game/YasuoStorm';
import { BALANCE, BASES, WORLD } from '../game/config';
import { direction, distance } from '../game/geometry';
import { Match } from '../game/Match';
import type { AbilityKey, Entity, GameEvent, Point } from '../game/types';
import { CameraRig } from './CameraRig';
import {cameraDragStep,startCameraDrag,type CameraDragState} from './CameraDrag';
import { YasuoAnimator, flipYasuoAttack } from './YasuoAnimation';
import { Q_DIRECTION_LABELS } from './YasuoQAnimation';
import { qDrawPose, qSwordFlash, Q_FLASH_START } from './YasuoQDraw';
import {YASUO_Q_HIT_SECONDS,YASUO_Q_CAST_SECONDS} from '../game/YasuoQ';
import qDrawUrl from '../../assets/heroes/yasuo/q-draw-v2-2026-10-13/body.png?url';
import qSwordUrl from '../../assets/heroes/yasuo/q-draw-2026-10-13/sword.png?url';
import { yasuoCastFacing } from './YasuoCastFacing';
import { drawStormVfx } from './StormVfx';
import {EQ_RING_SCALE,TORNADO_SCALE,airborneLift,eqPresentation} from './SkillPresentation';
import { YASUO_TEXTURES } from './YasuoAssets';
import wUserCastUrl from '../../assets/hero-skills/2026-10-12/yasuo/w-v5-user-pose-se/media/e-atlas.png?url';
import { drawWindWall,WIND_WALL_CANVAS } from './WindWallArt';
import windWallArtUrl from '../../assets/effects/wind-wall-v2-2026-10-15/runtime/wind-wall-atlas.png?url';
import windWallArtLayout from '../../assets/effects/wind-wall-v2-2026-10-15/runtime/layout.json';
import { W_CAST_SECONDS,WIND_WALL } from '../game/WindWall';
import { E, dashEndpoint } from '../game/YasuoE';
import forestMapUrl from '../../assets/map-studies/2026-10-09/01-forest/参考图片的地形布局_为我们的像素风中路_Solo_游戏绘制一张完整的俯视地图底图_宽_a7693192/sprite_00.png?url';
import {IceFloor} from './IceFloor';
import {BridgeDecor} from './BridgeDecor';
import {HOWLING_MAP} from '../game/config';
import {BRIDGE_SLOTS,bridgePoint} from '../game/Bridge';
import {TOWER_ART,TOWER_SCALE,TOWER_ORIGIN_Y,TOWER_BAR_OFFSET} from './TowerArt';
import {structureOcclusionAlpha} from './StructureOcclusion';
import {BuildingMotion} from './BuildingMotion';
import {BattlefieldMotion} from './BattlefieldMotion';
import {AmbientWildlife} from './AmbientWildlife';
import {MINION_CLIPS,MINION_URLS,MinionAnimator} from './MinionAnimation';

const COLORS = { blue: 0x6de5db, red: 0xee8582 } as const;

export interface SceneCallbacks {
  frame: (match: Match) => void;
  event: (event: GameEvent) => void;
}

export class ArenaScene extends Phaser.Scene {
  match: Match;
  aim: Point = { x: 240, y: 135 };
  aimKey: AbilityKey | null = null;
  confirmSkill?: () => boolean;
  cancelSkill?: () => boolean;
  attackSelecting = false;
  selectedId: number | null = null;
  readonly cameraRig = new CameraRig();
  recenterHeld = false;
  simulationSpeed = 1;
  dynamicMap = true;
  buildingMotionEnabled = true;
  livingBrushEnabled = true;
  battlefieldEnabled = true;
  abyssLifeEnabled = true;
  wildlifeEnabled = true;
  private wildlife?:AmbientWildlife;
  private battlefield?:BattlefieldMotion;
  private buildingMotion?:BuildingMotion;
  iceMap = true;
  lightingEnabled = true;
  firelightMotionEnabled = true;
  materialLightingEnabled = true;
  combatFeedbackEnabled = true;
  private combatFeedback?:CombatFeedback;
  accentsEnabled = true;
  private accents?:ArenaAccents;
  atmosphereEnabled = true;
  snowContactEnabled = true;
  private snowContact?:SnowContact;
  private atmosphere?:HowlingAtmosphere;
  private lighting?:ArenaLighting;
  private staticLitViews:Phaser.GameObjects.Image[]=[];
  private staticShadows:Phaser.GameObjects.Image[]=[];
  private shadows=new Map<number,Phaser.GameObjects.Image>();
  private healthBars?:HealthBars;
  private moveClick?:MoveClickIndicator;
  private minionAnimator=new MinionAnimator();
  private dashTargetTimer?:DashTargetTimer;
  private iceFloor?:IceFloor;
  private bridgeDecor?:BridgeDecor;
  private forest?:LayeredForest;
  heroAnimationLabel = '亚索 · 待机';
  private yasuoAnimators = {blue:new YasuoAnimator(),red:new YasuoAnimator()};
  private callbacks: SceneCallbacks;
  private accumulator = 0;
  private renderPositions=new RenderPositions();
  private renderAlpha=1;
  private displayedHero():Entity{return this.renderPositions.sample(this.match.hero('blue'),this.renderAlpha);}
  private lastHudAt = -1;
  private views = new Map<number, Phaser.GameObjects.Image>();
  private wallViews = new Map<number, { image: Phaser.GameObjects.Image; texture: Phaser.Textures.CanvasTexture }>();
  private dashGhosts: Phaser.GameObjects.Image[] = [];
  private eqRings: Phaser.GameObjects.Image[] = [];
  private readyWind: Phaser.GameObjects.Image[] = [];
  private summonerVfx?:SummonerVfx;
  private passiveShieldVfx?:PassiveShieldVfx;
  private tornadoViews = new Map<number, Phaser.GameObjects.Image>();
  private qSwordViews = new Map<number, Phaser.GameObjects.Image>();
  private homeguardViews = new Map<number, Phaser.GameObjects.Image[]>();
  private ground!: Phaser.GameObjects.Graphics;
  private effects!: Phaser.GameObjects.Graphics;
  private bars!: Phaser.GameObjects.Graphics;
  private booted = false;
  private pointerInside = false;
  private dragState:{button:'left'|'middle';movement:CameraDragState}|null = null;
  private pendingSelectionId:number|null = null;
  private cursorKeys!: Phaser.Types.Input.Keyboard.CursorKeys;

  constructor(match: Match, callbacks: SceneCallbacks) {
    super({ key: 'arena' });
    this.match = match;
    this.callbacks = callbacks;
  }

  preload(): void {
    MoveClickIndicator.preload(this);
    HealthBars.preload(this);
    this.load.image('homeguard-wind',homeguardUrl);
    for(const [key,clip] of Object.entries(MINION_CLIPS)){
      const url=Object.entries(MINION_URLS).find(([path])=>path.endsWith(`/${key}.png`))![1];
      this.load.spritesheet(`minion-${key}`,url,{frameWidth:clip.width,frameHeight:clip.height,endFrame:7});
    }
    for(const [team,url] of Object.entries(TOWER_ART)) this.load.image(`tower-art-${team}`,url);
    this.load.image('forest-map', forestMapUrl);
    IceFloor.preload(this);
    if(HOWLING_MAP)BridgeDecor.preload(this);
    if(HOWLING_MAP)HowlingAtmosphere.preload(this);
    if(HOWLING_MAP)AmbientWildlife.preload(this);
    LayeredForest.preload(this);
    this.load.spritesheet('yasuo-q-draw',qDrawUrl,{frameWidth:64,frameHeight:113,endFrame:36});
    this.load.spritesheet('yasuo-q-sword',qSwordUrl,{frameWidth:135,frameHeight:39,endFrame:15});
    this.load.spritesheet('spell-vfx-atlas',spellVfxUrl,{frameWidth:256,frameHeight:320,endFrame:15});
    this.load.image('wind-wall-loop-art',windWallArtUrl);
    this.load.spritesheet('yasuo-passive-shield',passiveShieldUrl,{frameWidth:passiveShieldLayout.width,frameHeight:passiveShieldLayout.height,endFrame:7});
    this.load.spritesheet('yasuo-tornado',tornadoUrl,{frameWidth:640,frameHeight:640,endFrame:15});
    this.load.spritesheet('yasuo-r-original',rOriginalUrl,{frameWidth:176,frameHeight:176,endFrame:15});
    this.load.spritesheet('yasuo-eq-ring',eqRingUrl,{frameWidth:176,frameHeight:144,endFrame:7});
    this.load.image('yasuo-eq3-source',eq3RingUrl);
    this.load.spritesheet('yasuo-w-user-cast', wUserCastUrl, { frameWidth: 128, frameHeight: 127, endFrame: 7 });
    for (const { clip, url } of YASUO_TEXTURES) this.load.spritesheet(clip.key, url, {
      frameWidth: clip.width, frameHeight: clip.height, startFrame: 0, endFrame: clip.frame_count - 1,
    });
  }

  create(): void {
    this.makeTextures();
    this.accents=new ArenaAccents(this);
    this.combatFeedback=new CombatFeedback(this,id=>this.match.entity(id));
    this.dashTargetTimer=new DashTargetTimer(this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>this.dashTargetTimer?.reset());
    if(HOWLING_MAP)this.lighting=new ArenaLighting(this);
    if(HOWLING_MAP)this.buildingMotion=new BuildingMotion(this);
    if(HOWLING_MAP)this.battlefield=new BattlefieldMotion(this);
    for(const key of Object.keys(MINION_CLIPS)) this.textures.get(`minion-${key}`).setFilter(Phaser.Textures.FilterMode.NEAREST);
    for(const team of ['blue','red']) this.textures.get(`tower-art-${team}`).setFilter(Phaser.Textures.FilterMode.NEAREST);
    if(HOWLING_MAP) for(const slot of BRIDGE_SLOTS.filter(s=>s.id.includes('nexus-tower')||s.id.endsWith('inner'))){
      const p=bridgePoint(slot.u,slot.v);
      const tower=this.add.image(p.x,p.y,`tower-art-${slot.team}`).setOrigin(.5,TOWER_ORIGIN_Y).setScale(TOWER_SCALE).setFlipX(slot.team==='blue').setDepth(actorDepth(p.y));
      this.staticLitViews.push(tower);
      this.buildingMotion?.register(tower,'tower',slot.team==='red');
      // Ground contact is separate from the tall, directional sprite silhouette.
      const contact=this.add.graphics().setDepth(.85);
      contact.fillStyle(0x07131e,.12).fillEllipse(p.x,p.y+2,62,23);
      contact.fillStyle(0x07131e,.22).fillEllipse(p.x,p.y+1,42,13);
      this.staticShadows.push(this.add.image(p.x+6,p.y+3,`tower-art-${slot.team}`)
        .setOrigin(.5,TOWER_ORIGIN_Y).setScale(TOWER_SCALE,-TOWER_SCALE*.32)
        .setFlipX(slot.team==='blue').setRotation(-.55).setTintFill(0x071222).setAlpha(.23).setDepth(.8));
    }
    // Separate all three front arcs from their rear arcs; retain the original pixels.
    const eq3Source=this.textures.get('yasuo-eq3-source').getSourceImage() as HTMLImageElement;
    for(let layer=0;layer<2;layer++) {
      const texture=this.textures.createCanvas(`yasuo-eq3-${layer}`,704,288)!;
      const context=texture.getContext(); context.drawImage(eq3Source,0,0);
      const pixels=context.getImageData(0,0,704,288);
      for(let y=0;y<288;y++)for(let x=0;x<704;x++) {
        if(Number(isFrontArc(x%176,y%144))!==layer)pixels.data[(y*704+x)*4+3]=0;
      }
      context.putImageData(pixels,0,0); texture.refresh();
      for(let frame=0;frame<8;frame++)texture.add(frame,0,frame%4*176,Math.floor(frame/4)*144,176,144);
      texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
    this.textures.get('yasuo-w-user-cast').setFilter(Phaser.Textures.FilterMode.NEAREST);
    for(const key of ['spell-vfx-atlas','yasuo-tornado','yasuo-q-draw','yasuo-q-sword'])this.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.readyWind=[0,1,0,1].map(()=>this.add.image(0,0,'spell-vfx-atlas').setOrigin(.5,280/320).setScale(.42).setVisible(false));
    this.summonerVfx=new SummonerVfx(this);
    this.textures.get('yasuo-passive-shield').setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.passiveShieldVfx=new PassiveShieldVfx(this);
    this.textures.get('yasuo-r-original').setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.textures.get('yasuo-eq-ring').setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.eqRings=[0,1,0,1].map(()=>this.add.image(0,0,'yasuo-eq-ring').setOrigin(88/176,125/144).setScale(HERO_EFFECT_SCALE).setVisible(false));
    for (const { clip } of YASUO_TEXTURES) this.textures.get(clip.key).setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.drawMap();
    if(HOWLING_MAP)this.bridgeDecor=new BridgeDecor(this,this.buildingMotion);
    if(HOWLING_MAP)this.wildlife=new AmbientWildlife(this);
    this.ground = this.add.graphics().setDepth(1);
    this.effects = this.add.graphics().setDepth(RENDER_DEPTH.feedback);
    this.bars = this.add.graphics().setDepth(RENDER_DEPTH.bars);
    this.healthBars=new HealthBars(this);
    this.moveClick=new MoveClickIndicator(this);
    for(const key of ['health-hero-frame','health-tower-frame'])this.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.dashGhosts = [0,1,2,0,1,2].map(()=>this.add.image(0,0,'blue-hero').setVisible(false));
    this.input.mouse?.disableContextMenu();
    this.cursorKeys = this.input.keyboard!.createCursorKeys();
    this.cameraRig.reset(this.match.hero('blue'));
    this.applyCamera();
    this.input.on('gameover', () => { this.pointerInside = true; });
    this.input.on('gameout', () => {
      this.pointerInside = false;
      this.dragState = null;
      this.pendingSelectionId = null;
      this.game.canvas.style.cursor='';
    });
    this.input.on('pointerup', (pointer:Phaser.Input.Pointer) => {
      if(this.dragState?.button==='left'&&pointer.button===0&&!this.dragState.movement.active&&this.match.phase==='playing'){
        this.selectedId=this.pendingSelectionId;
      }
      this.dragState=null;
      this.pendingSelectionId=null;
      this.game.canvas.style.cursor='';
    });
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      this.pointerInside = true;
      const drag=this.dragState;
      if(drag&&(drag.button==='left'?pointer.leftButtonDown():pointer.middleButtonDown())){
        const step=cameraDragStep(drag.movement,{x:pointer.x,y:pointer.y},this.cameraRig.zoom);
        drag.movement=step.state;
        if(step.pan){
          this.cameraRig.pan(step.pan.x,step.pan.y);
          this.applyCamera();
          this.game.canvas.style.cursor='grabbing';
        }
      }
      this.updateAim(pointer);
    });
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.pointerInside = true;
      this.updateAim(pointer);
      if (this.match.phase !== 'playing') return;
      if (pointer.middleButtonDown()) {
        this.dragState={button:'middle',movement:startCameraDrag({x:pointer.x,y:pointer.y},true)};
        this.cameraRig.following = false;
        return;
      }
      if(pointer.leftButtonDown()){
        if(this.confirmSkill?.()){this.dragState=null;this.pendingSelectionId=null;return;}
        if(this.attackSelecting){
          this.moveClick?.show(this.aim,this.time.now,true);
          this.attackSelecting=false;
          this.dragState=null;
          this.pendingSelectionId=null;
          const target=this.pickEntity(this.aim);
          if(target&&target.team!=='blue'&&target.hp>0){
            this.match.orderAttack('blue',target.id);
            this.selectedId=target.id;
          }else{
            this.match.orderAttackMove('blue',this.aim);
            this.selectedId=null;
          }
          return;
        }
        this.dragState={button:'left',movement:startCameraDrag({x:pointer.x,y:pointer.y})};
        this.pendingSelectionId=this.pickEntity(this.aim)?.id??null;
        return;
      }
      const hit = this.pickEntity(this.aim);
      if (pointer.rightButtonDown()) {
        if(this.cancelSkill?.())return;
        this.attackSelecting=false;
        if (hit && hit.team !== 'blue') {
          this.match.orderAttack('blue', hit.id);
          this.selectedId = hit.id;
        } else {
          this.match.orderMove('blue', this.aim);
          this.moveClick?.show(this.aim,this.time.now);
          this.selectedId = null;
        }
      }
    });
    this.input.on('wheel', (_pointer: Phaser.Input.Pointer, _objects: Phaser.GameObjects.GameObject[], _dx: number, dy: number) => {
      if (this.match.phase === 'playing' && dy !== 0) this.cameraRig.zoomStep(dy < 0);
    });
    this.game.canvas.addEventListener('mousedown', event => { if (event.button === 1) event.preventDefault(); });
    this.game.canvas.addEventListener('wheel', event => { event.preventDefault(); }, { passive: false });
    this.booted = true;
    this.renderMatch();
  }

  setMatch(match: Match): void {
    this.passiveShieldVfx?.reset();
    this.summonerVfx?.reset();
    this.wildlife?.reset();
    this.battlefield?.reset();
    this.bridgeDecor?.reset();
    this.snowContact?.reset();
    this.atmosphere?.reset();
    this.accents?.clear();
    this.combatFeedback?.reset();
    this.healthBars?.reset();
    this.moveClick?.reset();
    this.minionAnimator.reset();
    this.dashTargetTimer?.reset();
    for (const view of this.views.values()) view.destroy();
    this.views.clear();
    for (const {image, texture} of this.wallViews.values()) { image.destroy(); this.textures.remove(texture.key); }
    this.wallViews.clear();
    Object.values(this.yasuoAnimators).forEach(animator=>animator.reset());
    this.tweens.killAll();
    this.children.list.filter(c => c instanceof Phaser.GameObjects.Text && c.getData('transient')).forEach(c => c.destroy());
    this.match = match;
    this.accumulator = 0;
    this.renderPositions.reset();this.renderAlpha=1;
    this.lastHudAt = -1;
    this.selectedId = null;
    this.aimKey = null;
    this.attackSelecting = false;
    this.recenterHeld = false;
    this.dragState = null;
    this.pendingSelectionId = null;
    this.game.canvas.style.cursor='';
    this.cameraRig.reset(match.hero('blue'));
    if (this.booted) { this.applyCamera(); this.updateAim(this.input.activePointer); this.renderMatch(); }
  }

  update(time: number, delta: number): void {
    if (this.match.phase === 'playing') {
      this.accumulator += Math.min(delta / 1000, 0.25) * this.simulationSpeed;
      while (this.accumulator >= WORLD.step) {
        this.renderPositions.capture(this.match.entities);
        this.match.step(WORLD.step);
        this.accumulator -= WORLD.step;
        if (this.match.phase !== 'playing') { this.accumulator = 0; break; }
      }
    } else this.accumulator = 0;
    this.renderAlpha=this.match.phase==='playing'?this.accumulator/WORLD.step:1;
    for (const event of this.match.drainEvents()) {
      this.showEvent(event);
      this.callbacks.event(event);
    }
    this.updateCamera(Math.min(delta / 1000, 0.1));
    this.renderMatch();
    if (time - this.lastHudAt > 80) {
      this.callbacks.frame(this.match);
      this.lastHudAt = time;
    }
  }

  private updateAim(pointer: Phaser.Input.Pointer): void {
    // Never use screen coordinates as simulation coordinates after camera movement.
    this.aim = this.cameraRig.screenToWorld(toLogicalPointer(pointer));
    const target=this.pickEntity(this.aim);
    const staticTower=!target&&this.staticLitViews.some(view=>Math.abs(this.aim.x-view.x)<38&&this.aim.y>view.y-145&&this.aim.y<view.y+12);
    this.game.canvas.dataset.cursor=this.aimKey||this.attackSelecting?'target':target&&target.hp>0?(target.team==='blue'?'ally':'enemy'):staticTower?'locked':'move';
    this.game.canvas.title=staticTower?'防御塔 · 不可攻击':'';
  }

  private applyCamera(): void {
    this.iceFloor?.setSmoothSampling(this.cameraRig.following || this.recenterHeld || !!this.cursorKeys?.space.isDown);
    const camera = this.cameras.main;
    camera.setBounds(0, 0, WORLD.width, WORLD.height);
    camera.setZoom(this.cameraRig.zoom * RENDER_SCALE).centerOn(this.cameraRig.center.x, this.cameraRig.center.y);
    camera.roundPixels = false;
  }

  private updateCamera(dt: number): void {
    if (this.match.phase === 'playing') {
      const keys = this.cursorKeys;
      let dx = Number(keys.right.isDown) - Number(keys.left.isDown);
      let dy = Number(keys.down.isDown) - Number(keys.up.isDown);
      const pointer = toLogicalPointer(this.input.activePointer);
      if (!this.cameraRig.following && this.pointerInside && !this.dragState && !this.recenterHeld) {
        if (pointer.x < 10) dx--;
        if (pointer.x > this.cameraRig.viewport.width - 10) dx++;
        if (pointer.y < 10) dy--;
        if (pointer.y > this.cameraRig.viewport.height - 10) dy++;
      }
      if (this.recenterHeld || keys.space.isDown) this.cameraRig.lookAt(this.displayedHero());
      else if (dx || dy) {
        const length = Math.hypot(dx, dy), speed = 125 * dt;
        this.cameraRig.pan(dx / length * speed, dy / length * speed);
      } else if (this.cameraRig.following) this.cameraRig.lookAt(this.displayedHero());
    }
    this.applyCamera();
    // Refresh even for a stationary mouse while the camera or hero moves.
    this.updateAim(this.input.activePointer);
  }

  private pickEntity(point: Point): Entity | undefined {
    return pickUnit(this.match.entities,point);
  }

  abilityAim(key:AbilityKey):Point {
    const target=this.pickEntity(this.aim);
    // Model clicks aim at the ground position used by combat collision.
    return (key==='q'||key==='r')&&target&&target.team!=='blue'?{x:target.x,y:target.y}:this.aim;
  }

  private makeTextures(): void {
    for (const team of ['blue', 'red'] as const) {
      const light = COLORS[team], dark = team === 'blue' ? 0x2e777b : 0x934e57;
      for (const kind of ['hero', 'melee', 'ranged', 'tower'] as const) {
        const key = `${team}-${kind}`;
        if (this.textures.exists(key)) continue;
        const width = kind === 'tower' || kind === 'hero' ? 32 : 16;
        const height = kind === 'tower' ? 48 : width;
        const g = this.make.graphics({ x: 0, y: 0 });
        if (kind === 'hero') {
          g.fillStyle(0x08161c).fillRect(7, 5, 18, 23);
          g.fillStyle(dark).fillRect(7, 15, 18, 11).fillRect(6, 22, 6, 5);
          g.fillStyle(light).fillRect(11, 6, 10, 5).fillRect(9, 13, 14, 8);
          g.fillStyle(0xc5e1db).fillRect(12, 4, 8, 3).fillRect(13, 11, 6, 3);
          g.fillStyle(0x152b36).fillRect(12, 8, 8, 3).fillRect(12, 21, 4, 7).fillRect(19, 21, 4, 7);
          g.fillStyle(0xa6bec7).fillRect(24, 12, 2, 13).fillRect(23, 18, 4, 2);
          g.fillStyle(0xf3e1af).fillRect(14, 16, 3, 3);
        } else if (kind === 'tower') {
          g.fillStyle(0x28312e).fillRect(3, 36, 26, 8).fillRect(8, 12, 17, 26);
          g.fillStyle(0x626852).fillRect(4, 36, 24, 6).fillRect(9, 16, 14, 22);
          g.fillStyle(0x8b8d6c).fillRect(6, 34, 21, 4).fillRect(9, 14, 15, 5).fillRect(10, 20, 4, 12);
          g.fillStyle(0x434e41).fillRect(17, 20, 6, 14).fillRect(8, 29, 18, 3);
          g.fillStyle(0xb1ab80).fillRect(5, 36, 9, 2).fillRect(10, 15, 6, 2);
          g.fillStyle(0x49633c).fillRect(5, 39, 6, 3).fillRect(23, 34, 4, 3);
          g.fillStyle(dark).fillRect(12, 4, 9, 11).fillRect(14, 19, 6, 8);
          g.fillStyle(light).fillRect(14, 2, 5, 15).fillRect(11, 7, 11, 5).fillRect(15, 20, 3, 5);
          g.fillStyle(0xe3f8e8).fillRect(15, 3, 2, 8);
        } else {
          g.fillStyle(0x0b1720).fillRect(3, 3, 10, 11);
          g.fillStyle(dark).fillRect(4, 7, 8, 6);
          g.fillStyle(light).fillRect(5, 3, 6, 4).fillRect(5, 8, 6, 3);
          g.fillStyle(0x273741).fillRect(5, 5, 5, 2).fillRect(4, 12, 3, 2).fillRect(10, 12, 3, 2);
          if (kind === 'ranged') {
            g.fillStyle(0xd4ba8d).fillRect(13, 4, 1, 9);
            g.fillStyle(light).fillRect(12, 2, 3, 3);
          } else g.fillStyle(0x94a9b4).fillRect(12, 7, 2, 6);
        }
        g.generateTexture(key, width, height);
        g.destroy();
      }
    }
  }

  private drawMap(): void {
    if(HOWLING_MAP)this.atmosphere=new HowlingAtmosphere(this);
    if(HOWLING_MAP)this.snowContact=new SnowContact(this);
    this.textures.get('forest-map').setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.forest=new LayeredForest(this);
    this.iceFloor=new IceFloor(this);
    if(!HOWLING_MAP){
      const g = this.add.graphics().setDepth(1);
      for (const team of ['blue', 'red'] as const) {
        const base = BASES[team];
        const radius = BALANCE.fountainRadius;
        g.fillStyle(COLORS[team], 0.1).fillCircle(base.x, base.y, radius);
        g.lineStyle(1, COLORS[team], 0.5).strokeCircle(base.x, base.y, radius).strokeCircle(base.x, base.y, radius * 0.7);
        g.fillStyle(COLORS[team], 0.5).fillRect(base.x - 4, base.y - 14, 8, 28).fillRect(base.x - 14, base.y - 4, 28, 8);
      }
    }
  }

  private renderMatch(): void {
    if (!this.booted) return;
    const entities=this.match.entities.map(e=>e.kind==='tower'?e:this.renderPositions.sample(e,this.renderAlpha));
    this.ground.clear(); this.bars.clear(); this.effects.clear();
    this.moveClick?.update(this.time.now);
    this.healthBars?.begin(this.match.entities,this.match.time);
    this.dashTargetTimer?.update(entities,this.match.eTargetLocks,this.match.time);
    if(this.combatFeedback){this.combatFeedback.enabled=this.combatFeedbackEnabled;this.combatFeedback.update(this.match.time);}
    if(this.accents){this.accents.enabled=this.accentsEnabled;this.accents.update(this.match);}
    this.dashGhosts.forEach(image=>image.setVisible(false));
    this.eqRings.forEach(image=>image.setVisible(false));
    this.readyWind.forEach(image=>image.setVisible(false));
    this.summonerVfx?.update(this.match);
    this.passiveShieldVfx?.update(entities,this.match.time);
    const liveIds = new Set(this.match.entities.map(e => e.id));
    this.minionAnimator.retain(liveIds);
    for (const [id, images] of this.homeguardViews) if (!liveIds.has(id)) { images.forEach(image=>image.destroy()); this.homeguardViews.delete(id); }
    for (const [id, view] of this.views) if (!liveIds.has(id)) { view.destroy(); this.views.delete(id); }
    const hero = entities.find(e=>e.kind==='hero'&&e.team==='blue')!;
    if(this.attackSelecting&&this.match.phase==='playing'&&hero.hp>0){
      this.ground.fillStyle(0x65d9ed,.035).fillCircle(hero.x,hero.y,basicAttackRadius(hero));
      this.ground.lineStyle(1,0x89eaff,.8).strokeCircle(hero.x,hero.y,basicAttackRadius(hero));
    }
    this.forest?.update(this.match.time,hero,this.dynamicMap,!this.iceMap);
    this.iceFloor?.setVisible(this.iceMap);
    const mobileActors=entities.filter(e=>e.hp>0&&e.kind!=='tower');
    const heroActors=mobileActors.filter(e=>e.kind==='hero');
    this.wildlife?.update(this.match.time,this.wildlifeEnabled&&this.iceMap&&this.dynamicMap,mobileActors);
    this.bridgeDecor?.update(this.match.time,this.iceMap,this.dynamicMap,mobileActors,this.livingBrushEnabled,this.wildlife?.disturbances);
    this.battlefield?.update(this.match,this.iceMap&&this.dynamicMap&&this.battlefieldEnabled);
    this.atmosphere?.update(this.match.time,this.atmosphereEnabled&&this.iceMap,this.dynamicMap,this.abyssLifeEnabled);
    this.snowContact?.update(this.match,this.snowContactEnabled&&this.dynamicMap&&this.iceMap);
    if(this.lighting){
      this.lighting.enabled=this.lightingEnabled;
      this.lighting.motionEnabled=this.firelightMotionEnabled;
      this.lighting.update(this.match,this.iceMap,this.dynamicMap);
      this.iceFloor?.setLighting(this.lightingEnabled&&this.lighting.supported);
      this.iceFloor?.setMaterial(this.materialLightingEnabled);
      this.staticLitViews.forEach(view=>this.lighting!.receive(view));
      this.staticShadows.forEach(view=>view.setVisible(this.lightingEnabled&&this.lighting!.supported));
    }
    for(const view of this.staticLitViews)view.setAlpha(structureOcclusionAlpha('tower',{x:view.x,y:view.y},mobileActors));
    for(const [id,shadow] of this.shadows)if(!liveIds.has(id)){shadow.destroy();this.shadows.delete(id);}
    for (const entity of entities) {
      if (entity.kind === 'hero') {
        let winds=this.homeguardViews.get(entity.id);
        if(!winds){winds=[0,1].map(()=>this.add.image(0,0,'homeguard-wind').setBlendMode(Phaser.BlendModes.ADD));this.homeguardViews.set(entity.id,winds);}
        const running=homeguardActive(entity,this.match.time) && !!entity.destination && distance(entity,entity.destination)>1;
        winds.forEach((wind,i)=>{
          const phase=(this.match.time*2.4+i*.5)%1;
          const back=10+phase*28, side=i===0?-9:9;
          const c=Math.cos(entity.facing),s=Math.sin(entity.facing);
          wind.setVisible(running).setPosition(entity.x-c*back-s*side,entity.y-s*back+c*side-3)
            .setRotation(entity.facing).setDisplaySize(72+phase*22,45)
            .setAlpha(Math.sin(phase*Math.PI)*.7).setDepth(actorDepth(entity.y,-1));
        });
      }
      let view = this.views.get(entity.id);
      if (!view) {
        view = this.add.image(entity.x, entity.y, `${entity.team}-${entity.kind}`).setOrigin(0.5, 0.875);
        this.views.set(entity.id, view);
      }
      const moving = entity.speed > 0 && (entity.destination || (entity.targetId && !entity.windup && entity.cooldown <= 0));
      const bob = moving && this.match.phase === 'playing' ? Math.floor(this.match.time * 7 + entity.id) % 2 : 0;
      const isYasuo = entity.kind === 'hero';
      const isMinion=entity.kind==='melee'||entity.kind==='ranged';
      if (isYasuo) {
        const sample = this.yasuoAnimators[entity.team].sample(entity, this.match.time), clip = sample.clip;
        const offset=entity.team==='blue'?0:1;
        const readyWind=this.readyWind.slice(offset*2,offset*2+2),eqRings=this.eqRings.slice(offset*2,offset*2+2),dashGhosts=this.dashGhosts.slice(offset*3,offset*3+3);
        const actionTime=this.combatFeedbackEnabled?this.combatFeedback?.feel.actionTime(entity.id,this.match.time)??this.match.time:this.match.time;
        if((sample.state==='A'||sample.state==='B')&&'impact_frame' in clip)sample.frame=attackFrameAt(entity,actionTime,clip);
        view.setTexture(clip.key, sample.frame).setOrigin(clip.anchor[0] / clip.width, clip.anchor[1] / clip.height).setScale(sample.scale * HERO_VISUAL_SCALE);
        const action = sample.state === 'joke' ? '玩笑 · 抛酒壶' : sample.state === 'taunt' ? '挑衅 · 饮酒洒刃' : sample.state === 'laugh' ? '大笑' : sample.state === 'flute' ? '吹箫' : sample.state === 'Q' ? `Q 戳刺 · ${Q_DIRECTION_LABELS['direction' in clip ? clip.direction : 'e']}`
          : sample.state === 'E' ? `E 滑行 · ${Q_DIRECTION_LABELS['direction' in clip ? clip.direction : 'e']}` : sample.state === 'idle' ? '待机' : sample.state === 'walk' ? '走路' : `攻击 ${sample.state}`;
        if(entity.team==='blue') this.heroAnimationLabel = `亚索 · ${action} · ${sample.frame + 1}/${clip.frame_count}帧`;
        // Mirror only A/B for left-side targets, preserving the off-center foot anchor.
        const attackFlip=(sample.state==='A'||sample.state==='B')&&flipYasuoAttack(entity.facing);
        view.setFlipX(attackFlip);
        if(attackFlip)view.setOrigin(1-clip.anchor[0]/clip.width,clip.anchor[1]/clip.height);
        if(stormReady(entity,this.match.time)) {
          const age=Math.max(0,this.match.time-(entity.qReadyAt??this.match.time));
          const frame=Math.floor(age*12)%4;
          const fade=Math.min(1,age/.15,Math.max(0,(entity.qStacksUntil??this.match.time)-this.match.time)/.25);
          readyWind.forEach((image,i)=>image.setVisible(true).setFrame(frame+i*4).setAlpha(fade*(i?.85:.72))
            .setScale(.42,.42*(1+Math.sin(age*9)*.025)).setPosition(Math.round(entity.x),Math.round(entity.y))
            .setDepth(actorDepth(entity.y,i?.1:-.1)));
          // Small rising strands give the loop continuous upward motion between frames.
          for(let i=0;i<9;i++){
            const t=(age*.95+i/9)%1,side=i%2?1:-1;
            const x=entity.x+side*(23+Math.sin(t*7+i)*5),y=entity.y-t*104;
            this.effects.lineStyle(1,0xc4f4ff,fade*Math.sin(t*Math.PI)*.6)
              .lineBetween(x,y,x-side*2,y+5);
          }
          if(entity.team==='blue') this.heroAnimationLabel+=' · Q3 已蓄风';
        }
        if(entity.eqCast && entity.hp>0) {
          const age=this.match.time-entity.eqCast.startedAt;
          const spin=eqPresentation(entity.eqCast,this.match.time);
          if(spin.visible) {
            eqRings.forEach((image,i)=>{
              image.setVisible(true).setTexture(entity.eqCast!.empowered?`yasuo-eq3-${i}`:'yasuo-eq-ring',spin.frame).setScale(EQ_RING_SCALE).setAlpha(spin.alpha);
              if(entity.eqCast!.empowered)image.setCrop();
              else image.setCrop(0,i?88:0,176,i?56:88);
              image.setPosition(Math.round(entity.x),Math.round(entity.y)).setDepth(actorDepth(entity.y,i?.1:-.1));
            });
          }
          if(entity.team==='blue'&&age>=0)this.heroAnimationLabel=entity.eqCast.empowered?'亚索 · EQ3 多层环斩':'亚索 · EQ 环斩';
        }
        if (sample.state === 'E' && entity.eCast) {
          const cast=entity.eCast, age=this.match.time-cast.startedAt;
          const p=Math.max(0,Math.min(1,(age-E.startup)/E.dash));
          // Preserve the user-approved pose: no squash, rotation or extra sword arc.
          if(age>E.startup && age<E.startup+E.dash+E.recovery) {
            for(let i=0;i<3;i++) {
              const previous=Math.max(0,p-(i+1)*0.12);
              dashGhosts[i].setVisible(p>0).setTexture(clip.key,sample.frame)
                .setOrigin(clip.anchor[0]/clip.width,clip.anchor[1]/clip.height).setScale(sample.scale * HERO_VISUAL_SCALE)
                .setPosition(cast.start.x+(cast.end.x-cast.start.x)*previous,cast.start.y+(cast.end.y-cast.start.y)*previous)
                .setDepth(actorDepth(entity.y,-1)).setTint(0xafece8).setAlpha((0.22-i*0.06)*(1-Math.min(1,Math.max(0,(age-E.startup-E.dash)/E.recovery))));
            }
            const tail=Math.max(0,p-.36), tx=cast.start.x+(cast.end.x-cast.start.x)*tail, ty=cast.start.y+(cast.end.y-cast.start.y)*tail;
            this.effects.lineStyle(2,0xb7eeec,0.45).lineBetween(tx,ty-8,entity.x,entity.y-8);
          }
        }
        if(sample.state==='Q' && entity.qCast){
          const age=this.combatFeedbackEnabled?this.combatFeedback?.feel.qAge(entity.id,entity.qCast.startedAt,this.match.time,Q_FLASH_START,YASUO_Q_CAST_SECONDS)??this.match.time-entity.qCast.startedAt:this.match.time-entity.qCast.startedAt;
          const pose=qDrawPose(age,entity.qCast.facing);
          view.setTexture('yasuo-q-draw',pose.frame).setOrigin(pose.originX,pose.originY).setScale(HERO_EFFECT_SCALE).setFlipX(pose.flipX);
          if(entity.team==='blue') this.heroAnimationLabel=`亚索 · Q 拔刀 v2 · 刀身闪光 · ${pose.frame+1}/37帧`;
        }
        if (entity.wCast && entity.hp > 0 && this.match.time < entity.wCast.startedAt + W_CAST_SECONDS) {
          const frame = Math.min(7, Math.floor((this.match.time - entity.wCast.startedAt) * 10));
          const facing=yasuoCastFacing(entity.wCast.facing);
          view.setTexture('yasuo-w-user-cast', frame).setOrigin(facing.originX,facing.originY).setScale(HERO_EFFECT_SCALE).setFlipX(facing.flipX);
          if(entity.team==='blue') this.heroAnimationLabel = `亚索 · W 横斩 · ${frame + 1}/8帧`;
        }
        if(entity.q3Cast && entity.hp>0) {
          const frame=Math.min(7,Math.floor((this.match.time-entity.q3Cast.startedAt)*10));
          const facing=yasuoCastFacing(entity.q3Cast.facing);
          view.setTexture('yasuo-w-user-cast',frame).setOrigin(facing.originX,facing.originY).setScale(HERO_EFFECT_SCALE).setFlipX(facing.flipX);
          if(entity.team==='blue') this.heroAnimationLabel=`亚索 · Q3 横斩 · ${frame+1}/8帧`;
        }
      }
      const lift=airborneLift(entity,this.match.time);
      const cameraBounds=this.cameraRig.bounds;
      const snapX=(value:number)=>snapCameraCoordinate(value,cameraBounds.x,this.cameraRig.zoom);
      const snapY=(value:number)=>snapCameraCoordinate(value,cameraBounds.y,this.cameraRig.zoom);
      const impactAge=this.match.time-entity.hitAt;
      const impact=entity.kind!=='tower'&&entity.hitFrom&&impactAge>=0&&impactAge<.14
        ?Math.pow(1-impactAge/.14,2)*3.5:0;
      const impactDirection=entity.hitFrom?direction(entity.hitFrom,entity):{x:0,y:0};
      const reaction=this.combatFeedbackEnabled?this.combatFeedback?.feel.reaction(entity.id,this.match.time):undefined;
      const renderX=entity.x+(reaction?.active?reaction.x:impactDirection.x*impact),renderY=entity.y+(reaction?.active?reaction.y:impactDirection.y*impact);
      view.setPosition(snapX(renderX), snapY(renderY - (isYasuo ? 0 : bob)-lift));
      if(isYasuo&&entity.rCast&&entity.hp>0){
        const age=this.match.time-entity.rCast.startedAt;
        if(age<YASUO_R.animationDuration){view.setTexture('yasuo-r-original',yasuoRFrame(age)).setOrigin(104/176,149/176).setScale(HERO_EFFECT_SCALE).setFlipX(false);}
          if(entity.team==='blue') this.heroAnimationLabel=age<YASUO_R.animationDuration?'亚索 · R 狂风绝息斩 · 慢速':'亚索 · R 收势';
      }
      view.setDepth(actorDepth(entity.y));
      if (!isYasuo) view.setScale(entity.kind === 'hero' ? HERO_VISUAL_SCALE : 1).setFlipX(entity.kind !== 'tower' && Math.cos(entity.facing) < 0);
      if(entity.kind==='tower') {
        view.setTexture(`tower-art-${entity.team}`).setOrigin(.5,TOWER_ORIGIN_Y).setScale(TOWER_SCALE).setFlipX(entity.team==='blue');
        this.buildingMotion?.register(view,'tower',entity.team==='red',()=>entity.hp>0);
      }
      if(isMinion){
        const pose=this.minionAnimator.sample(entity,this.match.time);
        view.setTexture(pose.key,pose.frame).setOrigin(pose.originX,pose.originY).setScale(pose.scale)
          .setFlipX(pose.flip).setPosition(snapX(renderX),snapY(renderY-lift+pose.breathing));
      }
      view.setAlpha((entity.hp > 0 ? 1 : 0.25)*(isMinion?minionHeroVisibility(entity,heroActors,entity.id===this.selectedId||entity.id===hero.targetId):1)*(entity.kind==='tower'&&this.iceMap
        ?structureOcclusionAlpha('tower',entity,mobileActors):1));
      this.lighting?.receive(view);
      if(this.lighting?.supported){
        let shadow=this.shadows.get(entity.id);
        if(!shadow){shadow=this.add.image(0,0,view.texture.key);this.shadows.set(entity.id,shadow);}
        shadow.setTexture(view.texture.key,view.frame.name).setOrigin(view.originX,view.originY)
          .setPosition(entity.x+6,entity.y+3).setScale(view.scaleX,-view.scaleY*.32)
          .setFlip(view.flipX,false).setRotation(-.55).setTintFill(0x071222).setAlpha(.23)
          .setDepth(.8).setVisible(this.lightingEnabled&&entity.hp>0);
      }
      if(isMinion){
        if(reaction?.flash)view.setTintFill(0xeafff6);
        else if(this.match.time-entity.hitAt<.06)view.setTint(0xb9c7ce);
        else view.clearTint();
      }else if (reaction?.active?reaction.flash:this.match.time-entity.hitAt<.06) view.setTintFill(0xeafff6); else view.clearTint();
      if (entity.hp <= 0) continue;
      const footprintScale=1;
      const contactWidth=(entity.radius*2+4)*footprintScale,contactHeight=(entity.radius+2)*footprintScale;
      this.ground.fillStyle(0x061016,.12).fillEllipse(entity.x,entity.y+1,contactWidth*1.2,contactHeight*1.12);
      this.ground.fillStyle(0x061016,.28).fillEllipse(entity.x,entity.y+1,contactWidth*.8,contactHeight*.68);
      if(isYasuo&&entity.team!=='blue')this.ground.lineStyle(1.5,COLORS[entity.team],.8).strokeEllipse(entity.x,entity.y+1,entity.radius*2+8,12);
      const selected = entity.id === this.selectedId || entity.id === hero.targetId;
      if (selected) this.ground.lineStyle(1, entity.team === 'blue' ? COLORS.blue : 0xf9cd8e, 0.9).strokeEllipse(entity.x, entity.y + 1, (entity.radius * 2 + 9)*footprintScale, (entity.radius + 7)*footprintScale);
      if (entity.guardUntil > this.match.time) this.effects.lineStyle(1, COLORS[entity.team], 0.85).strokeCircle(entity.x, entity.y - 9, 15);
      // World-space proximity keeps panning the camera from revealing distant tower UI.
      const towerHint=entity.kind==='tower'&&hero.hp>0
        ?Math.max(0,Math.min(1,(entity.range+hero.radius+85-distance(hero,entity))/65)):0;
      const rangeHint=towerRangeHint(entity,hero);
      if(rangeHint)this.ground.lineStyle(rangeHint.danger?1.5:1,rangeHint.color,rangeHint.alpha).strokeCircle(entity.x,entity.y,rangeHint.radius);
      if(entity.kind==='tower'&&entity.team!==hero.team&&towerHint===0)continue;
      const barAlpha=isMinion?((selected||entity.hp<entity.maxHp)? .9:.5):entity.kind==='tower'&&entity.team!==hero.team?towerHint:1;
      const width = entity.kind === 'tower' ? 86 : entity.kind === 'hero' ? Math.round(32*HERO_ATTACHMENT_SCALE) : 18;
      let y = snapY(entity.y - lift - (entity.kind === 'tower' ? TOWER_BAR_OFFSET : isYasuo ? 33*HERO_VISUAL_SCALE : entity.kind === 'hero' ? 28*HERO_VISUAL_SCALE : UNIT_METRICS[entity.kind].height+5));
      if(entity.kind==='hero'&&entity.team!==hero.team&&Math.abs(entity.x-hero.x)<width+6&&Math.abs(entity.y-hero.y)<18)y-=18;
      const x = snapX(entity.x - width / 2);
      this.healthBars?.draw(this.bars,entity,this.match.time,x,y,width,barAlpha);
      if (entity.hp <= hero.damage && entity.team === 'red' && (entity.kind === 'melee' || entity.kind === 'ranged')) {
        this.bars.fillStyle(0xfbd8a0).fillRect(x - 3, y, 1, 2);
      }
    }
    this.buildingMotion?.update(this.match.time,this.iceMap,this.buildingMotionEnabled&&this.dynamicMap,this.firelightMotionEnabled);
    const wallIds = new Set(this.match.windWalls.map(w => w.id));
    for (const [id, value] of this.wallViews) if (!wallIds.has(id)) {
      value.image.destroy(); this.textures.remove(value.texture.key); this.wallViews.delete(id);
    }
    for (const wall of this.match.windWalls) {
      let value = this.wallViews.get(wall.id);
      if (!value) {
        const texture = this.textures.createCanvas(`wind-wall-${wall.id}`, WIND_WALL_CANVAS.size, WIND_WALL_CANVAS.size)!;
        texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
        value = { texture, image: this.add.image(wall.x, wall.y, texture.key).setOrigin(WIND_WALL_CANVAS.originX/WIND_WALL_CANVAS.size, WIND_WALL_CANVAS.originY/WIND_WALL_CANVAS.size) };
        this.wallViews.set(wall.id, value);
      }
      const age = (this.match.time - wall.startsAt) * 1000;
      const context = value.texture.context;
      context.clearRect(0, 0, WIND_WALL_CANVAS.size, WIND_WALL_CANVAS.size);
      // Game coordinates are already map-projected: do not squash ground Y a second time.
      if (age >= 0) drawWindWall(context, { center: {x: 0, y: 0}, angle: wall.angle * 180 / Math.PI,
        width: WIND_WALL.width, height: WIND_WALL.height, thickness: WIND_WALL.thickness }, { origin: {x: WIND_WALL_CANVAS.originX, y: WIND_WALL_CANVAS.originY}, groundScale: 1 }, age, age,
        {image:this.textures.get('wind-wall-loop-art').getSourceImage() as HTMLImageElement,...windWallArtLayout});
      value.texture.refresh(); value.image.setPosition(wall.x, wall.y).setDepth(actorDepth(wall.y,1));
    }
    const dashTarget=this.match.dashTarget(this.aim);
    if (dashTarget && this.match.phase==='playing' && !hero.eCast && !this.aimKey) {
      const valid=!this.match.dashError(this.aim), color=valid?0xadeee5:0x9c7777;
      this.ground.lineStyle(1,color,0.9).strokeEllipse(dashTarget.x,dashTarget.y+1,dashTarget.radius*2+10,10);
      if(valid) {
        const end=dashEndpoint(hero,dashTarget);
        this.ground.lineStyle(1,color,0.45).lineBetween(hero.x,hero.y,end.x,end.y).strokeCircle(end.x,end.y,4);
      }
    }
    const stormIds=new Set(this.match.projectiles.filter(p=>p.empowered).map(p=>p.id));
    const swordCasters=entities.filter(e=>e.kind==='hero'&&e.hp>0&&e.qCast);
    const swordIds=new Set(swordCasters.map(e=>e.id));
    for(const [id,image] of this.qSwordViews)if(!swordIds.has(id)){image.destroy();this.qSwordViews.delete(id);}
    for(const caster of swordCasters){
      const swordAge=this.combatFeedbackEnabled?this.combatFeedback?.feel.qAge(caster.id,caster.qCast!.startedAt,this.match.time,Q_FLASH_START,YASUO_Q_CAST_SECONDS)??this.match.time-caster.qCast!.startedAt:this.match.time-caster.qCast!.startedAt;
      const pose=qSwordFlash(swordAge,caster.x,caster.y,caster.qCast!.facing);
      let image=this.qSwordViews.get(caster.id);
      if(!image){image=this.add.image(pose.x,pose.y,'yasuo-q-sword');this.qSwordViews.set(caster.id,image);}
      image.setVisible(pose.visible).setFrame(pose.frame).setOrigin(pose.originX,pose.originY).setScale(pose.scale)
        .setRotation(pose.rotation).setPosition(pose.x,pose.y).setDepth(actorDepth(caster.y,.2)).setAlpha(pose.alpha);
    }
    for(const [id,image] of this.tornadoViews)if(!stormIds.has(id)){image.destroy();this.tornadoViews.delete(id);}
    for (const shot of this.match.projectiles) {
      if(shot.empowered) {
        let image=this.tornadoViews.get(shot.id);
        if(!image){image=this.add.image(shot.x,shot.y,'yasuo-tornado').setOrigin(.5,590/640).setScale(TORNADO_SCALE);this.tornadoViews.set(shot.id,image);}
        const age=Math.max(0,this.match.time-(shot.startedAt??this.match.time));
        image.setFrame(Math.floor(age*16)%16).setPosition(shot.x,shot.y).setDepth(actorDepth(shot.y)).setRotation(0).setAlpha(Math.min(1,age/.06,shot.remaining/16));
        drawStormVfx(this.effects,shot.x,shot.y,shot.vx,shot.vy,age,shot.remaining);
        continue;
      }
      if(shot.kind==='q'){
        // Q1/Q2 are melee contacts; only empowered Q has a travelling visual.
        continue;
      }
      const color = COLORS[shot.team];
      const source=this.match.entity(shot.sourceId),target=this.match.entity(shot.targetId);
      let shotY=shot.y;
      if(source?.kind==='ranged'&&target){
        const progress=Math.min(1,distance(source,shot)/Math.max(1,distance(source,target)));
        shotY-=17+(UNIT_METRICS[target.kind].height*.46-17)*progress+airborneLift(target,this.match.time)*progress;
        const d=direction(source,target);
        this.effects.lineStyle(1,color,.65).lineBetween(shot.x-d.x*5,shotY-d.y*5,shot.x,shotY);
      }
      this.effects.fillStyle(color, 0.17).fillCircle(shot.x, shotY, 4);
      this.effects.fillStyle(color).fillRect(Math.round(shot.x - shot.radius), Math.round(shotY - shot.radius), shot.radius * 2, shot.radius * 2);
    }
    for (const zone of this.match.zones) {
      const color = COLORS[zone.team], progress = 1 - (zone.triggerAt - this.match.time) / 0.55;
      this.ground.fillStyle(color, 0.13).fillCircle(zone.x, zone.y, zone.radius);
      this.ground.lineStyle(1, color, 0.8).strokeCircle(zone.x, zone.y, zone.radius);
      this.ground.lineStyle(1, color, 0.5).strokeCircle(zone.x, zone.y, zone.radius * progress);
    }
    if (this.aimKey && this.match.phase === 'playing' && hero.hp>0) {
      const preview=skillPreview(this.match,'blue',this.aimKey,this.abilityAim(this.aimKey));
      const color=preview.valid?0x86f3ed:0xed947f;
      this.ground.lineStyle(1,SKILL_RANGE_COLOR,.45).strokePoints(preview.range,false);
      for(const shape of preview.fills)this.ground.fillStyle(color,.12).fillPoints(shape,true);
      for(const path of preview.paths)this.ground.lineStyle(1.5,color,.95).strokePoints(path,false);
    }
    if (hero.windup > 0) this.bars.lineStyle(1, COLORS.blue, 0.6).strokeCircle(hero.x, hero.y - 12, 12);
  }

  private showEvent(event: GameEvent): void {
    if(event.type==='cast'&&event.ability==='q'&&this.combatFeedbackEnabled){
      const hero=this.match.hero(event.team);
      if(hero.qCast)this.combatFeedback?.feel.beginQ(hero.id,hero.qCast.startedAt,YASUO_Q_HIT_SECONDS);
    }
    this.battlefield?.event(event,this.match.time,this.iceMap&&this.dynamicMap&&this.battlefieldEnabled);
    if(event.sourceKind!=='hero'&&event.targetKind!=='hero'||!this.combatFeedbackEnabled)this.accents?.event(event,this.match.time);
    this.combatFeedback?.event(event,this.match.time,event.targetId===undefined?undefined:this.views.get(event.targetId));
    if (event.type !== 'hit' && event.type !== 'last-hit') return;
    // Soldier exchanges establish the lane; reserve damage numbers for hero interaction.
    if(event.type==='hit'&&event.sourceKind!=='hero'&&event.targetKind!=='hero')return;
    const cs = event.type === 'last-hit';
    const label=cs?'+1 CS':event.amount===0&&(event.absorbed??0)>0?`吸收 ${Math.round(event.absorbed!)}`:`${event.amount}${event.critical?'!':''}`;
    const text = this.add.text(event.x, event.y - 24, label, {
      fontFamily: 'Consolas, monospace', fontSize: cs ? '7px' : '6px',
      color: cs ? '#ffe0a0' : event.team === 'blue' ? '#b5eee3' : '#f0b0a3',
      stroke: '#10212b', strokeThickness: 1,
    }).setOrigin(0.5).setDepth(RENDER_DEPTH.text).setData('transient', true);
    this.tweens.add({ targets: text, y: text.y - (cs ? 15 : 9), alpha: 0, duration: cs ? 850 : 550, onComplete: () => text.destroy() });
  }
}
