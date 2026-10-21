import { describe, expect, it } from 'vitest';
import study from '../assets/hero-animations/2026-10-09/v2/study.json';
import batch from '../assets/hero-animations/2026-10-09/v2/batch.json';
import validation from '../assets/hero-animations/2026-10-09/v2/validation.json';
import previous from '../assets/hero-animations/2026-10-09/v1/study.json';
import { DIRECTIONS } from '../assets/hero-walk-directions/2026-10-09/v1/direction';
import { frameAt } from '../assets/hero-animations/2026-10-09/v1/timing';

const clips = study.heroes.flatMap(hero => hero.clips);

describe('complete eight-direction animation study', () => {
  it('covers three heroes, eight headings and both actions exactly once', () => {
    expect(study.heroes.map(hero => hero.id)).toEqual(['yasuo', 'ahri', 'garen']);
    expect(study.directions).toEqual(DIRECTIONS);
    expect(study.ready_clip_count).toBe(48);
    expect(clips).toHaveLength(48);
    for (const hero of study.heroes) {
      expect(hero.clips).toHaveLength(16);
      expect(new Set(hero.clips.map(clip => `${clip.state}-${clip.direction}`)).size).toBe(16);
      for (const direction of DIRECTIONS) {
        expect(hero.clips.filter(clip => clip.direction === direction).map(clip => clip.state)).toEqual(['idle', 'walk']);
        expect(hero.anchors[direction]).toHaveLength(2);
        expect(hero.anchors[direction].every(Number.isFinite)).toBe(true);
      }
    }
  });
  it('reuses the original six SE outputs rather than paying to regenerate them', () => {
    expect(clips.filter(clip => clip.reused)).toHaveLength(6);
    expect(clips.filter(clip => !clip.reused)).toHaveLength(42);
    expect(new Set(clips.map(clip => clip.job_id)).size).toBe(48);
    for (const hero of study.heroes) {
      const oldHero = previous.heroes.find(item => item.id === hero.id)!;
      for (const oldClip of oldHero.clips) {
        const reused = hero.clips.find(clip => clip.state === oldClip.state && clip.direction === 'se')!;
        expect(reused.reused).toBe(true);
        expect(reused.job_id).toBe(oldClip.job_id);
        for (const format of ['webp', 'gif', 'sheet'] as const) expect(reused[format]).toBe(`../v1/${oldClip[format]}`);
      }
    }
  });
  it('registers exactly the inspected declared final media with matching batch identifiers', () => {
    const allMedia = new Set<string>();
    for (const clip of clips) {
      expect(clip.status).toBe('success');
      expect(clip.manifest.endsWith('/final_outputs.json')).toBe(true);
      for (const format of ['webp', 'gif', 'sheet'] as const) allMedia.add(clip[format]);
      if (!clip.reused) expect(batch.jobs.find(job => job.job_id === clip.job_id)?.status).toBe('success');
    }
    expect(allMedia.size).toBe(144);
    expect([...allMedia].sort()).toEqual(validation.media.map(media => media.path).sort());
    expect(validation.status).toBe('passed');
    expect(validation.errors).toEqual([]);
    expect(validation.format_comparisons.filter(item => item.format === 'webp')
      .every(item => item.visible_pixels_equal_to_sheet)).toBe(true);
  });
  it('keeps native dimensions and excludes the empty ninth sheet cell at all playback rates', () => {
    for (const hero of study.heroes) for (const clip of hero.clips) {
      expect([clip.width, clip.height]).toEqual(hero.id === 'yasuo' ? [128, 128] : [256, 256]);
      expect([clip.columns, clip.rows, clip.frame_count]).toEqual([3, 3, 8]);
      expect(clip.durations_ms).toEqual(Array(8).fill(100));
      expect(clip.duration_ms).toBe(800);
      for (const rate of [0.5, 1, 2]) for (let frame = 0; frame < 24; frame++) {
        expect(frameAt(frame * 100 / rate, clip.durations_ms, rate)).toBe(frame % 8);
      }
    }
  });
  it('records technical validation without claiming art approval or runtime integration', () => {
    expect(study.validation.status).toBe('technical_pass');
    expect(study.validation.media_count).toBe(144);
    expect(study.validation.input_files_unmodified).toBe(true);
    expect(study.validation.production_ready).toBe(false);
    expect(study.validation.seamless_loop_guaranteed).toBe(false);
    expect(study.corrective_regeneration).toBe(false);
    expect(study.runtime_integration).toBe(false);
  });
});
