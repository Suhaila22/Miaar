import { beforeEach, describe, expect, it, vi } from "vitest";

const { createManagedUserMock, updateManagedUserMock, deleteUserAccountMock, getUserByIdMock } = vi.hoisted(() => ({
  createManagedUserMock: vi.fn(),
  updateManagedUserMock: vi.fn(),
  deleteUserAccountMock: vi.fn(),
  getUserByIdMock: vi.fn(),
}));

vi.mock("./db", () => ({
  createManagedUser: createManagedUserMock,
  updateManagedUser: updateManagedUserMock,
  deleteUserAccount: deleteUserAccountMock,
  getUserById: getUserByIdMock,
  ADMIN_PROVISIONED_LOGIN_METHOD: "admin_provisioned",
  getTrialStatus: vi.fn(),
  consumeTrialAttempt: vi.fn(),
  releaseTrialAttempt: vi.fn(),
  getAdminDashboardData: vi.fn(),
  getAdminUsersData: vi.fn(),
  resetTrialAttempts: vi.fn(),
  updateUserRole: vi.fn(),
  getAwardSamples: vi.fn(),
  getAwardSampleById: vi.fn(),
  updateAwardSampleRecord: vi.fn(),
  deleteAwardSampleRecord: vi.fn(),
  toAwardSampleView: vi.fn(),
}));

import { evaluationRouter } from "./routers/evaluation";

const adminCaller = () => evaluationRouter.createCaller({ req: {} as any, res: {} as any, user: { id: 1, role: "admin" } as any });
const userCaller = () => evaluationRouter.createCaller({ req: {} as any, res: {} as any, user: { id: 2, role: "user" } as any });

const provisionedUser = { id: 9, name: "New Reviewer", email: "reviewer@example.com", loginMethod: "admin_provisioned", role: "user" as const, trialAttempts: 0 };

describe("administrator user lifecycle", () => {
  beforeEach(() => {
    createManagedUserMock.mockReset();
    updateManagedUserMock.mockReset();
    deleteUserAccountMock.mockReset();
    getUserByIdMock.mockReset();
  });

  it("restricts create, edit, and delete operations to administrators", async () => {
    await expect(userCaller().createUser({ name: "Reviewer", email: "reviewer@example.com", role: "user", trialAttempts: 0 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(userCaller().updateUser({ userId: 9, name: "Reviewer", email: "reviewer@example.com", role: "user", trialAttempts: 0 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(userCaller().deleteUser({ userId: 9 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("creates a provisioned user with validated trial settings", async () => {
    createManagedUserMock.mockResolvedValue(provisionedUser);
    await expect(adminCaller().createUser({ name: "New Reviewer", email: "Reviewer@Example.com", role: "user", trialAttempts: 1 })).resolves.toEqual({ success: true, userId: 9, provisioned: true });
    expect(createManagedUserMock).toHaveBeenCalledWith({ name: "New Reviewer", email: "Reviewer@Example.com", role: "user", trialAttempts: 1 });
    await expect(adminCaller().createUser({ name: "A", email: "bad-email", role: "user", trialAttempts: 0 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("updates provisioned users but blocks changing an OAuth-managed email", async () => {
    getUserByIdMock.mockResolvedValue({ ...provisionedUser });
    updateManagedUserMock.mockResolvedValue({ ...provisionedUser, name: "Updated Reviewer" });
    await expect(adminCaller().updateUser({ userId: 9, name: "Updated Reviewer", email: "updated@example.com", role: "admin", trialAttempts: 2 })).resolves.toEqual({ success: true, userId: 9 });
    expect(updateManagedUserMock).toHaveBeenCalledWith(9, { name: "Updated Reviewer", email: "updated@example.com", role: "admin", trialAttempts: 2 });
    getUserByIdMock.mockResolvedValue({ ...provisionedUser, loginMethod: "local", email: "oauth@example.com" });
    await expect(adminCaller().updateUser({ userId: 9, name: "Updated Reviewer", email: "changed@example.com", role: "user", trialAttempts: 0 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("prevents self-deletion and delegates safe deletion for another user", async () => {
    await expect(adminCaller().deleteUser({ userId: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    deleteUserAccountMock.mockResolvedValue(true);
    await expect(adminCaller().deleteUser({ userId: 9 })).resolves.toEqual({ success: true, userId: 9 });
    expect(deleteUserAccountMock).toHaveBeenCalledWith(9);
  });
});
