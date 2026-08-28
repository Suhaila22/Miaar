// @vitest-environment jsdom
import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/trpc", () => ({ trpc: {} }));
vi.mock("@/components/TrialGate", () => ({ TrialGate: ({ children }: { children: React.ReactNode }) => <>{children}</> }));

import { NominationDetail } from "./Home";

const detail = {
  id: "nom-report-test",
  name: "Saved initiative",
  awardTitle: "Mi'yar Award",
  programType: "excellence" as const,
  date: "2026-08-23T00:00:00.000Z",
  overall: 84,
  tier: "gold",
  criteria: { leadership: { score: 8.4, note: "Saved criterion note" } },
  kpi_findings: "Saved KPI findings",
  strengths: ["Saved strength"],
  weaknesses: ["Saved improvement"],
  recommendations: ["Saved recommendation"],
  coverage: [],
  fileCount: 1,
  signatureData: "saved-signature",
  judgeCount: 1,
  judges: [{ name: "Judge 1", overall: 84, criteria: { leadership: { score: 8.4, note: "Judge note" } } }],
  weights: [{ key: "leadership", name: "Leadership", weight: 100 }],
  evidenceItems: [{
    id: "ev-report-test",
    fileName: "leadership-evidence.pdf",
    fileType: "criterion:leadership",
    criterionKey: "leadership",
    judgeKey: "judge_1",
    mimeType: "application/pdf",
    storageKey: "evidence/leadership-evidence.pdf",
    storageUrl: "/uploads/evidence/leadership-evidence.pdf",
    fileSize: 1024,
  }],
};

describe("NominationDetail saved evidence", () => {
  it("renders stored evidence with its criterion and judge scope", () => {
    render(
      <NominationDetail
        detail={detail}
        loading={false}
        auditEvents={[]}
        auditLoading={false}
        auditOpen={false}
        onAuditToggle={vi.fn()}
        onClose={vi.fn()}
        onDelete={vi.fn()}
        deleting={false}
        summary={null}
        onGenerateSummary={vi.fn()}
        generatingSummary={false}
      />
    );

    expect(screen.getByText("الأدلة المحفوظة")).toBeTruthy();
    expect(screen.getByText("leadership-evidence.pdf")).toBeTruthy();
    expect(screen.getByText(/المحكم · judge_1/)).toBeTruthy();
    expect(screen.getByText(/تم حفظ الملفات/)).toBeTruthy();
  });
});
