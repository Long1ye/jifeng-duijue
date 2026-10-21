import { AdditiveBlending, DoubleSide, Group, Mesh, MeshBasicMaterial, NearestFilter, NormalBlending, PlaneGeometry, SRGBColorSpace, TextureLoader, type Texture, type WebGLRenderer } from 'three';
import type { Point } from '../game/types';
import { COMBAT_ART, type CombatArtKey } from './CombatArt';
import { toThree, type ThreeCamera } from './Coordinates';
import { atlasRect } from './ActorSprites';

export interface CardOptions {
  ax?: number; ay?: number; alpha?: number; color?: number; height?: number;
  flat?: boolean; angle?: number; additive?: boolean; crop?: readonly [number, number, number, number];
  /** Camera-depth displacement for authored front/back layers. */
  depth?: number;
  ringLayer?: number;
}

/** Shared atlases, reusable cards, and per-card UVs (never mutate shared textures). */
export class CombatSprites {
  readonly group = new Group();
  readonly errors: string[] = [];
  private readonly textures = new Map<CombatArtKey, Texture>();
  private readonly ready = new Set<Texture>();
  private readonly cards: Mesh<PlaneGeometry, MeshBasicMaterial>[] = [];
  private used = 0;
  private disposed = false;
  constructor() {
    this.group.name = 'approved-combat-art';
    // Match the old scene's preload: the first real cast must not wait for its atlas.
    for (const key of Object.keys(COMBAT_ART) as CombatArtKey[]) if (!['qBody', 'cast', 'ultimate'].includes(key)) this.texture(key);
  }
  private texture(key: CombatArtKey): Texture {
    let map = this.textures.get(key);
    if (!map) {
      map = new TextureLoader().load(COMBAT_ART[key].url, texture => {
        if (!this.disposed) this.ready.add(texture);
      }, undefined, () => { if (!this.disposed) this.errors.push(key); });
      map.colorSpace = SRGBColorSpace; map.magFilter = map.minFilter = NearestFilter; map.generateMipmaps = false;
      this.textures.set(key, map);
    }
    return map;
  }
  warmup(renderer: WebGLRenderer, camera: ThreeCamera): void {
    for (const texture of this.textures.values()) renderer.initTexture(texture);
    this.begin();
    for (const key of this.textures.keys()) this.draw(key, 0, camera.focus, 1, 1, camera);
  }
  begin(): void { this.used = 0; }
  draw(key: CombatArtKey, frame: number, point: Point, width: number, height: number, camera: ThreeCamera, options: CardOptions = {}) {
    const map = this.texture(key);
    let card = this.cards[this.used];
    if (!card) {
      card = new Mesh(new PlaneGeometry(1, 1), new MeshBasicMaterial({ transparent: true, depthWrite: false, alphaTest: .025, toneMapped: false, fog: false, side: DoubleSide }));
      const layer = { value: 0 }; card.userData.layer = layer;
      card.material.onBeforeCompile = shader => {
        shader.uniforms.combatRingLayer = layer;
        shader.fragmentShader = 'uniform float combatRingLayer;\n' + shader.fragmentShader.replace('#include <map_fragment>', `
          #include <map_fragment>
          #ifdef USE_MAP
          if (combatRingLayer > 0.5) {
            vec2 pixel = floor(vec2(fract(vMapUv.x * 4.0) * 176.0, (1.0 - fract(vMapUv.y * 2.0)) * 144.0));
            float error = 100.0; float center = 24.0;
            float d = abs(length((pixel - vec2(88.0, 24.0)) / vec2(64.0, 25.0)) - 1.0);
            if (d < error) { error = d; center = 24.0; }
            d = abs(length((pixel - vec2(88.0, 55.0)) / vec2(71.0, 25.0)) - 1.0);
            if (d < error) { error = d; center = 55.0; }
            d = abs(length((pixel - vec2(88.0, 86.0)) / vec2(77.0, 29.0)) - 1.0);
            if (d < error) { center = 86.0; }
            bool front = pixel.y >= center;
            if ((combatRingLayer > 1.5) != front) discard;
          }
          #endif
        `);
      };
      card.material.customProgramCacheKey = () => 'approved-eq3-depth-v1';
      card.frustumCulled = false; this.cards.push(card); this.group.add(card);
    }
    this.used++;
    card.name = `combat-${key}`;
    card.userData.layer.value = options.ringLayer ?? 0;
    card.visible = this.ready.has(map) && (options.alpha ?? 1) > 0;
    if (card.material.map !== map) { card.material.map = map; card.material.needsUpdate = true; }
    card.material.opacity = options.alpha ?? 1; card.material.color.setHex(options.color ?? 0xffffff);
    card.material.blending = options.additive ? AdditiveBlending : NormalBlending;
    // Combat foregrounds must remain readable over the body they hit. Keep
    // authored rear halves and world-aligned cards in the normal depth pass.
    const foreground = !options.flat && (options.depth ?? 0) >= 0 && key !== 'wall';
    card.material.depthTest = !foreground;
    card.renderOrder = foreground ? 20 : 0;
    const image = map.image as HTMLImageElement | undefined;
    if (image?.width) {
      const spec = COMBAT_ART[key], cellW = spec.width || image.width, cellH = spec.height || image.height;
      const uv = atlasRect(frame, cellW, cellH, image.width, image.height);
      const [cx, cy, cw, ch] = options.crop ?? [0, 0, 1, 1];
      const ax = options.ax ?? .5, ay = options.ay ?? 1;
      const x0 = (cx - ax) * width, x1 = (cx + cw - ax) * width;
      const y0 = (ay - cy - ch) * height, y1 = (ay - cy) * height;
      const p = card.geometry.getAttribute('position'), coords = card.geometry.getAttribute('uv');
      p.setXYZ(0, x0, y1, 0); p.setXYZ(1, x1, y1, 0); p.setXYZ(2, x0, y0, 0); p.setXYZ(3, x1, y0, 0); p.needsUpdate = true;
      const left = uv.left + (uv.right - uv.left) * cx, right = left + (uv.right - uv.left) * cw;
      const top = uv.top - (uv.top - uv.bottom) * cy, bottom = top - (uv.top - uv.bottom) * ch;
      coords.setXY(0, left, top); coords.setXY(1, right, top); coords.setXY(2, left, bottom); coords.setXY(3, right, bottom); coords.needsUpdate = true;
    }
    card.position.copy(toThree(point, options.height ?? .9));
    if (options.flat) card.rotation.set(-Math.PI / 2, 0, options.angle ?? 0);
    else { card.quaternion.copy(camera.camera.quaternion); if (options.angle) card.rotateZ(options.angle); }
    if (options.depth) card.position.addScaledVector(camera.camera.position.clone().sub(toThree(camera.focus)).normalize(), options.depth);
    return card;
  }
  end(): void { for (let i = this.used; i < this.cards.length; i++) this.cards[i].visible = false; }
  reset(): void { this.used = 0; this.cards.forEach(card => { card.visible = false; }); }
  dispose(): void {
    if (this.disposed) return; this.disposed = true;
    for (const card of this.cards) { card.geometry.dispose(); card.material.dispose(); }
    this.textures.forEach(texture => texture.dispose()); this.cards.length = 0; this.textures.clear(); this.ready.clear(); this.group.clear(); this.group.removeFromParent();
  }
}
