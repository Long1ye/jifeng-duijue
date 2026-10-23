import {
  BufferAttribute, BufferGeometry, Color, DirectionalLight, DoubleSide, Group, LinearFilter,
  LinearMipmapLinearFilter, Mesh, MeshBasicMaterial, MeshDepthMaterial, PlaneGeometry,
  RGBADepthPacking, ShadowMaterial, SRGBColorSpace, TextureLoader, MirroredRepeatWrapping, Vector2, type Texture,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import guardianUrl from '../../assets/map-modules/howling-painted-v3/guardian-wall.png?url';
import archUrl from '../../assets/map-modules/howling-bridge-v7/arch-support.png?url';
import brazierUrl from '../../assets/map-modules/howling-painted-v3/brazier.png?url';
import floorUrl from '../../assets/map-modules/howling-target-v2/ground.png?url';
import stoneUrl from '../../assets/map-modules/howling-target-v2/stone.png?url';
import depthUrl from '../../assets/map-modules/howling-central-v1/runtime/depth.png?url';
import parapetUrl from '../../assets/map-modules/howling-painted-v6/parapet-run.png?url';
import type { Point } from '../game/types';
import { BRIDGE, bridgePoint } from '../game/Bridge';
import { bridgeArtQuad } from './CentralBridgeArt';
import { disposeSceneResources } from './SceneResources';
import { contactShadowTexture } from './S01Look';
import { toSimulation, toThree, type ThreeCamera } from './Coordinates';
import { ART_MAP, ART_GUARDIANS, ART_PIERS, ART_BRAZIERS, artEdgeV, artBrazierMount } from './PaintedMapLayout';
import { parapetRuns, parapetGeometry } from './PaintedParapet';
import { QUALITY_TUNING, QualitySettings } from './QualitySettings';
import { CANYON_GRADE_GLSL } from './CanyonGrade';
import { flameMotion } from './MaterialAccents';
import { fireFlicker } from './EnvironmentMotion';
import { LivingFire } from './LivingFire';

export const PAINTED_MAP = { ...ART_MAP, deckHalfWidth: 122, focusU: 0, focusV: -36, zoom: .4 } as const;
/** Guardian positions are tied to structural piers, outside the playable width
 * of 112. The source foot corner is offset from the pedestal's actual center. */
export const PAINTED_PIER_U = [...new Set(ART_PIERS.flatMap(p => [...p.nodes]))];
export const PAINTED_PILLARS = ART_GUARDIANS.map(p => ({ ...p, side: Math.sign(p.v) }));

/** Source pixels, measured against the native 1222x1287 artwork, not PNG margins. */
export const PAINTED_GUARDIAN = {
  width: 1222, height: 1287, anchor: [400, 1205], pixelScale: .25, elevation: 45,
  baseline: [[120, 1125], [200, 1143], [400, 1205], [600, 1110], [650, 1030], [1120, 790], [1222, 740]],
} as const;
type Crop = readonly [number, number, number, number];

export function paintedBaseline(x: number): number {
  const points = PAINTED_GUARDIAN.baseline;
  for (let i = 1; i < points.length; i++) {
    if (x <= points[i][0]) {
      const [ax, ay] = points[i - 1], [bx, by] = points[i];
      return ay + Math.max(0, Math.min(1, (x - ax) / (bx - ax))) * (by - ay);
    }
  }
  return points[points.length - 1][1];
}

/** Fixed-view relief surface: preserves source projection while recovering an
 * approximate footprint and world heights for depth tests and cast shadows.
 * It is intentionally not a rotatable model. No per-frame camera billboarding. */
export function paintedReliefGeometry(crop: Crop = [0, 0, 1222, 1287], columns = 80, rows = 84): BufferGeometry {
  const { width, height, anchor, pixelScale: scale } = PAINTED_GUARDIAN;
  const vertices: number[] = [], uv: number[] = [], indices: number[] = [];
  for (let row = 0; row <= rows; row++) for (let col = 0; col <= columns; col++) {
    const px = crop[0] + (crop[2] - crop[0]) * col / columns;
    const py = crop[1] + (crop[3] - crop[1]) * row / rows;
    const sx = (px - anchor[0]) * scale, sy = (anchor[1] - py) * scale;
    const base = paintedBaseline(px);
    let y = Math.max(-1, (base - py) * scale * Math.SQRT2);
    // Snow-covered seat has an approximately level top, rather than a standing
    // illustration plane. The statue itself retains its painted convex relief.
    const capTop = px < 400 ? 555 - (px - 185) * .22 : 507 + (px - 400) * .25;
    const capBottom = px < 400 ? 580 + (px - 185) * .40 : 666 - (px - 400) * .48;
    if (px > 185 && px < 630 && py > capTop && py < capBottom) y = 220;
    else if (px > 230 && px < 600 && py < 550) y += Math.sin(Math.max(0, py - 70) / 480 * Math.PI) * 10;
    // At 45 degrees, screen-up=(y-z)/sqrt(2). Altering depth and height together
    // retains every source pixel's intended screen position exactly.
    // The generated wall's drawn ground slope is steeper than our bridge's
    // calibrated projection. Reproject its recovered depth to the real bridge
    // axis, retaining verticals and height, instead of stretching the PNG.
    const wallAlignment = Math.max(0, px - 650) * scale * .25;
    vertices.push(sx, y, y - sy * Math.SQRT2 + wallAlignment);
    uv.push(px / width, 1 - py / height);
  }
  for (let row = 0; row < rows; row++) for (let col = 0; col < columns; col++) {
    const i = row * (columns + 1) + col;
    indices.push(i, i + columns + 1, i + 1, i + 1, i + columns + 1, i + columns + 2);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(vertices), 3));
  geometry.setAttribute('uv', new BufferAttribute(new Float32Array(uv), 2));
  geometry.setIndex(indices); geometry.computeVertexNormals(); geometry.computeBoundingSphere(); return geometry;
}

/** Recover the new arch from its straight attachment edge, cropping out the
 * painted upper surface so the existing parapet continues directly into it. */
export function paintedArchGeometry(left = 200, right = 1600, span = 128): BufferGeometry {
  const columns = 48, rows = 32, vertices: number[] = [], uv: number[] = [], indices: number[] = [];
  const scale = 128 * BRIDGE.projection.along[0] / 1400;
  for (let row = 0; row <= rows; row++) for (let col = 0; col <= columns; col++) {
    const px = left + (right - left) * col / columns;
    // Cut below the painted top face: the existing wall supplies the cap.
    const seam = 488 - px * .261;
    const py = seam + (885 - seam) * row / rows;
    const x = (px - 200) * scale * span / 128;
    // The opaque front face overlaps the wall foot. A tiny camera-facing
    // depth offset lets it cover the old deck thickness without a filler strip.
    vertices.push(x, (seam - py) * scale * Math.SQRT2 + 1.2, x * BRIDGE.projection.along[1] / BRIDGE.projection.along[0] + .15);
    uv.push(px / 1778, 1 - py / 885);
  }
  for (let row = 0; row < rows; row++) for (let col = 0; col < columns; col++) {
    const i = row * (columns + 1) + col;
    indices.push(i, i + columns + 1, i + 1, i + 1, i + columns + 1, i + columns + 2);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(vertices), 3));
  geometry.setAttribute('uv', new BufferAttribute(new Float32Array(uv), 2));
  geometry.setIndex(indices); geometry.computeVertexNormals(); return geometry;
}

function paintedPropGeometry(size: readonly [number, number], crop: Crop, anchor: readonly [number, number], scale: number): BufferGeometry {
  const columns = 24, rows = 32, vertices: number[] = [], uv: number[] = [], indices: number[] = [];
  for (let row = 0; row <= rows; row++) for (let col = 0; col <= columns; col++) {
    const px = crop[0] + (crop[2] - crop[0]) * col / columns;
    const py = crop[1] + (crop[3] - crop[1]) * row / rows;
    const x = (px - anchor[0]) * scale, screenY = (anchor[1] - py) * scale;
    const base = anchor[1] - Math.abs(px - anchor[0]) * .33;
    const y = Math.max(-1, (base - py) * scale * Math.SQRT2);
    vertices.push(x, y, y - screenY * Math.SQRT2); uv.push(px / size[0], 1 - py / size[1]);
  }
  for (let row = 0; row < rows; row++) for (let col = 0; col < columns; col++) {
    const i = row * (columns + 1) + col; indices.push(i, i + columns + 1, i + 1, i + 1, i + columns + 1, i + columns + 2);
  }
  const geometry = new BufferGeometry(); geometry.setAttribute('position', new BufferAttribute(new Float32Array(vertices), 3));
  geometry.setAttribute('uv', new BufferAttribute(new Float32Array(uv), 2)); geometry.setIndex(indices); geometry.computeVertexNormals(); return geometry;
}

export class PaintedBridgeSample {
  readonly group = new Group();
  readonly errors: string[] = [];
  private readonly ready = new Set<Texture>();
  private readonly depths: MeshDepthMaterial[] = [];
  private readonly occluders: { mesh: Mesh; material: MeshBasicMaterial; anchor: Point; opacity: number }[] = [];
  private readonly fireGlows: Mesh<PlaneGeometry, MeshBasicMaterial>[] = [];
  private readonly backdropShift = { value: new Vector2() };
  private readonly motionTime = { value: 0 };
  readonly livingFire: LivingFire;
  private lastTime = 0;
  private disposed = false;
  constructor(quality = new QualitySettings()) {
    this.group.name = 'painted-bridge-sample-v3';
    const loader = new TextureLoader();
    const load = (url: string) => {
      const texture = loader.load(url, t => { if (!this.disposed) this.ready.add(t); }, undefined,
        () => { if (!this.disposed) this.errors.push(url); });
      texture.colorSpace = SRGBColorSpace; texture.magFilter = LinearFilter;
      texture.minFilter = LinearMipmapLinearFilter; texture.anisotropy = 4; return texture;
    };
    const maps = { guardian: load(guardianUrl), floor: load(floorUrl), stone: load(stoneUrl), depth: load(depthUrl), arch: load(archUrl), brazier: load(brazierUrl), parapet: load(parapetUrl) };
    const material = (map: Texture, cutout = false) => new MeshBasicMaterial({
      map, side: DoubleSide, toneMapped: false, fog: false, alphaTest: cutout ? .48 : 0,
    });
    const floorGeometry = bridgeArtQuad(-88, 80, -122, 122, .5);
    const floor = new Mesh(floorGeometry, material(maps.floor)); floor.name = 'painted-bridge-floor'; this.group.add(floor);
    const shadow = new Mesh(floorGeometry, new ShadowMaterial({ color: 0x11182c, opacity: .32 }));
    shadow.userData.requiredMap = maps.floor;
    shadow.position.y = .06; shadow.receiveShadow = true; shadow.name = 'painted-ground-shadows'; this.group.add(shadow);
    for (const side of [-1, 1]) for (let i = 0; i < 16; i++) {
      const start = Math.max(PAINTED_MAP.minU, side < 0 ? -88 - (i + 1) * 42 : 80 + i * 42);
      const end = Math.min(PAINTED_MAP.maxU, side < 0 ? -88 - i * 42 : start + 42);
      if (start >= end) continue;
      const geometry = bridgeArtQuad(start, end, -122, 122, .5);
      const positions = geometry.getAttribute('position');
      for (let j = 0; j < positions.count; j++) {
        const u = j === 0 || j === 3 ? start : end;
        const v = (j < 2 ? -1 : 1) * artEdgeV(u), world = toThree(bridgePoint(u, v), .5);
        positions.setXYZ(j, world.x, world.y, world.z);
      }
      geometry.computeVertexNormals(); geometry.computeBoundingSphere();
      const uv = geometry.getAttribute('uv');
      for (let j = 0; j < uv.count; j++) {
        // Five offset crops and a longer reflection cycle avoid repeating the
        // same two snow scars. Stay outside the central emblem in the atlas.
        const t = i % 3 === 0 ? 1 - uv.getX(j) : uv.getX(j);
        const offset = [0, .045, .018, .068, .032][i % 5];
        uv.setX(j, side < 0 ? offset + t * .22 : .71 + offset + t * .22);
      }
      const road = new Mesh(geometry, floor.material); road.name = 'painted-road-extension'; this.group.add(road);
      const shade = new Mesh(geometry, shadow.material); shade.position.y = .06; shade.receiveShadow = true;
      shade.userData.requiredMap = maps.floor; this.group.add(shade);
    }
    // Real deck edge: the picture is the top surface, with a separate thickness.
    for (const sign of [-1, 1]) for (const [start, end] of [[-720, -470], [-470, 470], [470, 720]]) {
      const a = toThree(bridgePoint(start, sign * artEdgeV(start))), b = toThree(bridgePoint(end, sign * artEdgeV(end)));
      const side = new BufferGeometry().setFromPoints([a.clone().setY(.4), b.clone().setY(.4), a.clone().setY(-12), b.clone().setY(-12)]);
      side.setAttribute('uv', new BufferAttribute(new Float32Array([0, 1, 1, 1, 0, 0, 1, 0]), 2));
      side.setIndex([0, 2, 1, 1, 2, 3]); side.computeVertexNormals();
      const deck = new Mesh(side, material(maps.stone)); deck.material.color.setHex(0x9ba6b7); this.group.add(deck);
    }
    // Shallow entrance aprons continue below the end deck. They do not raise
    // the playable ground or make actors float over a decorative staircase.
    const stepMaterial = material(maps.stone);
    for (const sign of [-1, 1]) for (let i = 0; i < 3; i++) {
      const inner = sign * (720 + i * 8), outer = sign * (728 + i * 8), y = -4 - i * 4;
      const top = new Mesh(bridgeArtQuad(Math.min(inner, outer), Math.max(inner, outer), -100, 100, y), stepMaterial);
      top.name = 'painted-entrance-step'; this.group.add(top);
      const a = toThree(bridgePoint(outer, -100)), b = toThree(bridgePoint(outer, 100));
      const riser = new BufferGeometry().setFromPoints([a.clone().setY(y), b.clone().setY(y), a.clone().setY(y - 4), b.clone().setY(y - 4)]);
      riser.setAttribute('uv', new BufferAttribute(new Float32Array([0, 1, 1, 1, 0, 0, 1, 0]), 2));
      riser.setIndex([0, 2, 1, 1, 2, 3]); riser.computeVertexNormals();
      const face = new Mesh(riser, stepMaterial); face.name = 'painted-step-riser'; this.group.add(face);
    }
    // A solid ledge carries the wall's full footprint, including a statue's
    // deeper side face and loose stones. It closes blue wedges below cutouts.
    const ledgeMaterial = material(maps.floor), ledgeSideMaterial = material(maps.stone);
    const footingWidth = (u: number, side: number) => {
      const bases: number[][] = [];
      if (side < 0) bases.push([-667, -529], [490, 628]);
      const distance = Math.min(...bases.map(([a, b]) => Math.max(a - u, 0, u - b)));
      // Ordinary parapets meet the deck rim; only deep sanctuary plinths need
      // a projecting shelf. A seven-unit lip read as an empty walkway outside
      // the fence at gameplay scale.
      return 26 * Math.max(0, 1 - distance / 12);
    };
    for (const side of [-1, 1]) for (let start = -720; start < 720; start += 12) {
      const end = Math.min(720, start + 12), inner = side * artEdgeV(start), outer = side * (artEdgeV(start) + footingWidth(start, side));
      // The road already reaches the fence. Only add paving outside the deck;
      // an inward overlay squeezes the atlas into a conspicuous icy ribbon.
      if (footingWidth(start, side) > 0 || footingWidth(end, side) > 0) {
        const top = bridgeArtQuad(start, end, Math.min(inner, outer), Math.max(inner, outer), .55);
        const p = top.getAttribute('position'), uv = top.getAttribute('uv');
        for (let i = 0; i < p.count; i++) {
          const u = i === 0 || i === 3 ? start : end;
          const v = side < 0 ? -artEdgeV(u) + (i < 2 ? -footingWidth(u, side) : 0) : artEdgeV(u) + (i < 2 ? 0 : footingWidth(u, side));
          const world = toThree(bridgePoint(u, v), .55); p.setXYZ(i, world.x, world.y, world.z);
          const phase = (u + 720) % 80, t = phase <= 40 ? phase / 40 : (80 - phase) / 40;
          uv.setXY(i, .02 + t * .14, side < 0 ? (i < 2 ? .02 : .13) : (i < 2 ? .87 : .98));
        }
        top.computeBoundingSphere(); const cap = new Mesh(top, ledgeMaterial); cap.name = 'painted-wall-footing'; this.group.add(cap);
      }
      const a = toThree(bridgePoint(start, side * (artEdgeV(start) + footingWidth(start, side)))), b = toThree(bridgePoint(end, side * (artEdgeV(end) + footingWidth(end, side))));
      const rim = new BufferGeometry().setFromPoints([a.clone().setY(.55), b.clone().setY(.55), a.clone().setY(-12), b.clone().setY(-12)]);
      rim.setAttribute('uv', new BufferAttribute(new Float32Array([0, 1, 1, 1, 0, 0, 1, 0]), 2)); rim.setIndex([0, 2, 1, 1, 2, 3]); rim.computeVertexNormals();
      const face = new Mesh(rim, ledgeSideMaterial); face.name = 'painted-wall-footing-edge'; this.group.add(face);
    }
    for (const name of ['painted-wall-footing', 'painted-wall-footing-edge']) {
      const pieces = this.group.children.filter(o => o.name === name) as Mesh<BufferGeometry, MeshBasicMaterial>[];
      const merged = mergeGeometries(pieces.map(piece => piece.geometry), false);
      if (!merged) throw new Error('Cannot merge wall footings');
      const batch = new Mesh(merged, pieces[0].material); batch.name = name; this.group.add(batch);
      for (const piece of pieces) { piece.geometry.dispose(); this.group.remove(piece); }
    }
    const artMaterial = material(maps.parapet, true);
    const addRelief = (u: number, v: number, crop?: Crop) => {
      const geometry = paintedReliefGeometry(crop, 80, 84);
      const mesh = new Mesh(geometry, material(maps.guardian, true));
      mesh.position.copy(toThree(bridgePoint(u, v), .6)); mesh.name = 'painted-guardian-pillar';
      mesh.scale.setScalar(.8);
      mesh.position.z += 20;
      mesh.userData.pillarCenter = { u, v }; mesh.userData.pierU = u;
      this.occluders.push({ mesh, material: mesh.material, anchor: toSimulation(mesh.position), opacity: 1 });
      mesh.castShadow = true;
      const depth = new MeshDepthMaterial({ map: maps.guardian, alphaTest: .48, depthPacking: RGBADepthPacking, side: DoubleSide });
      mesh.customDepthMaterial = depth; this.depths.push(depth); this.group.add(mesh);
    };
    for (const pillar of PAINTED_PILLARS) {
      addRelief(pillar.u, pillar.v, [110, 60, 650, 1230]);
    }
    const wallDepth = new MeshDepthMaterial({ map: maps.parapet, alphaTest: .48, depthPacking: RGBADepthPacking, side: DoubleSide });
    this.depths.push(wallDepth);
    for (const side of [-1, 1]) {
      for (const { start: u, end } of parapetRuns(side)) {
        const geometry = parapetGeometry(end - u), p = geometry.getAttribute('position');
        // Follow the same edge and bridge direction as the new arch face.
        for (let i = 0; i < p.count; i++) {
          const localU = p.getX(i) / BRIDGE.projection.along[0];
          const dv = side * (artEdgeV(u + localU) - artEdgeV(u));
          p.setXYZ(i, p.getX(i) + dv * BRIDGE.projection.across[0], p.getY(i), p.getZ(i) + dv * BRIDGE.projection.across[1]);
        }
        const wall = new Mesh(geometry, artMaterial); wall.position.copy(toThree(bridgePoint(u, side * artEdgeV(u)), .6));
        wall.name = 'painted-rear-wall'; wall.castShadow = true; wall.customDepthMaterial = wallDepth;
        wall.userData.wallSpan = [u, end]; this.group.add(wall);
      }

      const archMaterial = material(maps.arch, true);
      // Project the actual distant backdrop into the low piers' fog blend.
      // This fixed-view solution retains stable depth and avoids a grainy
      // dissolve or a visible cutout base hanging in midair.
      archMaterial.userData.readyDependency = maps.depth;
      archMaterial.onBeforeCompile = shader => {
        shader.uniforms.bridgeBackdropGrade = quality.grading;
        shader.uniforms.bridgeBackdropMap = { value: maps.depth };
        shader.uniforms.bridgeBackdropTint = { value: new Color(0xa4b4cc) };
        shader.uniforms.bridgeBackdropShift = this.backdropShift;
        shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 bridgeMistPosition;')
          .replace('#include <project_vertex>', '#include <project_vertex>\nbridgeMistPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;');
        shader.fragmentShader = CANYON_GRADE_GLSL + '\nuniform float bridgeBackdropGrade;\n' + shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 bridgeMistPosition;\nuniform sampler2D bridgeBackdropMap;\nuniform vec3 bridgeBackdropTint;\nuniform vec3 bridgeBackdropFogColor;\nuniform vec2 bridgeBackdropShift;')
          .replace('#include <alphahash_fragment>', `
            float bridgeMistBaseline = smoothstep(260.0, 470.0, -bridgeMistPosition.y);
            float bridgeMistEnhanced = smoothstep(${QUALITY_TUNING.pierMistStart.toFixed(1)}, ${QUALITY_TUNING.pierMistEnd.toFixed(1)}, -bridgeMistPosition.y);
            float bridgeMist = mix(bridgeMistBaseline, bridgeMistEnhanced, bridgeBackdropGrade);
            float backdropX = bridgeMistPosition.x - bridgeBackdropShift.x;
            float backdropY = (bridgeMistPosition.y - bridgeMistPosition.z + bridgeBackdropShift.y) * 0.70710678;
            vec2 bridgeBackdropUv = vec2(0.5 + backdropX / 1800.0,
              0.5 + (backdropY - backdropX * ${(-BRIDGE.projection.along[1] / BRIDGE.projection.along[0] * Math.SQRT1_2).toFixed(8)}) / 1012.5);
            vec3 bridgeBackdrop = canyonBackdropGrade(texture2D(bridgeBackdropMap, bridgeBackdropUv).rgb * bridgeBackdropTint, bridgeBackdropGrade);
            bridgeBackdrop = canyonBackdropEdge(bridgeBackdrop, bridgeBackdropUv.y, 1.0);
            diffuseColor.rgb = mix(diffuseColor.rgb, bridgeBackdrop, bridgeMist);
            #include <alphahash_fragment>
          `);
      };
      archMaterial.customProgramCacheKey = () => 'painted-bridge-pier-mist-parallax-v5';
      const nodes = ART_PIERS.find(p => p.side === side)!.nodes;
      for (let i = 0; i < nodes.length - 1; i++) {
        const u = nodes[i], next = nodes[i + 1];
        const archGeometry = paintedArchGeometry(200, 1600, next - u);
        const p = archGeometry.getAttribute('position');
        for (let j = 0; j < p.count; j++) {
          const localU = p.getX(j) / BRIDGE.projection.along[0];
          const dv = side * (artEdgeV(u + localU) - artEdgeV(u));
          p.setXYZ(j, p.getX(j) + dv * BRIDGE.projection.across[0], p.getY(j), p.getZ(j) + dv * BRIDGE.projection.across[1]);
        }
        archGeometry.computeBoundingSphere();
        const arch = new Mesh(archGeometry, archMaterial);
        arch.position.copy(toThree(bridgePoint(u, side * artEdgeV(u)))); arch.name = 'painted-bridge-arch';
        arch.userData.pierSpan = [u, next]; this.group.add(arch);
      }
      for (const u of nodes) {
        const pier = new Mesh(paintedArchGeometry(30, 400), archMaterial);
        pier.position.copy(toThree(bridgePoint(u, side * artEdgeV(u)))); pier.position.z += .7;
        pier.name = 'painted-load-bearing-pier'; pier.userData.pierU = u; this.group.add(pier);
      }
    }
    // The painted wall sections share one atlas and never fade. Batch them after
    // world placement; guardians retain separate materials for local occlusion.
    const walls = this.group.children.filter(o => o.name === 'painted-rear-wall') as Mesh<BufferGeometry, MeshBasicMaterial>[];
    const placed = walls.map(wall => { wall.updateMatrix(); return wall.geometry.clone().applyMatrix4(wall.matrix); });
    const wallGeometry = mergeGeometries(placed, false);
    if (!wallGeometry) throw new Error('Cannot batch painted parapets');
    const wallBatch = new Mesh(wallGeometry, artMaterial); wallBatch.name = 'painted-continuous-parapets';
    wallBatch.castShadow = true; wallBatch.customDepthMaterial = walls[0].customDepthMaterial; this.group.add(wallBatch);
    for (const wall of walls) { wall.geometry.dispose(); this.group.remove(wall); }
    for (const geometry of placed) geometry.dispose();

    const glowMap = contactShadowTexture();
    for (const { u, v } of ART_BRAZIERS) {
      // All bowls stand on the deck; the near wall depth-tests in front of
      // their lower silhouette. Mount data also anchors the light and embers.
      const { u: bowlU, v: bowlV, height: bowlHeight } = artBrazierMount(u, v);
      const brazier = new Mesh(paintedPropGeometry([1350, 1165], [250, 145, 1090, 1025], [675, 1015], .065), material(maps.brazier, true));
      brazier.position.copy(toThree(bridgePoint(bowlU, bowlV), bowlHeight)); brazier.name = 'painted-fire-bowl'; this.group.add(brazier);
      flameMotion(brazier.material, this.motionTime);
      brazier.userData.mount = { u: bowlU, v: bowlV, height: bowlHeight };
      const glow = new Mesh(new PlaneGeometry(158, 112), new MeshBasicMaterial({ map: glowMap, color: 0xffb568, transparent: true, opacity: .20,
        depthWrite: false, toneMapped: false, fog: false }));
      glow.rotation.x = -Math.PI / 2; glow.position.copy(toThree(bridgePoint(bowlU, bowlV), bowlHeight - .08));
      glow.userData.requiredMap = maps.brazier; glow.name = 'painted-fire-ground-glow'; this.fireGlows.push(glow); this.group.add(glow);
      glow.userData.baseOpacity = .20;
      const wallGlow = new Mesh(new PlaneGeometry(125, 90), glow.material.clone());
      wallGlow.rotation.y = -Math.atan(BRIDGE.projection.along[1] / BRIDGE.projection.along[0]);
      wallGlow.position.copy(toThree(bridgePoint(bowlU, Math.sign(v) * (artEdgeV(bowlU) - 8)), 34));
      wallGlow.material.opacity = .15; wallGlow.userData.baseOpacity = .15;
      wallGlow.userData.requiredMap = maps.brazier; wallGlow.name = 'painted-fire-wall-glow';
      this.fireGlows.push(wallGlow); this.group.add(wallGlow);
    }
    this.livingFire = new LivingFire(this.group.children.filter(o => o.name === 'painted-fire-bowl'));
    this.group.add(this.livingFire.mesh);
    // One canyon composition spans 1.5 normal gameplay frames (1200 world
    // units wide), so individual cliffs remain readable while following a hero.
    // Mirror at tile boundaries to cover both bases without flat color margins.
    maps.depth.wrapS = MirroredRepeatWrapping;
    const backdropWidth = 1800, backdropHeight = backdropWidth * 9 / 16;
    const backdropGeometry = new PlaneGeometry(16000, 10000), backdropUv = backdropGeometry.getAttribute('uv');
    const bridgeScreenSlope = -BRIDGE.projection.along[1] / BRIDGE.projection.along[0] * Math.SQRT1_2;
    for (let i = 0; i < backdropUv.count; i++) {
      const x = (backdropUv.getX(i) - .5) * 16000, y = (backdropUv.getY(i) - .5) * 10000;
      backdropUv.setXY(i, x / backdropWidth + .5, (y - x * bridgeScreenSlope) / backdropHeight + .5);
    }
    const backdropMaterial = material(maps.depth);
    const backdrop = new Mesh(backdropGeometry, backdropMaterial);
    backdrop.rotation.x = -Math.PI / 4; backdrop.position.set(0, -1200, -1200);
    backdrop.material.color.setHex(0xa4b4cc); backdrop.name = 'painted-distant-abyss'; this.group.add(backdrop);
    const sun = new DirectionalLight(0xffffff, 2); sun.position.set(-400, 850, 350);
    sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -.0002;
    Object.assign(sun.shadow.camera, { left: -3200, right: 3200, top: 2200, bottom: -2200, near: 1, far: 6000 });
    sun.shadow.camera.updateProjectionMatrix(); this.group.add(sun);
    this.update(0, bridgePoint(-10));
  }
  update(time: number, actor: Point, camera?: ThreeCamera): void {
    this.motionTime.value = time;
    if (camera) {
      const focus = toThree(camera.focus); this.backdropShift.value.set(focus.x * .18, focus.z * .18);
      const backdrop = this.group.getObjectByName('painted-distant-abyss');
      if (backdrop) { backdrop.position.x = this.backdropShift.value.x; backdrop.position.z = -1200 + this.backdropShift.value.y; }
    }
    this.group.traverse(object => {
      if (!(object instanceof Mesh)) return;
      if (object === this.livingFire.mesh) return;
      const material = object.material as MeshBasicMaterial;
      const required = (object.userData.requiredMap as Texture | undefined) ?? material.map;
      object.visible = (required ? this.ready.has(required) : true) &&
        (!material.userData.readyDependency || this.ready.has(material.userData.readyDependency));
    });
    this.livingFire.update(time);
    const reset = time < this.lastTime;
    const dt = reset ? 0 : Math.min(.1, Math.max(0, time - this.lastTime));
    this.lastTime = time;
    for (let i = 0; i < this.fireGlows.length; i++) {
      const glow = this.fireGlows[i];
      glow.material.opacity = glow.userData.baseOpacity * fireFlicker(time, Math.floor(i / 2));
    }
    for (const occluder of this.occluders) {
      if (reset) occluder.opacity = 1;
      if (camera) {
      const anchor = occluder.anchor, pillar = camera.project(anchor, .6), torso = camera.project(actor, 38);
      const pixelScale = camera.size.height / (camera.camera.top - camera.camera.bottom);
      const behind = actor.y < anchor.y + 12;
      const overlaps = Math.abs(torso.x - pillar.x) < 50 * pixelScale &&
        torso.y < pillar.y + 5 * pixelScale && torso.y > pillar.y - 240 * pixelScale;
      const target = behind && overlaps ? .38 : 1;
      occluder.opacity += (target - occluder.opacity) * (1 - Math.exp(-12 * dt));
      }
      const fading = occluder.opacity < .995, material = occluder.material;
      if (material.transparent !== fading) { material.transparent = fading; material.needsUpdate = true; }
      material.opacity = fading ? occluder.opacity : 1;
      material.alphaTest = fading ? .10 : .48; material.depthWrite = !fading;
      material.alphaToCoverage = !fading && material.userData.edgeCoverage === true;
    }
  }
  dispose(): void {
    if (this.disposed) return; this.disposed = true;
    this.group.traverse(o => { if (o instanceof DirectionalLight) o.shadow.dispose(); });
    for (const depth of this.depths) depth.dispose();
    this.livingFire.dispose();
    disposeSceneResources(this.group); this.group.removeFromParent(); this.group.clear();
  }
}
