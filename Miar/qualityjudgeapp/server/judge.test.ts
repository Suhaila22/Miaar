import { describe, expect, it } from "vitest";
import { classify, computeOverall, EVIDENCE_TYPES, guessEvidenceType, RUBRIC } from "../shared/judge";

describe("nomination judging constants", () => {
  it("keeps the required eight rubric weights at exactly 100%", () => {
    expect(RUBRIC).toHaveLength(8);
    expect(RUBRIC.reduce((sum, item) => sum + item.weight, 0)).toBe(100);
    expect(RUBRIC.map((item) => item.weight)).toEqual([10, 20, 10, 15, 10, 20, 10, 5]);
  });

  it("computes the weighted overall score from 0 to 100", () => {
    const perfect = Object.fromEntries(RUBRIC.map((item) => [item.key, { score: 10, note: "" }]));
    expect(computeOverall(perfect)).toBe(100);

    const zero = Object.fromEntries(RUBRIC.map((item) => [item.key, { score: 0, note: "" }]));
    expect(computeOverall(zero)).toBe(0);

    const impactOnly = Object.fromEntries(RUBRIC.map((item) => [item.key, { score: item.key === "impact" ? 10 : 0, note: "" }]));
    expect(computeOverall(impactOnly)).toBe(20);
  });

  it("classifies all required leaderboard tiers", () => {
    expect(classify(95).key).toBe("gold");
    expect(classify(85).key).toBe("silver");
    expect(classify(75).key).toBe("bronze");
    expect(classify(65).key).toBe("mention");
    expect(classify(55).key).toBe("none");
  });

  it("auto-detects evidence types from file extensions", () => {
    expect(guessEvidenceType("agenda.png")).toBe("photos");
    expect(guessEvidenceType("deck.pptx")).toBe("presentations");
    expect(guessEvidenceType("attendance.xlsx")).toBe("attendance");
    expect(guessEvidenceType("report.pdf")).toBe("annual_report");
    expect(guessEvidenceType("raw.bin")).toBe("other");
    expect(EVIDENCE_TYPES).toHaveLength(10);
  });
});

import { filterLeaderboard } from "../shared/leaderboard";

describe("leaderboard filters and perfect score filtering", () => {
  const rows = [
    { name: "مبادرة النور", tier: "gold", overall: 94 },
    { name: "مبادرة الأثر", tier: "silver", overall: 84 },
    { name: "مبادرة المعرفة", tier: "gold", overall: 91 },
  ];

  it("filters by Arabic search text and tier together", () => {
    expect(filterLeaderboard(rows, "المعرفة", "all").map((row) => row.name)).toEqual(["مبادرة المعرفة"]);
    expect(filterLeaderboard(rows, "مبادرة", "gold").map((row) => row.overall)).toEqual([94, 91]);
    expect(filterLeaderboard(rows, "", "silver").map((row) => row.name)).toEqual(["مبادرة الأثر"]);
  });

  it("filters candidates with perfect criteria scores correctly", () => {
    const list = [
      { id: "1", name: "A", overall: 95, tier: "gold", criteria: { alignment: { score: 10, note: "" } } },
      { id: "2", name: "B", overall: 80, tier: "silver", criteria: { alignment: { score: 8, note: "" } } },
    ];
    const perfectOnlyFiltered = list.filter((s) => Object.values(s.criteria || {}).some((c: any) => c?.score === 10));
    expect(perfectOnlyFiltered).toHaveLength(1);
    expect(perfectOnlyFiltered[0]?.name).toBe("A");
  });
});
