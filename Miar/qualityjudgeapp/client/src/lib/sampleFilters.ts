import type { IllustrativeSample } from "@shared/sampleData";

export type SampleSort = "highest" | "lowest";

export type SampleFilterState = {
  search?: string;
  programFilter?: string;
  tierFilter?: string;
  sortBy?: SampleSort;
  tags?: string[];
};

export function filterIllustrativeSamples(samples: IllustrativeSample[], filters: SampleFilterState = {}) {
  const normalized = (filters.search ?? "").trim().toLocaleLowerCase();
  const programFilter = filters.programFilter ?? "all";
  const tierFilter = filters.tierFilter ?? "all";
  const sortBy = filters.sortBy ?? "highest";
  const tagFilters = filters.tags ?? [];

  return [...samples]
    .filter((sample) => {
      const matchesProgram = programFilter === "all" || sample.programType === programFilter;
      const matchesTier = tierFilter === "all" || sample.tier === tierFilter;
      const matchesTags = tagFilters.length === 0 || tagFilters.every((tag) => sample.tags?.some((sampleTag) => sampleTag.key === tag));
      const haystack = `${sample.name.ar} ${sample.name.en} ${sample.organization.ar} ${sample.organization.en} ${sample.award.ar} ${sample.award.en} ${sample.summary.ar} ${sample.summary.en}`.toLocaleLowerCase();
      return matchesProgram && matchesTier && matchesTags && (!normalized || haystack.includes(normalized));
    })
    .sort((a, b) => sortBy === "highest" ? b.score - a.score : a.score - b.score);
}
