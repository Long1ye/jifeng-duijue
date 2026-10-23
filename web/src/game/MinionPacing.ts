import {BASES,HOWLING_MAP,MINION_EXITS} from './config';
import type {Point,Team} from './types';

/** Use the same front anchor for measuring the lane and spawning its waves. */
export function minionWaveFront(team:Team):Point {
 const base=BASES[team],enemy=BASES[team==='blue'?'red':'blue'];
 const length=Math.hypot(enemy.x-base.x,enemy.y-base.y);
 const exit=HOWLING_MAP?MINION_EXITS[team]:base,offset=HOWLING_MAP?90:180;
 return {x:exit.x+(enemy.x-base.x)/length*offset,y:exit.y+(enemy.y-base.y)/length*offset};
}

export const MINION_PACING_RULES={targetMarchSeconds:55,minSpeed:24,maxSpeed:44,
 reinforcementRatio:.65,minWaveInterval:24,maxWaveInterval:40} as const;

/** World units per second, independent of champion skill range conversion or match age. */
export function calculateMinionPacing(blue:Point,red:Point){
 const rules=MINION_PACING_RULES,distanceToMid=Math.hypot(red.x-blue.x,red.y-blue.y)/2;
 const speed=Math.max(rules.minSpeed,Math.min(rules.maxSpeed,distanceToMid/rules.targetMarchSeconds));
 const marchSeconds=distanceToMid/speed;
 const waveInterval=Math.max(rules.minWaveInterval,Math.min(rules.maxWaveInterval,Math.round(marchSeconds*rules.reinforcementRatio)));
 return {distanceToMid,speed,marchSeconds,waveInterval};
}

export const MINION_PACING=calculateMinionPacing(minionWaveFront('blue'),minionWaveFront('red'));
