import React from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { languageState, libraryState, translations } = vi.hoisted(() => {
  const languageState = { current: "en" as "ar" | "en" };
  const english = {
    awardsLibrary: "Awards Library",
    awardsLibraryDesc: "Explore illustrative award decisions organized by program, tier, and score.",
    awardsLibraryNav: "Awards Library",
    awardsLibraryIntro: "A visual reference for comparable award decisions and evaluation signals.",
    awardsLibraryNotice: "Every item here is illustrative and is not a real customer award or result.",
    awardDetails: "Award details",
    awardProgram: "Judging program",
    awardRecipient: "Organization / initiative",
    awardMetrics: "Evaluation signals",
    awardRationale: "Decision rationale",
    awardCollection: "Award collection",
    noAwardResults: "No awards match the current search",
    clearAwardFilters: "Clear award filters",
    allAwardTypes: "All award types",
    searchAwards: "Search by award or initiative name...",
    awardType: "Award type",
    highestAwardScore: "Highest score",
    lowestAwardScore: "Lowest score",
    closeAwardDetails: "Close award details",
    viewAwardDetails: "View details",
    illustrativeAward: "Illustrative award",
    awardCount: "awards",
    allPrograms: "All programs",
    allTiers: "All tiers",
    score: "Score",
    cancel: "Cancel",
    exportSamplePdf: "Export PDF",
    specializedTags: "Specialized criteria",
    specializedTagsHint: "Select multiple tags to find awards that share every criterion",
    allTags: "All tags",
    activeTags: "Active tags",
    tagCount: "tags",
    clearTagFilters: "Clear tags",
    tagMatchMode: "All selected tags must match",
    programTypeLabel: "Judging program",
    controlCenter: "Control center",
  } as const;
  const arabic = {
    ...english,
    awardsLibrary: "مكتبة الجوائز",
    awardsLibraryDesc: "استكشف قرارات تكريم توضيحية مصنفة حسب البرنامج والفئة والنتيجة.",
    awardsLibraryNav: "مكتبة الجوائز",
    awardsLibraryIntro: "مرجع بصري لقرارات الجوائز ومؤشرات التقييم القابلة للمقارنة.",
    awardsLibraryNotice: "جميع العناصر هنا توضيحية وليست جوائز أو نتائج حقيقية للعملاء.",
    awardDetails: "تفاصيل الجائزة",
    awardProgram: "برنامج التحكيم",
    awardRecipient: "الجهة / المبادرة",
    awardMetrics: "مؤشرات التقييم",
    awardRationale: "حيثيات القرار",
    awardCollection: "مجموعة الجوائز",
    noAwardResults: "لا توجد جوائز مطابقة للبحث الحالي",
    clearAwardFilters: "مسح فلاتر الجوائز",
    allAwardTypes: "كل أنواع الجوائز",
    searchAwards: "ابحث باسم الجائزة أو المبادرة...",
    awardType: "نوع الجائزة",
    highestAwardScore: "الأعلى تقييماً",
    lowestAwardScore: "الأقل تقييماً",
    closeAwardDetails: "إغلاق تفاصيل الجائزة",
    viewAwardDetails: "عرض التفاصيل",
    awardCount: "جائزة",
    allPrograms: "كل البرامج",
    allTiers: "كل الفئات",
    score: "الدرجة",
    cancel: "إلغاء",
    exportSamplePdf: "تصدير PDF",
    specializedTags: "المعايير المتخصصة",
    specializedTagsHint: "اختر أكثر من وسم لعرض الجوائز التي تجمع هذه المعايير",
    allTags: "كل الوسوم",
    activeTags: "الوسوم النشطة",
    tagCount: "أوسمة",
    clearTagFilters: "مسح الوسوم",
    tagMatchMode: "تتم مطابقة جميع الوسوم المختارة",
    programTypeLabel: "نوع برنامج التحكيم",
    controlCenter: "لوحة التحكم",
  } as const;
  const samples = [
    {
      id: "sample-green-path",
      name: { ar: "منصة المسار الأخضر", en: "Green Path Platform" },
      organization: { ar: "نموذج توضيحي · التميز المؤسسي", en: "Illustrative · Institutional Excellence" },
      programType: "excellence" as const,
      score: 96,
      tier: "gold" as const,
      award: { ar: "جائزة التميز المؤسسي", en: "Institutional Excellence Award" },
      summary: { ar: "منصة توضيحية للاستدامة.", en: "A demonstration sustainability platform." },
      rationale: { ar: "مؤشرات واضحة.", en: "Clear indicators." },
      metrics: [{ ar: "كفاءة الموارد", en: "Resource efficiency" }],
      tags: [{ key: "sustainability", ar: "الاستدامة", en: "Sustainability" }, { key: "innovation", ar: "الابتكار", en: "Innovation" }],
    },
    {
      id: "sample-water-ai",
      name: { ar: "مختبر الذكاء المائي", en: "Water Intelligence Lab" },
      organization: { ar: "نموذج توضيحي · مشروع تخرج", en: "Illustrative · Graduation Project" },
      programType: "graduation" as const,
      score: 91,
      tier: "gold" as const,
      award: { ar: "جائزة البحث التطبيقي", en: "Applied Research Award" },
      summary: { ar: "مشروع بحثي توضيحي.", en: "An illustrative research project." },
      rationale: { ar: "منهجية قوية.", en: "Strong method." },
      metrics: [{ ar: "نموذج تنبؤي", en: "Predictive model" }],
      tags: [{ key: "sustainability", ar: "الاستدامة", en: "Sustainability" }, { key: "applied_research", ar: "البحث التطبيقي", en: "Applied research" }],
    },
  ];
  return { languageState, libraryState: { current: samples }, translations: { en: english, ar: arabic } };
});

vi.mock("@/components/DashboardLayout", () => ({ useLang: () => ({ lang: languageState.current, t: translations[languageState.current] }) }));
vi.mock("wouter", () => ({ useLocation: () => ["/awards", vi.fn()] }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/sampleExport", () => ({ exportSamplePdf: vi.fn(() => true) }));
vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: 1, name: "Admin User", role: "admin" }, loading: false }),
}));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({}),
    evaluation: {
      awardLibrary: { useQuery: () => ({ data: libraryState.current, isLoading: false, error: undefined }) },
    },
  },
}));

import AwardsLibrary from "./AwardsLibrary";

afterEach(() => cleanup());
beforeEach(() => { languageState.current = "en"; });

describe("AwardsLibrary", () => {
  it("renders persisted award cards and filters by award or initiative name", () => {
    render(<AwardsLibrary />);
    expect(screen.getByRole("heading", { name: "Awards Library" })).toBeDefined();
    expect(screen.getAllByText("Institutional Excellence Award").length).toBeGreaterThan(0);
    expect(screen.getByText("Water Intelligence Lab")).toBeDefined();
    expect(screen.getByText("Every item here is illustrative and is not a real customer award or result.")).toBeDefined();

    fireEvent.change(screen.getByRole("textbox", { name: "Search by award or initiative name..." }), { target: { value: "Water" } });
    expect(screen.getByText("Water Intelligence Lab")).toBeDefined();
    expect(screen.queryByText("Green Path Platform")).toBeNull();
  });

  it("filters by program, tier, and award type and supports score sorting", () => {
    render(<AwardsLibrary />);
    const selects = screen.getAllByRole("combobox");
    fireEvent.change(selects[0], { target: { value: "graduation" } });
    expect(screen.getByText("Water Intelligence Lab")).toBeDefined();
    expect(screen.queryByText("Green Path Platform")).toBeNull();
    fireEvent.change(selects[1], { target: { value: "gold" } });
    fireEvent.change(selects[2], { target: { value: "Applied Research Award" } });
    expect(screen.getAllByRole("article")).toHaveLength(1);
    fireEvent.change(selects[3], { target: { value: "lowest" } });
    expect(screen.getAllByRole("article")[0].textContent).toContain("Water Intelligence Lab");
  });

  it("renders English specialized tag badges inside award cards", () => {
    render(<AwardsLibrary />);
    const greenCard = screen.getAllByRole("article").find((article) => article.textContent?.includes("Green Path Platform"));
    expect(greenCard).toBeDefined();
    expect(within(greenCard as HTMLElement).getByText("Sustainability")).toBeDefined();
    expect(within(greenCard as HTMLElement).getByText("Innovation")).toBeDefined();
  });

  it("filters by combined specialized tag chips and exposes active state feedback", () => {
    render(<AwardsLibrary />);
    const sustainabilityButton = screen.getByRole("button", { name: "Sustainability" });
    fireEvent.click(sustainabilityButton);
    expect(sustainabilityButton.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "Clear tags" })).toBeDefined();
    expect(screen.getAllByRole("article")).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Innovation" }));
    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(screen.getAllByRole("article")[0].textContent).toContain("Green Path Platform");
  });

  it("renders Arabic specialized tags and localized active controls", () => {
    languageState.current = "ar";
    render(<AwardsLibrary />);
    expect(screen.getByRole("heading", { name: "مكتبة الجوائز" })).toBeDefined();
    const sustainabilityButton = screen.getByRole("button", { name: "الاستدامة" });
    const greenCard = screen.getAllByRole("article").find((article) => article.textContent?.includes("منصة المسار الأخضر"));
    expect(greenCard).toBeDefined();
    expect(within(greenCard as HTMLElement).getByText("الاستدامة")).toBeDefined();
    expect(within(greenCard as HTMLElement).getByText("الابتكار")).toBeDefined();
    fireEvent.click(sustainabilityButton);
    expect(sustainabilityButton.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "مسح الوسوم" })).toBeDefined();
    expect(screen.getByText(/الوسوم النشطة/)).toBeDefined();
  });

  it("opens and closes an award detail dialog", () => {
    render(<AwardsLibrary />);
    fireEvent.click(screen.getAllByRole("button", { name: "View details" })[0]);
    expect(screen.getByRole("dialog")).toBeDefined();
    expect(screen.getByRole("dialog").textContent).toContain("Institutional Excellence Award");
    expect(screen.getByRole("dialog").textContent).toContain("96%");
    fireEvent.click(screen.getByRole("button", { name: "Close award details" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("renders responsive filter and card layouts correctly on mobile viewport size", () => {
    window.innerWidth = 390;
    render(<AwardsLibrary />);
    expect(screen.getByRole("heading", { name: "Awards Library" })).toBeDefined();
    expect(screen.getAllByRole("combobox")).toHaveLength(4);
    expect(screen.getAllByRole("article").length).toBe(2);
  });
});
