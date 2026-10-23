import {equipmentShortcut,EQUIPMENT_SHORTCUT_LABELS} from './EquipmentShortcuts';
import {equipmentIconUrl} from './EquipmentIcons';
export {preloadEquipmentIcons} from './EquipmentIcons';
import type {Match} from '../game/Match';
import type {Entity} from '../game/types';
import {ITEMS,itemById,statLines,itemOnMap,type Item} from '../game/ItemCatalog';
import {atShop,purchaseError,purchasePlan} from '../game/Equipment';
import {equipmentImplementation,itemUseError} from '../game/EquipmentEffects';
import './equipment-hud.css';

type Actions={buy:(id:number)=>void;sell:(slot:number)=>void;use:(slot:number)=>void;signal?:AbortSignal};
let render:((match:Match,hero:Entity)=>void)|undefined;
export const updateEquipmentHud=(match:Match,hero:Entity)=>render?.(match,hero);
function icon(item:Item):HTMLElement {
 const node=document.createElement('span');node.className='item-icon';
 node.style.backgroundImage=`url("${equipmentIconUrl(item.id)}")`;node.dataset.itemIcon=String(item.id);
 node.setAttribute('aria-hidden','true');return node;
}
export function mountEquipmentHud(actions:Actions):void {
 const shell=document.querySelector<HTMLElement>('.match-shell')!,hud=document.querySelector<HTMLElement>('.player-hud')!;
 const inventory=document.createElement('section');inventory.className='equipment-hud';inventory.setAttribute('aria-label','装备与金币');
 const slots=document.createElement('div');slots.className='equipment-slots';
 const open=document.createElement('button');open.type='button';open.id='shop-toggle';open.className='shop-toggle';open.setAttribute('aria-expanded','false');
 inventory.append(slots,open);hud.append(inventory);
 const panel=document.createElement('section');panel.className='equipment-shop';panel.id='equipment-shop';panel.hidden=true;panel.setAttribute('aria-label','装备商店');
 panel.innerHTML=`<header class="shop-header"><div><small>HOWLING ABYSS · ARMORY</small><h2>装备商店 <span>亚索推荐</span></h2></div><div class="shop-wallet"></div><button type="button" class="shop-close" aria-label="关闭商店">×</button></header>
 <div class="shop-body"><aside class="shop-sidebar"><label class="shop-search-label">查找装备<input type="search" class="shop-search" placeholder="名称 / 属性" aria-label="搜索装备"></label><nav class="shop-filters" aria-label="装备分类"></nav><div class="shop-hint"><b>浪客的武库</b><p>先积累攻速，再补充暴击与续航。</p><p>已购组件会自动抵扣合成价格。</p><small>商店打开时，对局仍在继续。</small></div></aside><div class="shop-catalog"><div class="shop-catalog-heading">可用装备 <span class="shop-count"></span></div><div class="shop-grid"></div><p class="shop-empty" hidden>没有匹配的装备</p></div><article class="shop-detail"></article></div>
 <footer class="shop-footer"><div class="shop-location" role="status"></div><span>P 打开 / 关闭 · Esc 关闭 · 双击购买</span></footer>`;
 shell.append(panel);
 const query=<T extends HTMLElement=HTMLElement>(selector:string)=>panel.querySelector<T>(selector)!;
 query('.shop-header h2 span').textContent='26.20 · 全装备';
 let match:Match|undefined,hero:Entity|undefined,selected=1055,category='推荐',detailKey='',listKey='',inventoryKey='',previousMatch:Match|undefined;
 let selectedSlot:number|null=null;
 const slotButtons=Array.from({length:7},(_,index)=>{
  const button=document.createElement('button');button.type='button';button.className='equipment-slot';button.dataset.slot=String(index);
  button.onclick=()=>{selectedSlot=index;const id=index===6?hero?.trinket:hero?.inventory?.[index];if(id)selected=id;setOpen(true);draw();};
  button.oncontextmenu=event=>{event.preventDefault();if(match?.phase==='playing'){actions.use(index);draw();}};
  slots.append(button);return button;
 });
 const setOpen=(value:boolean)=>{
  if(value&&!match?.leagueRules)return;
  panel.hidden=!value;open.setAttribute('aria-expanded',String(value));
  if(value){document.dispatchEvent(new Event('midline:shop-open'));draw();query<HTMLButtonElement>('.shop-close').focus({preventScroll:true});}
  else document.querySelector<HTMLElement>('#viewport,#arena')?.focus({preventScroll:true});
 };
 open.onclick=()=>setOpen(!!panel.hidden);query('.shop-close').onclick=()=>setOpen(false);
 document.addEventListener('midline:shop-request',()=>setOpen(true),{signal:actions.signal});
 const filters=['推荐','本图装备','全部','基础','组件','成装','攻击力','攻击速度','暴击','法术强度','技能急速','护甲穿透','法术穿透','生存','鞋子','主动装备','消耗品','饰品','条件装备'];
 for(const name of filters){const button=document.createElement('button');button.type='button';button.textContent=name;
  button.onclick=()=>{category=name;listKey='';draw();};query('.shop-filters').append(button);}
 query<HTMLInputElement>('.shop-search').oninput=()=>{listKey='';draw();};
 panel.addEventListener('contextmenu',event=>event.preventDefault());
 panel.addEventListener('pointerdown',event=>event.stopPropagation());
 document.addEventListener('keydown',event=>{
  const typing=event.target instanceof HTMLElement&&!!event.target.closest('input,textarea,select,[contenteditable]');
  if(event.key==='Escape'&&!panel.hidden){event.preventDefault();event.stopImmediatePropagation();setOpen(false);return;}
  if(event.key.toLowerCase()==='p'&&!typing&&!event.ctrlKey&&!event.altKey&&!event.metaKey&&match?.leagueRules){event.preventDefault();event.stopImmediatePropagation();if(!event.repeat)setOpen(!!panel.hidden);return;}
  const slot=equipmentShortcut(event);
  if(slot!==null&&!typing&&panel.hidden&&match?.leagueRules){event.preventDefault();event.stopImmediatePropagation();if(!event.repeat)actions.use(slot);return;}
  if(!panel.hidden){event.stopImmediatePropagation();}
 },{capture:true,signal:actions.signal});
 document.addEventListener('keyup',event=>{if(!panel.hidden)event.stopImmediatePropagation();},{capture:true,signal:actions.signal});
 function buy(id:number){if(!match||!hero||match.phase!=='playing'||purchaseError(hero,id))return;actions.buy(id);selectedSlot=null;draw();}
 function choose(item:Item){selected=item.id;selectedSlot=null;detailKey='';draw();}
 function draw(){
  if(!match||!hero)return;
  inventory.hidden=!match.leagueRules;
  if(!match.leagueRules){panel.hidden=true;return;}
  const gold=Math.floor(hero.gold??0),inv=hero.inventory??Array(6).fill(null),allSlots=[...inv,hero.trinket??null];
  open.textContent=`◈ ${gold.toLocaleString()}  商店 [P]`;open.title='打开装备商店 · P';
  const key=JSON.stringify(allSlots),slotKey=`${key}:${Math.floor(match.time)}:${hero.itemState?.['charges:2031']}`;
  if(slotKey!==inventoryKey){inventoryKey=slotKey;slotButtons.forEach((button,index)=>{
   const id=allSlots[index],item=id==null?undefined:itemById(id);button.replaceChildren();
   button.title=item?`${item.name}\n${statLines(item).join(' · ')}\n点击在商店查看 / 出售`:`空装备栏 ${index+1}`;
   button.setAttribute('aria-label',index===6?`饰品栏：${item?.name??'空'}`:item?`装备栏 ${index+1}：${item.name}`:`空装备栏 ${index+1}`);
   if(item)button.append(icon(item));else button.textContent='＋';
   if(index===6)button.classList.add('trinket-slot');
   if(item?.active){button.title+='\n右键使用主动效果';const label=document.createElement('kbd');label.textContent=EQUIPMENT_SHORTCUT_LABELS[index];button.append(label);
    const remaining=Math.ceil((hero!.itemState?.[`cd:${id}`]??0)-match!.time);if(remaining>0){const cd=document.createElement('span');cd.className='item-cooldown';cd.textContent=String(remaining);button.append(cd);}
   }
  });}
  if(panel.hidden)return;
  query('.shop-wallet').textContent=`◈ ${gold.toLocaleString()} 金币`;
  query('.shop-location').textContent=match.phase!=='playing'?'对局未进行，暂不可交易':atShop(hero)?'● 位于己方商店区域 · 可以购买与出售':'○ 返回己方泉水或圣所商店后可交易 · 可随时浏览装备';
  query('.shop-location').classList.toggle('available',atShop(hero)&&match.phase==='playing');
  const term=query<HTMLInputElement>('.shop-search').value.trim().toLowerCase();
  const affordability=ITEMS.map(item=>Number((hero!.gold??0)>=purchasePlan(hero!,item).cost)).join('');
  const nextListKey=`${affordability}:${key}:${category}:${term}:${selected}`;
  if(nextListKey!==listKey){listKey=nextListKey;
   query('.shop-filters').querySelectorAll('button').forEach(button=>{button.classList.toggle('active',button.textContent===category);button.setAttribute('aria-pressed',String(button.textContent===category));});
   const recommended=[1055,3006,3153,3031,3046];
   const filtered=ITEMS.filter(item=>(!term||`${item.id} ${item.name} ${statLines(item).join(' ')} ${item.effect??''}`.toLowerCase().includes(term))&&
    (category==='全部'||category==='本图装备'&&itemOnMap(item)&&!item.condition||category==='推荐'&&recommended.includes(item.id)||category===item.category||category==='主动装备'&&item.active||category==='攻击力'&&item.stats.ad||category==='攻击速度'&&item.stats.as||category==='暴击'&&item.stats.crit||category==='法术强度'&&item.stats.ap||category==='技能急速'&&item.stats.haste||category==='护甲穿透'&&(item.stats.armorPen||item.stats.lethality)||category==='法术穿透'&&(item.stats.magicPen||item.stats.flatMagicPen)||category==='鞋子'&&item.unique==='boots'||category==='条件装备'&&item.condition||category==='生存'&&(item.stats.hp||item.stats.armor||item.stats.mr||item.stats.lifesteal)));
   const grid=query('.shop-grid');grid.replaceChildren();
   for(const item of filtered){const button=document.createElement('button');button.type='button';button.className='shop-item';button.dataset.itemId=String(item.id);button.classList.toggle('selected',selected===item.id);
    const price=purchasePlan(hero,item).cost;button.classList.toggle('affordable',(hero.gold??0)>=price);
    button.classList.toggle('catalog-only',!!item.condition||!itemOnMap(item));
    button.title=`${item.name} · ${statLines(item).join(' · ')}${price!==item.cost?` · 总价 ${item.cost}`:''}`;
    button.append(icon(item));const name=document.createElement('b');name.textContent=item.name;const cost=document.createElement('span');cost.textContent=`◈ ${price}`;button.append(name,cost);
    if(item.condition||!itemOnMap(item)){const badge=document.createElement('small');badge.textContent=item.condition?'条件获取':'地图限定';button.append(badge);}
    button.onclick=()=>choose(item);button.ondblclick=()=>buy(item.id);grid.append(button);
   }
   query('.shop-count').textContent=`${filtered.length} 件`;query('.shop-empty').hidden=!!filtered.length;
  }
  const nextDetailKey=`${selected}:${purchaseError(hero,selected)}:${key}:${match.phase}:${selectedSlot}:${(hero.itemState?.['cd:'+selected]??0)>match.time?Math.floor(match.time):''}:${hero.itemState?.['charges:'+selected]}`;
  if(nextDetailKey===detailKey)return;detailKey=nextDetailKey;
  const item=itemById(selected)!,detail=query('.shop-detail');detail.replaceChildren();
  const heading=document.createElement('div');heading.className='shop-detail-heading';heading.append(icon(item));
  const name=document.createElement('div');name.innerHTML=`<small>${item.category}</small><h3>${item.name}</h3><span>◈ ${item.cost} 金币</span>`;heading.append(name);detail.append(heading);
  const stats=document.createElement('div');stats.className='shop-item-stats';
  for(const line of statLines(item)){const p=document.createElement('p');p.textContent=line;stats.append(p);}detail.append(stats);
  if(item.stats.crit){const note=document.createElement('p');note.className='shop-passive';note.textContent='浪客之道：装备暴击几率翻倍，超过 100% 的部分转为额外攻击力。';detail.append(note);}
  if(item.effect){const effect=document.createElement('p');effect.className='shop-passive';effect.textContent=item.effect;detail.append(effect);}
  const implementation=document.createElement('p');implementation.className='shop-implementation';implementation.textContent=equipmentImplementation(item);detail.append(implementation);
  if(item.stats.mana||item.stats.manaRegen){const note=document.createElement('p');note.className='shop-buy-note';note.textContent='亚索无法力资源；法力与法力回复不增加剑意。';detail.append(note);}
  const recipeTitle=document.createElement('h4');recipeTitle.textContent=item.recipe.length?'合成路线':'基础装备';detail.append(recipeTitle);
  const tree=document.createElement('div');tree.className='shop-recipe';
  function recipeNode(id:number,available:(number|null)[]):HTMLElement {
   const component=itemById(id)!,branch=document.createElement('div');branch.className='recipe-branch';
   const button=document.createElement('button');button.type='button';button.title=`${component.name} · ${component.cost} 金币`;button.setAttribute('aria-label',`查看 ${component.name}`);button.append(icon(component));
   const index=available.indexOf(id),owned=index>=0;if(owned)available[index]=null;
   const label=document.createElement('span');label.textContent=owned?'✓ 已拥有':String(component.cost);button.append(label);button.classList.toggle('owned',owned);button.onclick=()=>choose(component);branch.append(button);
   if(component.recipe.length){const children=document.createElement('div');children.className='recipe-children';for(const sub of component.recipe)children.append(recipeNode(sub,owned?[]:available));branch.append(children);}return branch;
  }
  const available=[...inv];for(const id of item.recipe)tree.append(recipeNode(id,available));detail.append(tree);
  const upgrades=ITEMS.filter(upgrade=>upgrade.recipe.includes(item.id));
  if(upgrades.length){const label=document.createElement('h4');label.textContent='可合成为';detail.append(label);const row=document.createElement('div');row.className='shop-upgrades';
   for(const upgrade of upgrades){const button=document.createElement('button');button.type='button';button.title=upgrade.name;button.setAttribute('aria-label',`查看 ${upgrade.name}`);button.append(icon(upgrade));button.onclick=()=>choose(upgrade);row.append(button);}detail.append(row);}
  const cost=purchasePlan(hero,item).cost,error=purchaseError(hero,item.id);
  const purchase=document.createElement('button');purchase.type='button';purchase.id='shop-buy';purchase.className='shop-buy';purchase.disabled=!!error||match.phase!=='playing';
  purchase.textContent=`${cost!==item.cost?'合成':'购买'} · ${cost} 金币`;purchase.onclick=()=>buy(item.id);detail.append(purchase);
  const message=document.createElement('p');message.className='shop-buy-note';message.textContent=match.phase!=='playing'?'对局进行中才可交易':error??(cost!==item.cost?`已拥有组件抵扣 ${item.cost-cost} 金币`:'购买后立即获得属性加成');detail.append(message);
  const ownedSlot=selectedSlot!==null&&allSlots[selectedSlot]===item.id?selectedSlot:allSlots.indexOf(item.id);
  if(ownedSlot>=0){const sell=document.createElement('button');sell.type='button';sell.id='shop-sell';sell.className='shop-sell';sell.textContent=`出售 · +${item.sell} 金币`;sell.disabled=!atShop(hero)||match.phase!=='playing';sell.onclick=()=>{actions.sell(ownedSlot);selectedSlot=null;draw();};detail.append(sell);}
  if(ownedSlot>=0&&item.active){const use=document.createElement('button');use.type='button';use.id='shop-use';use.className='shop-buy';use.textContent=`使用 · ${itemUseError(hero,ownedSlot,match.time)??item.name}`;use.disabled=!!itemUseError(hero,ownedSlot,match.time)||match.phase!=='playing';use.onclick=()=>{actions.use(ownedSlot);detailKey='';draw();};detail.append(use);}
 }
 const update=(state:Match,player:Entity)=>{
  if(previousMatch&&previousMatch!==state){panel.hidden=true;open.setAttribute('aria-expanded','false');selectedSlot=null;}
  previousMatch=state;match=state;hero=player;draw();
 };
 render=update;actions.signal?.addEventListener('abort',()=>{if(render===update)render=undefined;panel.remove();inventory.remove();},{once:true});
}
