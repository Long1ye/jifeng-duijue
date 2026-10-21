import type {Entity} from './types';
import catalog from './data/items-16.20.1.json';
import {HOWLING_MAP} from './config';

export type ItemCategory='基础'|'组件'|'成装'|'消耗品'|'饰品';
export interface ItemStats {ad?:number;hp?:number;armor?:number;as?:number;crit?:number;ms?:number;percentMS?:number;lifesteal?:number;omnivamp?:number;mr?:number;ap?:number;haste?:number;mana?:number;manaRegen?:number;regen?:number;regenPercent?:number;armorPen?:number;lethality?:number;magicPen?:number;flatMagicPen?:number;tenacity?:number;healShield?:number;critDamage?:number;slowResist?:number}
export type ItemActive='potion'|'refill'|'elixir'|'hat'|'stasis'|'cleave'|'stride'|'cleanse'|'speed'|'slow'|'shield'|'heal'|'gunblade'|'rocket'|'anchor'|'ward'|'sweep';
export interface Item {id:number;name:string;cost:number;sell:number;icon:number;category:ItemCategory;stats:ItemStats;recipe:number[];effect?:string;officialEffect?:string;unique?:'boots'|'starter'|'legendary';tags?:string[];maps?:number[];groups?:string[];condition?:string;active?:ItemActive;charges?:number;minLevel?:number}
/** Pinned DDragon 16.20.1. Only the implemented Yasuo item pool is offered. */
const LEGACY_ITEMS:readonly Item[]=[
 {id:1036,name:'长剑',cost:350,sell:245,icon:0,category:'基础',stats:{ad:10},recipe:[]},
 {id:1042,name:'短剑',cost:250,sell:175,icon:1,category:'基础',stats:{as:.1},recipe:[]},
 {id:1001,name:'鞋子',cost:300,sell:210,icon:2,category:'基础',stats:{ms:25},recipe:[],unique:'boots'},
 {id:1055,name:'多兰之刃',cost:450,sell:180,icon:3,category:'基础',stats:{ad:10,hp:80,omnivamp:.025},recipe:[],unique:'starter',effect:'全能吸血：造成伤害时回复 2.5%，范围技能按三分之一结算。'},
 {id:1018,name:'灵巧披风',cost:600,sell:420,icon:4,category:'基础',stats:{crit:.15},recipe:[]},
 {id:1037,name:'十字镐',cost:875,sell:613,icon:5,category:'基础',stats:{ad:25},recipe:[]},
 {id:1038,name:'暴风之剑',cost:1300,sell:910,icon:6,category:'基础',stats:{ad:40},recipe:[]},
 {id:1053,name:'吸血鬼节杖',cost:900,sell:630,icon:7,category:'组件',stats:{ad:15,lifesteal:.07},recipe:[1036]},
 {id:1043,name:'反曲之弓',cost:700,sell:490,icon:8,category:'组件',stats:{as:.15},recipe:[1042],effect:'蛰刺：普攻和 Q 的首个目标额外受到 15 物理伤害；同名被动不叠加。'},
 {id:3086,name:'狂热',cost:1200,sell:840,icon:9,category:'组件',stats:{as:.15,crit:.15,percentMS:.04},recipe:[1018,1042]},
 {id:1028,name:'红水晶',cost:400,sell:280,icon:10,category:'基础',stats:{hp:150},recipe:[]},
 {id:1029,name:'布甲',cost:300,sell:210,icon:11,category:'基础',stats:{armor:15},recipe:[]},
 {id:3006,name:'狂战士胫甲',cost:1100,sell:770,icon:12,category:'成装',stats:{ms:45,as:.3},recipe:[1001,1042,1042],unique:'boots'},
 {id:3031,name:'无尽之刃',cost:3500,sell:2450,icon:13,category:'成装',stats:{ad:75,crit:.25},recipe:[1038,1037,1018],unique:'legendary',effect:'暴击伤害提升 30 个百分点，再应用亚索的暴击伤害修正。'},
 {id:3046,name:'幻影之舞',cost:2650,sell:1855,icon:14,category:'成装',stats:{as:.65,crit:.25,percentMS:.1},recipe:[1042,3086,1042],unique:'legendary',effect:'幽影华尔兹：无视英雄与小兵的单位碰撞，仍受建筑和地形阻挡。'},
 {id:3153,name:'破败王者之刃',cost:3200,sell:2240,icon:15,category:'成装',stats:{ad:40,as:.25,lifesteal:.1},recipe:[1053,1043,1037],unique:'legendary',effect:'本项目适配：普攻 / Q 首个目标附带当前生命 8% 物理伤害（小兵最多 60）；对同一英雄命中三次，减速 30% 持续 1 秒，冷却 15 秒。'},
];
export const ITEM_VERSION='16.20.1';
export const ITEMS:readonly Item[]=catalog.map(data=>{
 const item=data as Item,legacy=LEGACY_ITEMS.find(legacy=>legacy.id===item.id);
 return {...item,...legacy,stats:item.stats,officialEffect:item.effect};
});
const itemIndex=new Map(ITEMS.map(item=>[item.id,item]));
export const itemById=(id:number):Item|undefined=>itemIndex.get(id);
export const itemOnMap=(item:Item,map=HOWLING_MAP?12:11)=>item.maps?.includes(map)??true;
export const hasItem=(hero:Entity,id:number)=>hero.inventory?.includes(id)??false;
export function equipmentStats(hero:Entity):Required<ItemStats>{
 const result=Object.fromEntries(Object.keys(STAT_LABELS).map(key=>[key,0])) as Required<ItemStats>;
 const add=(stats:ItemStats)=>{for(const key of Object.keys(stats) as (keyof ItemStats)[])result[key]+=stats[key]??0;};
 for(const id of [...hero.inventory??[],hero.trinket??null]){const item=id===null?undefined:itemById(id);if(item)add(item.stats);}
 for(const buff of hero.itemBuffs??[])add(buff.stats);
 result.hp+=hero.itemState?.permanentHP??0;result.ad+=hero.itemState?.permanentAD??0;result.ap+=hero.itemState?.permanentAP??0;
 if(hasItem(hero,3089))result.ap*=1.3;
 if(hasItem(hero,2501))result.ad+=result.hp*.02;
 if(hasItem(hero,3039))result.crit+=Math.min(.3,result.hp/10000);
 if(hasItem(hero,3003)||hasItem(hero,3040))result.ap+=result.mana*.01;
 if(hasItem(hero,3004)||hasItem(hero,3042))result.ad+=result.mana*.025;
 if(hasItem(hero,4633))result.ap+=result.hp*.02;
 if(hasItem(hero,6621)){result.ap+=result.manaRegen*10;result.healShield+=result.manaRegen*.02;}
 if(hasItem(hero,2517))result.haste+=result.ad*.15;
 if(hasItem(hero,3032))result.crit+=Math.min(.25,hero.itemState?.wildCrit??0);
 if(hasItem(hero,3742)){result.ms+=(hero.itemState?.momentum??0)*.2;result.slowResist+=.15;}
 if(hasItem(hero,1120)||hasItem(hero,1086))result.regen+=4;
 if(hasItem(hero,1054))result.regen+=4;
 return result;
}
export const STAT_LABELS:Record<keyof ItemStats,string>={ad:'攻击力',hp:'生命值',armor:'护甲',as:'攻击速度',crit:'暴击几率',ms:'移动速度',percentMS:'移动速度',lifesteal:'生命偷取',omnivamp:'全能吸血',mr:'魔法抗性',ap:'法术强度',haste:'技能急速',mana:'法力值',manaRegen:'基础法力回复',regen:'生命回复 / 5秒',regenPercent:'基础生命回复',armorPen:'护甲穿透',lethality:'穿甲',magicPen:'法术穿透',flatMagicPen:'固定法术穿透',tenacity:'韧性',healShield:'治疗与护盾强度',critDamage:'暴击伤害',slowResist:'减速抗性'};
export function statLines(item:Item):string[]{
 return (Object.entries(item.stats) as [keyof ItemStats,number][]).map(([key,value])=>`+${['as','crit','percentMS','lifesteal','omnivamp','manaRegen','regenPercent','armorPen','magicPen','tenacity','healShield','critDamage','slowResist'].includes(key)?`${Math.round(value*1000)/10}%`:value} ${STAT_LABELS[key]}`);
}
