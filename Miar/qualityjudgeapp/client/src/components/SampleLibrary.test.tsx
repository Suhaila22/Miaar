import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/trpc", () => {
  const mutation = () => ({ isPending: false, variables: undefined, mutate: vi.fn() });
  return {
    trpc: {
      useUtils: () => ({ evaluation: { adminDashboard: { invalidate: vi.fn() } } }),
      evaluation: {
        updateAwardSample: { useMutation: mutation },
        deleteAwardSample: { useMutation: mutation },
        generateAwardSampleDescription: { useMutation: mutation },
      },
    },
  };
});

vi.mock("@/components/DashboardLayout", () => ({
  useLang: () => ({
    lang: "en",
    t: {
      sampleLibrary: "Illustrative Sample Library",
      sampleLibraryDesc: "Educational examples for exploring judging types and reading decisions visually.",
      illustrativeData: "Illustrative data · not real nominations",
      bestAwarded: "Best-Scoring Awarded Samples",
      bestAwardedDesc: "Curated demonstrations showing what a strong result can look like.",
      awardSelection: "Award Selection Section",
      awardSelectionDesc: "Demonstration decisions with a recorded score and selection rationale.",
      viewSamples: "View samples",
      allPrograms: "All programs",
      searchSamples: "Search samples...",
      filterCategory: "Program category",
      allTiers: "All tiers",
      goldTier: "Gold",
      silverTier: "Silver",
      bronzeTier: "Bronze",
      sortBy: "Sort by",
      highestScore: "Highest score",
      lowestScore: "Lowest score",
      resultCount: "results",
      noActivity: "No activity recorded yet",
    },
  }),
}));

import { SampleLibrary } from "./SampleLibrary";
import { ILLUSTRATIVE_SAMPLES } from "@shared/sampleData";

describe("SampleLibrary", () => {
  it("renders the labeled sample gallery and award-selection sections", () => {
    const html = renderToStaticMarkup(<SampleLibrary samples={ILLUSTRATIVE_SAMPLES} />);
    expect(html).toContain("Illustrative Sample Library");
    expect(html).toContain("Illustrative data · not real nominations");
    expect(html).toContain("Best-Scoring Awarded Samples");
    expect(html).toContain("Award Selection Section");
    expect(html).toContain("View samples · 12 results");
    expect(html).toContain("Search samples...");
    expect(html).toContain("Program category");
    expect(html).toContain("All tiers");
    expect(html).toContain("Highest score");
    expect(html).toContain("Green Path Platform");
    expect(html).toContain("Operations Excellence Cycle");
  });
});
