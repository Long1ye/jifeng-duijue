import { describe, expect, it, vi } from 'vitest';
import { classifyGraphicsHardware, conservativeGraphicsTier, detectGraphicsHardware } from '../src/render-three/GraphicsHardware';

describe('startup graphics hardware presets', () => {
  const capable = { hardwareConcurrency: 12, deviceMemory: 8, maxTextureSize: 16384 };
  it.each(['ANGLE (Google, Vulkan SwiftShader Device)', 'Mesa llvmpipe', 'Microsoft Basic Render Driver', 'Software Rasterizer'])('uses minimum for software rendering: %s', renderer => {
    expect(classifyGraphicsHardware({ ...capable, renderer })).toMatchObject({ kind: 'software', tier: 'minimum' });
  });
  it.each(['Intel(R) UHD Graphics 630', 'ANGLE (Intel, Intel(R) Iris(R) Xe Graphics)', 'AMD Radeon(TM) Graphics', 'AMD Radeon 780M', 'Apple M2 GPU', 'Adreno 740'])('prioritizes low for integrated or unified graphics: %s', renderer => {
    expect(classifyGraphicsHardware({ ...capable, renderer })).toMatchObject({ kind: 'integrated', tier: 'low' });
  });
  it('uses high only for recognized capable GPUs with sufficient CPU and reported limits', () => {
    for (const renderer of ['NVIDIA GeForce RTX 4060 Laptop GPU', 'AMD Radeon RX 7800 XT']) {
      expect(classifyGraphicsHardware({ ...capable, renderer }).tier).toBe('high');
      expect(classifyGraphicsHardware({ ...capable, renderer, hardwareConcurrency: 4 }).tier).toBe('low');
      expect(classifyGraphicsHardware({ ...capable, renderer, deviceMemory: 4 }).tier).toBe('low');
      expect(classifyGraphicsHardware({ renderer, hardwareConcurrency: 12 }).tier).toBe('balanced');
    }
    expect(classifyGraphicsHardware({ ...capable, renderer: 'NVIDIA GeForce GT 710' }).tier).toBe('balanced');
    expect(classifyGraphicsHardware({ ...capable, renderer: 'NVIDIA GeForce RTX 4090', maxTextureSize: 2048 }).tier).toBe('minimum');
  });
  it('does not infer a powerful GPU from a masked name, many cores or large texture limits', () => {
    expect(classifyGraphicsHardware(capable)).toMatchObject({ kind: 'unknown', tier: 'low' });
    expect(classifyGraphicsHardware({ ...capable, renderer: 'WebKit WebGL' }).tier).toBe('low');
  });
  it('reads only the existing context once and tolerates unavailable or denied debug information', () => {
    const getParameter = vi.fn((parameter: number) => parameter === 1 ? 'Intel UHD Graphics 630' : 16384);
    const gl = { getExtension: vi.fn(() => ({ UNMASKED_RENDERER_WEBGL: 1 })), getParameter, RENDERER: 2, MAX_TEXTURE_SIZE: 3 } as unknown as WebGL2RenderingContext;
    expect(detectGraphicsHardware(gl, capable)).toMatchObject({ kind: 'integrated', tier: 'low' });
    expect(getParameter).toHaveBeenCalledTimes(2);
    const masked = { ...gl, getExtension: () => null, getParameter: (parameter: number) => parameter === 2 ? 'WebKit WebGL' : 16384 };
    expect(detectGraphicsHardware(masked as WebGL2RenderingContext, capable).tier).toBe('low');
    const denied = { ...gl, getExtension: () => { throw new Error('denied'); } };
    expect(detectGraphicsHardware(denied as WebGL2RenderingContext, capable).tier).toBe('low');
  });
  it('retains automatic reductions and prevents a saved high preset from overruling weaker hardware', () => {
    expect(conservativeGraphicsTier('high', 'minimum')).toBe('minimum');
    expect(conservativeGraphicsTier('high', 'low')).toBe('low');
    expect(conservativeGraphicsTier('minimum', 'high')).toBe('minimum');
    expect(conservativeGraphicsTier('balanced', 'high')).toBe('balanced');
  });
});
