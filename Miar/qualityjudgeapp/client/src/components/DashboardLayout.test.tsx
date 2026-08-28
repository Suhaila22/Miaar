// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DashboardLayout from "./DashboardLayout";

const harness = vi.hoisted(() => ({ locationMock: vi.fn(), user: null as null | { id: number; name: string; email: string; role: "admin" | "user" }, logout: vi.fn() }));
vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ loading: false, user: harness.user, logout: harness.logout }) }));
vi.mock("@/components/AuthForm", () => ({ AuthForm: ({ lang }: { lang: string }) => <div data-testid="auth-form">{lang}</div> }));
vi.mock("wouter", () => ({ useLocation: () => ["/", harness.locationMock] }));

afterEach(() => cleanup());

describe("DashboardLayout authentication entry", () => {
  beforeEach(() => { harness.locationMock.mockClear(); harness.logout.mockClear(); harness.user = null; localStorage.setItem("miyar-lang", "ar"); });

  it("shows the email/password auth form when signed out", () => {
    render(<DashboardLayout><div>workspace</div></DashboardLayout>);
    expect(screen.getByTestId("auth-form")).toBeTruthy();
    expect(screen.getByTestId("auth-form").textContent).toBe("ar");
  });

  it("renders the auth form in English/LTR mode", () => {
    localStorage.setItem("miyar-lang", "en");
    render(<DashboardLayout><div>workspace</div></DashboardLayout>);
    expect(screen.getByText("Welcome to Mi'yar")).toBeTruthy();
    expect(screen.getByTestId("auth-form").textContent).toBe("en");
  });

  it("uses the language-specific guide PDF link", () => {
    harness.user = { id: 1, name: "Suha Mohieldin", email: "suha@example.com", role: "user" };
    Object.defineProperty(window, "matchMedia", { writable: true, configurable: true, value: () => ({ matches: false, addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {} }) });
    render(<DashboardLayout><div>workspace</div></DashboardLayout>);
    expect(screen.getAllByRole("link", { name: /دليل الاستخدام/ })[0].getAttribute("href")).toBe("/miyar_user_guide.pdf");
    cleanup();
    localStorage.setItem("miyar-lang", "en");
    render(<DashboardLayout><div>workspace</div></DashboardLayout>);
    expect(screen.getAllByRole("link", { name: /User Guide/ })[0].getAttribute("href")).toBe("/miyar_user_guide_en.pdf");
  });

  it("navigates from the authenticated profile menu to /account", async () => {
    harness.user = { id: 1, name: "Suha Mohieldin", email: "suha@example.com", role: "user" };
    Object.defineProperty(window, "matchMedia", { writable: true, configurable: true, value: () => ({ matches: false, addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {} }) });
    render(<DashboardLayout><div>workspace</div></DashboardLayout>);
    const profileTrigger = screen.getByRole("button", { name: /Suha Mohieldin/ });
    fireEvent.pointerDown(profileTrigger, { button: 0 });
    fireEvent.click(profileTrigger);
    fireEvent.click(await screen.findByRole("menuitem", { name: "حسابي" }));
    expect(harness.locationMock).toHaveBeenCalledWith("/account");
  });
});
