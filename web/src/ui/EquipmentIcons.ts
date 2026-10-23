import {ITEMS} from '../game/ItemCatalog';

const pixelIcons=import.meta.glob('../../assets/ui/equipment-pixel-dark-64/*.png',{eager:true,query:'?url',import:'default'}) as Record<string,string>;
const urls=new Map(Object.entries(pixelIcons).map(([path,url])=>[Number(path.match(/\/(\d+)\.png$/)![1]),url]));
for(const item of ITEMS)if(!urls.has(item.id))throw new Error(`Missing equipment icon: ${item.id}`);
export function equipmentIconUrl(id:number):string{return urls.get(id)!;}
export async function preloadEquipmentIcons():Promise<void>{
 await Promise.all(ITEMS.map(item=>{const image=new Image();image.src=equipmentIconUrl(item.id);return image.decode();}));
}
