import { describe, expect, it } from 'vitest';
import { LoadingManager } from 'three';
import { AssetLoadGate } from '../src/presentation/AssetLoadGate';

describe('game resource gate', () => {
  it('waits for real texture and decode completion after sealing', async () => {
    const manager = new LoadingManager(), original = manager.itemStart, gate = new AssetLoadGate(manager);
    let decode!: () => void, finished = false;
    gate.ready.then(() => { finished = true; });
    manager.itemStart('hero'); gate.track('HUD', new Promise<void>(resolve => { decode = resolve; })); gate.seal();
    manager.itemEnd('hero'); await Promise.resolve(); expect(finished).toBe(false);
    decode(); await gate.ready; expect(finished).toBe(true); expect(manager.itemStart).toBe(original);
  });
  it('blocks the match on failure and restores the loader callbacks', async () => {
    const manager = new LoadingManager(), original = manager.itemEnd, gate = new AssetLoadGate(manager);
    manager.itemStart('/textures/hero.png'); gate.seal(); manager.itemError('/textures/hero.png'); manager.itemEnd('/textures/hero.png');
    await expect(gate.ready).rejects.toThrow('hero.png'); expect(manager.itemEnd).toBe(original);
  });
  it('tracks dependencies started inside another loader callback', async () => {
    const manager = new LoadingManager(), gate = new AssetLoadGate(manager);
    let extra = false, finished = false;
    manager.onLoad = () => { if (!extra) { extra = true; manager.itemStart('animation'); } };
    gate.ready.then(() => { finished = true; }); manager.itemStart('map'); gate.seal(); manager.itemEnd('map');
    await Promise.resolve(); expect(finished).toBe(false);
    manager.itemEnd('animation'); await gate.ready; expect(finished).toBe(true);
  });
  it('cancels pending loading without unlocking gameplay', async () => {
    const manager = new LoadingManager(), gate = new AssetLoadGate(manager);
    manager.itemStart('pending'); gate.seal(); gate.dispose(); await expect(gate.ready).rejects.toThrow('取消');
    manager.itemEnd('pending');
  });
});
