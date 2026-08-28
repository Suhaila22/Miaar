// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Account from "./Account";

const harness = vi.hoisted(() => {
  const updateMutation = { mutate: vi.fn(), isPending: false };
  const authUser = { id: 7, name: "Suha Mohieldin", email: "suha@example.com", role: "user" as const };
  const ar = { welcomeDesc: "سجّل الدخول للوصول إلى مساحة التقييم.", signIn: "تسجيل الدخول", createAccount: "إنشاء حساب جديد", oauthAccountHint: "يتم تأمين الحساب ببريد إلكتروني وكلمة مرور.", accountNav: "حسابي", accountTitle: "الملف الشخصي", accountEyebrow: "إعدادات الحساب", accountDesc: "حدّث اسم العرض وراجع بيانات الدخول.", profileDetails: "بيانات الملف الشخصي", profileName: "اسم العرض", profileEmail: "البريد الإلكتروني", profileRole: "صلاحية الحساب", saveProfile: "حفظ الملف الشخصي", profileUpdated: "تم التحديث", profileUpdateFailure: "تعذر التحديث", profileNameRequired: "أدخل اسماً صحيحاً", oauthManagedAccount: "يتم الدخول بالبريد وكلمة المرور.", accountSecurityTitle: "أمان الحساب", accountSecurityDesc: "الدخول محمي.", accountDeleteTitle: "إدارة حذف الحساب", accountDeleteAdminOnly: "الحذف للمشرفين فقط.", signOut: "تسجيل الخروج", admin: "مدير", user: "مستخدم", userManagementTitle: "إدارة المستخدمين" };
  const en = { welcomeDesc: "Sign in to access the evaluation workspace.", signIn: "Sign in", createAccount: "Create an account", oauthAccountHint: "Accounts use email and password.", accountNav: "My account", accountTitle: "Profile", accountEyebrow: "ACCOUNT SETTINGS", accountDesc: "Update your display name and review your access details.", profileDetails: "Profile details", profileName: "Display name", profileEmail: "Email address", profileRole: "Account role", saveProfile: "Save profile", profileUpdated: "Updated", profileUpdateFailure: "Could not update", profileNameRequired: "Enter a valid name", oauthManagedAccount: "Sign-in uses email and password.", accountSecurityTitle: "Account security", accountSecurityDesc: "Sign-in is protected.", accountDeleteTitle: "Account deletion", accountDeleteAdminOnly: "Deletion is restricted to administrators.", signOut: "Sign out", admin: "Admin", user: "User", userManagementTitle: "User management" };
  return { updateMutation, authUser, ar, en, logout: vi.fn(), setData: vi.fn(), lang: "ar" as "ar" | "en" };
});

vi.mock("@/components/DashboardLayout", () => ({ useLang: () => ({ lang: harness.lang, t: harness.lang === "ar" ? harness.ar : harness.en }) }));
vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ user: harness.authUser, loading: false, logout: harness.logout }) }));
vi.mock("wouter", () => ({ useLocation: () => ["/account", vi.fn()] }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/trpc", () => ({ trpc: { useUtils: () => ({ auth: { me: { setData: harness.setData } } }), auth: { updateProfile: { useMutation: () => harness.updateMutation } } } }));

afterEach(() => cleanup());

describe("Account", () => {
  beforeEach(() => {
    harness.lang = "ar";
    harness.authUser.name = "Suha Mohieldin";
    harness.updateMutation.mutate.mockClear();
    harness.logout.mockClear();
    harness.setData.mockClear();
  });

  it("renders bilingual-ready profile details with OAuth-managed fields", () => {
    render(<Account />);
    expect(screen.getByRole("heading", { name: "الملف الشخصي" })).toBeTruthy();
    expect(screen.getByLabelText("البريد الإلكتروني").hasAttribute("readonly")).toBe(true);
    expect(screen.getByText("يتم الدخول بالبريد وكلمة المرور.")).toBeTruthy();
  });

  it("renders English/LTR labels and profile fields", () => {
    harness.lang = "en";
    render(<Account />);
    expect(screen.getByRole("heading", { name: "Profile" })).toBeTruthy();
    expect(screen.getByLabelText("Display name")).toBeTruthy();
    expect(screen.getByText("Sign-in uses email and password.")).toBeTruthy();
  });

  it("validates and submits a display-name update", () => {
    render(<Account />);
    fireEvent.change(screen.getByLabelText("اسم العرض"), { target: { value: "Updated Reviewer" } });
    fireEvent.click(screen.getByRole("button", { name: "حفظ الملف الشخصي" }));
    expect(harness.updateMutation.mutate).toHaveBeenCalledWith({ name: "Updated Reviewer" });
    fireEvent.change(screen.getByLabelText("اسم العرض"), { target: { value: "A" } });
    fireEvent.click(screen.getByRole("button", { name: "حفظ الملف الشخصي" }));
    expect(screen.getByRole("alert")).toBeTruthy();
  });

  it("remains usable at a mobile viewport", () => {
    window.innerWidth = 390;
    window.dispatchEvent(new Event("resize"));
    render(<Account />);
    expect(screen.getByRole("heading", { name: "الملف الشخصي" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "حفظ الملف الشخصي" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "تسجيل الخروج" })).toBeTruthy();
  });

  it("offers an explicit sign-out action", () => {
    render(<Account />);
    fireEvent.click(screen.getByRole("button", { name: "تسجيل الخروج" }));
    expect(harness.logout).toHaveBeenCalledTimes(1);
  });
});
