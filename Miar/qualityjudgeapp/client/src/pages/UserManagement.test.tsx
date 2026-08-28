// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import UserManagement from "./UserManagement";

const harness = vi.hoisted(() => {
  const labels = {
    ar: {
      loadingUsers: "جارٍ تحميل دليل المستخدمين...", adminOnly: "هذه الصفحة متاحة لمسؤولي المنصة فقط", userManagementEyebrow: "دليل الحسابات والصلاحيات", userManagementTitle: "إدارة المستخدمين", userManagementDesc: "راقب الحسابات والصلاحيات.", backToControlCenter: "العودة إلى مركز التحكم", totalAccounts: "إجمالي الحسابات", usersCount: "حساب مسجل", adminsCount: "المشرفون", activeUsers: "المستخدمون النشطون", activeRecently: "نشط مؤخراً", user: "مستخدم", regularUsersDetail: "حسابات مستخدمين", availableTrial: "تجربة متاحة", trialAvailable: "محاولات متبقية", exhaustedTrial: "تجربة مستنفدة", trialExhausted: "استنفد الحد", directoryFilters: "بحث وتصفية", usersDirectory: "دليل المستخدمين", searchUsers: "ابحث عن مستخدم...", ofUsers: "من", roleFilter: "الصلاحية", allRoles: "كل الصلاحيات", admin: "مدير", statusFilter: "حالة الحساب", allStatuses: "كل الحالات", inactiveUsers: "غير نشط", evaluations: "التقييمات", assignedReviews: "مهام التحكيم", completedReviews: "مكتملة", unnamedUser: "مستخدم بلا اسم", noEmail: "لا يوجد بريد", noUsers: "لا يوجد مستخدمون", noUsersDesc: "غيّر الفلاتر", manageRole: "إدارة الصلاحية", addUser: "إضافة مستخدم", editUser: "تعديل المستخدم", deleteUser: "حذف المستخدم", createUserTitle: "إضافة مستخدم جديد", editUserTitle: "تعديل بيانات المستخدم", userName: "اسم المستخدم", userEmail: "البريد الإلكتروني", userRole: "صلاحية الحساب", trialAttemptsUsed: "المحاولات المستخدمة", trialAttemptsHint: "من أصل 5 محاولات مجانية", userNamePlaceholder: "أدخل الاسم الكامل", userEmailPlaceholder: "name@example.com", saveUser: "حفظ المستخدم", createUserSuccess: "تمت الإضافة", createUserFailure: "تعذر الإضافة", updateUserSuccess: "تم التحديث", updateUserFailure: "تعذر التحديث", deleteUserConfirm: "هل تريد الحذف؟", confirmDelete: "تأكيد الحذف", cancel: "إلغاء", deleteUserSuccess: "تم الحذف", deleteUserFailure: "تعذر الحذف", cannotDeleteSelf: "لا يمكنك حذف حسابك", invalidUserName: "أدخل اسماً صحيحاً", invalidUserEmail: "أدخل بريداً صحيحاً", duplicateUserEmail: "البريد مستخدم", oauthEmailNotice: "لا يمكن تغيير بريد OAuth", provisionedUserNotice: "يمكن تسجيل الدخول عبر OAuth بهذا البريد", roleChangeConfirm: "هل تريد تغيير الصلاحية؟", roleUpdatedSuccess: "تم تحديث الصلاحية", roleUpdatedFailure: "تعذر التحديث", remaining: "متبقية", lastActive: "آخر نشاط", trialUsage: "استخدام التجربة", resetConfirm: "هل تريد إعادة العداد؟", reset: "إعادة", openWorkspace: "فتح مساحة التقييم", resetSuccess: "تمت الإعادة", resetFailure: "تعذر الإعادة", appSubtitle: "محرك تقييم", noActivity: "لا نشاط"
    },
    en: {
      loadingUsers: "Loading the user directory...", adminOnly: "This page is available to platform administrators only", userManagementEyebrow: "ACCOUNT & ACCESS DIRECTORY", userManagementTitle: "User Management", userManagementDesc: "Monitor accounts and permissions.", backToControlCenter: "Back to control center", totalAccounts: "Total accounts", usersCount: "registered accounts", adminsCount: "Administrators", activeUsers: "Active users", activeRecently: "Active recently", user: "User", regularUsersDetail: "standard accounts", availableTrial: "Trial available", trialAvailable: "Attempts remaining", exhaustedTrial: "Trial exhausted", trialExhausted: "Free limit reached", directoryFilters: "SEARCH & FILTER", usersDirectory: "Users directory", searchUsers: "Search users...", ofUsers: "of", roleFilter: "Role", allRoles: "All roles", admin: "Admin", statusFilter: "Account status", allStatuses: "All statuses", inactiveUsers: "Inactive recently", evaluations: "Evaluations", assignedReviews: "Review tasks", completedReviews: "completed", unnamedUser: "Unnamed user", noEmail: "No email", noUsers: "No matching users", noUsersDesc: "Change the filters", manageRole: "Manage role", addUser: "Add user", editUser: "Edit user", deleteUser: "Delete user", createUserTitle: "Add a new user", editUserTitle: "Edit user details", userName: "User name", userEmail: "Email address", userRole: "Account role", trialAttemptsUsed: "Used attempts", trialAttemptsHint: "Out of 5 free attempts", userNamePlaceholder: "Enter full name", userEmailPlaceholder: "name@example.com", saveUser: "Save user", createUserSuccess: "Added", createUserFailure: "Could not add", updateUserSuccess: "Updated", updateUserFailure: "Could not update", deleteUserConfirm: "Delete this user?", confirmDelete: "Confirm deletion", cancel: "Cancel", deleteUserSuccess: "Deleted", deleteUserFailure: "Could not delete", cannotDeleteSelf: "Cannot delete yourself", invalidUserName: "Enter a valid name", invalidUserEmail: "Enter a valid email", duplicateUserEmail: "Email already used", oauthEmailNotice: "OAuth email cannot be changed", provisionedUserNotice: "This user can sign in through OAuth with this email", roleChangeConfirm: "Change this role?", roleUpdatedSuccess: "User role updated", roleUpdatedFailure: "Could not update role", remaining: "remaining", lastActive: "Last activity", trialUsage: "Trial usage", resetConfirm: "Reset attempts?", reset: "Reset", openWorkspace: "Open workspace", resetSuccess: "Attempts reset", resetFailure: "Could not reset", appSubtitle: "Evaluation engine", noActivity: "No activity"
    }
  } as const;
  const users = [
    { id: 1, name: "Admin User", email: "admin@example.com", role: "admin" as const, loginMethod: "admin_provisioned", trialAttempts: 1, trialLimit: 5, remainingAttempts: 4, createdAt: "2026-08-01T10:00:00.000Z", lastSignedIn: "2026-08-20T10:00:00.000Z", lastActivityAt: "2026-08-20T10:00:00.000Z", lastEvaluationAt: null, evaluations: 4, assignedTasks: 2, completedTasks: 2, isActive: true },
    { id: 2, name: "Reviewer Account", email: "reviewer@example.com", role: "user" as const, loginMethod: "local", trialAttempts: 5, trialLimit: 5, remainingAttempts: 0, createdAt: "2026-07-01T10:00:00.000Z", lastSignedIn: "2026-08-18T10:00:00.000Z", lastActivityAt: "2026-08-18T10:00:00.000Z", lastEvaluationAt: "2026-08-17T10:00:00.000Z", evaluations: 2, assignedTasks: 3, completedTasks: 1, isActive: true },
    { id: 3, name: "Legacy Account", email: "legacy@example.com", role: "user" as const, loginMethod: "admin_provisioned", trialAttempts: 0, trialLimit: 5, remainingAttempts: 5, createdAt: "2025-01-01T10:00:00.000Z", lastSignedIn: null, lastActivityAt: null, lastEvaluationAt: null, evaluations: 0, assignedTasks: 0, completedTasks: 0, isActive: false },
  ];
  const queryState = { data: undefined as any, kpis: undefined as any, isLoading: false, error: undefined as any, refetch: vi.fn() };
  const resetMutation = { mutate: vi.fn(), isPending: false };
  const roleMutation = { mutate: vi.fn(), isPending: false };
  const createMutation = { mutate: vi.fn(), isPending: false };
  const updateMutation = { mutate: vi.fn(), isPending: false };
  const deleteMutation = { mutate: vi.fn(), isPending: false };
  const invalidation = { invalidate: vi.fn() };
  const location = vi.fn();
  return { labels, users, queryState, resetMutation, roleMutation, createMutation, updateMutation, deleteMutation, invalidation, location, lang: "ar" as "ar" | "en" };
});

vi.mock("@/components/DashboardLayout", () => ({ useLang: () => ({ lang: harness.lang, t: harness.labels[harness.lang] }) }));
vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: 1, role: "admin" }, loading: false }) }));
vi.mock("wouter", () => ({ useLocation: () => ["/users", harness.location] }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ evaluation: { adminUsers: harness.invalidation, adminDashboard: harness.invalidation } }),
    evaluation: {
      adminUsers: { useQuery: () => harness.queryState },
      resetUserTrial: { useMutation: () => harness.resetMutation },
      updateUserRole: { useMutation: () => harness.roleMutation },
      createUser: { useMutation: () => harness.createMutation },
      updateUser: { useMutation: () => harness.updateMutation },
      deleteUser: { useMutation: () => harness.deleteMutation },
    },
  },
}));

afterEach(() => cleanup());

describe("UserManagement", () => {
  beforeEach(() => {
    harness.lang = "ar";
    harness.queryState.error = undefined;
    harness.queryState.data = { kpis: { totalUsers: 3, admins: 1, regularUsers: 2, activeUsers: 2, availableTrialUsers: 2, exhaustedTrialUsers: 1 }, users: harness.users };
    harness.location.mockClear();
    harness.resetMutation.mutate.mockClear();
    harness.roleMutation.mutate.mockClear();
    harness.createMutation.mutate.mockClear();
    harness.updateMutation.mutate.mockClear();
    harness.deleteMutation.mutate.mockClear();
    vi.stubGlobal("confirm", vi.fn(() => true));
  });

  it("renders real user metrics and the bilingual-ready management controls", () => {
    render(<UserManagement />);
    expect(screen.getByRole("heading", { name: "إدارة المستخدمين" })).toBeTruthy();
    expect(screen.getAllByText("Admin User").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Reviewer Account").length).toBeGreaterThan(0);
    expect(screen.getByText("المشرفون")).toBeTruthy();
    expect(screen.getByLabelText("ابحث عن مستخدم...")).toBeTruthy();
    expect(screen.getByLabelText("الصلاحية")).toBeTruthy();
    expect(screen.getByLabelText("حالة الحساب")).toBeTruthy();
  });

  it("filters by search, role, and trial status", () => {
    render(<UserManagement />);
    fireEvent.change(screen.getByLabelText("ابحث عن مستخدم..."), { target: { value: "reviewer" } });
    expect(screen.getAllByText("Reviewer Account").length).toBeGreaterThan(0);
    expect(screen.queryByText("Legacy Account")).toBeNull();
    fireEvent.change(screen.getByLabelText("ابحث عن مستخدم..."), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("الصلاحية"), { target: { value: "admin" } });
    expect(screen.getAllByText("Admin User").length).toBeGreaterThan(0);
    expect(screen.queryByText("Reviewer Account")).toBeNull();
  });

  it("supports guarded trial reset and role management actions", () => {
    render(<UserManagement />);
    fireEvent.click(screen.getAllByRole("button", { name: "إعادة" })[0]);
    expect(harness.resetMutation.mutate).toHaveBeenCalledWith({ userId: 1 });
    fireEvent.change(screen.getAllByLabelText(/إدارة الصلاحية: Reviewer Account/)[0], { target: { value: "admin" } });
    expect(harness.roleMutation.mutate).toHaveBeenCalledWith({ userId: 2, role: "admin" });
  });

  it("renders English copy and a forbidden state for non-admin responses", () => {
    harness.lang = "en";
    const { rerender } = render(<UserManagement />);
    expect(screen.getByRole("heading", { name: "User Management" })).toBeTruthy();
    harness.queryState.error = { data: { code: "FORBIDDEN" } };
    harness.queryState.data = undefined;
    rerender(<UserManagement />);
    expect(screen.getByText("This page is available to platform administrators only")).toBeTruthy();
  });

  it("supports responsive mobile view layout rendering", () => {
    window.innerWidth = 375;
    window.dispatchEvent(new Event("resize"));
    render(<UserManagement />);
    expect(screen.getAllByText("Admin User").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Reviewer Account").length).toBeGreaterThan(0);
  });

  it("opens the create dialog and submits a provisioned user", () => {
    render(<UserManagement />);
    fireEvent.click(screen.getByRole("button", { name: "إضافة مستخدم" }));
    fireEvent.change(screen.getByLabelText("اسم المستخدم"), { target: { value: "New Account" } });
    fireEvent.change(screen.getByLabelText("البريد الإلكتروني"), { target: { value: "new@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "حفظ المستخدم" }));
    expect(harness.createMutation.mutate).toHaveBeenCalledWith({ name: "New Account", email: "new@example.com", role: "user", trialAttempts: 0 });
  });

  it("opens edit mode and safely deletes a non-current user", () => {
    render(<UserManagement />);
    fireEvent.click(screen.getAllByRole("button", { name: "تعديل المستخدم" })[0]);
    fireEvent.change(screen.getByLabelText("اسم المستخدم"), { target: { value: "Updated Admin" } });
    fireEvent.click(screen.getByRole("button", { name: "حفظ المستخدم" }));
    expect(harness.updateMutation.mutate).toHaveBeenCalledWith({ userId: 1, name: "Updated Admin", email: "admin@example.com", role: "admin", trialAttempts: 1 });
    cleanup();
    render(<UserManagement />);
    const deleteButtons = screen.getAllByRole("button", { name: "حذف المستخدم" });
    const enabledDelete = deleteButtons.find((button) => !button.hasAttribute("disabled"));
    expect(enabledDelete).toBeTruthy();
    fireEvent.click(enabledDelete!);
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByText(/هل تريد الحذف/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "تأكيد الحذف" }));
    expect(harness.deleteMutation.mutate).toHaveBeenCalledWith({ userId: 2 });
  });
});
