import { describe, expect, it } from "vitest";
import { AWARD_SAMPLE_TAGS, AWARD_SELECTION_SAMPLES, BEST_AWARDED_SAMPLE_IDS, ILLUSTRATIVE_SAMPLES } from "./sampleData";

describe("illustrative sample library", () => {
  it("contains at least ten clearly structured samples across all judging programs", () => {
    expect(ILLUSTRATIVE_SAMPLES.length).toBeGreaterThanOrEqual(10);
    expect(new Set(ILLUSTRATIVE_SAMPLES.map((sample) => sample.programType))).toEqual(new Set(["excellence", "graduation", "tenders", "performance"]));
    for (const sample of ILLUSTRATIVE_SAMPLES) {
      expect(sample.name.ar).toBeTruthy();
      expect(sample.name.en).toBeTruthy();
      expect(sample.summary.ar).toBeTruthy();
      expect(sample.summary.en).toBeTruthy();
      expect(sample.score).toBeGreaterThanOrEqual(0);
      expect(sample.score).toBeLessThanOrEqual(100);
    }
  });

  it("keeps best-awarded and award-selection references connected to sample records", () => {
    const sampleIds = new Set(ILLUSTRATIVE_SAMPLES.map((sample) => sample.id));
    expect(BEST_AWARDED_SAMPLE_IDS.length).toBeGreaterThanOrEqual(3);
    expect(BEST_AWARDED_SAMPLE_IDS.every((id) => sampleIds.has(id))).toBe(true);
    expect(AWARD_SELECTION_SAMPLES.every((entry) => sampleIds.has(entry.sampleId))).toBe(true);
    expect(AWARD_SELECTION_SAMPLES.every((entry) => entry.selection.ar && entry.selection.en)).toBe(true);
  });

  it("provides bilingual specialized tags for every illustrative award", () => {
    for (const sample of ILLUSTRATIVE_SAMPLES) {
      const tags = AWARD_SAMPLE_TAGS[sample.id];
      expect(tags.length).toBeGreaterThan(0);
      expect(tags.every((tag) => tag.key && tag.ar && tag.en)).toBe(true);
    }
  });
});
