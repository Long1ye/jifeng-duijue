import {describe,it,expect} from 'vitest';
import {actorDepth,RENDER_DEPTH} from '../src/render/RenderDepth';
describe('ground-contact depth',()=>{
 it('orders nearby units on either side of a tower without whole-unit rounding',()=>{
  expect(actorDepth(2100.1)).toBeLessThan(actorDepth(2100.2));
  expect(actorDepth(2100.3)).toBeGreaterThan(actorDepth(2100.2));
 });
 it('retains front and rear skill layers around the actor',()=>{
  expect(actorDepth(2100,-.1)).toBeLessThan(actorDepth(2100));
  expect(actorDepth(2100,.1)).toBeGreaterThan(actorDepth(2100));
 });
 it('keeps bars and messages above actors throughout the ice bridge and weather',()=>{
  for(const y of [0,900,1700,3400])expect(RENDER_DEPTH.feedback).toBeGreaterThan(actorDepth(y));
  expect(RENDER_DEPTH.bars).toBeGreaterThan(10000);
  expect(RENDER_DEPTH.bars).toBeGreaterThan(RENDER_DEPTH.feedback);
  expect(RENDER_DEPTH.text).toBeGreaterThan(RENDER_DEPTH.bars);
 });
});
