/** Visual size only: never apply this to movement, collision or skill ranges. */
export const HERO_VISUAL_SCALE = 2.975;
/** Attachments authored against the previous 1.5x hero presentation. */
export const HERO_ATTACHMENT_SCALE = HERO_VISUAL_SCALE / 1.5;
export const HERO_EFFECT_SCALE = 0.25 * HERO_VISUAL_SCALE;
/** Render more samples without changing the logical camera or world-space sizes. */
export const RENDER_SCALE = 3;
/** Quantize presentation to a render pixel, not a whole world unit. */
export const snapRenderCoordinate = (value:number,zoom:number) => Math.round(value*zoom*RENDER_SCALE)/(zoom*RENDER_SCALE);
/** Quantize against the actual camera scroll, keeping a locked actor on one screen pixel. */
export const snapCameraCoordinate=(value:number,scroll:number,zoom:number)=>scroll+snapRenderCoordinate(value-scroll,zoom);
export const toLogicalPointer = (point: {x:number;y:number}) => ({x:point.x/RENDER_SCALE,y:point.y/RENDER_SCALE});
