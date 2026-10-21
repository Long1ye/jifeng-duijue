import type {Entity} from './types';

export type YasuoEmote = 'joke' | 'taunt' | 'laugh';
export function emoteActive(hero:Entity,time:number){
  return hero.hp>0&&!!hero.emote&&time>=hero.emote.startedAt;
}
/** Plain digits also work when a browser reserves Ctrl+number for tab switching. */
export function emoteShortcut(event:Pick<KeyboardEvent,'code'|'altKey'|'metaKey'|'shiftKey'>&{key?:string}):YasuoEmote|null{
  if(event.altKey||event.metaKey||event.shiftKey)return null;
  const digit=event.code.match(/^(?:Digit|Numpad)([124])$/)?.[1]??event.key;
  return digit==='1'?'joke':digit==='2'?'taunt':digit==='4'?'laugh':null;
}
