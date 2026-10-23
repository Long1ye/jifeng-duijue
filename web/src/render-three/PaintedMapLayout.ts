/** Layout interpreted from all four target compositions. Image coordinates are
 * review pins, not a claim that independently generated views share a camera.
 * u/v stay in the existing gameplay footprint; high structures stay at edges. */
import bridgeLayout from '../../assets/map-studies/howling-abyss-v1/layout.json';
export const ART_OUTER_U = Math.abs(bridgeLayout.blue.outerTower[0]);
export const ART_BASE = bridgeLayout.blue;
export const ART_BRUSHES = bridgeLayout.brush;
export const ART_MAP = { minU: -720, maxU: 720, centralHalfLength: 180 } as const;
export const ART_GUARDIANS = [
  { id: 'central-near-left', u: -96, v: 128, reference: [850, 1040] },
  { id: 'central-near-right', u: 160, v: 128, reference: [1750, 570] },
  { id: 'central-far-left', u: -160, v: -128, reference: [350, 715] },
  { id: 'central-far-right', u: 96, v: -128, reference: [1110, 300] },
] as const;
export const ART_PIERS = [
  { side: -1, nodes: [-720, -608, -480, -352, -288, -160, -32, 96, 224, 352, 480, 608, 720] },
  { side: 1, nodes: [-720, -608, -480, -352, -224, -96, 32, 160, 288, 416, 544, 672, 720] },
] as const;
export const ART_NEAR_BRAZIERS = [-650, -520, -218, 85, 285, 520, 650]
  .map(u => ({ u, v: artEdgeV(u) - 14 }));
export const ART_BRAZIERS = [
  { u: -310, v: -104 }, { u: -180, v: -104 }, { u: 310, v: -104 },
  ...ART_NEAR_BRAZIERS,
] as const;
export const ART_CRYSTALS = [
  { u: -683, v: -158 }, { u: -550, v: -153 }, { u: -385, v: 126 },
  { u: -220, v: -124 }, { u: -144, v: 124 }, { u: -108, v: -124 }, { u: 135, v: -124 },
  { u: 315, v: 124 }, { u: 550, v: 153 }, { u: 683, v: 158 },
] as const;
/** The simulation flares bases from 112 to 160; architecture sits outside it. */
export function artEdgeV(u: number): number { return 122 + Math.max(0, Math.min(1, (Math.abs(u) - 470) / 250)) * 48; }
export function artBrazierMount(u: number, v: number): { u: number; v: number; height: number } {
  // Keep the authored shoulder location at deck height. The near parapet
  // naturally occludes the base; never lift it or push it into the road.
  return { u, v, height: .7 };
}
export const ART_VIEWS = {
  ice: { u: -345, v: -105, zoom: .95, label: '建筑冰晶细节', source: '04-central-bridge.png' },
  layout: { u: 0, v: 0, zoom: .13, label: '建筑与草丛布局', source: '01-overview.png' },
  central: { u: 0, v: -36, zoom: .4, label: '中央四兽柱与圆纹章', source: '04-central-bridge.png' },
  sanctuary: { u: (ART_BASE.nexus[0] + ART_BASE.innerTower[0]) / 2 - 28, v: -40, zoom: .36, label: '蓝方圣所', source: '02-sanctuary.png' },
  redsanctuary: { u: -(ART_BASE.nexus[0] + ART_BASE.innerTower[0]) / 2 + 28, v: -40, zoom: .36, label: '红方圣所', source: '02-sanctuary.png' },
  sample: { u: -ART_OUTER_U + 45, v: -22, zoom: .6, label: '外塔与连接路段', source: '03-outer-tower.png' },
  overview: { u: 0, v: 0, zoom: .13, label: '整桥布局', source: '01-overview.png' },
  combat: { u: 0, v: -36, zoom: .4, label: '中央战斗', source: '04-central-bridge.png' },
  match: { u: -620, v: 0, zoom: .6, label: '正常对局', source: '01-overview.png' },
} as const;
