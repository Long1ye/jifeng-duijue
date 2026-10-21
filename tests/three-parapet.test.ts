import { describe, expect, it, vi } from 'vitest';
import { Mesh, Raycaster, Texture, TextureLoader, Vector3 } from 'three';
import { PARAPET_ART, PARAPET_SPAN, parapetCut, parapetGeometry, parapetRuns } from '../src/render-three/PaintedParapet';
import { PaintedBridgeSample } from '../src/render-three/PaintedBridgeSample';
import { LANDMARK_SPECS, landmarkRelief } from '../src/render-three/PaintedMapLandmarks';
import { BRIDGE, bridgePoint } from '../src/game/Bridge';
import { toThree } from '../src/render-three/Coordinates';
import { artEdgeV } from '../src/render-three/PaintedMapLayout';

describe('wall detail regressions', () => {
  it('closes the wall-to-arch joint through ordinary and flared bridge edges', () => {
    const mock = vi.spyOn(TextureLoader.prototype, 'load').mockImplementation((_url, done) => {
      const texture = new Texture<HTMLImageElement>(); done?.(texture); return texture;
    });
    const bridge = new PaintedBridgeSample();
    try {
      bridge.group.updateMatrixWorld(true);
      expect(bridge.group.getObjectByName('painted-continuous-stringcourse')).toBeUndefined();
      const arches = bridge.group.children.filter(o => o.name === 'painted-bridge-arch') as Mesh[];
      expect(arches.length).toBeGreaterThan(10);
      for (const side of [-1, 1]) for (const run of parapetRuns(side)) {
        for (let u = run.start + .1; u < run.end; u += 6) {
          const point = toThree(bridgePoint(u, side * artEdgeV(u)), -2);
          const ray = new Raycaster(point.clone().add(new Vector3(0, 0, 10)), new Vector3(0, 0, -1), 0, 20);
          expect(ray.intersectObjects(arches).length, `open arch joint at ${u}, side ${side}`).toBeGreaterThan(0);
        }
      }
      for (const arch of arches) {
        arch.geometry.computeBoundingBox();
        expect(arch.geometry.boundingBox!.max.y).toBeGreaterThan(.55);
      }
    } finally { bridge.dispose(); mock.mockRestore(); }
  });
  it('continues the rear wall into both sanctuary plinths without filling the niches', () => {
    const runs = parapetRuns(-1);
    for (const u of [-660, -535, 497, 619]) {
      expect(runs.some(run => run.start <= u && run.end >= u), `open sanctuary joint at ${u}`).toBe(true);
    }
    for (const u of [-600, 560]) expect(runs.some(run => run.start < u && run.end > u)).toBe(false);
  });
  it('joins full and partial runs through masonry without cutting a pointed post', () => {
    for (let i = 1; i <= 101; i++) {
      const span = PARAPET_SPAN * i / 101, [left, right] = parapetCut(span);
      for (const edge of [left, right]) for (const [a, b] of PARAPET_ART.posts) expect(edge < a || edge > b).toBe(true);
      const g = parapetGeometry(span), p = g.getAttribute('position'); g.computeBoundingBox();
      expect(g.boundingBox!.max.x).toBeCloseTo(span * BRIDGE.projection.along[0], 3);
      expect(g.boundingBox!.min.y).toBeGreaterThanOrEqual(.25);
      for (let j = 0; j < p.count; j += 71) expect(p.getZ(j)).toBeCloseTo(p.getX(j) * BRIDGE.projection.along[1] / BRIDGE.projection.along[0], 3);
      g.dispose();
    }
    expect(() => parapetCut(0)).toThrow(); expect(() => parapetCut(PARAPET_SPAN + 1)).toThrow();
  });
  it('does not bury the sanctuary feet under the receiving floor', () => {
    for (const spec of [LANDMARK_SPECS.backwall]) {
      const g = landmarkRelief(spec); g.computeBoundingBox();
      expect(g.boundingBox!.min.y + .8).toBeGreaterThan(.55); g.dispose();
    }
  });
  it('supports the reported protruding stone feet rather than exposing abyss beneath them', () => {
    const mock = vi.spyOn(TextureLoader.prototype, 'load').mockImplementation((_url, done) => {
      const texture = new Texture<HTMLImageElement>(); done?.(texture); return texture;
    });
    const bridge = new PaintedBridgeSample();
    try {
      const floor = bridge.group.children.filter(o => ['painted-wall-footing', 'painted-bridge-floor', 'painted-road-extension'].includes(o.name)) as Mesh[];
      bridge.group.updateMatrixWorld(true);
      const cases = [
        { spec: LANDMARK_SPECS.backwall, u: -647, v: -145, feet: [[125, 805], [200, 869], [1500, 565]] },
      ];
      for (const { spec, u, v, feet } of cases) for (const [px, py] of feet) {
        const foot = toThree(bridgePoint(u, v));
        foot.x += (px - spec.anchor[0]) * spec.scale;
        foot.z += .25 - (spec.anchor[1] - py) * spec.scale * Math.SQRT2;
        const ray = new Raycaster(foot.clone().setY(100), new Vector3(0, -1, 0));
        expect(ray.intersectObjects(floor, false).length, `unsupported source foot ${px},${py}`).toBeGreaterThan(0);
      }
      expect(bridge.group.children.filter(o => o.name === 'painted-wall-footing')).toHaveLength(1);
      expect(bridge.group.children.filter(o => o.name === 'painted-wall-footing-edge')).toHaveLength(1);
      // The ordinary near fence must sit at the outer rim rather than behind
      // an exposed strip of paving. Inspect the actual merged render geometry.
      const rim = bridge.group.children.find(o => o.name === 'painted-wall-footing-edge') as Mesh;
      const vertices = rim.geometry.getAttribute('position');
      const a = BRIDGE.projection.along, b = BRIDGE.projection.across;
      const determinant = a[0] * b[1] - a[1] * b[0];
      // Support paving must stay outside the existing road. An inward cap
      // used to stretch a floor crop into a continuous bright strip.
      const cap = bridge.group.getObjectByName('painted-wall-footing') as Mesh;
      const top = cap.geometry.getAttribute('position');
      for (let i = 0; i < top.count; i++) {
        const x = top.getX(i), z = top.getZ(i);
        const u = (x * b[1] - z * b[0]) / determinant;
        const v = (a[0] * z - a[1] * x) / determinant;
        expect(Math.abs(v) - artEdgeV(u)).toBeGreaterThanOrEqual(-.001);
        expect(u < -510 || u > 467, `unnecessary ordinary wall cap at ${u}`).toBe(true);
      }
      let checked = 0;
      for (let i = 0; i < vertices.count; i++) {
        const x = vertices.getX(i), z = vertices.getZ(i);
        const u = (x * b[1] - z * b[0]) / determinant;
        const v = (a[0] * z - a[1] * x) / determinant;
        if (v <= 0) continue;
        expect(v - artEdgeV(u)).toBeCloseTo(0, 3); checked++;
      }
      expect(checked).toBeGreaterThan(100);
    } finally { bridge.dispose(); mock.mockRestore(); }
  });
});

