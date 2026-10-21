import Phaser from 'phaser';
import { BASES, HOWLING_MAP } from '../game/config';
import { BRIDGE, BRIDGE_SLOTS, bridgePoint } from '../game/Bridge';
import {BRIDGE_LIGHTS,bridgeLightPoint} from './BridgeLights';
import {fireFlicker,crystalBreath} from './EnvironmentalLight';
import {halfWidth} from '../../assets/map-studies/howling-abyss-v1/geometry';
import {actorDepth} from './RenderDepth';
import type { Match } from '../game/Match';
import {environmentWind} from './EnvironmentWind';

/** Native Light2D illumination; shadows remain explicit 2D silhouettes. */
export class ArenaLighting {
  readonly supported: boolean;
  enabled = true;
  motionEnabled = true;
  private lamps: {light:Phaser.GameObjects.Light;x:number;y:number;radius:number;phase:number;strength:number;id:string;fire:boolean}[]=[];
  private firePools?:Phaser.GameObjects.Graphics;
  private fireSites:{station:number;x:number;y:number;outer:{x:number;y:number}[];inner:{x:number;y:number}[];embers:Phaser.GameObjects.Graphics}[]=[];
  constructor(private scene:Phaser.Scene){
    this.supported=scene.game.renderer.type===Phaser.WEBGL;
    if(!this.supported)return;
    scene.lights.enable().setAmbientColor(0xb4c8dc);
    if(HOWLING_MAP){
      this.firePools=scene.add.graphics().setDepth(.76);
      scene.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{
        this.firePools?.destroy();
        for(const site of this.fireSites)site.embers.destroy();
      });
    }
    for(const slot of BRIDGE_SLOTS.filter(s=>s.id.includes('tower')||s.id.endsWith('inner')||s.id.endsWith('outer'))){
      const p=bridgePoint(slot.u,slot.v);
      // Blue art and snow already read bright. Its former broad cyan pool washed
      // the deck; red needed a little more reflected warmth to read as a pair.
      const blue=slot.team==='blue',x=p.x,y=p.y-55,radius=blue?185:205,strength=blue?.59:.79;
      this.lamps.push({light:scene.lights.addLight(x,y,radius,blue?0x93c8e5:0xe7a4a8,strength),x,y,radius,phase:slot.u,strength,id:slot.id,fire:false});
    }
    if(HOWLING_MAP)for(const slot of BRIDGE_SLOTS.filter(s=>s.id.endsWith('nexus')||s.id.endsWith('inhibitor'))){
      const p=bridgePoint(slot.u,slot.v),nexus=slot.id.endsWith('nexus'),blue=slot.team==='blue';
      const x=p.x,y=p.y-(nexus?38:25),radius=nexus?145:92,strength=nexus?(blue?.35:.43):(blue?.24:.29);
      this.lamps.push({light:scene.lights.addLight(x,y,radius,blue?0xa3dcf3:0xffafb5,strength),x,y,radius,phase:slot.u,strength,id:slot.id,fire:false});
    }
    if(!HOWLING_MAP)for(const team of ['blue','red'] as const){
      const p=BASES[team];
      const radius=270,strength=.65;
      this.lamps.push({light:scene.lights.addLight(p.x,p.y,radius,team==='blue'?0x96e9ff:0xffbdc1,strength),x:p.x,y:p.y,radius,phase:p.x,strength,id:team+'-spawn',fire:false});
    }
    if(HOWLING_MAP)for(const prop of BRIDGE_LIGHTS){
      if(!prop.lit)continue;
      const p=bridgeLightPoint(prop),x=p.x,y=p.y-72,radius=180,strength=.52;
      this.lamps.push({light:scene.lights.addLight(x,y,radius,0xffb568,strength),x,y,radius,phase:prop.station,strength,id:`bridge-${prop.kind}-${prop.u}-${prop.side}`,fire:true});
      const edge=halfWidth(BRIDGE,prop.u);
      const floor=(du:number,inset:number)=>bridgePoint(prop.u+du,prop.side*(edge-inset));
      const outer=[floor(-15,4),floor(12,5),floor(18,14),floor(12,34),floor(4,43),floor(-12,36),floor(-18,19)];
      const inner=[floor(-9,5),floor(8,5),floor(11,13),floor(7,24),floor(-8,25),floor(-11,13)];
      this.fireSites.push({station:prop.station,x:p.x,y:p.y-prop.width*.43,outer,inner,
        embers:scene.add.graphics().setDepth(actorDepth(p.y,72))});
    }
  }
  receive(image:Phaser.GameObjects.Image){
    if(!this.supported)return;
    if(this.enabled){if(image.pipeline.name!=='Light2D')image.setPipeline('Light2D');}
    else if(image.pipeline.name==='Light2D')image.resetPipeline();
  }
  update(match:Match,visible:boolean,windEnabled=true){
    if(!this.supported)return;
    const active=this.enabled&&visible;
    this.scene.lights.setAmbientColor(active?0xb4c8dc:0xffffff);
    this.firePools?.clear();
    for(const site of this.fireSites)site.embers.clear();
    for(const lamp of this.lamps){
      const destroyed=lamp.id.endsWith('outer')&&match.tower(lamp.id.startsWith('blue')?'blue':'red').hp<=0;
      const pulse=this.motionEnabled?(lamp.fire?fireFlicker(match.time,lamp.phase):crystalBreath(match.time,lamp.phase)):1;
      lamp.light.setIntensity(active&&!destroyed?lamp.strength*pulse:0);
      lamp.light.setRadius(lamp.radius*(lamp.fire ? .94+.06*pulse : 1+.025*(pulse-1)));
      if(lamp.fire)lamp.light.setPosition(lamp.x+(this.motionEnabled?Math.sin(match.time*3.7+lamp.phase*.4)*2:0),lamp.y-3*(pulse-1));
    }
    if(active&&this.motionEnabled&&this.firePools){
      const view=this.scene.cameras.main.worldView;
      for(const site of this.fireSites){
        if(site.x<view.left-125||site.x>view.right+125||site.y<view.top-100||site.y>view.bottom+100)continue;
        const pulse=fireFlicker(match.time,site.station);
        const wind=windEnabled?environmentWind(match.time,site.x,site.y):{x:0,y:0,gust:0};
        // Irregular stone-facing bounce begins at the brazier's rail bay and
        // fades inward. No disconnected round decal or light in the abyss.
        this.firePools.fillStyle(0xffb66e,.032*pulse).fillPoints(site.outer,true);
        this.firePools.fillStyle(0xffd195,.055*pulse).fillPoints(site.inner,true);
        for(let i=0;i<5;i++){
          const age=(match.time*(.68+i*.11)+site.station*.013+i*.47)%1;
          const x=Math.round(site.x+Math.sin(match.time*2.6+i*3+site.station)*4+(i?3:-3)+wind.x*age*.4);
          const y=Math.round(site.y-age*(30+i%3*8));
          site.embers.fillStyle(i%2?0xffdd8c:0xff9d54,(1-age)*.72*pulse).fillRect(x,y,i%2?2:3,i%2?3:2);
        }
      }
    }
  }
}
