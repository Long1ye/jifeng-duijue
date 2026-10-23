/** Approximate shallow relief from existing color art; not authored geometry or shadows. */
export function terrainNormals(rgba:Uint8ClampedArray,width:number,height:number):Uint8ClampedArray {
  if(rgba.length!==width*height*4)throw new Error('Invalid terrain dimensions');
  const heights=new Float32Array(width*height),out=new Uint8ClampedArray(rgba.length);
  for(let i=0;i<heights.length;i++){
    const k=i*4;
    heights[i]=(rgba[k]*.2126+rgba[k+1]*.7152+rgba[k+2]*.0722)/255;
  }
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const i=y*width+x,k=i*4;
    const left=y*width+Math.max(0,x-1),right=y*width+Math.min(width-1,x+1);
    const up=Math.max(0,y-1)*width+x,down=Math.min(height-1,y+1)*width+x;
    // Do not create a raised ridge along the transparent edge of the bridge.
    const opaque=rgba[k+3]>240&&rgba[left*4+3]>240&&rgba[right*4+3]>240&&rgba[up*4+3]>240&&rgba[down*4+3]>240;
    const nx=opaque?Math.max(-.28,Math.min(.28,(heights[left]-heights[right])*.85)):0;
    const ny=opaque?Math.max(-.28,Math.min(.28,(heights[down]-heights[up])*.85)):0;
    const inv=1/Math.sqrt(nx*nx+ny*ny+1);
    out[k]=(nx*inv*.5+.5)*255;out[k+1]=(ny*inv*.5+.5)*255;out[k+2]=(inv*.5+.5)*255;out[k+3]=255;
  }
  return out;
}
