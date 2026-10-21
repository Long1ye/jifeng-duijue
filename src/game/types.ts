export type Team = 'blue' | 'red';
export type EntityKind = 'hero' | 'melee' | 'ranged' | 'tower';
export type AbilityKey = 'q' | 'w' | 'e' | 'r';
export type WinReason = 'first-blood' | 'first-tower' | '100-cs' | 'draw';
export type MatchPhase = 'ready' | 'playing' | 'paused' | 'ended';

export interface Point { x: number; y: number }

export interface Entity extends Point {
  id: number;
  team: Team;
  kind: EntityKind;
  hp: number;
  maxHp: number;
  radius: number;
  speed: number;
  fluteAt?: number | null;
  emote?: {action:import('./YasuoEmote').YasuoEmote;startedAt:number}|null;
  homeguardUntil?: number;
  homeguardCombatAt?: number;
  range: number;
  damage: number;
  attackInterval: number;
  attackWindup?:number;
  laneRules?:boolean;
  projectileSpeed?:number;
  /** Plating belongs to Summoner's Rift, never Howling Abyss. */
  towerHasPlates?:boolean;
  towerPlates?:number;
  towerBulwarks?:{until:number;armor:number}[];
  towerHeat?:number;
  towerHeatUntil?:number;
  towerMinionsSeenAt?:number;
  cooldown: number;
  windup: number;
  targetId: number | null;
  attackTargetId: number | null;
  /** Presentation timing; does not change damage, range or attack cadence. */
  attackStartedAt: number | null;
  attackReleasedAt: number | null;
  attacksReleased: number;
  /** Both Yasuo heroes lock Q heading and resolve one piercing contact per cast. */
  qCast: { startedAt: number; facing: number; hit?: boolean;critical?:boolean } | null;
  qStacks?: number;
  qStacksUntil?: number;
  qReadyAt?: number;
  q3Cast?: { startedAt: number; facing: number; released: boolean;critical?:boolean } | null;
  wCast?: { startedAt: number; facing: number } | null;
  eCast?: import('./YasuoE').DashCast | null;
  airborneUntil?: number;
  /** Presentation-only launch clock/direction; control still uses airborneUntil. */
  airborneStartedAt?: number;
  airborneDirection?: Point;
  airborneHold?: { at: number; fromUntil: number };
  rCast?: { startedAt:number; targetIds:number[]; hit:boolean } | null;
  eqCast?: { startedAt: number; triggerAt: number; endsAt: number; eStartedAt: number; facing: number; hit: boolean; empowered?: boolean;critical?:boolean } | null;
  destination: Point | null;
  formation?: { wave:number; slot:number; goal:Point };
  facing: number;
  slowUntil: number;
  hitAt: number;
  /** Short hit stun, separate from knock-up, animation duration and damage reduction. */
  flinchUntil?: number;
  flinchProtectedUntil?: number;
  /** Last impact direction is presentation-only; it never changes simulation position. */
  hitFrom?: Point;
  mana: number;
  maxMana: number;
  /** Legacy mana fields stay zero; Yasuo's actual resource is Flow. */
  flow?:number;
  passiveShield?:number;
  passiveShieldAt?:number;
  passiveShieldUntil?:number;
  level?:number;
  experience?:number;
  skillPoints?:number;
  skillRanks?:Record<AbilityKey,number>;
  armor?:number;
  magicResist?:number;
  healthRegen?:number;
  bonusAttackSpeed?:number;
  eDamageStacks?:number;
  eDamageStacksUntil?:number;
  critChance?:number;
  gold?:number;
  inventory?:(number|null)[];
  itemHitCasts?:string[];
  ruinedKing?:{targetId:number;hits:number;expiresAt:number;cooldownUntil:number};
  abilityPower?:number;
  abilityHaste?:number;
  bonusMana?:number;
  trinket?:number|null;
  itemState?:Record<string,number>;
  itemBuffs?:{id:number;until:number;stats:import('./ItemCatalog').ItemStats}[];
  itemShields?:{amount:number;until:number;magic?:boolean}[];
  itemDots?:{key?:number;sourceId:number;until:number;dps:number;magic:boolean;trueDamage?:boolean}[];
  itemBursts?:{sourceId:number;at:number;amount:number}[];
  itemWards?:{x:number;y:number;until:number;radius:number}[];
  grievousUntil?:number;
  stasisUntil?:number;
  lastHeroDamageAt?:number;
  potion?:{until:number;perSecond:number};
  abilities: Record<AbilityKey, number>;
  guardUntil: number;
  aggroUntil: number;
  aggroTargetId: number | null;
}

export interface Projectile extends Point {
  critical?:boolean;
  empowered?: boolean;
  startedAt?: number;
  hitIds?: number[];
  id: number;
  sourceId: number;
  team: Team;
  kind: 'attack' | 'q';
  targetId: number | null;
  damage: number;
  speed: number;
  vx: number;
  vy: number;
  remaining: number;
  radius: number;
}

export interface Zone extends Point {
  id: number;
  sourceId: number;
  team: Team;
  radius: number;
  triggerAt: number;
  damage: number;
}

export interface MatchResult {
  winner: Team | null;
  reason: WinReason;
  time: number;
}

export type ImpactKind = 'attack' | 'q' | 'q3' | 'e' | 'eq' | 'eq3' | 'r' | 'spell' | 'ignite'|'item-magic'|'item-physical'|'item-true';
export interface GameEvent extends Point {
  type: 'hit' | 'kill' | 'last-hit' | 'wave' | 'cast' | 'end' | 'move' | 'attack';
  team: Team;
  amount?: number;
  absorbed?:number;
  critical?:boolean;
  ability?: AbilityKey;
  /** Presentation context, captured at the actual simulation event. */
  at?: number;
  sourceId?: number;
  targetId?: number;
  sourceKind?: EntityKind;
  targetKind?: EntityKind;
  from?: Point;
  impact?: ImpactKind;
}

export function enemyOf(team: Team): Team { return team === 'blue' ? 'red' : 'blue'; }
