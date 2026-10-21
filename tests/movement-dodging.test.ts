import {describe,it,expect} from 'vitest';
import {Match} from '../src/game/Match';
import {BALANCE,ABILITIES} from '../src/game/config';
import {grantStorm} from '../src/game/YasuoStorm';
import {enemyOf,type Team} from '../src/game/types';

function advance(m:Match,seconds:number){const end=m.time+seconds;while(m.time<end-1e-9)m.step(Math.min(1/120,end-m.time));}
function setup(team:Team,speed:number=BALANCE.hero.speed){
  const m=new Match({ai:false,waves:false});m.start();
  const player=m.hero(team),caster=m.hero(enemyOf(team));
  Object.assign(player,{x:500,y:350,speed});Object.assign(caster,{x:610,y:350,speed:0,damage:0});
  return {m,player,caster};
}
describe.each(['blue','red'] as const)('%s movement and dodge windows',team=>{
  it('moves 80 world units per second with no diagonal speed bonus',()=>{
    for(const target of [{x:700,y:350},{x:700,y:550}]){
      const {m,player}=setup(team);m.orderMove(team,target);advance(m,.5);
      expect(Math.hypot(player.x-500,player.y-350)).toBeCloseTo(40);
    }
  });
  it.each(['q','q3'] as const)('can sidestep %s after seeing its cast, while the old speed cannot',kind=>{
    for(const speed of [53,80]){
      const {m,player,caster}=setup(team,speed),hp=player.hp;
      if(kind==='q3'){grantStorm(caster,0);grantStorm(caster,0);}
      m.cast(caster.team,'q',player);advance(m,kind==='q'?.2:.3);
      m.orderMove(team,{x:player.x,y:player.y+150});advance(m,1);
      expect(player.hp).toBe(speed===80?hp:hp-ABILITIES.q.damage);
    }
  });
  it.each(['q','q3'] as const)('still takes %s when standing in its path',kind=>{
    const {m,player,caster}=setup(team),hp=player.hp;
    if(kind==='q3'){grantStorm(caster,0);grantStorm(caster,0);}
    m.cast(caster.team,'q',player);advance(m,1.2);expect(player.hp).toBe(hp-ABILITIES.q.damage);
  });
  it('retains the 30 percent slow on the higher base speed',()=>{
    const {m,player}=setup(team);player.slowUntil=2;m.orderMove(team,{x:700,y:350});advance(m,.5);
    expect(player.x-500).toBeCloseTo(28);
  });
});
