import { beforeEach, describe, expect, it, vi } from "vitest";

const { updateUserProfileMock } = vi.hoisted(() => ({ updateUserProfileMock: vi.fn() }));

vi.mock("./db", () => ({
  updateUserProfile: updateUserProfileMock,
}));

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const makeContext = (user?: TrpcContext["user"]): TrpcContext => ({
  user,
  req: { protocol: "https", headers: {} } as TrpcContext["req"],
  res: {} as TrpcContext["res"],
});

const signedInUser = {
  id: 7,
  openId: "profile-user",
  email: "profile@example.com",
  name: "Profile User",
  loginMethod: "local",
  role: "user" as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

describe("auth.updateProfile", () => {
  beforeEach(() => updateUserProfileMock.mockReset());

  it("requires an authenticated session", async () => {
    await expect(appRouter.createCaller(makeContext()).auth.updateProfile({ name: "Updated User" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(updateUserProfileMock).not.toHaveBeenCalled();
  });

  it("validates the display name and persists it for the signed-in user", async () => {
    updateUserProfileMock.mockResolvedValue({ ...signedInUser, name: "Updated User" });
    await expect(appRouter.createCaller(makeContext(signedInUser)).auth.updateProfile({ name: " Updated User " })).resolves.toMatchObject({ success: true, user: { id: 7, name: "Updated User" } });
    expect(updateUserProfileMock).toHaveBeenCalledWith(7, { name: "Updated User" });
    await expect(appRouter.createCaller(makeContext(signedInUser)).auth.updateProfile({ name: "A" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
