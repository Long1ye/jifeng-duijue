/** Damage lag uses simulation time, so pausing and restarting remain exact. */
export class HealthBarTrail {
 private states=new Map<number,{health:number;trail:number;hold:number;time:number}>();
 sample(id:number,hp:number,maxHp:number,time:number):number {
  const health=Math.max(0,Math.min(1,hp/Math.max(1,maxHp)));
  let state=this.states.get(id);
  if(!state||time<state.time){state={health,trail:health,hold:time,time};this.states.set(id,state);return health;}
  if(health<state.health){state.trail=Math.max(state.trail,state.health);state.hold=time+.18;}
  if(health>state.health)state.trail=health;
  state.trail=Math.max(health,state.trail-Math.max(0,time-Math.max(state.time,state.hold))*1.5);
  state.health=health;state.time=time;return state.trail;
 }
 retain(ids:Set<number>){for(const id of this.states.keys())if(!ids.has(id))this.states.delete(id);}
 reset(){this.states.clear();}
}
