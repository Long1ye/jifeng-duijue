import { describe, expect, it, vi } from 'vitest';
vi.mock('../src/ui/AudioFeedback', () => ({ AudioFeedback: class {
  enabled = true; audioContext = null; unlock = vi.fn(); play = vi.fn(); updateMovement = vi.fn(); stop = vi.fn(); dispose = vi.fn();
} }));
vi.mock('../src/ui/MapMusic', () => ({ MapMusic: class {
  enabled = true; failed = false; reset = vi.fn(); update = vi.fn(); dispose = vi.fn(); noticeCombat = vi.fn();
} }));
vi.mock('../src/ui/EnvironmentAudio', () => ({ EnvironmentAudio: class {
  enabled = true; reset = vi.fn(); update = vi.fn(); dispose = vi.fn(); noticeCombat = vi.fn();
} }));
import { ThreeAudio } from '../src/presentation/ThreeAudio';
import { Match } from '../src/game/Match';
import { RenderPositions } from '../src/render/RenderPositions';
import type { PrototypeFrame } from '../src/presentation/PrototypeHost';

const frame = (match: Match): PrototypeFrame => ({ match, alpha: 1, positions: new RenderPositions(), events: [] });
describe('Three.js original audio lifecycle', () => {
  it('delivers the final hero death together with the end event without repeating it', () => {
    const audio=new ThreeAudio(),match=new Match({ai:false,waves:false});match.start();audio.unlock();audio.update(frame(match),match.hero('blue'),1000);
    match.phase='ended';const value=frame(match);value.events=[{type:'kill',team:'red',targetKind:'hero',targetId:match.hero('blue').id,x:0,y:0},{type:'end',team:'red',x:0,y:0}];
    audio.update(value,match.hero('blue'),1000);expect(audio.combat.play).toHaveBeenCalledTimes(2);
    audio.update(frame(match),match.hero('blue'),1000);expect(audio.combat.play).toHaveBeenCalledTimes(2);audio.dispose();
  });
  it('requires a gesture, consumes each host batch once and stops all layers immediately on blur', () => {
    const audio = new ThreeAudio(), match = new Match({ ai: false, waves: false }); match.start();
    const value = frame(match); value.events = [{ type: 'cast', team: 'blue', ability: 'q', x: 0, y: 0 }];
    audio.update(value, match.hero('blue'), 1000);
    expect(audio.combat.play).not.toHaveBeenCalled();
    audio.unlock(); audio.update(value, match.hero('blue'), 1000); expect(audio.combat.play).toHaveBeenCalledTimes(1);
    audio.update(frame(match), match.hero('blue'), 1000); expect(audio.combat.play).toHaveBeenCalledTimes(1);
    audio.stop(); expect(audio.combat.stop).toHaveBeenCalled();
    expect(audio.music.update).toHaveBeenLastCalledWith(match.time, match.phase, false, false); expect(audio.environment.reset).toHaveBeenCalled();
    audio.dispose();
  });
  it('resets audio on match identity even at time zero and plays the terminal event once', () => {
    const audio = new ThreeAudio(), first = new Match({ ai: false, waves: false }); first.start(); audio.unlock();
    audio.update(frame(first), first.hero('blue'), 1000);
    const second = new Match({ ai: false, waves: false }); second.start(); audio.update(frame(second), second.hero('blue'), 1000);
    expect(audio.music.reset).toHaveBeenCalledTimes(2);
    second.phase = 'ended'; const value = frame(second); value.events = [{ type: 'end', team: 'blue', x: 0, y: 0 }];
    audio.update(value, second.hero('blue'), 1000); expect(audio.combat.play).toHaveBeenCalledTimes(1);
    audio.update(frame(second), second.hero('blue'), 1000); expect(audio.combat.play).toHaveBeenCalledTimes(1);
    audio.dispose(); expect(audio.combat.dispose).toHaveBeenCalledOnce(); expect(audio.music.dispose).toHaveBeenCalledOnce(); expect(audio.environment.dispose).toHaveBeenCalledOnce();
  });
});
