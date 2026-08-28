import { beforeEach, describe, expect, it, vi } from "vitest";

const { getAwardSamplesMock, getAwardSampleByIdMock, updateAwardSampleRecordMock, deleteAwardSampleRecordMock, toAwardSampleViewMock, invokeLLMMock } = vi.hoisted(() => ({
  getAwardSamplesMock: vi.fn(),
  getAwardSampleByIdMock: vi.fn(),
  updateAwardSampleRecordMock: vi.fn(),
  deleteAwardSampleRecordMock: vi.fn(),
  toAwardSampleViewMock: vi.fn(),
  invokeLLMMock: vi.fn(),
}));

vi.mock("./db", () => ({
  getAwardSamples: getAwardSamplesMock,
  getAwardSampleById: getAwardSampleByIdMock,
  updateAwardSampleRecord: updateAwardSampleRecordMock,
  deleteAwardSampleRecord: deleteAwardSampleRecordMock,
  toAwardSampleView: toAwardSampleViewMock,
  getTrialStatus: vi.fn(),
  consumeTrialAttempt: vi.fn(),
  releaseTrialAttempt: vi.fn(),
  getAdminDashboardData: vi.fn(),
  resetTrialAttempts: vi.fn(),
}));
vi.mock("../server/_core/llm", () => ({ invokeLLM: invokeLLMMock }));

import { evaluationRouter } from "./routers/evaluation";

const adminCaller = () => evaluationRouter.createCaller({ req: {} as any, res: {} as any, user: { id: 1, role: "admin" } as any });
const userCaller = () => evaluationRouter.createCaller({ req: {} as any, res: {} as any, user: { id: 2, role: "user" } as any });

const rawSample = {
  id: "sample-1",
  nameAr: "نموذج توضيحي",
  nameEn: "Illustrative Sample",
  organizationAr: "نموذج توضيحي · التميز المؤسسي",
  organizationEn: "Illustrative · Institutional Excellence",
  programType: "excellence",
  score: 91,
  tier: "gold",
  awardAr: "جائزة توضيحية",
  awardEn: "Illustrative Award",
  summaryAr: "وصف عربي سابق",
  summaryEn: "Previous English description",
  rationaleAr: "سبب عربي",
  rationaleEn: "English rationale",
  metricsJson: JSON.stringify([{ ar: "مؤشر", en: "Indicator" }]),
  isIllustrative: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("award sample management", () => {
  beforeEach(() => {
    getAwardSamplesMock.mockReset();
    getAwardSampleByIdMock.mockReset();
    updateAwardSampleRecordMock.mockReset();
    deleteAwardSampleRecordMock.mockReset();
    toAwardSampleViewMock.mockReset();
    invokeLLMMock.mockReset();
  });

  it("allows authenticated users to read the awards library while restricting management", async () => {
    const view = [{ id: "sample-1", name: { ar: "نموذج", en: "Sample" } }];
    getAwardSamplesMock.mockResolvedValue(view);
    await expect(userCaller().awardLibrary()).resolves.toEqual(view);
    await expect(userCaller().awardSamples()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows an administrator to update and delete a sample", async () => {
    const view = { id: "sample-1", name: { ar: "محدث", en: "Updated" } };
    updateAwardSampleRecordMock.mockResolvedValue(true);
    getAwardSampleByIdMock.mockResolvedValue(rawSample);
    toAwardSampleViewMock.mockReturnValue(view);
    await expect(adminCaller().updateAwardSample({ id: "sample-1", nameAr: "محدث", nameEn: "Updated", organizationAr: "مؤسسة", organizationEn: "Organization", programType: "excellence", score: 94, tier: "gold", awardAr: "جائزة", awardEn: "Award", summaryAr: "وصف", summaryEn: "Description", rationaleAr: "سبب", rationaleEn: "Rationale" })).resolves.toEqual(view);
    expect(updateAwardSampleRecordMock).toHaveBeenCalledWith("sample-1", expect.objectContaining({ score: 94, summaryEn: "Description" }));
    deleteAwardSampleRecordMock.mockResolvedValue(true);
    await expect(adminCaller().deleteAwardSample({ id: "sample-1" })).resolves.toEqual({ success: true, id: "sample-1" });
  });

  it("generates and persists bilingual Copilot descriptions", async () => {
    getAwardSampleByIdMock.mockResolvedValue(rawSample);
    invokeLLMMock.mockResolvedValue({ choices: [{ message: { content: JSON.stringify({ summaryAr: "وصف عربي مولد", summaryEn: "Generated English description" }) } }] });
    updateAwardSampleRecordMock.mockResolvedValue(true);
    toAwardSampleViewMock.mockReturnValue({ id: "sample-1", summary: { ar: "وصف عربي مولد", en: "Generated English description" } });
    await expect(adminCaller().generateAwardSampleDescription({ id: "sample-1" })).resolves.toMatchObject({ sample: { id: "sample-1" } });
    expect(updateAwardSampleRecordMock).toHaveBeenCalledWith("sample-1", { summaryAr: "وصف عربي مولد", summaryEn: "Generated English description" });
  });
});
