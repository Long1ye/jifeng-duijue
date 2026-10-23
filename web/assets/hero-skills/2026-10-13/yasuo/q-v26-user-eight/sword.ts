export const BLADE_LENGTH_SCALE = 3;
// Sword-axis coordinate of the guard, relative to the existing grip anchor.
export const BLADE_ROOT = 17;
export const swordAxisX = (x:number) => x <= BLADE_ROOT ? x : BLADE_ROOT + (x-BLADE_ROOT)*BLADE_LENGTH_SCALE;

/** Stretch the blade/animated glow along its axis, without stretching the grip. */
export function drawSword(c:CanvasRenderingContext2D, image:CanvasImageSource) {
 const sourceAngle = Math.atan2(27,112);
 for (const blade of [false,true]) {
  c.save();
  c.beginPath();
  c.rect(blade ? BLADE_ROOT : -2048,-2048,blade ? 2048 : 2048+BLADE_ROOT,4096);
  c.clip();
  if(blade){c.translate(BLADE_ROOT,0);c.scale(BLADE_LENGTH_SCALE,1);c.translate(-BLADE_ROOT,0);}
  c.rotate(-sourceAngle);
  c.drawImage(image,-16,-5);
  c.restore();
 }
}
