import type { Match } from '../game/Match';
import type { AbilityKey, Entity, Point, Team } from '../game/types';
import { ABILITIES } from '../game/config';
import { direction } from '../game/geometry';
import { stormReady, STORM } from '../game/YasuoStorm';
import { YASUO_Q_HALF_WIDTH } from '../game/YasuoQ';
import { dashEndpoint, EQ } from '../game/YasuoE';
import { wallEnds, WIND_WALL } from '../game/WindWall';

export interface SkillPreview { valid: boolean; range: Point[]; paths: Point[][]; fills: Point[][] }
export const SKILL_RANGE_COLOR = 0x86f3ed;
function circle(center: Point, radius: number): Point[] {
  return Array.from({length:65}, (_, i) => ({x:center.x + Math.cos(i*Math.PI/32)*radius,y:center.y + Math.sin(i*Math.PI/32)*radius}));
}
export function skillPreview(match: Match, team: Team, key: AbilityKey, aim: Point, canSee: (entity: Entity) => boolean = () => true): SkillPreview {
  const hero = match.hero(team), dir = direction(hero, aim);
  const empowered = stormReady(hero, match.time);
  const range = key === 'q' && empowered ? STORM.range : ABILITIES[key].range;
  const result: SkillPreview = {valid:hero.abilities[key]<=match.time&&(!match.leagueRules||!!hero.skillRanks?.[key]),range:circle(hero, range),paths:[],fills:[]};
  if (key === 'q') {
    if (hero.eCast) {
      const ring = circle(hero.eCast.end, EQ.radius); result.paths.push(ring); result.fills.push(ring);
    } else {
      const width = empowered ? STORM.radius : YASUO_Q_HALF_WIDTH;
      const p = (along: number, side: number) => ({x:hero.x+dir.x*along-dir.y*side,y:hero.y+dir.y*along+dir.x*side});
      const shape = [p(0,-width),p(range-10,-width),p(range-10,-width-5),p(range,0),p(range-10,width+5),p(range-10,width),p(0,width)];
      result.paths.push([...shape,shape[0]]); result.fills.push(shape);
    }
  } else if (key === 'w') {
    const center={x:hero.x+dir.x*WIND_WALL.distance,y:hero.y+dir.y*WIND_WALL.distance};
    const [a,b] = wallEnds({id:0,team,startsAt:0,angle:Math.atan2(dir.y,dir.x),...center});
    const h=WIND_WALL.thickness/2;
    const shape=[{x:a.x-dir.x*h,y:a.y-dir.y*h},{x:b.x-dir.x*h,y:b.y-dir.y*h},{x:b.x+dir.x*h,y:b.y+dir.y*h},{x:a.x+dir.x*h,y:a.y+dir.y*h}];
    result.paths.push([...shape,shape[0]],[hero,center]); result.fills.push(shape);
  } else {
    const target = key === 'e' ? match.dashTarget(aim,team) : match.rTarget(team);
    result.valid &&= !!target && canSee(target) && (key !== 'e' || !match.dashError(aim,team));
    if (target && canSee(target)) {
      result.paths.push(circle(target,target.radius+8));
      const end=key==='e'?dashEndpoint(hero,target):target;
      result.paths.push([hero,end],circle(end,5));
    }
  }
  return result;
}
