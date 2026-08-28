import { beforeEach, describe, expect, it, vi } from "vitest";

const { invokeLLMMock, getNominationByIdMock, getAssignmentForJudgeMock } = vi.hoisted(() => ({
  invokeLLMMock: vi.fn(),
  getNominationByIdMock: vi.fn(),
  getAssignmentForJudgeMock: vi.fn(),
}));

vi.mock("./_core/llm", () => ({ invokeLLM: invokeLLMMock }));
vi.mock("./dbNomination", () => ({
  getNominationById: getNominationByIdMock,
  createNominationRecord: vi.fn(),
  getNominationsByUserId: vi.fn(),
  updateNominationScores: vi.fn(),
  deleteNominationRecord: vi.fn(),
  deleteAllNominationsByUserId: vi.fn(),
  replaceEvaluationDecision: vi.fn(),
}));
vi.mock("./dbGovernance", () => ({
  getAssignmentForJudge: getAssignmentForJudgeMock,
  getAssignmentsForJudge: vi.fn(),
  getAuditEventsForNomination: vi.fn(),
  addAuditEvent: vi.fn(),
  createJudgeAssignment: vi.fn(),
  markAssignmentComplete: vi.fn(),
  deleteAuditEventsForNomination: vi.fn(),
}));
vi.mock("./db", () => ({
  getTrialStatus: vi.fn(),
  consumeTrialAttempt: vi.fn(),
  releaseTrialAttempt: vi.fn(),
  getAdminDashboardData: vi.fn(),
  resetTrialAttempts: vi.fn(),
}));
vi.mock("./storage", () => ({ storagePut: vi.fn() }));
vi.mock("./extraction", () => ({ extractEvidenceText: vi.fn() }));

import { evaluationRouter } from "./routers/evaluation";

const nomination = {
  id: "nom-1",
  userId: 7,
  name: "Community Knowledge Initiative",
  awardTitle: "Mi'yar Excellence",
  programType: "excellence",
  context: "A knowledge-sharing initiative.",
  overallScore: 86,
  tier: "gold",
  criteriaJson: JSON.stringify({ impact: { score: 9, note: "Documented reach" } }),
  kpiFindings: "400 participants and 10 sessions recorded.",
  strengthsJson: JSON.stringify(["Strong reach"]),
  weaknessesJson: JSON.stringify(["More long-term tracking needed"]),
  recommendationsJson: JSON.stringify(["Maintain annual measurement"]),
  coverageJson: JSON.stringify([{ key: "report", covered: true }]),
  fileCount: 3,
  judgeCount: 1,
  judgesJson: JSON.stringify([]),
  weightsJson: JSON.stringify([{ key: "impact", name: "Impact", weight: 20 }]),
  signatureData: "signed",
};

describe("Copilot evaluation summaries", () => {
  beforeEach(() => {
    invokeLLMMock.mockReset();
    getNominationByIdMock.mockReset();
    getAssignmentForJudgeMock.mockReset();
    getNominationByIdMock.mockResolvedValue(nomination);
    getAssignmentForJudgeMock.mockResolvedValue(null);
  });

  it("returns bilingual nomination and award summaries from the structured response", async () => {
    invokeLLMMock.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({
        headlineAr: "مبادرة معرفة مجتمعية موثقة",
        headlineEn: "Documented Community Knowledge Initiative",
        nominationSummaryAr: "ملخص الترشيح العربي.",
        nominationSummaryEn: "English nomination profile summary.",
        awardSummaryAr: "ملخص قرار الجائزة العربي.",
        awardSummaryEn: "English award decision summary.",
      }) } }],
    });

    const caller = evaluationRouter.createCaller({ req: {} as any, res: {} as any, user: { id: 7, role: "user" } as any });
    const result = await caller.generateSummary({ id: "nom-1" });

    expect(result).toMatchObject({ id: "nom-1", programType: "excellence", headlineEn: "Documented Community Knowledge Initiative" });
    expect(invokeLLMMock).toHaveBeenCalledOnce();
    const request = invokeLLMMock.mock.calls[0][0];
    expect(request.messages[0].content).toContain("Mi'yar Copilot");
    expect(request.messages[1].content).toContain("Community Knowledge Initiative");
    expect(request.response_format.json_schema.strict).toBe(true);
  });

  it("rejects malformed AI output instead of returning an incomplete report", async () => {
    invokeLLMMock.mockResolvedValue({ choices: [{ message: { content: "not-json" } }] });
    const caller = evaluationRouter.createCaller({ req: {} as any, res: {} as any, user: { id: 7, role: "user" } as any });
    await expect(caller.generateSummary({ id: "nom-1" })).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
  });

  it("reconstructs saved detail from normalized decisions, criterion scores, evidence, and signature", async () => {
    getNominationByIdMock.mockResolvedValue({
      ...nomination,
      createdAt: new Date("2026-08-23T00:00:00.000Z"),
      evidenceItems: [{ fileName: "impact.pdf", storageUrl: "/uploads/impact.pdf", storageKey: "impact.pdf", criterionKey: "impact", judgeKey: null }],
      decisionRecords: [{
        id: "dec-1",
        nominationId: "nom-1",
        judgeUserId: 7,
        judgeKey: "judge_1",
        decisionType: "judge",
        overallScore: 84,
        tier: "gold",
        metadataJson: JSON.stringify({ judgeName: "Judge 1" }),
        criteria: [{ criterionKey: "impact", scoreTenths: 84, note: "Saved note" }],
        signature: null,
      }, {
        id: "dec-aggregate",
        nominationId: "nom-1",
        judgeUserId: null,
        judgeKey: "aggregate",
        decisionType: "aggregate",
        overallScore: 84,
        tier: "gold",
        decisionText: "Saved KPI summary",
        metadataJson: null,
        criteria: [{ criterionKey: "impact", scoreTenths: 84, note: "Saved note" }],
        signature: { signatureData: "saved-signature" },
      }],
    });

    const caller = evaluationRouter.createCaller({ req: {} as any, res: {} as any, user: { id: 7, role: "user" } as any });
    const result = await caller.getDetail({ id: "nom-1" });

    expect(result).toMatchObject({
      overall: 84,
      tier: "gold",
      kpi_findings: "Saved KPI summary",
      signatureData: "saved-signature",
      criteria: { impact: { score: 8.4, note: "Saved note", evidence: [{ name: "impact.pdf", url: "/uploads/impact.pdf", storageKey: "impact.pdf" }] } },
      judges: [{ name: "Judge 1", overall: 84, criteria: { impact: { score: 8.4, note: "Saved note" } } }],
    });
  });
});
