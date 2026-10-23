import { initialGraphicsTier, type GraphicsTier } from './GraphicsPerformance';

export interface GraphicsHardwareHints {
  hardwareConcurrency?: number;
  deviceMemory?: number;
  renderer?: string;
  maxTextureSize?: number;
}
export interface GraphicsHardware {
  kind: 'software' | 'integrated' | 'discrete' | 'unknown';
  tier: GraphicsTier;
  description: string;
}

/** Renderer names are hints, not a complete inventory of installed GPUs.
 * Texture limits only cap presets; a large texture limit never proves speed. */
export function classifyGraphicsHardware(hints: GraphicsHardwareHints): GraphicsHardware {
  const name = hints.renderer ?? '';
  let kind: GraphicsHardware['kind'] = 'unknown';
  if (/swiftshader|llvmpipe|softpipe|software rasterizer|software renderer|microsoft basic render|gdi generic|lavapipe|warp\b/i.test(name)) kind = 'software';
  else if (/intel.*(?:uhd|iris|hd graphics)|radeon.*(?:vega|\b[6789]\d0m\b|\(tm\) graphics|integrated)|apple.*(?:gpu|m[1-9])|mali|adreno|powervr/i.test(name)) kind = 'integrated';
  else if (/nvidia|geforce|quadro|radeon.*(?:\brx\b|\bpro\b)|intel.*arc.*\ba\d{3}\b/i.test(name)) kind = 'discrete';

  let tier: GraphicsTier = kind === 'software' ? 'minimum' : kind === 'integrated' || kind === 'unknown' ? 'low' : 'balanced';
  const capableCpu = (hints.hardwareConcurrency ?? 0) >= 8;
  const sufficientMemory = hints.deviceMemory === undefined || hints.deviceMemory >= 8;
  const knownFastGpu = /RTX\s*[345]0[6-9]0|Radeon.*RX\s*(?:6[7-9]\d0|7[6-9]\d0|9\d\d0)/i.test(name);
  if (kind === 'discrete' && capableCpu && sufficientMemory && knownFastGpu && (hints.maxTextureSize ?? 0) >= 8192) tier = 'high';
  if (initialGraphicsTier(hints) === 'low' && tier !== 'minimum') tier = 'low';
  if (hints.maxTextureSize !== undefined && hints.maxTextureSize < 4096) tier = 'minimum';
  const description = kind === 'software' ? '检测到软件渲染，优先使用极低配'
    : kind === 'integrated' ? '检测到核显或集成图形，优先保证流畅'
      : kind === 'discrete' ? '检测到独显特征，已结合处理器与内存预设画质'
        : '浏览器未提供明确显卡信息，采用保守画质';
  return { kind, tier, description };
}

/** Run once against the game's existing context: no extra GPU context or benchmark stalls. */
export function detectGraphicsHardware(gl: WebGLRenderingContext | WebGL2RenderingContext, hints: Pick<GraphicsHardwareHints, 'hardwareConcurrency' | 'deviceMemory'>): GraphicsHardware {
  let renderer = '', maxTextureSize: number | undefined;
  try {
    const debug = gl.getExtension('WEBGL_debug_renderer_info');
    renderer = String(gl.getParameter(debug ? debug.UNMASKED_RENDERER_WEBGL : gl.RENDERER) ?? '');
    const limit = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    if (typeof limit === 'number' && Number.isFinite(limit) && limit > 0) maxTextureSize = limit;
  } catch { /* Privacy settings may deny driver information. */ }
  return classifyGraphicsHardware({ ...hints, renderer, maxTextureSize });
}

/** Saved automatic reductions remain effective, but never override a weaker hardware preset. */
export function conservativeGraphicsTier(saved: GraphicsTier, detected: GraphicsTier): GraphicsTier {
  const order: GraphicsTier[] = ['minimum', 'low', 'balanced', 'high'];
  return order[Math.min(order.indexOf(saved), order.indexOf(detected))];
}
