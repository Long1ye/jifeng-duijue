import {it,expect} from 'vitest';
import {campActors} from '../src/render/CampLayout';
it('keeps all ten decorative actors outside the playable ends throughout their cycles',()=>{
 for(const sign of [-1,1])for(let t=0;t<100;t+=.25){const actors=campActors(sign,t);expect(actors).toHaveLength(10);for(const actor of actors){expect(actor.u*sign).toBeGreaterThan(740);expect(actor.alpha).toBeGreaterThanOrEqual(0);expect(actor.alpha).toBeLessThanOrEqual(1);}}
});
