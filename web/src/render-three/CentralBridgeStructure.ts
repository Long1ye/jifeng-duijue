import {
  AmbientLight, BufferAttribute, BufferGeometry, ConeGeometry, CylinderGeometry, DodecahedronGeometry,
  DirectionalLight, ExtrudeGeometry, Group, HemisphereLight, Matrix4, Mesh, MeshBasicMaterial, MeshStandardMaterial,
  Shape, TorusGeometry, Vector3, type Material, type Texture,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { bridgePoint } from '../game/Bridge';
import { toThree } from './Coordinates';
import { CENTRAL_ARCHES, CENTRAL_BRIDGE as LAYOUT, CENTRAL_RAILS } from './CentralBridgeLayout';
import { S01_TORCHES } from './S01Look';
import { targetGuardian, targetSnowCap, targetIcicles, type SculptRole } from './TargetBridgeSculpture';

/** Closed, bevelled masonry with a genuinely open arch, including its soffit. */
export function bridgeSupportGeometry(width: number): ExtrudeGeometry {
  const post = 38, spring = -205, radius = width / 2 - post;
  const shape = new Shape();
  shape.moveTo(0, LAYOUT.deckBottom); shape.lineTo(width, LAYOUT.deckBottom);
  shape.lineTo(width, -LAYOUT.archHeight); shape.lineTo(width - post, -LAYOUT.archHeight);
  shape.lineTo(width - post, spring);
  shape.absarc(width / 2, spring, radius, 0, Math.PI, false);
  shape.lineTo(post, -LAYOUT.archHeight); shape.lineTo(0, -LAYOUT.archHeight); shape.closePath();
  return new ExtrudeGeometry(shape, { depth: 40, steps: 1, curveSegments: 18,
    bevelEnabled: true, bevelSize: 2, bevelThickness: 2, bevelSegments: 1 }).translate(0, 0, -20);
}

export interface StructuralCurtain { start: number; end: number; materials: Material[]; opacity: number }
export function createCentralBridgeStructure(stoneMap: Texture): {
  group: Group; curtains: StructuralCurtain[]; flames: Mesh[];
} {
  const group = new Group(); group.name = 'central-solid-architecture';
  // Blue sky bounce reaches the soffits and the camera-facing masonry, rather
  // than letting the directional deck shadow turn an entire facade black.
  group.add(new AmbientLight(0xc5cddd, 1.65));
  const bounce = new DirectionalLight(0xc6cce0, 1.25);
  const focus = toThree(bridgePoint(-4));
  bounce.position.copy(focus).add(new Vector3(100, 450, 900));
  bounce.target.position.copy(focus); group.add(bounce, bounce.target);
  group.add(new HemisphereLight(0xb9c6de, 0x5b6070, 0.72));
  const sun = new DirectionalLight(0xe1e6f3, 1.6);
  sun.position.copy(focus).add(new Vector3(-450, 800, 300)); sun.target.position.copy(focus);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -1100, right: 1100, top: 850, bottom: -850, near: 20, far: 2200 });
  sun.shadow.normalBias = 0.5; sun.shadow.bias = -0.0002; group.add(sun, sun.target);
  const curtains: StructuralCurtain[] = [], flames: Mesh[] = [];
  const stone = new MeshStandardMaterial({ map: stoneMap, color: 0xb5b4c0, roughness: 1, vertexColors: true,
    emissiveMap: stoneMap, emissive: 0x98949f, emissiveIntensity: 0.65 });
  const trim = new MeshStandardMaterial({ color: 0x858896, roughness: 1, vertexColors: true });
  const dark = new MeshStandardMaterial({ color: 0x404553, roughness: 1, vertexColors: true });
  const snow = new MeshStandardMaterial({ color: 0xd1d9e7, roughness: 1, vertexColors: true });
  const ice = new MeshStandardMaterial({ color: 0x9ac2df, roughness: 0.5, metalness: 0, vertexColors: true });
  const carving = new MeshStandardMaterial({ map: stoneMap, bumpMap: stoneMap, bumpScale: 0.6,
    color: 0xc4c6d0, roughness: 1, flatShading: true, vertexColors: true,
    emissiveMap: stoneMap, emissive: 0xb6b3bd, emissiveIntensity: 0.6 });
  const archDress = new MeshStandardMaterial({ map: stoneMap, color: 0xcfd0d9, roughness: 1,
    vertexColors: true, emissiveMap: stoneMap, emissive: 0xb8b8c2, emissiveIntensity: 0.8 });
  const noise = (n: number) => { const x = Math.sin(n * 73.17 + 18.31) * 43758.5453; return x - Math.floor(x); };
  const batches = new Map<Material, BufferGeometry[]>();
  const add = (geometry: BufferGeometry, material: Material, target = batches) => {
    const list = target.get(material) ?? []; list.push(geometry); target.set(material, list);
  };
  const uv = (geometry: BufferGeometry): BufferGeometry => {
    const p = geometry.getAttribute('position'), n = geometry.getAttribute('normal'), values = new Float32Array(p.count * 2);
    for (let i = 0; i < p.count; i++) {
      values[i * 2] = (Math.abs(n.getX(i)) > 0.6 ? p.getZ(i) : p.getX(i)) / 240;
      values[i * 2 + 1] = (Math.abs(n.getY(i)) > 0.6 ? p.getZ(i) : p.getY(i)) / 240;
    }
    // All batches use the same non-indexed layout, including curved components.
    const result = geometry.index ? geometry.toNonIndexed() : geometry;
    if (result !== geometry) geometry.dispose();
    // Recompute UV after expanding an indexed geometry.
    if (result !== geometry) return uv(result);
    result.setAttribute('uv', new BufferAttribute(values, 2));
    const colors = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) {
      const variation = 0.88 + noise(Math.round(p.getX(i) / 3) + Math.round(p.getY(i) / 3) * 11 + Math.round(p.getZ(i) / 3) * 17) * 0.18;
      colors.set([variation, variation, variation], i * 3);
    }
    result.setAttribute('color', new BufferAttribute(colors, 3));
    return result;
  };
  const flush = (source: Map<Material, BufferGeometry[]>, parent: Group, name: string) => {
    for (const [material, geometries] of source) {
      const merged = mergeGeometries(geometries, false);
      if (!merged) throw new Error('Cannot batch central masonry');
      const mesh = new Mesh(merged, material); mesh.name = name;
      mesh.castShadow = !material.userData.distant; mesh.receiveShadow = !material.userData.distant; parent.add(mesh);
      geometries.forEach(g => g.dispose());
    }
  };
  const along = toThree(bridgePoint(1)).sub(toThree(bridgePoint(0))).normalize();
  const normal = new Vector3(-along.z, 0, along.x);
  const placement = (u: number, v: number) => new Matrix4().makeBasis(along, new Vector3(0, 1, 0), normal).setPosition(toThree(bridgePoint(u, v)));
  const spanLength = (a: number, b: number) => toThree(bridgePoint(b)).distanceTo(toThree(bridgePoint(a)));
  const box = (x: number, y: number, z: number, w: number, h: number, d: number, matrix: Matrix4,
    material: Material, target = batches) => {
    const bevel = Math.min(2.2, h / 5, d / 5), shape = new Shape();
    shape.moveTo(-w / 2 + bevel, -h / 2 + bevel); shape.lineTo(w / 2 - bevel, -h / 2 + bevel);
    shape.lineTo(w / 2 - bevel, h / 2 - bevel); shape.lineTo(-w / 2 + bevel, h / 2 - bevel); shape.closePath();
    const geometry = new ExtrudeGeometry(shape, { depth: d - 2 * bevel, steps: 1,
      bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 1 });
    add(uv(geometry.translate(x, y, z - d / 2 + bevel)).applyMatrix4(matrix), material, target);
  };

  // Own the real deck as well: the target sample does not need the old arena's
  // masonry, props or illumination beneath the new surface.
  const deckShape = new Shape();
  [[LAYOUT.edgeMinU, -112], [LAYOUT.edgeMaxU, -112], [LAYOUT.edgeMaxU, 112], [LAYOUT.edgeMinU, 112]].forEach(([u, v], i) => {
    const p = toThree(bridgePoint(u, v));
    if (i === 0) deckShape.moveTo(p.x, -p.z); else deckShape.lineTo(p.x, -p.z);
  });
  deckShape.closePath();
  add(uv(new ExtrudeGeometry(deckShape, { depth: 17, bevelEnabled: false })
    .rotateX(-Math.PI / 2).translate(0, -17.1, 0)), stone);

  // The accepted art alternates tall beast pylons and low, broken walls.
  // Stone courses and snow edges intentionally avoid one continuous straight cap.
  for (const pose of CENTRAL_RAILS) {
    const target = new Map<Material, BufferGeometry[]>(), parent = new Group();
    parent.name = pose.foreground ? 'near-parapet' : 'far-parapet';
    const ownStone = stone.clone(), ownTrim = trim.clone(), ownSnow = snow.clone(), ownIce = ice.clone();
    const ownCarving = carving.clone(), ownRecess = dark.clone();
    const matrix = placement(pose.startU, pose.v), width = spanLength(pose.startU, pose.endU);
    const index = Math.round((pose.startU - LAYOUT.edgeMinU) / 42), seed = index * 19 + (pose.foreground ? 3 : 47);
    const roles = { carving: ownCarving, recess: ownRecess, snow: ownSnow, ice: ownIce };
    const sculpt = (geometry: BufferGeometry, role: SculptRole) => add(uv(geometry).applyMatrix4(matrix), roles[role], target);
    box(width / 2, 7, 0, width, 14, 37, matrix, ownTrim, target);
    for (let row = 0; row < 4; row++) {
      const offset = row % 2 ? -12 : 0, count = 6, step = (width - 34) / count;
      for (let j = 0; j <= count; j++) {
        const left = Math.max(18, 18 + offset + j * step), right = Math.min(width - 15, 18 + offset + (j + 1) * step);
        if (right - left < 5) continue;
        const worn = noise(seed + j * 7 + row * 13), height = row === 3 ? 8 + worn * 11 : 14;
        box((left + right) / 2, 17 + row * 14 + height / 2, (worn - 0.5) * 2,
          right - left - 0.9, height - 0.8, 24 + worn * 4, matrix, ownStone, target);
      }
    }
    for (let j = 0; j < 5; j++) {
      const x = 27 + j * (width - 54) / 4, chipped = noise(seed + j * 23);
      if (chipped < 0.2) continue;
      box(x, 76 + chipped * 4, 0, 21 + chipped * 6, 12, 31, matrix, ownTrim, target);
      targetSnowCap(sculpt, x, 83 + chipped * 4, 0, 25 + chipped * 6, 35, seed + j);
      if (j % 2 === 0) targetIcicles(sculpt, x, 82, 17, 25, seed + j * 3, 45);
    }
    const column = (x: number, major: boolean) => {
      const w = major ? 49 : 32, height = major ? 131 : 86;
      box(x, 10, 0, w + 16, 20, w + 17, matrix, ownTrim, target);
      for (let k = 0; k < (major ? 7 : 5); k++) {
        const blockH = (height - 18) / (major ? 7 : 5);
        box(x + (noise(seed + k) - 0.5) * 1.4, 18 + (k + 0.5) * blockH, 0,
          w - (k % 3 === 0 ? 0 : 2.5), blockH - 0.8, w + 1, matrix, ownStone, target);
      }
      box(x, height - 2, 0, w + 9, 12, w + 12, matrix, ownTrim, target);
      targetSnowCap(sculpt, x, height + 7, 0, w + 12, w + 15, seed + 11);
      targetIcicles(sculpt, x, height + 3, (w + 15) / 2, w + 8, seed + 21, major ? 75 : 45);
      for (const face of [-1, 1]) {
        const panelHeight = major ? 94 : 53, panelY = major ? 68 : 44;
        box(x, panelY, face * (w / 2 + 0.5), 29, panelHeight, 0.8, matrix, ownStone, target);
        for (const edge of [-1, 1]) box(x + edge * 15.5, panelY, face * (w / 2 + 1.5),
          2, panelHeight + 3, 2, matrix, ownTrim, target);
        for (let k = 0; k < (major ? 4 : 2); k++) {
          const y = 33 + k * 22;
          add(uv(new TorusGeometry(9, 1.6, 4, 4)
            .translate(x, y, face * (w / 2 + 1.8))).applyMatrix4(matrix), ownCarving, target);
        }
      }
      if (major) {
        targetGuardian(sculpt, x, height + 11, 0, seed);
      } else {
        for (let k = 0; k < 3; k++) {
          add(uv(new ConeGeometry(6 + k * 1.4, 32 + k * 13, 5).rotateZ((k - 1) * 0.18)
            .translate(x + (k - 1) * 8, height + 24 + k * 5, 0)).applyMatrix4(matrix), ownIce, target);
        }
      }
    };
    column(0, index % 2 === 0);
    if (pose.endU === LAYOUT.edgeMaxU) column(width, true);
    const activeMaterials = [...target.keys()];
    for (const material of [ownStone, ownTrim, ownSnow, ownIce, ownCarving, ownRecess]) {
      if (!target.has(material)) material.dispose();
    }
    flush(target, parent, 'target-carved-parapet'); group.add(parent);
    parent.userData.guardian = index % 2 === 0;
    if (pose.foreground) curtains.push({ start: pose.startU, end: pose.endU,
      materials: activeMaterials, opacity: 1 });
  }

  for (const pose of CENTRAL_ARCHES) {
    const width = spanLength(pose.startU, pose.endU), matrix = placement(pose.startU, pose.v);
    add(uv(bridgeSupportGeometry(width)).applyMatrix4(matrix), stone);
    // Individual radial arch stones project out from both faces; the underside
    // is real geometry rather than a painted dark curve.
    const radius = width / 2 - 38;
    for (let j = 0; j < 13; j++) {
      const a = j * Math.PI / 13 + 0.009, b = (j + 1) * Math.PI / 13 - 0.009;
      const wedge = new Shape();
      wedge.absarc(width / 2, -205, radius + 27, a, b, false);
      wedge.absarc(width / 2, -205, radius + 2, b, a, true); wedge.closePath();
      add(uv(new ExtrudeGeometry(wedge, { depth: 47, bevelEnabled: false, curveSegments: 3 })
        .translate(0, 0, -23.5)).applyMatrix4(matrix), archDress);
    }
    const buttress = (x: number) => {
      box(x, -258, 0, 48, 238, 58, matrix, stone);
      box(x, -355, 0, 66, 32, 75, matrix, trim);
      box(x, -174, 0, 57, 13, 67, matrix, trim);
      const sculpt = (g: BufferGeometry, role: SculptRole) => add(uv(g).applyMatrix4(matrix), { carving, recess: dark, snow, ice }[role]);
      targetSnowCap(sculpt, x, -162, 0, 64, 73, x + 17);
      targetIcicles(sculpt, x, -166, 36, 63, x + 29, 120);
      for (const face of [-1, 1]) for (let k = 0; k < 6; k++) {
        add(uv(new TorusGeometry(11, 1.7, 4, 4)
          .translate(x, -220 - k * 20, face * 31)).applyMatrix4(matrix), carving);
      }
      box(x, -22, 0, 48, 24, 56, matrix, trim);
    };
    buttress(0); if (pose.endU === LAYOUT.edgeMaxU) buttress(width);
    box(width / 2, -8, 0, width, 16, 48, matrix, trim);
  }
  // Snow gathers on sheltered shoulders; broken stones transition into the road.
  for (const side of [-1, 1]) for (let i = 0; i < 44; i++) {
    const u = LAYOUT.edgeMinU + 3 + i * 7.6, seed = i * 17 + side * 9;
    const p = toThree(bridgePoint(u, side * (96 + noise(seed) * 10)), 1.2);
    const sculpt = (g: BufferGeometry, role: SculptRole) => add(uv(g).translate(p.x, p.y, p.z), { carving, recess: dark, snow, ice }[role]);
    if (i % 3 !== 0) targetSnowCap(sculpt, 0, 2, 0, 16 + noise(seed + 1) * 14, 13 + noise(seed + 2) * 10, seed);
    for (let k = 0; k < 3; k++) {
      add(uv(new DodecahedronGeometry(1, 0).scale(2 + noise(seed + k) * 3, 1 + noise(seed + 3 + k) * 3, 2 + noise(seed + 7 + k) * 4)
        .rotateY(seed).translate(p.x + k * 4, 2.4, p.z - side * (10 + k * 6))), carving);
    }
  }
  // Layered fractured cliffs replace the former regular cylinder silhouettes.
  const cliff = new MeshStandardMaterial({ color: 0x6a748b, roughness: 1, flatShading: true, vertexColors: true });
  // Fine fracture/grain belongs to the rock surface, while the silhouette and
  // parallax still come from the closed cliff meshes.
  cliff.onBeforeCompile = shader => {
    shader.vertexShader = 'varying vec3 targetRockPosition;\n' + shader.vertexShader.replace('#include <worldpos_vertex>',
      '#include <worldpos_vertex>\n targetRockPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = `varying vec3 targetRockPosition;
      float targetRockHash(vec3 p) { return fract(sin(dot(p, vec3(12.9898,78.233,31.731))) * 43758.5453); }
      ` + shader.fragmentShader.replace('#include <color_fragment>', `
      #include <color_fragment>
      vec3 rockP = targetRockPosition;
      float grain = targetRockHash(floor(rockP * 1.3));
      float seam = 1.0 - smoothstep(0.025, 0.12, abs(sin(rockP.x * 0.075 + rockP.z * 0.05 + sin(rockP.y * 0.01))));
      float bed = step(0.945, fract(rockP.y * 0.025 + sin(rockP.x * 0.02) * 0.05));
      diffuseColor.rgb *= (0.84 + grain * 0.22) * (1.0 - seam * 0.3 - bed * 0.24);
      `);
  };
  cliff.customProgramCacheKey = () => 'target-fractured-cliffs-v1';
  const farSnow = new MeshStandardMaterial({ color: 0xaabacd, roughness: 1, vertexColors: true });
  cliff.userData.distant = farSnow.userData.distant = true;
  for (const side of [-1, 1]) for (let i = 0; i < 24; i++) {
    const seed = i * 23 + side * 17, u = -400 + i * 35;
    const v = side * (250 + i % 4 * 95), height = 780 + noise(seed) * 640;
    const radius = 42 + noise(seed + 4) * 67;
    const top = side < 0 ? -30 + (i % 4 === 2 ? 230 : 0) : -390 - i % 3 * 120;
    const p = toThree(bridgePoint(u, v), top - height / 2);
    for (let k = 0; k < 4; k++) {
      const h = height * (0.62 + noise(seed + k) * 0.38), r = radius * (k === 0 ? 1 : 0.38);
      const dx = k === 0 ? 0 : Math.cos(k * 2.3) * radius, dz = k === 0 ? 0 : Math.sin(k * 2.3) * radius;
      const geometry = new CylinderGeometry(r * 0.65, r, h, 7, 4);
      const positions = geometry.getAttribute('position');
      for (let j = 0; j < positions.count; j++) {
        const y = positions.getY(j), x = positions.getX(j), z = positions.getZ(j);
        const n = noise(Math.round(y / 30) * 7 + Math.round(x) + Math.round(z) * 13 + seed);
        positions.setXYZ(j, x * (0.9 + n * 0.16), y + (n - 0.5) * 20, z * (0.9 + n * 0.16));
      }
      geometry.computeVertexNormals();
      add(uv(geometry).translate(p.x + dx, p.y, p.z + dz), cliff);
      const summit = p.y + h / 2;
      const sculpt = (g: BufferGeometry) => add(uv(g).translate(p.x + dx, summit, p.z + dz), farSnow);
      targetSnowCap(sculpt, 0, 0, 0, r * 1.4, r * 1.4, seed + k);
      if (k === 0) {
        for (let t = 0; t < 7; t++) {
          add(uv(new ConeGeometry(3 + t % 2 * 2, 100 + noise(seed + t) * 240, 5).rotateZ(Math.PI)
            .translate(p.x + dx + (t - 3) * 7, summit - 100, p.z + dz + r * 0.65)), farSnow);
        }
      }
    }
  }
  // Braziers are bowls and stone pedestals; only the emissive flame is unlit.
  for (const source of S01_TORCHES) {
    const u = source.phase; if (u < LAYOUT.edgeMinU || u > LAYOUT.edgeMaxU) continue;
    const p = toThree(source), matrix = new Matrix4().makeTranslation(p.x, 0, p.z);
    box(0, 8, 0, 36, 16, 36, matrix, trim);
    box(0, 24, 0, 27, 20, 27, matrix, stone);
    add(uv(new CylinderGeometry(22, 13, 16, 10).translate(0, 39, 0)).applyMatrix4(matrix), trim);
    add(uv(new CylinderGeometry(18, 15, 2, 10).translate(0, 47.5, 0)).applyMatrix4(matrix), dark);
    add(uv(new TorusGeometry(20, 2.5, 4, 10).rotateX(Math.PI / 2).translate(0, 48, 0)).applyMatrix4(matrix), trim);
    const flame = new Mesh(new ConeGeometry(10, 28, 5), new MeshBasicMaterial({ color: 0xffb34e, toneMapped: false }));
    flame.position.set(p.x, 61, p.z); flame.userData.phase = source.phase;
    flame.name = 'volumetric-brazier-flame'; flames.push(flame); group.add(flame);
  }
  flush(batches, group, 'solid-bridge-architecture');
  // The prototype owns every geometry and material through this tree.
  // Base templates were cloned for wall segments, so dispose the unused originals
  // only if they are not used by the static batches.
  for (const material of [ice, carving]) if (!batches.has(material)) material.dispose();
  return { group, curtains, flames };
}
