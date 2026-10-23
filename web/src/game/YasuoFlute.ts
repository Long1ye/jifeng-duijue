import type {Entity} from './types';
export function fluteActive(hero:Entity,time:number){return hero.hp>0&&hero.fluteAt!=null&&time>=hero.fluteAt;}
/** Ctrl+3 can be reserved by the browser host; plain 3 is the in-game fallback. */
export function fluteShortcut(event:Pick<KeyboardEvent,'code'|'ctrlKey'|'altKey'|'metaKey'|'shiftKey'>&{key?:string}){
 return !event.altKey&&!event.metaKey&&!event.shiftKey&&(event.code==='Digit3'||event.code==='Numpad3'||event.key==='3');
}
