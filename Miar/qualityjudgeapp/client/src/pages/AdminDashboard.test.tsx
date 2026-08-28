import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { dashboardFixture, emptyDashboardFixture, dashboardState, testTranslations } = vi.hoisted(() => {
  const translations = new Proxy({
    controlCenter: "Control Center",
    controlCenterSubtitle: "Operational overview of the Mi'yar platform",
    dashboardGreeting: "Welcome to the Control Center",
    dashboardOverview: "A live view of evaluation performance and operations",
    overview: "Overview",
    users: "Users",
    activeUsers: "Active Users",
    totalNominations: "Total Nominations",
    pendingReviews: "Pending Reviews",
    completedEvaluations: "Completed Evaluations",
    freeTrials: "Free Trials",
    trialUsage: "Free Trial Usage",
    resetAttempts: "Reset Attempts",
    resetForUser: "Reset User Attempts",
    resetSuccess: "Attempts reset successfully",
    resetFailure: "Unable to reset attempts",
    recentActivity: "Recent Activity",
    upcomingReviews: "Upcoming Reviews",
    programDistribution: "Evaluations by Program",
    tierDistribution: "Results by Tier",
    completionProgress: "Nomination Progress",
    criteriaReadiness: "Core Criteria Readiness",
    recentNominations: "Recent Nominations",
    bestOpportunities: "Best Improvement Opportunities",
    viewAll: "View all",
    openWorkspace: "Open Evaluation Workspace",
    dashboardRefresh: "Refresh data",
    dashboardPeriod: "Last 6 months",
    lastSixMonths: "Last six months",
    kpiSubtitle: "Operational metrics from persisted data",
    topScore: "Top score",
    averageJudges: "Average judges",
    unsignedReports: "Reports awaiting approval",
    scoreDistribution: "Score distribution",
    criteriaReadinessDesc: "Average criterion scores across evaluations",
    evidenceReadiness: "Evidence readiness",
    evidenceReadinessDesc: "Coverage rate across required evidence types",
    programPerformance: "Program performance",
    programPerformanceDesc: "Volume, score, and signed-report rate",
    upcomingReviewsDesc: "Assigned work awaiting review or sign-off",
    status: "Status",
    assignedAt: "Assigned",
    noUpcomingReviews: "No upcoming reviews",
    liveData: "Live data from the system",
    attentionNeeded: "Needs attention",
    signaturesPending: "Signatures pending",
    evidenceCoverage: "Evidence coverage",
    workflow: "Workflow",
    reviewQueue: "Review queue",
    viewLeaderboard: "View leaderboard",
    openNomination: "Open nomination",
    judges: "Judges",
    files: "Files",
    signed: "Signed",
    noData: "Not enough data yet",
    sampleLibrary: "Illustrative Sample Library",
    sampleLibraryDesc: "Educational examples for exploring judging types and reading decisions visually.",
    illustrativeData: "Illustrative data · not real nominations",
    bestAwarded: "Best-Scoring Awarded Samples",
    bestAwardedDesc: "Curated demonstrations showing what a strong result can look like.",
    awardSelection: "Award Selection Section",
    awardSelectionDesc: "Demonstration decisions with a recorded score and selection rationale.",
    viewSamples: "View samples",
    allPrograms: "All programs",
    searchSamples: "Search samples...",
    filterCategory: "Program category",
    allTiers: "All tiers",
    goldTier: "Gold",
    silverTier: "Silver",
    bronzeTier: "Bronze",
    sortBy: "Sort by",
    highestScore: "Highest score",
    lowestScore: "Lowest score",
    resultCount: "results",
    sampleUpdated: "Sample updated",
    sampleDeleted: "Sample deleted",
    descriptionGenerated: "AI description generated",
    summaryGenerationError: "Unable to generate the AI summary",
    confirmDeleteSample: "Delete this illustrative sample?",
    sampleManagement: "Illustrative Sample Management",
    cancel: "Cancel",
    saveSample: "Save changes",
    gold: "Gold",
    silver: "Silver",
    bronze: "Bronze",
    mention: "Honorable Mention",
    none: "Unranked",
    attempts: "Attempts",
    remaining: "remaining",
    lastActive: "Last active",
  } as Record<string, string>, { get: (target, property: string) => target[property] ?? property });

  const base = {
    kpis: { totalUsers: 8, activeUsers: 6, totalNominations: 12, pendingReviews: 3, completedEvaluations: 12, freeTrialUsers: 7, exhaustedTrialUsers: 1, averageScore: 82, averageJudges: 1.5, topScore: 97, evidenceFiles: 25, signedReports: 8, unsignedReports: 4, overdueReviews: 0, upcomingDeadlines: 1 },
    programCounts: { excellence: 5, graduation: 3, tenders: 2, performance: 2 },
    tierCounts: { gold: 5, silver: 4, bronze: 2, mention: 1 },
    scoreBands: { gold: 5, silver: 4, bronze: 2, attention: 1 },
    monthlyVolume: [{ label: "Mar", labelAr: "مارس", value: 1 }, { label: "Apr", labelAr: "أبريل", value: 3 }],
    criterionReadiness: [{ key: "impact", average: 84, count: 5, label: "Impact" }, { key: "documentation", average: 72, count: 5, label: "Documentation" }],
    evidenceReadiness: [{ key: "annual_report", label: "Detailed report", value: 76 }],
    programPerformance: [{ programType: "excellence", count: 5, averageScore: 86, signed: 4 }, { programType: "graduation", count: 3, averageScore: 80, signed: 2 }],
    upcomingReviews: [{ id: "assignment-1", nominationId: "nom-1", name: "Green Path Platform", programType: "excellence", status: "assigned", assignedAt: "2026-08-20T10:00:00.000Z", dueAt: "2026-08-27T10:00:00.000Z", daysRemaining: 5, isOverdue: false, score: 84 }],
    upcomingDeadlines: [{ id: "assignment-1", nominationId: "nom-1", name: "Green Path Platform", programType: "excellence", status: "assigned", assignedAt: "2026-08-20T10:00:00.000Z", dueAt: "2026-08-27T10:00:00.000Z", daysRemaining: 5, isOverdue: false, score: 84 }],
    improvementOpportunities: [{ key: "documentation", average: 72, count: 5, label: "Documentation", gap: 28 }],
    recentNominations: [{ id: "nom-1", userId: 1, name: "Green Path Platform", awardTitle: "Institutional Excellence Award", programType: "excellence", overallScore: 84, tier: "silver", fileCount: 3, judgeCount: 2, signatureData: null, createdAt: "2026-08-20T10:00:00.000Z" }],
    recentActivity: [{ id: "audit-1", nominationId: "nom-1", actorUserId: 1, action: "scores_created", createdAt: "2026-08-20T10:00:00.000Z" }],
    users: [{ id: 1, name: "Admin User", email: "admin@example.com", role: "admin" as const, trialAttempts: 1, createdAt: "2026-08-01T10:00:00.000Z", lastSignedIn: "2026-08-20T10:00:00.000Z", remainingAttempts: 4 }],
    samples: [],
  };
  const emptyDashboardFixture = { ...base, kpis: { totalUsers: 0, activeUsers: 0, totalNominations: 0, pendingReviews: 0, completedEvaluations: 0, freeTrialUsers: 0, exhaustedTrialUsers: 0, averageScore: 0, averageJudges: 0, topScore: 0, evidenceFiles: 0, signedReports: 0, unsignedReports: 0, overdueReviews: 0, upcomingDeadlines: 0 }, programCounts: {}, tierCounts: {}, scoreBands: {}, monthlyVolume: [], criterionReadiness: [], evidenceReadiness: [], programPerformance: [], upcomingReviews: [], upcomingDeadlines: [], improvementOpportunities: [], recentNominations: [], recentActivity: [], users: [] } as unknown as typeof base;
  const dashboardState = { current: base };
  return { dashboardFixture: base, emptyDashboardFixture, dashboardState, testTranslations: translations };
});

vi.mock("@/components/DashboardLayout", () => ({ useLang: () => ({ lang: "en", t: testTranslations }) }));
vi.mock("wouter", () => ({ useLocation: () => ["/admin", vi.fn()] }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/trpc", () => {
  const mutation = () => ({ isPending: false, variables: undefined, mutate: vi.fn() });
  return {
    trpc: {
      useUtils: () => ({ evaluation: { adminDashboard: { invalidate: vi.fn() } } }),
      evaluation: {
        adminDashboard: { useQuery: () => ({ data: dashboardState.current, isLoading: false, error: undefined, refetch: vi.fn() }) },
        resetUserTrial: { useMutation: mutation },
        updateAwardSample: { useMutation: mutation },
        deleteAwardSample: { useMutation: mutation },
        generateAwardSampleDescription: { useMutation: mutation },
      },
    },
  };
});

import AdminDashboard from "./AdminDashboard";

afterEach(() => cleanup());

describe("AdminDashboard", () => {
  it("renders the command-center KPI, analytics, workflow, and sample sections", () => {
    const html = renderToStaticMarkup(<AdminDashboard />);
    expect(html).toContain("Welcome to the Control Center");
    expect(html).toContain("Evaluation volume");
    expect(html).toContain("Hover or use Tab to inspect monthly data points");
    expect(html).toContain("role=\"button\"");
    expect(html).toContain("Mar: 1 evaluations");
    expect(html).toContain("Core criteria readiness");
    expect(html).toContain("Program performance");
    expect(html).toContain("Institutional Excellence: 5 files, 86%");
    expect(html).toContain("Review queue");
    expect(html).toContain("Upcoming deadlines");
    expect(html).toContain("Best improvement opportunities");
    expect(html).toContain("28% gap");
    expect(html).toContain("Green Path Platform");
    expect(html).toContain("Illustrative Sample Library");
  });

  it("supports keyboard and pointer inspection across every chart family", () => {
    render(<AdminDashboard />);

    const volumePoint = screen.getByRole("button", { name: "Mar: 1 evaluations" });
    fireEvent.focus(volumePoint);
    expect(screen.getByRole("status").textContent).toContain("Mar");
    expect(screen.getByRole("status").textContent).toContain("1");
    fireEvent.blur(volumePoint);
    expect(screen.queryByRole("status")).toBeNull();

    const certificationBand = screen.getByRole("button", { name: /Gold: 5 files, range 90/ });
    fireEvent.mouseEnter(certificationBand);
    expect(screen.getByRole("status").textContent).toContain("Gold");
    expect(screen.getByRole("status").textContent).toContain("90–100");
    fireEvent.mouseLeave(certificationBand);
    expect(screen.queryByRole("status")).toBeNull();

    const rubricCriterion = screen.getAllByRole("button", { name: /Societal impact: 84%/ })[0];
    fireEvent.focus(rubricCriterion);
    expect(screen.getByRole("status").textContent).toContain("84%");
    fireEvent.blur(rubricCriterion);
    expect(screen.queryByRole("status")).toBeNull();

    const distributionLegend = screen.getAllByRole("button", { name: /Institutional Excellence: 5 files/ })[0];
    fireEvent.focus(distributionLegend);
    expect(screen.getByRole("status").textContent).toContain("Institutional Excellence");
    fireEvent.blur(distributionLegend);
    expect(screen.queryByRole("status")).toBeNull();

    const programRow = screen.getByRole("button", { name: "Institutional Excellence: 5 files, 86%" });
    fireEvent.mouseEnter(programRow);
    expect(screen.getByRole("status").textContent).toContain("86%");
    expect(screen.getByRole("status").textContent).toContain("80%");
    fireEvent.mouseLeave(programRow);
    expect(screen.queryByRole("status")).toBeNull();

    const readinessGauge = screen.getByRole("img", { name: "Average readiness: 82%" });
    fireEvent.focus(readinessGauge);
    expect(screen.getByRole("status").textContent).toContain("82%");
    expect(screen.getByRole("status").textContent).toContain("Certification-band benchmark");
    fireEvent.blur(readinessGauge);
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("renders empty-state dashboard data without throwing", () => {
    dashboardState.current = emptyDashboardFixture;
    expect(() => renderToStaticMarkup(<AdminDashboard />)).not.toThrow();
    dashboardState.current = dashboardFixture;
  });
});
