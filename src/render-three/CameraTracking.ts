import type { Entity } from '../game/types';
import type { PrototypeFrame } from '../presentation/PrototypeHost';
import type { ThreeCamera } from './Coordinates';

/** Camera and sprite must share one render-time position. Simulation ticks can
 * be idle between 165 Hz frames; a locked camera must still advance with the
 * interpolated body rather than smoothing/catching up at the simulation rate. */
export function trackHeroCamera(camera: ThreeCamera, frame: Pick<PrototypeFrame, 'match' | 'positions' | 'alpha' | 'localTeam'>,
  locked: boolean, recenterHeld = false): Entity {
  const hero = frame.positions.sample(frame.match.hero(frame.localTeam ?? 'blue'), frame.alpha);
  if (locked || recenterHeld) camera.lookAt(hero);
  return hero;
}
