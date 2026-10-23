import {describe,it,expect} from 'vitest';
import {snapRenderCoordinate,RENDER_SCALE} from '../src/render/Presentation';
import {YasuoAnimator,spriteFrameAt} from '../src/render/YasuoAnimation';
import {Match} from '../src/game/Match';

describe('presentation continuity without changing simulation or depth',()=>{
  it('snaps within half a render pixel at every supported zoom',()=>{
    for(const zoom of [.6,1,1.5])for(const value of [-32.17,0,250.24,1234.87]){
      const snapped=snapRenderCoordinate(value,zoom);
      expect(Math.abs(snapped-value)).toBeLessThanOrEqual(.5/(zoom*RENDER_SCALE)+1e-9);
      expect(snapped*zoom*RENDER_SCALE).toBeCloseTo(Math.round(snapped*zoom*RENDER_SCALE));
    }
    expect(snapRenderCoordinate(250.24,1)).not.toBe(250);
  });
  it('preserves the walk clock across direction changes and freezes on pause',()=>{
    const hero=new Match({ai:false,waves:false}).hero('blue'),anim=new YasuoAnimator();
    hero.facing=0;anim.sample(hero,0);
    hero.x+=1;anim.sample(hero,.1);
    hero.x+=1;hero.facing=Math.PI/2;
    const turned=anim.sample(hero,.45);
    expect(turned.state).toBe('walk');
    if(!('durations_ms' in turned.clip))throw new Error('Expected locomotion timing');
    expect(turned.frame).toBe(spriteFrameAt(350*.8/1.04,turned.clip.durations_ms,true));
    expect(anim.sample(hero,.45).frame).toBe(turned.frame);
    expect(anim.sample(hero,.5).state).toBe('idle');
    anim.reset();expect(anim.sample(hero,0).frame).toBe(0);
  });
});
