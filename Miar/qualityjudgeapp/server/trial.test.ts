import { beforeEach, describe, expect, it, vi } from "vitest";
import { canStartTrialAttempt, FREE_TRIAL_ATTEMPT_LIMIT, getTrialStatus } from "../shared/trial";

const { getTrialStatusMock, consumeTrialAttemptMock, getAdminDashboardDataMock, resetTrialAttemptsMock } = vi.hoisted(() => ({
  getTrialStatusMock: vi.fn(),
  consumeTrialAttemptMock: vi.fn(),
  getAdminDashboardDataMock: vi.fn(),
  resetTrialAttemptsMock: vi.fn(),
}));
vi.mock("./db", () => ({
  getTrialStatus: getTrialStatusMock,
  consumeTrialAttempt: consumeTrialAttemptMock,
  releaseTrialAttempt: vi.fn(),
  getAdminDashboardData: getAdminDashboardDataMock,
  resetTrialAttempts: resetTrialAttemptsMock,
}));

import { evaluationRouter } from "./routers/evaluation";

describe("free trial policy", () => {
  beforeEach(() => {
    getTrialStatusMock.mockReset();
    consumeTrialAttemptMock.mockReset();
    getAdminDashboardDataMock.mockReset();
    resetTrialAttemptsMock.mockReset();
  });
  it("allows attempts below the five-attempt limit", () => {
    expect(FREE_TRIAL_ATTEMPT_LIMIT).toBe(5);
    expect(canStartTrialAttempt(0)).toBe(true);
    expect(canStartTrialAttempt(4)).toBe(true);
    expect(getTrialStatus(4)).toEqual({ used: 4, limit: 5, remaining: 1, exhausted: false });
  });

  it("blocks the fifth completed attempt and any later attempt", () => {
    expect(canStartTrialAttempt(5)).toBe(false);
    expect(canStartTrialAttempt(6)).toBe(false);
    expect(getTrialStatus(5)).toEqual({ used: 5, limit: 5, remaining: 0, exhausted: true });
  });

  it("normalizes negative and fractional usage safely", () => {
    expect(getTrialStatus(-2)).toEqual({ used: 0, limit: 5, remaining: 5, exhausted: false });
    expect(getTrialStatus(2.9)).toEqual({ used: 2, limit: 5, remaining: 3, exhausted: false });
  });

  it("exposes the authenticated user trial status through the protected router", async () => {
    getTrialStatusMock.mockResolvedValue({ used: 5, limit: 5, remaining: 0, exhausted: true });
    const caller = evaluationRouter.createCaller({
      req: {} as any,
      res: {} as any,
      user: { id: 77, role: "user" } as any,
    });
    await expect(caller.trialStatus()).resolves.toEqual({ used: 5, limit: 5, remaining: 0, exhausted: true });
    expect(getTrialStatusMock).toHaveBeenCalledWith(77);
  });

  it("requires admin access for the control center", async () => {
    const caller = evaluationRouter.createCaller({
      req: {} as any,
      res: {} as any,
      user: { id: 77, role: "user" } as any,
    });
    await expect(caller.adminDashboard()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows admins to load dashboard data and reset a user's trial attempts", async () => {
    const dashboard = { kpis: { totalUsers: 1 }, users: [] };
    getAdminDashboardDataMock.mockResolvedValue(dashboard);
    resetTrialAttemptsMock.mockResolvedValue(true);
    const caller = evaluationRouter.createCaller({
      req: {} as any,
      res: {} as any,
      user: { id: 1, role: "admin" } as any,
    });
    await expect(caller.adminDashboard()).resolves.toEqual(dashboard);
    await expect(caller.resetUserTrial({ userId: 77 })).resolves.toEqual({ success: true, userId: 77, remainingAttempts: 5 });
    expect(resetTrialAttemptsMock).toHaveBeenCalledWith(77);
  });

  it("rejects an evaluation before expensive work when the user is exhausted", async () => {
    getTrialStatusMock.mockResolvedValue({ used: 5, limit: 5, remaining: 0, exhausted: true });
    const caller = evaluationRouter.createCaller({
      req: {} as any,
      res: {} as any,
      user: { id: 77, role: "user" } as any,
    });
    await expect(caller.evaluate({
      nomineeName: "Candidate",
      awardTitle: "Evaluation",
      programType: "graduation",
      context: "",
      files: [],
      weights: undefined,
      judgeCount: 1,
      signatureData: undefined,
    })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(consumeTrialAttemptMock).not.toHaveBeenCalled();
  });
});
