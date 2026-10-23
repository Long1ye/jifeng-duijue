import { BufferGeometry, ConeGeometry, ExtrudeGeometry, IcosahedronGeometry, Shape, TorusGeometry } from 'three';

export type SculptRole = 'carving' | 'recess' | 'snow' | 'ice';
export type SculptPart = (geometry: BufferGeometry, role: SculptRole) => void;
const noise = (n: number) => { const x = Math.sin(n * 73.17 + 18.31) * 43758.5453; return x - Math.floor(x); };

/** Sculpted snow lobes, with a broken lower edge rather than a rectangular slab. */
export function targetSnowCap(add: SculptPart, x: number, y: number, z: number, width: number, depth: number, seed: number): void {
  const outline = new Shape();
  for (let i = 0; i < 12; i++) {
    const angle = i * Math.PI / 6, radius = 0.8 + noise(seed + i * 7) * 0.28;
    const px = Math.cos(angle) * width * 0.53 * radius, pz = Math.sin(angle) * depth * 0.53 * radius;
    if (i === 0) outline.moveTo(px, pz); else outline.lineTo(px, pz);
  }
  outline.closePath();
  add(new ExtrudeGeometry(outline, { depth: 2.2, bevelEnabled: true, bevelSize: 0.9,
    bevelThickness: 0.8, bevelSegments: 1 }).rotateX(-Math.PI / 2).translate(x, y - 0.8, z), 'snow');
  for (let i = 0; i < 2; i++) {
    const angle = noise(seed + i * 11) * Math.PI * 2, size = 3 + noise(seed + i) * 3;
    add(new IcosahedronGeometry(1, 1).scale(size, 1.2, size * 0.8)
      .translate(x + Math.cos(angle) * width * 0.4, y - 1, z + Math.sin(angle) * depth * 0.43), 'snow');
  }
}

/** Snow-worn seated guardian, based on the beast silhouettes in the accepted art.
 * All anatomy, mane, paws and facial recesses are independent closed volumes. */
export function targetGuardian(add: SculptPart, x: number, base: number, z: number, seed: number): void {
  const mass = (px: number, py: number, pz: number, w: number, h: number, d: number, role: SculptRole = 'carving', detail = 1) => {
    add(new IcosahedronGeometry(1, detail).scale(w, h, d).translate(x + px, base + py, z + pz), role);
  };
  // Haunches, chest and two weight-bearing forelegs.
  mass(0, 23, -8, 22, 26, 24); mass(0, 48, 0, 20, 28, 20);
  for (const side of [-1, 1]) {
    mass(side * 13, 12, -13, 14, 13, 19);
    mass(side * 11, 25, 15, 6.5, 22, 7.5);
    mass(side * 11, 5, 21, 9, 6, 14);
    // Three cut toe channels on the front paws.
    for (let i = -1; i <= 1; i++) mass(side * 11 + i * 3.5, 5.5, 31, 0.8, 2.5, 1.6, 'recess', 0);
  }
  mass(0, 72, 7, 18, 19, 18); mass(0, 65, 22, 13, 9, 12);
  mass(0, 70, 32, 8.5, 5, 4, 'recess');
  mass(0, 60, 21, 10, 3, 10, 'recess');
  mass(0, 57, 23, 9, 4.5, 9);
  for (const side of [-1, 1]) {
    mass(side * 10, 76, 21, 2.8, 1.4, 2, 'recess');
    mass(side * 10, 80, 20, 8, 3.5, 5);
    add(new ConeGeometry(7.5, 20, 4).rotateZ(side * -0.18).translate(x + side * 13, base + 91, z + 2), 'carving');
    for (let i = 0; i < 5; i++) {
      const tuft = new ConeGeometry(7 + i % 2 * 2, 22, 5).rotateZ(side * -0.8).rotateX(-0.2);
      tuft.translate(x + side * (17 + i % 2 * 2), base + 68 - i * 9, z - 1 + i * 1.5); add(tuft, 'carving');
    }
  }
  // A curled stone tail reads from the side as well as the main game view.
  add(new TorusGeometry(14, 4.5, 5, 10, Math.PI * 1.5).rotateY(Math.PI / 2)
    .translate(x + 21, base + 17, z - 11), 'carving');
  targetSnowCap(add, x, base + 91, z + 7, 29, 24, seed);
  targetSnowCap(add, x - 2, base + 65, z - 16, 25, 20, seed + 4);
  targetSnowCap(add, x + 13, base + 16, z - 17, 18, 18, seed + 9);
}

/** Unequal ice teeth, attached to ledges instead of evenly spaced spikes. */
export function targetIcicles(add: SculptPart, x: number, y: number, z: number, width: number, seed: number, length = 55): void {
  for (let i = 0; i < 7; i++) {
    const height = length * (0.22 + noise(seed + i * 13) * 0.95);
    const radius = 0.8 + height * 0.025;
    add(new ConeGeometry(radius, height, 5).rotateZ(Math.PI)
      .translate(x + (noise(seed + i * 7 + 3) - 0.5) * width, y - height / 2, z), 'ice');
  }
}
