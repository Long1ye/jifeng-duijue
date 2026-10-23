import { afterEach, expect, it, vi } from 'vitest';
import { WorldHealthBars } from '../src/render-three/WorldHealthBars';
import { Match } from '../src/game/Match';
import { RenderPositions } from '../src/render/RenderPositions';
import { ThreeCamera } from '../src/render-three/Coordinates';

class ElementStub {
  className = ''; width = 0; height = 0; hidden = false;
  style: { cssText?: string; transform?: string; opacity?: string } = {};
  dataset: Record<string, string> = {};
  children: ElementStub[] = [];
  parent?: ElementStub;
  context = { scale: vi.fn(), clearRect: vi.fn(), drawImage: vi.fn(), fillRect: vi.fn(), fillStyle: '', imageSmoothingEnabled: false };
  setAttribute() {}
  getContext() { return this.context; }
  append(...children: ElementStub[]) { for (const child of children) { child.parent = this; this.children.push(child); } }
  replaceChildren() { this.children = []; }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter(child => child !== this); }
}
afterEach(() => vi.unstubAllGlobals());

it('keeps moving minion bars in a cached native-resolution UI layer, aligned to physical pixels', () => {
  vi.stubGlobal('document', { createElement: () => new ElementStub() });
  vi.stubGlobal('window', { devicePixelRatio: 1.25 });
  vi.stubGlobal('Image', class { src = ''; complete = false; naturalWidth = 0; });
  const container = new ElementStub(), bars = new WorldHealthBars(container as unknown as HTMLElement);
  const match = new Match({ ai: false, waves: false });
  const minion = match.spawnMinion('blue', 'melee', match.hero('blue'));
  const camera = new ThreeCamera(); camera.resize(1280, 720); camera.lookAt(minion);
  const positions = new RenderPositions(); positions.capture(match.entities); minion.x += 3; minion.y += 1;
  const layer = bars.element as unknown as ElementStub;
  try {
    for (const alpha of [.1, .3, .5, .7, .9]) {
      bars.update({ match, positions, alpha, events: [] }, camera, true, true);
      const bar = layer.children.find(child => child.dataset.entityId === String(minion.id))!;
      expect(bar.width).toBe(Math.round(34 * 1.25)); expect(bar.height).toBe(Math.round(5 * 1.25));
      const [, x, y] = bar.style.transform!.match(/translate3d\(([-\d.]+)px,([-\d.]+)px/)!;
      for (const value of [x, y]) expect(Number(value) * 1.25).toBeCloseTo(Math.round(Number(value) * 1.25));
      expect(bar.context.clearRect).toHaveBeenCalledTimes(1);
      expect(bar.context.fillRect.mock.lastCall).toEqual([2, 1, 30, 2]);
    }
    const bar = layer.children.find(child => child.dataset.entityId === String(minion.id))!;
    minion.hp = minion.maxHp / 2;
    bars.update({ match, positions, alpha: 1, events: [] }, camera, true, true);
    expect(bar.context.fillRect.mock.lastCall).toEqual([2, 1, 15, 2]);
    bars.update({ match, positions, alpha: 1, events: [] }, camera, true, true, entity => entity.id !== minion.id);
    expect(layer.children.some(child => child.dataset.entityId === String(minion.id))).toBe(false);
    bars.update({ match, positions, alpha: 1, events: [] }, camera, true, true);
    minion.hp = 0;
    bars.update({ match, positions, alpha: 1, events: [] }, camera, true, true);
    expect(layer.children.some(child => child.dataset.entityId === String(minion.id))).toBe(false);
  } finally { bars.dispose(); }
});
