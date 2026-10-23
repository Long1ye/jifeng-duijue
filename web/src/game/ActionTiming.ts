import type {Entity} from './types';
import {YASUO_Q_HIT_SECONDS} from './YasuoQ';
import {W_DELAY} from './WindWall';
import {STORM} from './YasuoStorm';
import {E} from './YasuoE';
import {YASUO_R} from './YasuoR';

/** Control recovery is independent of the remaining presentation frames. */
export function actionReadyAt(hero:Entity,time:number):number{
 return Math.max(time,
  hero.qCast?hero.qCast.startedAt+YASUO_Q_HIT_SECONDS+.05:0,
  hero.wCast?hero.wCast.startedAt+W_DELAY+.05:0,
  hero.q3Cast?hero.q3Cast.startedAt+STORM.releaseDelay+.05:0,
  hero.eCast?hero.eCast.startedAt+E.startup+E.dash:0,
  hero.eqCast?hero.eqCast.triggerAt+.05:0,
  hero.rCast?hero.rCast.startedAt+YASUO_R.duration:0);
}

export function finishActionRecovery(hero:Entity,time:number):void{
 if(actionReadyAt(hero,time)>time)return;
 if(hero.qCast?.hit)hero.qCast=null;
 if(hero.wCast)hero.wCast=null;
 if(hero.q3Cast?.released)hero.q3Cast=null;
 if(hero.eqCast?.hit)hero.eqCast=null;
 if(hero.eCast&&Math.hypot(hero.x-hero.eCast.end.x,hero.y-hero.eCast.end.y)<.01)hero.eCast=null;
}
