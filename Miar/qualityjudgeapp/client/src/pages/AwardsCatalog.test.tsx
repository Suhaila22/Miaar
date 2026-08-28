// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { languageState, catalogState, mutationMocks, translations } = vi.hoisted(() => {
  const languageState = { current: "en" as "ar" | "en" };
  const catalogState = { current: [] as any[], error: undefined as unknown };
  const mutationMocks = [vi.fn(), vi.fn(), vi.fn()];
  const en = { institutionalTitle: "Institutional Awards Catalog" };
  const ar = { institutionalTitle: "سجل الجوائز المؤسسية" };
  return { languageState, catalogState, mutationMocks, translations: { en, ar } };
});

vi.mock("@/components/DashboardLayout", () => ({ useLang: () => ({ lang: languageState.current, t: translations[languageState.current] }) }));
vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: 1, role: "admin" }, loading: false }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ evaluation: { awardCatalog: { invalidate: vi.fn() } } }),
    evaluation: {
      awardCatalog: { useQuery: () => ({ data: catalogState.current, isLoading: false, error: catalogState.error }) },
      createAward: { useMutation: () => ({ mutate: mutationMocks[0], isPending: false }) },
      updateAward: { useMutation: () => ({ mutate: mutationMocks[1], isPending: false }) },
      deleteAward: { useMutation: () => ({ mutate: mutationMocks[2], isPending: false }) },
    },
  },
}));

import AwardsCatalog from "./AwardsCatalog";

afterEach(() => cleanup());
beforeEach(() => {
  languageState.current = "en";
  catalogState.error = undefined;
  catalogState.current = [
    { id: "award-1", title: { ar: "جائزة التميز", en: "Excellence Award" }, organizer: { ar: "جهة حكومية", en: "Government Entity" }, country: { ar: "الإمارات", en: "UAE" }, sector: "government", level: "national", category: "institutional", eligibility: { ar: "جهات حكومية مستوفية للشروط.", en: "Eligible government entities meeting requirements." }, deadline: "2027-12-31T00:00:00.000Z", status: "active", criteria: [{ id: "criterion-1", key: "impact", name: { ar: "الأثر", en: "Impact" }, description: { ar: "", en: "" }, weight: 100, evidenceRequired: true }], eligibilityRules: [{ id: "rule-1", key: "government_entity", name: { ar: "جهة حكومية", en: "Government entity" }, description: { ar: "جهة مستوفية للشروط.", en: "Eligible government entity." }, required: true }] },
    { id: "award-2", title: { ar: "جائزة التحول", en: "Transformation Award" }, organizer: { ar: "مؤسسة حكومية", en: "Public Institution" }, country: { ar: "الإمارات", en: "UAE" }, sector: "digital", level: "regional", category: "innovation", eligibility: { ar: "مؤسسات مستوفية للشروط.", en: "Institutions meeting requirements." }, deadline: null, status: "draft", criteria: [{ id: "criterion-2", key: "innovation", name: { ar: "الابتكار", en: "Innovation" }, description: { ar: "", en: "" }, weight: 100, evidenceRequired: false }], eligibilityRules: [{ id: "rule-2", key: "registered", name: { ar: "تسجيل ساري", en: "Valid registration" }, description: { ar: "تسجيل ساري مطلوب.", en: "A valid registration is required." }, required: true }] },
  ];
  mutationMocks.forEach((mock) => mock.mockReset());
});

describe("AwardsCatalog", () => {
  it("renders institutional awards and filters by title or organizer", () => {
    render(<AwardsCatalog />);
    expect(screen.getByRole("heading", { name: "Institutional Awards Catalog" })).toBeDefined();
    expect(screen.getByText("Excellence Award")).toBeDefined();
    expect(screen.getByText("Government entity")).toBeDefined();
    fireEvent.change(screen.getByPlaceholderText("Search by title, organizer, or sector..."), { target: { value: "Transformation" } });
    expect(screen.getByText("Transformation Award")).toBeDefined();
    expect(screen.queryByText("Excellence Award")).toBeNull();
  });

  it("filters by status and renders the empty state", () => {
    render(<AwardsCatalog />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "active" } });
    expect(screen.getAllByRole("article")).toHaveLength(1);
    fireEvent.change(screen.getByPlaceholderText("Search by title, organizer, or sector..."), { target: { value: "does-not-exist" } });
    expect(screen.getByText("No awards match the current search.")).toBeDefined();
  });

  it("switches to Arabic and exposes criteria and eligibility", () => {
    languageState.current = "ar";
    render(<AwardsCatalog />);
    expect(screen.getByRole("heading", { name: "سجل الجوائز المؤسسية" })).toBeDefined();
    expect(screen.getByText("جائزة التميز")).toBeDefined();
    expect(screen.getAllByText("الأهلية").length).toBeGreaterThan(0);
    expect(screen.getAllByText("عرض المعايير والأوزان").length).toBeGreaterThan(0);
  });

  it("renders the localized error state", () => {
    catalogState.current = [];
    catalogState.error = { message: "catalog failed" };
    render(<AwardsCatalog />);
    expect(screen.getByText("Unable to load the awards catalog")).toBeDefined();
    expect(screen.getByText("catalog failed")).toBeDefined();
  });

  it("submits create and edit payloads and calls delete", () => {
    render(<AwardsCatalog />);
    fireEvent.click(screen.getByRole("button", { name: "Add award" }));
    fireEvent.change(screen.getByLabelText("Arabic title"), { target: { value: "جائزة جديدة" } });
    fireEvent.change(screen.getByLabelText("English title"), { target: { value: "New Award" } });
    fireEvent.change(screen.getByLabelText("Arabic organizer"), { target: { value: "جهة منظمة" } });
    fireEvent.change(screen.getByLabelText("English organizer"), { target: { value: "Organizing Body" } });
    fireEvent.change(screen.getByLabelText("Sector"), { target: { value: "health" } });
    fireEvent.change(screen.getByLabelText("Level"), { target: { value: "national" } });
    fireEvent.change(screen.getByLabelText("Category"), { target: { value: "service" } });
    fireEvent.change(screen.getByLabelText("Arabic eligibility"), { target: { value: "جهات مستوفية للشروط المعتمدة." } });
    fireEvent.change(screen.getByLabelText("English eligibility"), { target: { value: "Entities meeting approved requirements." } });
    fireEvent.change(screen.getByLabelText("Arabic rule name"), { target: { value: "جهة حكومية" } });
    fireEvent.change(screen.getByLabelText("English rule name"), { target: { value: "Government entity" } });
    fireEvent.change(screen.getByLabelText("Arabic rule description"), { target: { value: "جهة مستوفية للشروط." } });
    fireEvent.change(screen.getByLabelText("English rule description"), { target: { value: "Eligible government entity." } });
    fireEvent.change(screen.getByLabelText("Arabic criterion"), { target: { value: "الأثر" } });
    fireEvent.change(screen.getByLabelText("English criterion"), { target: { value: "Impact" } });
    fireEvent.change(screen.getByLabelText("Weight %"), { target: { value: "100" } });
    fireEvent.click(screen.getByRole("button", { name: "Save award" }));
    expect(mutationMocks[0]).toHaveBeenCalledWith(expect.objectContaining({ titleAr: "جائزة جديدة", titleEn: "New Award", organizerEn: "Organizing Body", deadline: null, criteria: [expect.objectContaining({ nameEn: "Impact", weight: 100 })], eligibilityRules: [expect.objectContaining({ nameEn: "Government entity", required: true })] }));

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    const card = screen.getAllByRole("article")[0];
    fireEvent.click(within(card).getByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByLabelText("English title"), { target: { value: "Updated Award" } });
    fireEvent.click(screen.getByRole("button", { name: "Save award" }));
    expect(mutationMocks[1]).toHaveBeenCalledWith(expect.objectContaining({ id: "award-1", titleEn: "Updated Award", criteria: [expect.objectContaining({ weight: 100 })] }));
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    vi.stubGlobal("confirm", () => true);
    fireEvent.click(within(card).getByRole("button", { name: "Delete" }));
    expect(mutationMocks[2]).toHaveBeenCalledWith({ id: "award-1" });
    vi.unstubAllGlobals();
  });
});
