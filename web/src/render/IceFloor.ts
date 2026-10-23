import Phaser from 'phaser';
import stoneUrl from '../../assets/map-modules/howling-stone-v2/stone.png?url';
import snowUrl from '../../assets/map-modules/howling-snow-v3/snow.png?url';
import {WORLD,HOWLING_MAP} from '../game/config';
import {BRIDGE,BRIDGE_OUTLINE,bridgePoint} from '../game/Bridge';
import {halfWidth} from '../../assets/map-studies/howling-abyss-v1/geometry';
import {terrainNormals} from './TerrainNormals';
import {edgeSnowPatch,edgeChips,BRIDGE_SURFACE} from './BridgeSurface';
import {drawStoneCells,STONE_URLS,SNOW_STONE_URLS,SNOW_STONE_COUNT,stoneKey,snowStoneKey} from './BridgeTiles';
import {CIRCLE_URLS,circleKey,drawBridgeCircle} from './BridgeCircle';
import {STORY_URLS,storyKey,drawBridgeStory} from './BridgeStory';
import {EDGE_URLS,edgeKey} from './BridgeEdge';
import {PROP_URLS,propKey,drawBridgeProps} from './BridgeProps';
import {LIGHT_URLS,lightKey,drawBridgeLights,type BridgeLightKind} from './BridgeLights';
import {RAIL_URLS,railKey,drawBridgeRails} from './BridgeRails';
import {BRIDGEHEAD_URLS,bridgeheadKey,drawBridgeheadApproaches,drawBridgeheadGates} from './Bridgehead';

/** Material trial: unchanged rectangular gameplay bounds, no fake abyss or blockers. */
export class IceFloor {
 static preload(scene:Phaser.Scene){
  scene.load.image('ice-stone-atlas',stoneUrl);scene.load.image('ice-snow-atlas',snowUrl);
  if(HOWLING_MAP)for(let i=0;i<6;i++){
   const url=Object.entries(BRIDGEHEAD_URLS).find(([path])=>path.endsWith(`/module-${i}.png`))?.[1];
   if(!url)throw new Error(`Missing bridgehead ${i}`);
   scene.load.image(bridgeheadKey(i),url);
  }
  if(HOWLING_MAP)for(let i=0;i<4;i++){
   const url=Object.entries(RAIL_URLS).find(([path])=>path.endsWith(`/rail-${i}.png`))?.[1];
   if(!url)throw new Error(`Missing bridge railing ${i}`);
   scene.load.image(railKey(i),url);
  }
  if(HOWLING_MAP)for(const [index,url] of Object.entries(PROP_URLS))scene.load.image(propKey(Number(index)),url);
  if(HOWLING_MAP)for(const [kind,url] of Object.entries(LIGHT_URLS))scene.load.image(lightKey(kind as BridgeLightKind),url);
  if(HOWLING_MAP)for(let i=0;i<SNOW_STONE_COUNT;i++){
   const url=Object.entries(SNOW_STONE_URLS).find(([path])=>path.endsWith(`/snow-${i}.png`))?.[1];
   if(!url)throw new Error(`Missing snowy bridge stone ${i}`);
   scene.load.image(snowStoneKey(i),url);
  }
  if(HOWLING_MAP)for(let i=0;i<16;i++){
   const url=Object.entries(EDGE_URLS).find(([path])=>path.endsWith(`/stone-${i.toString().padStart(2,'0')}.png`))?.[1];
   if(!url)throw new Error(`Missing bridge edge ${i}`);
   scene.load.image(edgeKey(i),url);
  }
  if(HOWLING_MAP)for(const [path,url] of Object.entries(STORY_URLS)){
   const name=path.split('/').pop()!.replace('.png','');
   if(!name.endsWith('-sheet'))scene.load.image(storyKey(name),url);
  }
  if(HOWLING_MAP)for(let i=0;i<16;i++){
   const url=Object.entries(STONE_URLS).find(([path])=>path.endsWith(`/stone-${i.toString().padStart(2,'0')}.png`))?.[1];
   if(!url)throw new Error(`Missing bridge stone ${i}`);
   scene.load.image(stoneKey(i),url);
   const circleUrl=Object.entries(CIRCLE_URLS).find(([path])=>path.endsWith(`/stone-${i.toString().padStart(2,'0')}.png`))?.[1];
   if(!circleUrl)throw new Error(`Missing bridge circle ${i}`);
   scene.load.image(circleKey(i),circleUrl);
  }
 }
 private image:Phaser.GameObjects.Image;
 private normalSource?:Phaser.Textures.TextureSource;
 private materialEnabled=true;
 private smoothSampling=true;
 constructor(scene:Phaser.Scene){
  const texture=scene.textures.createCanvas('ice-floor-composite',WORLD.width,WORLD.height)!;
  const ctx=texture.getContext();ctx.imageSmoothingEnabled=false;
  const stone=scene.textures.get('ice-stone-atlas').getSourceImage() as HTMLImageElement;
  const snow=scene.textures.get('ice-snow-atlas').getSourceImage() as HTMLImageElement;
  if(!HOWLING_MAP){ctx.fillStyle='#526b7d';ctx.fillRect(0,0,WORLD.width,WORLD.height);}
  const bridgePath=(offset=0)=>{ctx.beginPath();BRIDGE_OUTLINE.forEach((p,i)=>{if(i)ctx.lineTo(p.x,p.y+offset);else ctx.moveTo(p.x,p.y+offset);});ctx.closePath();};
  if(HOWLING_MAP){
   for(let u=-600;u<=600;u+=150){const p=bridgePoint(u,halfWidth(BRIDGE,u));ctx.fillStyle='#183248';ctx.beginPath();ctx.moveTo(p.x-10,p.y);ctx.lineTo(p.x+14,p.y);ctx.lineTo(p.x+4,p.y+58);ctx.lineTo(p.x-8,p.y+44);ctx.fill();}
   // Layered vertical fascia below the unchanged playable outline.
   bridgePath(BRIDGE_SURFACE.edgeDepth);ctx.fillStyle='#182d40';ctx.fill();
   bridgePath(14);ctx.fillStyle='#263e51';ctx.fill();ctx.strokeStyle='#395568';ctx.stroke();
   bridgePath(5);ctx.fillStyle='#405b6c';ctx.fill();
   // The approach joins at deck height: cover the old end fascia at the doorway.
   drawBridgeheadApproaches(ctx,[]);
   ctx.save();bridgePath();ctx.clip();ctx.fillStyle='#526b7d';ctx.fill();
  }
  // Smaller runtime tiles on the bridge; keep source art and 2:1 aspect unchanged.
  const tileWidth=HOWLING_MAP?96:128,tileHeight=tileWidth/2;
  if(!HOWLING_MAP)for(let row=-1;row<=Math.ceil(WORLD.height/(tileHeight/2))+1;row++)for(let col=-1;col<=Math.ceil(WORLD.width/tileWidth)+1;col++){
   const x=col*tileWidth+(row%2?tileWidth/2:0),y=row*tileHeight/2;
   ctx.drawImage(stone,256,64,128,64,x-tileWidth/2,y-tileHeight/2,tileWidth,tileHeight);
  }
  // Independent, deterministic snow decals. Keep the diagonal fighting lane readable.
  if(!HOWLING_MAP)for(let row=0;row<10;row++)for(let col=0;col<15;col++){
   const x=col*76+((row%2)*31),y=row*72;
   const laneDistance=Math.abs(y-(670-x*.64));
   const seed=(col*17+row*31)%13;
   if(laneDistance<100&&seed>1)continue;
   if(seed>8)continue;
   const density=laneDistance>220?3:laneDistance>130?2:laneDistance>90?1:0;
   ctx.drawImage(snow,(seed%4)*128,density*64,128,64,x-50,y-22,128,64);
  }
  if(HOWLING_MAP){
   drawStoneCells(ctx,Array.from({length:16},(_,i)=>scene.textures.get(stoneKey(i)).getSourceImage() as HTMLImageElement),
    Array.from({length:16},(_,i)=>scene.textures.get(edgeKey(i)).getSourceImage() as HTMLImageElement),
    Array.from({length:SNOW_STONE_COUNT},(_,i)=>scene.textures.get(snowStoneKey(i)).getSourceImage() as HTMLImageElement));
   drawBridgeCircle(ctx,Array.from({length:16},(_,i)=>scene.textures.get(circleKey(i)).getSourceImage() as HTMLImageElement));
   const storyImages:Record<string,HTMLImageElement>={};
   for(const kind of ['repair','damage'])for(let i=0;i<4;i++)storyImages[`${kind}-${i}`]=scene.textures.get(storyKey(`${kind}-${i}`)).getSourceImage() as HTMLImageElement;
   drawBridgeStory(ctx,storyImages);
   // Low-opacity midtone reduces high-frequency stone contrast without blurring actors.
   ctx.fillStyle=`rgba(82,107,125,${BRIDGE_SURFACE.stoneVeil})`;
   ctx.fillRect(0,0,WORLD.width,WORLD.height);
   // Clipped inner edge shading separates the deck from its vertical fascia.
   bridgePath();ctx.lineWidth=12;ctx.strokeStyle=`rgba(11,30,45,${BRIDGE_SURFACE.edgeShade})`;ctx.stroke();
   // Small exposed mortar recesses break the outer bricks without suggesting deep pits.
   for(const chip of edgeChips()){
    const edge=chip.side*halfWidth(BRIDGE,chip.u);
    const points=[bridgePoint(chip.u-chip.width,edge),bridgePoint(chip.u+chip.width,edge),
     bridgePoint(chip.u+chip.width*.35,edge-chip.side*chip.depth*.7),
     bridgePoint(chip.u-chip.width*.4,edge-chip.side*chip.depth)];
    ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();
    ctx.fillStyle='#314958';ctx.fill();
    ctx.beginPath();ctx.moveTo(points[1].x,points[1].y);ctx.lineTo(points[2].x,points[2].y);ctx.lineTo(points[3].x,points[3].y);
    ctx.strokeStyle='rgba(156,181,191,.65)';ctx.lineWidth=1.2;ctx.stroke();
    const crack=bridgePoint(chip.u-chip.width*.5,edge-chip.side*(chip.depth+5));
    ctx.beginPath();ctx.moveTo(points[3].x,points[3].y);ctx.lineTo(crack.x,crack.y);
    ctx.strokeStyle='rgba(27,48,63,.5)';ctx.lineWidth=1;ctx.stroke();
   }
   // Snowy stones above replace pavement; only a few loose flecks remain.
   for(let u=-650,i=0;u<=650;u+=86,i++)for(const side of [-1,1]){
    const patch=edgeSnowPatch(i,side),along=u+patch.alongJitter;
    const p=bridgePoint(along,side*(halfWidth(BRIDGE,along)-patch.inset-18));
    ctx.globalAlpha=.42;
    ctx.drawImage(snow,patch.column*128,0,128,64,p.x-38,p.y-19,76,38);
   }
   ctx.globalAlpha=1;
   ctx.restore();
   // Build once, at half resolution: no per-frame pixel reads or texture uploads.
   // Exclude the site labels so text never becomes fake raised geometry.
   if(scene.game.renderer.type===Phaser.WEBGL){
    const normal=document.createElement('canvas');normal.width=Math.ceil(WORLD.width/2);normal.height=Math.ceil(WORLD.height/2);
    const nc=normal.getContext('2d',{willReadFrequently:true})!;
    nc.drawImage(texture.getSourceImage() as HTMLCanvasElement,0,0,normal.width,normal.height);
    const data=nc.getImageData(0,0,normal.width,normal.height);
    data.data.set(terrainNormals(data.data,normal.width,normal.height));nc.putImageData(data,0,0);
    texture.setDataSource(normal);this.normalSource=texture.dataSource[0];
   }
   const propImages=Object.fromEntries(Object.keys(PROP_URLS).map(index=>[index,scene.textures.get(propKey(Number(index))).getSourceImage() as HTMLImageElement]));
   const lightImages=Object.fromEntries(Object.keys(LIGHT_URLS).map(kind=>[kind,scene.textures.get(lightKey(kind as BridgeLightKind)).getSourceImage() as HTMLImageElement])) as Record<BridgeLightKind,HTMLImageElement>;
   drawBridgeRails(ctx,Array.from({length:4},(_,i)=>scene.textures.get(railKey(i)).getSourceImage() as HTMLImageElement));
   // The rear bridge rail passes behind the bridgehead masonry and roof.
   // Composite the gate after the rails so its silhouette occludes that span.
   drawBridgeheadGates(ctx,Array.from({length:6},(_,i)=>scene.textures.get(bridgeheadKey(i)).getSourceImage() as HTMLImageElement));
   // Exterior story clusters are baked once; the small lamp glow is handled by Light2D.
   drawBridgeProps(ctx,propImages);
   drawBridgeLights(ctx,lightImages);
  }
  // Smooth only the composited ground during fractional camera zoom/panning.
  // Actor and skill textures retain their existing nearest-neighbor filtering.
  texture.refresh();texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
  this.image=scene.add.image(0,0,'ice-floor-composite').setOrigin(0).setDepth(.5);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{if(this.normalSource)texture.dataSource=[this.normalSource];this.image.destroy();scene.textures.remove('ice-floor-composite');});
 }
 setVisible(visible:boolean){this.image.setVisible(visible);}
 setSmoothSampling(enabled:boolean){
  if(enabled===this.smoothSampling)return;
  this.smoothSampling=enabled;
  this.image.texture.setFilter(enabled?Phaser.Textures.FilterMode.LINEAR:Phaser.Textures.FilterMode.NEAREST);
 }
 setLighting(enabled:boolean){
  if(enabled){if(this.image.pipeline.name!=='Light2D')this.image.setPipeline('Light2D');}
  else if(this.image.pipeline.name==='Light2D')this.image.resetPipeline();
 }
 setMaterial(enabled:boolean){
  if(!this.normalSource||enabled===this.materialEnabled)return;
  this.materialEnabled=enabled;
  this.image.texture.dataSource=enabled?[this.normalSource]:[];
 }
}
