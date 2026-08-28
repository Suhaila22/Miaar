import { beforeEach, describe, expect, it, vi } from "vitest";

const { getDbMock } = vi.hoisted(() => ({ getDbMock: vi.fn() }));
vi.mock("./db", () => ({ getDb: getDbMock }));

import { createNominationRecord } from "./dbNomination";

const record = {
  id: "nom-persistence-test",
  userId: 7,
  name: "Persisted nomination",
  awardTitle: "Mi'yar Award",
  programType: "excellence",
  context: "Test context",
  overallScore: 84,
  tier: "gold",
  criteriaJson: JSON.stringify({ impact: { score: 8.4, note: "Saved note" } }),
  kpiFindings: "Saved KPI",
  strengthsJson: "[]",
  weaknessesJson: "[]",
  recommendationsJson: "[]",
  coverageJson: "[]",
  fileCount: 2,
  judgeCount: 1,
  judgesJson: "[]",
  weightsJson: "[]",
  signatureData: "data:image/png;base64,signature",
};

describe("normalized nomination persistence", () => {
  beforeEach(() => {
    getDbMock.mockReset();
  });

  it("inserts evidence, judge decisions, criterion scores, and signatures in one transaction", async () => {
    const inserted: Array<{ table: unknown; values: unknown }> = [];
    const tx = {
      insert: vi.fn((table: unknown) => ({
        values: vi.fn(async (values: unknown) => {
          inserted.push({ table, values });
        }),
      })),
    };
    const db = { transaction: vi.fn(async (callback: (transaction: typeof tx) => Promise<void>) => callback(tx)) };
    getDbMock.mockResolvedValue(db);

    await createNominationRecord(
      record,
      [{
        id: "ev-persistence-test",
        nominationId: record.id,
        fileName: "evidence.pdf",
        fileType: "report",
        criterionKey: "impact",
        judgeKey: null,
        uploadedByUserId: record.userId,
        mimeType: "application/pdf",
        extractedText: "Extracted evidence",
        storageKey: "evidence/key",
        storageUrl: "/uploads/evidence/key",
        fileSize: 123,
      }],
      [{
        decision: {
          id: "dec-persistence-test",
          nominationId: record.id,
          judgeUserId: record.userId,
          judgeKey: "judge_1",
          decisionType: "judge",
          status: "submitted",
          overallScore: 84,
          tier: "gold",
          decisionText: null,
          metadataJson: JSON.stringify({ source: "test" }),
        },
        criteria: [{
          id: "score-persistence-test",
          nominationId: record.id,
          decisionId: "dec-persistence-test",
          criterionKey: "impact",
          scoreTenths: 84,
          note: "Saved note",
        }],
        signature: {
          id: "sig-persistence-test",
          nominationId: record.id,
          decisionId: "dec-persistence-test",
          signerUserId: record.userId,
          signatureData: record.signatureData,
        },
      }]
    );

    expect(db.transaction).toHaveBeenCalledOnce();
    expect(inserted).toHaveLength(5);
    expect(inserted.map((entry) => entry.values)).toEqual([
      record,
      expect.arrayContaining([expect.objectContaining({ fileName: "evidence.pdf", extractedText: "Extracted evidence" })]),
      expect.objectContaining({ id: "dec-persistence-test", decisionType: "judge" }),
      expect.arrayContaining([expect.objectContaining({ criterionKey: "impact", scoreTenths: 84 })]),
      expect.objectContaining({ id: "sig-persistence-test", signerUserId: record.userId }),
    ]);
  });
});
