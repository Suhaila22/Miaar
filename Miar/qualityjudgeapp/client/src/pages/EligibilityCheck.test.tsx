// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { languageState, catalogState } = vi.hoisted(() => ({ languageState: { current: "en" as "ar" | "en" }, catalogState: { current: [] as any[], error: undefined as any } }));
vi.mock("@/components/DashboardLayout", () => ({ useLang: () => ({ lang: languageState.current, t: {} }) }));
vi.mock("@/lib/trpc", () => ({ trpc: { evaluation: { awardCatalog: { useQuery: () => ({ data: catalogState.current, isLoading: false, error: catalogState.error }) } }, institutional: { eligibility: { submit: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) } } } } }));

import EligibilityCheck from "./EligibilityCheck";

afterEach(() => cleanup());
beforeEach(() => {
  languageState.current = "en";
  catalogState.error = undefined;
  catalogState.current = [{ id: "award-1", title: { ar: "جائزة التميز", en: "Excellence Award" }, organizer: { ar: "جهة حكومية", en: "Government Entity" }, country: { ar: "الإمارات", en: "UAE" }, sector: "government", level: "national", category: "institutional", eligibility: { ar: "جهات مستوفية للشروط.", en: "Eligible entities." }, deadline: null, status: "active", criteria: [], eligibilityRules: [{ id: "rule-1", key: "government_entity", name: { ar: "جهة حكومية", en: "Government entity" }, description: { ar: "أن تكون الجهة مؤهلة.", en: "The applicant must be eligible." }, required: true }, { id: "rule-2", key: "optional", name: { ar: "خطة تطوير", en: "Development plan" }, description: { ar: "خطة اختيارية.", en: "An optional plan." }, required: false }] }];
});

describe("EligibilityCheck", () => {
  it("blocks verification until required rules are confirmed, then passes", () => {
    render(<EligibilityCheck />);
    fireEvent.click(screen.getByRole("button", { name: "Verify eligibility" }));
    expect(screen.getByText("Eligibility not complete")).toBeDefined();
    fireEvent.click(screen.getAllByRole("checkbox")[0]);
    fireEvent.click(screen.getByRole("button", { name: "Verify eligibility" }));
    expect(screen.getByText("Preliminarily eligible")).toBeDefined();
    expect(screen.getByText("Optional")).toBeDefined();
  });

  it("renders Arabic labels and the localized error state", () => {
    languageState.current = "ar";
    render(<EligibilityCheck />);
    expect(screen.getByRole("heading", { name: "فحص أهلية المشاركة" })).toBeDefined();
    expect(screen.getByText("جهة حكومية")).toBeDefined();
    cleanup();
    catalogState.error = { message: "failed" };
    render(<EligibilityCheck />);
    expect(screen.getByText("تعذر تحميل شروط الأهلية")).toBeDefined();
    expect(screen.getByText("failed")).toBeDefined();
  });
});
