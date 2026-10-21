import {describe,it,expect} from 'vitest';
import {Match} from '../src/game/Match';
describe('live scoreboard counters',()=>{
 it('counts hero kills and deaths once, without confusing minion CS',()=>{
  const match=new Match({ai:false,waves:false});match.phase='playing';
  const hero=match.hero('blue'),enemy=match.hero('red');match.damage(hero,enemy,enemy.maxHp+1);
  expect(match.kills.blue).toBe(1);expect(match.deaths.red).toBe(1);expect(match.cs.blue).toBe(0);
  match.damage(hero,enemy,100);expect(match.kills.blue).toBe(1);
  expect(new Match().kills.blue).toBe(0);
 });
 it('counts a tower death without inventing a player kill',()=>{
  const match=new Match({ai:false,waves:false});match.phase='playing';
  const hero=match.hero('blue');match.damage(match.tower('red'),hero,hero.maxHp+1);
  expect(match.deaths.blue).toBe(1);expect(match.kills.red).toBe(0);
 });
});
