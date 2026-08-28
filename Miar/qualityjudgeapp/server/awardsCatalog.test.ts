import { beforeEach, describe, expect, it, vi } from "vitest";

const { getAwardsCatalogMock, createAwardRecordMock, updateAwardRecordMock, deleteAwardRecordMock, getGovernedCriteriaMock, updateGovernedCriterionStatusMock } = vi.hoisted(() => ({
  getAwardsCatalogMock: vi.fn(),
  createAwardRecordMock: vi.fn(),
  updateAwardRecordMock: vi.fn(),
  deleteAwardRecordMock: vi.fn(),
  getGovernedCriteriaMock: vi.fn(),
  updateGovernedCriterionStatusMock: vi.fn(),
}));

vi.mock("./db", () => ({
  getAwardsCatalog: getAwardsCatalogMock,
  createAwardRecord: createAwardRecordMock,
  updateAwardRecord: updateAwardRecordMock,
  deleteAwardRecord: deleteAwardRecordMock,
  getGovernedCriteriaRecords: getGovernedCriteriaMock,
  updateGovernedCriterionStatus: updateGovernedCriterionStatusMock,
  getAwardSamples: vi.fn(),
  getAwardSampleById: vi.fn(),
  updateAwardSampleRecord: vi.fn(),
  deleteAwardSampleRecord: vi.fn(),
  toAwardSampleView: vi.fn(),
  getTrialStatus: vi.fn(),
  consumeTrialAttempt: vi.fn(),
  releaseTrialAttempt: vi.fn(),
  getAdminDashboardData: vi.fn(),
  getAdminUsersData: vi.fn(),
  resetTrialAttempts: vi.fn(),
  updateUserRole: vi.fn(),
  getUserById: vi.fn(),
  createManagedUser: vi.fn(),
  updateManagedUser: vi.fn(),
  deleteUserAccount: vi.fn(),
  ADMIN_PROVISIONED_LOGIN_METHOD: "admin_provisioned",
}));

vi.mock("./_core/llm", () => ({ invokeLLM: vi.fn() }));

import { evaluationRouter } from "./routers/evaluation";

const adminCaller = () => evaluationRouter.createCaller({ req: {} as any, res: {} as any, user: { id: 1, role: "admin" } as any });
const userCaller = () => evaluationRouter.createCaller({ req: {} as any, res: {} as any, user: { id: 2, role: "user" } as any });

const validInput = {
  titleAr: "جائزة التميز الحكومي",
  titleEn: "Government Excellence Award",
  organizerAr: "الجهة الحكومية المنظمة",
  organizerEn: "Government Organizing Body",
  countryAr: "الإمارات",
  countryEn: "UAE",
  sector: "government",
  level: "national",
  category: "institutional",
  eligibilityAr: "الجهات الحكومية المستوفية لشروط المشاركة المعتمدة.",
  eligibilityEn: "Government entities meeting the approved participation requirements.",
  deadline: "2027-12-31T00:00:00.000Z",
  status: "active" as const,
  criteria: [
    { criterionKey: "impact", nameAr: "الأثر", nameEn: "Impact", descriptionAr: "أثر واضح", descriptionEn: "Clear impact", weight: 60, evidenceRequired: true },
    { criterionKey: "innovation", nameAr: "الابتكار", nameEn: "Innovation", descriptionAr: "حل مبتكر", descriptionEn: "Innovative solution", weight: 40, evidenceRequired: false },
  ],
  eligibilityRules: [
    { ruleKey: "government_entity", nameAr: "جهة حكومية", nameEn: "Government entity", descriptionAr: "أن تكون الجهة حكومية ومستوفية للمتطلبات.", descriptionEn: "The applicant must be an eligible government entity.", required: true },
  ],
};

describe("institutional awards catalog", () => {
  beforeEach(() => {
    getAwardsCatalogMock.mockReset();
    createAwardRecordMock.mockReset();
    updateAwardRecordMock.mockReset();
    deleteAwardRecordMock.mockReset();
    getGovernedCriteriaMock.mockReset();
    updateGovernedCriterionStatusMock.mockReset();
  });

  it("allows users to browse active awards and administrators to include drafts", async () => {
    getAwardsCatalogMock.mockResolvedValue([]);
    await userCaller().awardCatalog();
    expect(getAwardsCatalogMock).toHaveBeenCalledWith(false);
    await adminCaller().awardCatalog();
    expect(getAwardsCatalogMock).toHaveBeenCalledWith(true);
  });

  it("restricts catalog mutations to administrators", async () => {
    await expect(userCaller().createAward(validInput)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(userCaller().updateAward({ ...validInput, id: "award-1" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(userCaller().deleteAward({ id: "award-1" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("creates, updates, and deletes a catalog award with normalized criteria", async () => {
    const view = { id: "award-1", title: { ar: validInput.titleAr, en: validInput.titleEn }, criteria: validInput.criteria };
    createAwardRecordMock.mockResolvedValue(view);
    updateAwardRecordMock.mockResolvedValue(view);
    deleteAwardRecordMock.mockResolvedValue(true);
    await expect(adminCaller().createAward(validInput)).resolves.toEqual(view);
    expect(createAwardRecordMock).toHaveBeenCalledWith(expect.objectContaining({ createdByUserId: 1, deadline: new Date(validInput.deadline) }));
    await expect(adminCaller().updateAward({ ...validInput, id: "award-1" })).resolves.toEqual(view);
    expect(updateAwardRecordMock).toHaveBeenCalledWith("award-1", expect.objectContaining({ deadline: new Date(validInput.deadline) }));
    await expect(adminCaller().deleteAward({ id: "award-1" })).resolves.toEqual({ success: true, id: "award-1" });
  });

  it("restricts governed criteria lifecycle changes and passes the approving administrator", async () => {
    getGovernedCriteriaMock.mockResolvedValue([]);
    updateGovernedCriterionStatusMock.mockResolvedValue([]);
    await expect(userCaller().governedCriteria()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(adminCaller().governedCriteria()).resolves.toEqual([]);
    await expect(userCaller().updateGovernedCriterionStatus({ id: "criterion-1", status: "approved" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(adminCaller().updateGovernedCriterionStatus({ id: "criterion-1", status: "approved" })).resolves.toEqual([]);
    expect(updateGovernedCriterionStatusMock).toHaveBeenCalledWith("criterion-1", "approved", 1);
  });

  it("rejects criteria whose weights do not total 100 percent", async () => {
    createAwardRecordMock.mockRejectedValue(new Error("AWARD_WEIGHTS_MUST_TOTAL_100"));
    await expect(adminCaller().createAward({ ...validInput, criteria: validInput.criteria.map((criterion) => ({ ...criterion, weight: 20 })) })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
