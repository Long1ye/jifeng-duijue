/** Runtime quality controls. Keep art tuning here and leave simulation untouched. */
export const QUALITY_TUNING = {
  actorOuterOpacity: .36, actorContactOpacity: .46,
  actorShadowHeight: 1.04, actorContactHeight: 1.08, buildingContactHeight: .98, pavingShadowHeight: .84,
  actorShadowSunX: 400 / 850, actorShadowSunZ: -350 / 850,
  buildingContactOpacity: .30, wallContactOpacity: .13,
  shadowMapSize: 2048, shadowPadding: 260, shadowMinimumExtent: 700,
  materialRelief: .36, stoneHeight: 6, metalHighlight: .08, metalPower: 22, iceRim: .14, iceSpecular: .07,
  frostSheen: .10,
  stoneContrast: .34, stoneMidpoint: .22,
  fireLightRadius: 215, lanternLightRadius: 155, warmLightStrength: .62,
  actorLightStrength: .32, canyonMistEnhancement: .65,
  pierMistStart: 110, pierMistEnd: 185,
  colorGrade: .16, neutralTint: [.96, .995, 1.035], distantContrast: .20,
  glowOpacity: .22, glowRadiusTexels: 10,
} as const;
export type QualityEffect = 'contact' | 'materials' | 'grading' | 'glow' | 'weather' | 'winter';

export class QualitySettings {
  readonly contact = { value: 1 };
  readonly materials = { value: 1 };
  readonly grading = { value: 1 };
  readonly glow = { value: 1 };
  readonly weather = { value: 1 };
  readonly winter = { value: 1 };
  /** Keep the previous material response available for same-frame increment QA. */
  readonly surfaceRefinement = { value: 1 };
  enhanced = true;
  reduced = false;
  setEnhanced(enabled: boolean) {
    this.enhanced = enabled;
    for (const effect of [this.contact, this.materials, this.grading, this.glow, this.weather, this.winter]) effect.value = enabled ? 1 : 0;
  }
}

/** Low contact vanishes before the high airborne shadow; both use simulation height. */
export function actorGrounding(lift: number) {
  const height = Math.max(0, lift);
  return { outerOpacity: QUALITY_TUNING.actorOuterOpacity / (1 + height / 24), spread: 1 + Math.min(1, height / 32) * .25,
    contactOpacity: QUALITY_TUNING.actorContactOpacity * Math.max(0, 1 - height / 12) ** 2 };
}
