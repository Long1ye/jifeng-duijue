import {groundPoint,project,stateAt,LIFE,clamp,type Point,type WallSpec,type Projection} from '../../assets/hero-skills/2026-10-12/yasuo/w-v4-free-angle/wall';

export const WIND_WALL_CANVAS={size:256,originX:128,originY:176} as const;
const TAU=Math.PI*2;
function path(ctx:CanvasRenderingContext2D,points:Point[]){
  ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(Math.round(p.x),Math.round(p.y)):ctx.moveTo(Math.round(p.x),Math.round(p.y)));
}
function line(ctx:CanvasRenderingContext2D,points:Point[],color:string,alpha:number,width:number){
  if(points.length<2||alpha<=0)return;
  ctx.strokeStyle=color;ctx.globalAlpha=clamp(alpha);ctx.lineWidth=width;path(ctx,points);ctx.stroke();
}

/** Broad translucent ribbons form a continuous wind curtain, with sparse curling edges. */
export function drawWindWall(ctx:CanvasRenderingContext2D,wall:WallSpec,camera:Projection,age:number,windTime:number){
  const life=stateAt(age);if(!life.active||life.opacity<=0)return;
  const phase=windTime/LIFE.windPeriod*TAU;
  const fade=clamp((age-LIFE.fade)/(LIFE.end-LIFE.fade));
  const point=(u:number,z:number,n=0)=>project(groundPoint(wall,u,n),z,camera);
  const grow=(u:number)=>stateAt(age,u/(wall.width/2)).grow;
  const crest=(u:number)=>wall.height*(.84+.16*Math.cos(u/wall.width*Math.PI))*grow(u)*(1-fade*.25);
  ctx.save();ctx.imageSmoothingEnabled=false;ctx.lineJoin='round';ctx.lineCap='round';

  const foot=[point(-wall.width/2,0,-wall.thickness*.7),point(wall.width/2,0,-wall.thickness*.7),point(wall.width/2,0,wall.thickness*.7),point(-wall.width/2,0,wall.thickness*.7)];
  ctx.fillStyle='#78b8b5';ctx.globalAlpha=life.opacity*life.grow*.10;path(ctx,foot);ctx.closePath();ctx.fill();
  // A faint continuous volume connects the ribbons, with an irregular, open crest.
  for(const side of [-1,1]){
    const outline:Point[]=[];
    for(let i=0;i<=32;i++){
      const u=(i/32-.5)*wall.width;
      outline.push(point(u,Math.max(0,crest(u)+Math.sin(i*.42+phase)*2*grow(u)),side*wall.thickness*.5));
    }
    for(let i=32;i>=0;i--)outline.push(point((i/32-.5)*wall.width,0,side*wall.thickness*.5));
    ctx.fillStyle=side<0?'#386c79':'#a4d7d3';ctx.globalAlpha=life.opacity*life.grow*(side<0?.16:.10);
    path(ctx,outline);ctx.closePath();ctx.fill();
  }

  // Tapered sheets flow upward together; each sheet fades before wrapping to the base.
  for(let band=0;band<7;band++){
    const travel=((windTime/LIFE.windPeriod)+band/7)%1;
    const alpha=Math.sin(travel*Math.PI)*life.opacity;
    const top:Point[]=[],bottom:Point[]=[],edge:Point[]=[];
    const span=wall.width*(.52+(band%3)*.11);
    const center=Math.sin(phase+band*2.1)*wall.width*.12;
    for(let i=0;i<=32;i++){
      const t=i/32,u=center+(t-.5)*span,local=grow(u),height=crest(u);
      const taper=Math.sin(t*Math.PI)**.7;
      const wave=Math.sin(t*Math.PI*1.3+phase+band*.7)*9+Math.sin(t*TAU*.7+band)*4;
      const z=Math.max(0,Math.min(height-1,(wall.height*(.05+travel*.87)+wave)*local));
      const thickness=(4+band%3*2)*taper*local;
      const across=Math.sin(t*TAU*.8+phase+band)*wall.thickness*.8;
      top.push(point(u,Math.min(height,z+thickness),across));
      bottom.push(point(u,Math.max(0,z-thickness*.45),across));
      if(i>=5&&i<=27)edge.push(point(u,z+thickness*.6,across));
    }
    ctx.fillStyle=band%2?'#abdcd7':'#79c2c5';ctx.globalAlpha=alpha*.26;
    path(ctx,[...top,...bottom.reverse()]);ctx.closePath();ctx.fill();
    line(ctx,edge,'#2f6575',alpha*.16,4);
    line(ctx,edge,'#def4e9',alpha*.38,1);
  }

  // A few long curls give the wall volume at edge-on angles without a curtain of needles.
  for(let strand=0;strand<4;strand++){
    const travel=(windTime/LIFE.windPeriod+strand*.237)%1;
    const u=Math.sin(strand*2.4+1.2)*(wall.width*.4),height=crest(u),points:Point[]=[];
    const head=travel*(height+24),tail=Math.max(0,head-24);
    for(let i=0;i<=14;i++){
      const z=tail+(Math.min(height,head)-tail)*i/14;
      if(z<0||z>height||tail>height)continue;
      const curl=Math.sin(z/height*TAU*.8-phase+strand*.8);
      points.push(point(u+curl*3*grow(u),z,curl*wall.thickness*.7));
    }
    const alpha=Math.sin(travel*Math.PI)*life.opacity*grow(u);
    line(ctx,points,'#69aeb7',alpha*.24,6);
    line(ctx,points,'#d4eee5',alpha*.32,1);
  }
  // Ten feathered motes lift off the crest; no dense spark shower.
  for(let i=0;i<10;i++){
    const t=(windTime/1100+i*.173)%1,u=(i/9-.5)*(wall.width-8);
    const p=point(u+Math.sin(phase+i)*3,crest(u)-3+t*12,Math.sin(phase+i*.7)*wall.thickness*.5);
    ctx.globalAlpha=life.opacity*grow(u)*Math.sin(t*Math.PI)*.40;ctx.fillStyle='#d5efe6';
    ctx.fillRect(Math.round(p.x),Math.round(p.y),i%3?1:2,1);
  }
  ctx.restore();
}
