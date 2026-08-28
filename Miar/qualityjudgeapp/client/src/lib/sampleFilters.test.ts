import { describe, expect, it } from "vitest";
import { ILLUSTRATIVE_SAMPLES } from "@shared/sampleData";
import { filterIllustrativeSamples } from "./sampleFilters";

describe("illustrative sample filters", () => {
  it("searches across bilingual names, awards, organizations, and descriptions", () => {
    expect(filterIllustrativeSamples(ILLUSTRATIVE_SAMPLES, { search: "Green Path" }).map((sample) => sample.id)).toEqual(["sample-green-path"]);
    expect(filterIllustrativeSamples(ILLUSTRATIVE_SAMPLES, { search: "أفضل عرض تقني" }).map((sample) => sample.id)).toEqual(["sample-procurement-cloud"]);
  });

  it("combines program and tier filters without mutating the source array", () => {
    const originalOrder = ILLUSTRATIVE_SAMPLES.map((sample) => sample.id);
    const results = filterIllustrativeSamples(ILLUSTRATIVE_SAMPLES, { programFilter: "graduation", tierFilter: "gold" });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((sample) => sample.programType === "graduation" && sample.tier === "gold")).toBe(true);
    expect(ILLUSTRATIVE_SAMPLES.map((sample) => sample.id)).toEqual(originalOrder);
  });

  it("sorts results by highest or lowest score", () => {
    const highest = filterIllustrativeSamples(ILLUSTRATIVE_SAMPLES, { sortBy: "highest" });
    const lowest = filterIllustrativeSamples(ILLUSTRATIVE_SAMPLES, { sortBy: "lowest" });
    expect(highest[0]?.score).toBeGreaterThanOrEqual(highest.at(-1)?.score ?? 0);
    expect(lowest[0]?.score).toBeLessThanOrEqual(lowest.at(-1)?.score ?? 100);
  });

  it("matches every selected specialized tag", () => {
    const taggedSamples = ILLUSTRATIVE_SAMPLES.map((sample) => ({
      ...sample,
      tags: sample.id === "sample-green-path"
        ? [{ key: "sustainability", ar: "الاستدامة", en: "Sustainability" }, { key: "innovation", ar: "الابتكار", en: "Innovation" }]
        : [{ key: "innovation", ar: "الابتكار", en: "Innovation" }],
    }));
    const results = filterIllustrativeSamples(taggedSamples, { tags: ["sustainability", "innovation"] });
    expect(results.map((sample) => sample.id)).toEqual(["sample-green-path"]);
  });
});
