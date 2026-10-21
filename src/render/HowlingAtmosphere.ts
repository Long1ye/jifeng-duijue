import Phaser from 'phaser';
import { WORLD } from '../game/config';
import { bridgePoint, BRIDGE } from '../game/Bridge';
import { halfWidth } from '../../assets/map-studies/howling-abyss-v1/geometry';
import {AbyssScenery} from './AbyssScenery';
import {environmentWind} from './EnvironmentWind';
import {stoneCells,snowStoneTier} from './BridgeTiles';
import {snowSurface} from './SnowSurface';
import {CachedPolygon} from './CachedPolygon';
import {AbyssLife} from './AbyssLife';

/** Deterministic decoration: no collision, gameplay state or per-frame allocations of objects. */
export const terrainNoise=(a:number,b:number)=>{
  const n=Math.sin(a*127.1+b*311.7)*43758.5453;
  return n-Math.floor(n);
};
const wrap=(n:number,size:number)=>((n%size)+size)%size;

export class HowlingAtmosphere {
  static preload(scene:Phaser.Scene){AbyssScenery.preload(scene);}
  private scenery:AbyssScenery;
  private backdrop:Phaser.GameObjects.Graphics;
  private base:Phaser.GameObjects.Graphics;
  private fog:Phaser.GameObjects.Graphics;
  private snow:Phaser.GameObjects.Graphics;
  private drift:Phaser.GameObjects.Graphics;
  private lastTime=-1;
  private abyssLife:AbyssLife;
  private mistBands=[3,2,1].map(band=>new CachedPolygon(new Phaser.Geom.Ellipse(0,0,180+band*65,12+band*18).getPoints(32)));
  private flakes=Array.from({length:120},()=>({x:0,y:0}));
  private driftSites=stoneCells().filter(cell=>(snowStoneTier(cell)??-1)>=1)
    .filter((_,i)=>i%7===0).map(cell=>bridgePoint(cell.u,cell.v)).filter(p=>snowSurface(p.x,p.y));
  constructor(private scene:Phaser.Scene){
    this.abyssLife=new AbyssLife(scene);
    this.scenery=new AbyssScenery(scene);
    this.base=scene.add.graphics().setDepth(.05).fillStyle(0x081321).fillRect(0,0,WORLD.width,WORLD.height);
    this.backdrop=scene.add.graphics().setDepth(.1).setAlpha(.25);
    this.fog=scene.add.graphics().setDepth(.25);
    this.snow=scene.add.graphics().setDepth(10000);
    this.drift=scene.add.graphics().setDepth(.82);
    const g=this.backdrop;
    g.fillStyle(0x081321).fillRect(0,0,WORLD.width,WORLD.height);
    // Distant ice silhouettes, separated from the playable bridge by a dark gap.
    for(let layer=0;layer<3;layer++)for(const side of [-1,1])for(let u=-790;u<820;u+=28){
      const n=terrainNoise(u,layer+side*7);
      const p=bridgePoint(u,side*(halfWidth(BRIDGE,u)+130+layer*95));
      const w=45+n*65,h=75+n*145;
      g.fillStyle([0x142b3b,0x102333,0x0c1c2a][layer]);
      new CachedPolygon([{x:p.x-w,y:p.y+30},{x:p.x-w*.5,y:p.y+12},{x:p.x+9,y:p.y-h*.3},{x:p.x+w*.7,y:p.y},{x:p.x+w*.45,y:p.y+h*.35},{x:p.x+12,y:p.y+h*1.6},{x:p.x-w*.32,y:p.y+h*.65}]).fill(g);
      g.fillStyle(0x315168,.12).fillTriangle(p.x+9,p.y-h*.3,p.x+w*.7,p.y,p.x+10,p.y+h*.5);
    }
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{this.base.destroy();this.backdrop.destroy();this.fog.destroy();this.snow.destroy();this.drift.destroy();});
  }
  reset(){this.lastTime=-1;this.fog.clear();this.snow.clear();this.drift.clear();}
  update(time:number,enabled:boolean,animated=true,depthEnabled=true){
    this.abyssLife.update(time,enabled&&animated&&depthEnabled);
    this.scenery.update(this.scene.cameras.main,enabled);
    this.backdrop.setVisible(enabled);this.fog.setVisible(enabled);this.snow.setVisible(enabled);
    this.drift.setVisible(enabled&&animated);
    if(!enabled){this.lastTime=-1;return;}
    const camera=this.scene.cameras.main, bounds=camera.worldView;
    const x=bounds.x,y=bounds.y,w=bounds.width,h=bounds.height;
    const seed=this.lastTime<0||time<this.lastTime;
    const dt=seed?0:Math.min(.1,Math.max(0,time-this.lastTime));
    this.lastTime=time;
    const weatherTime=animated?time:0;
    this.fog.clear();this.snow.clear();this.drift.clear();
    // Loose snow lifts from actual snowy stones; ground depth keeps actors readable.
    if(animated)for(const [i,site] of this.driftSites.entries()){
      if(site.x<x-220||site.x>x+w+220||site.y<y-100||site.y>y+h+100)continue;
      const wind=environmentWind(time,site.x,site.y);
      const age=wrap(time*.64+i*.371,1),envelope=Math.sin(age*Math.PI);
      if(wind.gust<.08)continue;
      for(let j=0;j<6;j++){
        const px=site.x+wind.x*age*.9+j*7;
        const py=site.y+wind.y*age*.45-j*1.5-Math.sin(age*Math.PI)*8;
        this.drift.fillStyle(0xc9e4ee,envelope*wind.gust*(.16-j*.019))
          .fillRect(Math.round(px),Math.round(py),12+j*3,2+(j%2));
      }
    }
    // Behind the opaque bridge surface: mist can never hide combat or range markers.
    const mistWind=environmentWind(weatherTime,x+w*.5,y+h*.5);
    this.fog.fillStyle(0x719eb5,.014);
    for(let i=0;i<22;i++){
      const px=x+wrap(terrainNoise(i,1)*(w+420)+weatherTime*(5+i%3)-x*.12,w+420)-210;
      const py=y+wrap(terrainNoise(i,2)*(h+200)-y*.08+Math.sin(weatherTime*.12+i)*18,h+200)-100;
      const sway=mistWind.gust*8*Math.sin(weatherTime*.4+i);
      for(const band of this.mistBands)band.fill(this.fog,px+sway,py);
    }
    // Sparse layered flakes. Camera-relative wrapping avoids spawning across the whole map.
    for(let i=0;i<this.flakes.length;i++){
      const near=i%5===0,flake=this.flakes[i];
      if(seed){flake.x=x+terrainNoise(i,5)*(w+40)-20;flake.y=y+terrainNoise(i,9)*(h+40)-20;}
      const wind=environmentWind(weatherTime,flake.x,flake.y);
      if(animated){flake.x+=wind.x*dt*(near?1.4:.8);flake.y+=(wind.y+(near?16:9))*dt;}
      // World-space particles persist through camera motion; recycle only at view margins.
      const px=flake.x=x+wrap(flake.x-x+20,w+40)-20;
      const py=flake.y=y+wrap(flake.y-y+20,h+40)-20;
      const size=near?3:1;
      this.snow.fillStyle(near?0xe3f6ff:0xa6c8dc,near?.5:.29).fillRect(Math.round(px),Math.round(py),size,size);
      if(animated&&wind.gust>.35&&i%3===0){
        this.snow.fillStyle(0xcce7f2,.12*wind.gust).fillRect(Math.round(px+size+1),Math.round(py-1),near?8:4,1);
      }
    }
  }
}
