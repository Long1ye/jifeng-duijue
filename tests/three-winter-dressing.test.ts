import { afterEach, expect, it, vi } from 'vitest';
import { BoxGeometry, Group, Mesh, MeshBasicMaterial, Texture, TextureLoader } from 'three';
import { WinterDressing } from '../src/render-three/WinterDressing';
import { QualitySettings } from '../src/render-three/QualitySettings';
import { EnvironmentIllumination } from '../src/render-three/EnvironmentIllumination';

afterEach(() => vi.restoreAllMocks());

it('follows crystal transforms, team colors, fading, destruction and ancestor visibility', () => {
  const map = new Texture<HTMLImageElement>(); vi.spyOn(TextureLoader.prototype, 'load').mockReturnValue(map);
  const root = new Group(), geometry = new BoxGeometry();
  const blue = new Mesh(geometry, new MeshBasicMaterial()), red = new Mesh(geometry, new MeshBasicMaterial());
  blue.name = red.name = 'painted-tower'; blue.userData.team = 'blue'; red.userData.team = 'red'; root.add(blue, red);
  const quality = new QualitySettings(), dressing = new WinterDressing(quality, [root], new EnvironmentIllumination([]));
  try {
    root.position.x = 90; blue.position.z = 35; dressing.update();
    expect(dressing.crystals.value[0].x).toBe(90); expect(dressing.crystals.value[0].z).toBe(35);
    const colors = dressing.crystalColors.value;
    expect(colors[0].z).toBeGreaterThan(colors[0].x); expect(colors[1].x).toBeGreaterThan(colors[1].z);
    const fullStrength = colors[0].length();
    blue.material.opacity = .35; dressing.update(); expect(colors[0].length()).toBeCloseTo(fullStrength * .35);
    blue.visible = false; dressing.update(); expect(colors[0].length()).toBe(0); expect(colors[1].length()).toBeGreaterThan(0);
    blue.visible = true; root.visible = false; dressing.update(); expect(colors.every(c => c.length() === 0)).toBe(true);
  } finally { dressing.dispose(); geometry.dispose(); blue.material.dispose(); red.material.dispose(); }
});

it('releases only its owned resources once, ignores late loading and supports independent fallback', () => {
  const map = new Texture<HTMLImageElement>(); let loaded: (() => void) | undefined;
  vi.spyOn(TextureLoader.prototype, 'load').mockImplementation((_url, done) => { loaded = () => done?.(map); return map; });
  const root = new Group(), borrowedMap = new Texture(), ground = new Mesh(new BoxGeometry(), new MeshBasicMaterial({ map: borrowedMap }));
  ground.name = 'painted-bridge-floor'; root.add(ground);
  const quality = new QualitySettings(), dressing = new WinterDressing(quality, [root], new EnvironmentIllumination([]));
  const mesh = dressing.group.children[0] as Mesh;
  const ownedMap = vi.spyOn(map, 'dispose'), ownedGeometry = vi.spyOn(mesh.geometry, 'dispose');
  const borrowedGeometry = vi.spyOn(ground.geometry, 'dispose'), borrowedTexture = vi.spyOn(borrowedMap, 'dispose');
  expect(dressing.group.visible).toBe(false); loaded?.(); dressing.update(); expect(dressing.group.visible).toBe(true);
  quality.winter.value = 0; dressing.update(); expect(dressing.group.visible).toBe(false); expect(quality.materials.value).toBe(1);
  quality.setEnhanced(false); expect(quality.winter.value).toBe(0);
  quality.setEnhanced(true); dressing.update(); expect(dressing.group.visible).toBe(true);
  dressing.dispose(); dressing.dispose(); loaded?.();
  expect(dressing.group.children).toHaveLength(0);
  expect(ownedMap).toHaveBeenCalledOnce(); expect(ownedGeometry).toHaveBeenCalledOnce();
  expect(borrowedGeometry).not.toHaveBeenCalled(); expect(borrowedTexture).not.toHaveBeenCalled();
  ground.geometry.dispose(); ground.material.dispose(); borrowedMap.dispose();
});
