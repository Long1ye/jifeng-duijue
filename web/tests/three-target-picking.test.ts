import { describe, expect, it } from 'vitest';
import { CylinderGeometry, Mesh, MeshBasicMaterial, Raycaster } from 'three';
import { ThreeCamera, toThree } from '../src/render-three/Coordinates';
import { pickActorId } from '../src/render-three/InputPicking';

describe('overlapping combat targets', () => {
  const geometry = new CylinderGeometry(1, 1, 1, 8), material = new MeshBasicMaterial();
  function setup(width = 1600, height = 900, zoom = .6) {
    const view = new ThreeCamera(); view.resize(width, height); view.setElevation(45); view.setZoom(zoom);
    const point = { x: 3100, y: 1700 }; view.lookAt(point);
    const rect = { left: 23, top: 17, width, height };
    const actor = (id: number, team: string, x = 0, y = 0, hero = false) => {
      const mesh = new Mesh(geometry, material), bodyHeight = hero ? 78 : 32;
      mesh.scale.set(hero ? 21 : 10, bodyHeight, hero ? 11 : 6);
      mesh.position.copy(toThree({ x: point.x + x, y: point.y + y }, bodyHeight / 2));
      mesh.userData = { entityId: id, entityTeam: team }; mesh.visible = false;
      return mesh;
    };
    const cursor = (x = 0, y = 0, height = 16) => {
      const screen = view.project({ x: point.x + x, y: point.y + y }, height);
      return { x: screen.x + rect.left, y: screen.y + rect.top };
    };
    const pick = (client: { x: number; y: number }, actors: Mesh[], paddingCss = 5) =>
      pickActorId(view, rect, client, actors, new Raycaster(), { preferredTeam: 'red', paddingCss });
    return { actor, cursor, pick, view, rect };
  }
  it.each([false, true])('picks a hostile behind an allied minion (hostile hero: %s)', hero => {
    const { actor, cursor, pick, view, rect } = setup();
    const ally = actor(1, 'blue', 0, 6), enemy = actor(2, 'red', 0, 0, hero), at = cursor();
    expect(pickActorId(view, rect, at, [ally, enemy])).toBe(1);
    expect(pick(at, [ally, enemy])).toBe(2);
    expect(pick(at, [enemy, ally])).toBe(2);
  });
  it('uses cursor proximity among enemies instead of always stealing minion clicks for a hero', () => {
    const { actor, cursor, pick } = setup();
    const minion = actor(2, 'red'), hero = actor(3, 'red', 0, 0, true);
    expect(pick(cursor(), [hero, minion])).toBe(2);
    expect(pick(cursor(0, 0, 55), [minion, hero])).toBe(3);
  });
  it.each([[1280, 720, .4], [1920, 1080, .6], [1280, 720, 1.5]])('adds a bounded CSS pixel margin at %s x %s / %s', (width, height, zoom) => {
    const { actor, cursor, pick, view, rect } = setup(width, height, zoom);
    const enemy = actor(2, 'red');
    const center = cursor();
    const edge = view.project({ x: 3110, y: 1700 }, 16).x + rect.left;
    const near = { x: edge + 3, y: center.y };
    expect(pick(near, [enemy], 0)).toBeNull();
    expect(pick(near, [enemy])).toBe(2);
    expect(pick({ x: edge + 8, y: center.y }, [enemy])).toBeNull();
    expect(pick({ x: rect.left - 1, y: center.y }, [enemy])).toBeNull();
    expect(pick(center, [])).toBeNull();
  });
  it('still allows selecting allied units without a nearby enemy', () => {
    const { actor, cursor, pick } = setup();
    expect(pick(cursor(), [actor(1, 'blue'), actor(2, 'red', 80)])).toBe(1);
    expect(pick(cursor(150), [actor(1, 'blue')])).toBeNull();
  });
});
