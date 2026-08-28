import { and, asc, desc, eq, gt, lt, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { AwardSample, InsertAwardSample, InsertUser, type User, awards, awardCriteria, awardEligibilityRules, awardSamples, users, nominations, evidenceItems, evaluationDecisions, criterionScores, decisionSignatures, judgeAssignments, auditEvents, type Award, type AwardCriterion, type InsertAward, type InsertAwardCriterion, type InsertAwardEligibilityRule, governedCriteria, type InsertGovernedCriterion, type GovernedCriterion, weightTemplates, type InsertWeightTemplate } from "../drizzle/schema";
import { FREE_TRIAL_ATTEMPT_LIMIT, getTrialStatus as buildTrialStatus } from "../shared/trial";
import { ENV } from './_core/env';
import { JUDGING_PROGRAMS } from "../shared/judge";
import { AWARD_SAMPLE_TAGS, type AwardTag } from "../shared/sampleData";

let _db: ReturnType<typeof drizzle> | null = null;

export const ADMIN_PROVISIONED_LOGIN_METHOD = "admin_provisioned" as const;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export const LOCAL_LOGIN_METHOD = "local" as const;

/**
 * Registers a new local (email + password) account, or "claims" an existing
 * admin-provisioned placeholder row that matches the same email (see
 * `createManagedUser`). Throws "USER_EMAIL_EXISTS" if the email already has
 * a password set.
 */
export async function registerLocalUser(input: {
  name: string;
  email: string;
  passwordHash: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const normalizedEmail = input.email.trim().toLowerCase();
  const existing = await getUserByEmail(normalizedEmail);

  if (existing) {
    if (existing.passwordHash) {
      throw new Error("USER_EMAIL_EXISTS");
    }
    // Claim a placeholder account an admin provisioned ahead of time.
    const role = existing.role ?? (normalizedEmail === ENV.ownerEmail ? "admin" : "user");
    await db
      .update(users)
      .set({
        name: input.name.trim(),
        passwordHash: input.passwordHash,
        loginMethod: LOCAL_LOGIN_METHOD,
        role,
        lastSignedIn: new Date(),
      })
      .where(eq(users.id, existing.id));
    return getUserById(existing.id);
  }

  const openId = `local_${crypto.randomUUID()}`;
  const role = normalizedEmail === ENV.ownerEmail ? "admin" : "user";
  const result = await db.insert(users).values({
    openId,
    name: input.name.trim(),
    email: normalizedEmail,
    passwordHash: input.passwordHash,
    loginMethod: LOCAL_LOGIN_METHOD,
    role,
    lastSignedIn: new Date(),
  });
  const userId = Number((result as { insertId?: number }).insertId ?? 0);
  return userId ? getUserById(userId) : undefined;
}

export async function touchLastSignedIn(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, userId));
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return result[0];
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const normalizedEmail = email.trim().toLowerCase();
  const result = await db.select().from(users).where(sql`LOWER(${users.email}) = ${normalizedEmail}`).limit(1);
  return result[0];
}

export async function updateUserProfile(userId: number, input: { name: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const current = await getUserById(userId);
  if (!current) return undefined;
  await db.update(users).set({ name: input.name.trim() }).where(eq(users.id, userId));
  return getUserById(userId);
}

export async function countUsersByRole(role: "admin" | "user") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select({ id: users.id }).from(users).where(eq(users.role, role));
  return result.length;
}

export async function createManagedUser(input: { name: string; email: string; role: "admin" | "user"; trialAttempts: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const email = input.email.trim().toLowerCase();
  const existing = await getUserByEmail(email);
  if (existing) throw new Error("USER_EMAIL_EXISTS");
  const openId = `managed_${crypto.randomUUID()}`;
  const result = await db.insert(users).values({
    openId,
    name: input.name.trim(),
    email,
    role: input.role,
    trialAttempts: input.trialAttempts,
    loginMethod: ADMIN_PROVISIONED_LOGIN_METHOD,
    lastSignedIn: new Date(0),
  });
  const userId = Number((result as { insertId?: number }).insertId ?? 0);
  const created = userId ? await getUserById(userId) : undefined;
  if (!created) throw new Error("USER_CREATE_FAILED");
  return created;
}

export async function updateManagedUser(userId: number, input: { name: string; email: string; role: "admin" | "user"; trialAttempts: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const current = await getUserById(userId);
  if (!current) return undefined;
  const email = input.email.trim().toLowerCase();
  const duplicate = await getUserByEmail(email);
  if (duplicate && duplicate.id !== userId) throw new Error("USER_EMAIL_EXISTS");
  await db.update(users).set({ name: input.name.trim(), email, role: input.role, trialAttempts: input.trialAttempts }).where(eq(users.id, userId));
  return getUserById(userId);
}

export async function deleteUserAccount(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const current = await getUserById(userId);
  if (!current) return false;
  const ownedNominations = await db.select({ id: nominations.id }).from(nominations).where(eq(nominations.userId, userId));
  for (const nomination of ownedNominations) {
    await db.delete(decisionSignatures).where(eq(decisionSignatures.nominationId, nomination.id));
    await db.delete(criterionScores).where(eq(criterionScores.nominationId, nomination.id));
    await db.delete(evaluationDecisions).where(eq(evaluationDecisions.nominationId, nomination.id));
    await db.delete(auditEvents).where(eq(auditEvents.nominationId, nomination.id));
    await db.delete(judgeAssignments).where(eq(judgeAssignments.nominationId, nomination.id));
    await db.delete(evidenceItems).where(eq(evidenceItems.nominationId, nomination.id));
  }
  await db.delete(nominations).where(eq(nominations.userId, userId));
  const authoredDecisions = await db.select({ id: evaluationDecisions.id }).from(evaluationDecisions).where(eq(evaluationDecisions.judgeUserId, userId));
  for (const decision of authoredDecisions) {
    await db.delete(decisionSignatures).where(eq(decisionSignatures.decisionId, decision.id));
    await db.delete(criterionScores).where(eq(criterionScores.decisionId, decision.id));
  }
  await db.delete(evaluationDecisions).where(eq(evaluationDecisions.judgeUserId, userId));
  await db.delete(judgeAssignments).where(eq(judgeAssignments.judgeUserId, userId));
  await db.delete(auditEvents).where(eq(auditEvents.actorUserId, userId));
  const result = await db.delete(users).where(eq(users.id, userId));
  return Number((result as { affectedRows?: number }).affectedRows ?? 0) > 0;
}

export async function getTrialStatus(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select({ trialAttempts: users.trialAttempts }).from(users).where(eq(users.id, userId)).limit(1);
  return buildTrialStatus(result[0]?.trialAttempts ?? 0);
}

/** Atomically consumes one attempt so concurrent requests cannot exceed the free-trial limit. */
export async function consumeTrialAttempt(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db
    .update(users)
    .set({ trialAttempts: sql`${users.trialAttempts} + 1` })
    .where(and(eq(users.id, userId), lt(users.trialAttempts, FREE_TRIAL_ATTEMPT_LIMIT)));
  return Number((result as { affectedRows?: number }).affectedRows ?? 0) > 0;
}

export async function releaseTrialAttempt(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(users)
    .set({ trialAttempts: sql`GREATEST(${users.trialAttempts} - 1, 0)` })
    .where(and(eq(users.id, userId), gt(users.trialAttempts, 0)));
}

export async function resetTrialAttempts(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.update(users).set({ trialAttempts: 0 }).where(eq(users.id, userId));
  return Number((result as { affectedRows?: number }).affectedRows ?? 0) > 0;
}

export async function updateUserRole(userId: number, role: "admin" | "user") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.update(users).set({ role }).where(eq(users.id, userId));
  return Number((result as { affectedRows?: number }).affectedRows ?? 0) > 0;
}

export async function getAdminUsersData() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [userRows, nominationRows, assignmentRows, auditRows] = await Promise.all([
    db.select({ id: users.id, name: users.name, email: users.email, loginMethod: users.loginMethod, role: users.role, trialAttempts: users.trialAttempts, createdAt: users.createdAt, lastSignedIn: users.lastSignedIn }).from(users),
    db.select({ userId: nominations.userId, createdAt: nominations.createdAt }).from(nominations),
    db.select({ judgeUserId: judgeAssignments.judgeUserId, status: judgeAssignments.status, assignedAt: judgeAssignments.assignedAt, completedAt: judgeAssignments.completedAt }).from(judgeAssignments),
    db.select({ actorUserId: auditEvents.actorUserId, createdAt: auditEvents.createdAt }).from(auditEvents),
  ]);

  const evaluationStats = new Map<number, { evaluations: number; lastEvaluationAt: Date | null }>();
  for (const row of nominationRows) {
    const current = evaluationStats.get(row.userId) || { evaluations: 0, lastEvaluationAt: null };
    current.evaluations += 1;
    if (!current.lastEvaluationAt || row.createdAt > current.lastEvaluationAt) current.lastEvaluationAt = row.createdAt;
    evaluationStats.set(row.userId, current);
  }

  const assignmentStats = new Map<number, { assignedTasks: number; completedTasks: number; lastAssignmentAt: Date | null }>();
  for (const row of assignmentRows) {
    const current = assignmentStats.get(row.judgeUserId) || { assignedTasks: 0, completedTasks: 0, lastAssignmentAt: null };
    current.assignedTasks += 1;
    if (row.status === "completed" || row.completedAt) current.completedTasks += 1;
    if (!current.lastAssignmentAt || row.assignedAt > current.lastAssignmentAt) current.lastAssignmentAt = row.assignedAt;
    assignmentStats.set(row.judgeUserId, current);
  }

  const auditActivity = new Map<number, Date>();
  for (const row of auditRows) {
    const current = auditActivity.get(row.actorUserId);
    if (!current || row.createdAt > current) auditActivity.set(row.actorUserId, row.createdAt);
  }

  const now = Date.now();
  const monthAgo = now - 30 * 24 * 60 * 60 * 1000;
  const usersWithMetrics = userRows.map((user) => {
    const evaluations = evaluationStats.get(user.id) || { evaluations: 0, lastEvaluationAt: null };
    const assignments = assignmentStats.get(user.id) || { assignedTasks: 0, completedTasks: 0, lastAssignmentAt: null };
    const activityDates = [user.lastSignedIn, evaluations.lastEvaluationAt, assignments.lastAssignmentAt, auditActivity.get(user.id)].filter((value): value is Date => Boolean(value));
    const lastActivityAt = activityDates.reduce<Date | null>((latest, value) => !latest || value > latest ? value : latest, null);
    return {
      ...user,
      createdAt: user.createdAt.toISOString(),
      lastSignedIn: user.lastSignedIn?.toISOString() || null,
      lastActivityAt: lastActivityAt?.toISOString() || null,
      lastEvaluationAt: evaluations.lastEvaluationAt?.toISOString() || null,
      trialLimit: FREE_TRIAL_ATTEMPT_LIMIT,
      remainingAttempts: Math.max(FREE_TRIAL_ATTEMPT_LIMIT - user.trialAttempts, 0),
      evaluations: evaluations.evaluations,
      assignedTasks: assignments.assignedTasks,
      completedTasks: assignments.completedTasks,
      isActive: Boolean(lastActivityAt && lastActivityAt.getTime() >= monthAgo),
    };
  }).sort((a, b) => (b.lastActivityAt ? new Date(b.lastActivityAt).getTime() : 0) - (a.lastActivityAt ? new Date(a.lastActivityAt).getTime() : 0));

  return {
    kpis: {
      totalUsers: usersWithMetrics.length,
      admins: usersWithMetrics.filter((user) => user.role === "admin").length,
      regularUsers: usersWithMetrics.filter((user) => user.role === "user").length,
      activeUsers: usersWithMetrics.filter((user) => user.isActive).length,
      availableTrialUsers: usersWithMetrics.filter((user) => user.trialAttempts < FREE_TRIAL_ATTEMPT_LIMIT).length,
      exhaustedTrialUsers: usersWithMetrics.filter((user) => user.trialAttempts >= FREE_TRIAL_ATTEMPT_LIMIT).length,
    },
    users: usersWithMetrics,
  };
}

function parseDashboardJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export async function getAdminDashboardData() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [userRows, nominationRows, evidenceRows, assignmentRows, auditRows, sampleRows] = await Promise.all([
    db.select({ id: users.id, name: users.name, email: users.email, role: users.role, trialAttempts: users.trialAttempts, createdAt: users.createdAt, lastSignedIn: users.lastSignedIn }).from(users).orderBy(desc(users.lastSignedIn)),
    db.select({ id: nominations.id, userId: nominations.userId, name: nominations.name, awardTitle: nominations.awardTitle, programType: nominations.programType, overallScore: nominations.overallScore, tier: nominations.tier, fileCount: nominations.fileCount, judgeCount: nominations.judgeCount, signatureData: nominations.signatureData, criteriaJson: nominations.criteriaJson, coverageJson: nominations.coverageJson, createdAt: nominations.createdAt }).from(nominations).orderBy(desc(nominations.createdAt)),
    db.select({ id: evidenceItems.id }).from(evidenceItems),
    db.select({ id: judgeAssignments.id, nominationId: judgeAssignments.nominationId, status: judgeAssignments.status, assignedAt: judgeAssignments.assignedAt, dueAt: judgeAssignments.dueAt, completedAt: judgeAssignments.completedAt }).from(judgeAssignments),
    db.select({ id: auditEvents.id, nominationId: auditEvents.nominationId, actorUserId: auditEvents.actorUserId, action: auditEvents.action, createdAt: auditEvents.createdAt }).from(auditEvents).orderBy(desc(auditEvents.createdAt)).limit(12),
    db.select().from(awardSamples).orderBy(desc(awardSamples.score), asc(awardSamples.createdAt)),
  ]);

  const now = Date.now();
  const monthAgo = now - 30 * 24 * 60 * 60 * 1000;
  const activeUsers = userRows.filter((user) => user.lastSignedIn && user.lastSignedIn.getTime() >= monthAgo).length;
  const averageScore = nominationRows.length ? Math.round(nominationRows.reduce((sum, item) => sum + item.overallScore, 0) / nominationRows.length) : 0;
  const averageJudges = nominationRows.length ? Number((nominationRows.reduce((sum, item) => sum + item.judgeCount, 0) / nominationRows.length).toFixed(1)) : 0;
  const programCounts = nominationRows.reduce<Record<string, number>>((result, item) => { result[item.programType] = (result[item.programType] || 0) + 1; return result; }, {});
  const tierCounts = nominationRows.reduce<Record<string, number>>((result, item) => { result[item.tier] = (result[item.tier] || 0) + 1; return result; }, {});
  const scoreBands = nominationRows.reduce<Record<string, number>>((result, item) => { const band = item.overallScore >= 90 ? "gold" : item.overallScore >= 80 ? "silver" : item.overallScore >= 70 ? "bronze" : "attention"; result[band] = (result[band] || 0) + 1; return result; }, {});
  const monthlyVolume = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now);
    date.setMonth(date.getMonth() - (5 - index), 1);
    const month = date.getMonth();
    const year = date.getFullYear();
    return { label: date.toLocaleDateString("en-US", { month: "short" }), labelAr: date.toLocaleDateString("ar-AE", { month: "short" }), value: nominationRows.filter((item) => item.createdAt.getMonth() === month && item.createdAt.getFullYear() === year).length };
  });

  const criterionStats: Record<string, { total: number; count: number }> = {};
  const coverageStats: Record<string, { covered: number; total: number; label: string }> = {};
  for (const nomination of nominationRows) {
    const program = JUDGING_PROGRAMS[nomination.programType as keyof typeof JUDGING_PROGRAMS] || JUDGING_PROGRAMS.excellence;
    const criteria = parseDashboardJson<Record<string, { score?: number }>>(nomination.criteriaJson, {});
    for (const criterion of program.rubric) {
      const score = criteria[criterion.key]?.score;
      if (typeof score === "number") {
        criterionStats[criterion.key] = criterionStats[criterion.key] || { total: 0, count: 0 };
        criterionStats[criterion.key].total += Math.max(0, Math.min(10, score));
        criterionStats[criterion.key].count += 1;
      }
    }
    const coverage = parseDashboardJson<Array<{ key?: string; label?: string; covered?: boolean }>>(nomination.coverageJson, []);
    for (const item of coverage) {
      if (!item.key) continue;
      coverageStats[item.key] = coverageStats[item.key] || { covered: 0, total: 0, label: item.label || item.key };
      coverageStats[item.key].total += 1;
      if (item.covered) coverageStats[item.key].covered += 1;
    }
  }
  const criterionReadiness = Object.entries(criterionStats).map(([key, value]) => ({ key, average: Math.round((value.total / Math.max(value.count, 1)) * 10), count: value.count, label: key })).sort((a, b) => b.average - a.average);
  const evidenceReadiness = Object.entries(coverageStats).map(([key, value]) => ({ key, label: value.label, value: Math.round((value.covered / Math.max(value.total, 1)) * 100) })).sort((a, b) => b.value - a.value);
  const programPerformance = Object.entries(programCounts).map(([programType, count]) => {
    const rows = nominationRows.filter((item) => item.programType === programType);
    return { programType, count, averageScore: Math.round(rows.reduce((sum, item) => sum + item.overallScore, 0) / Math.max(rows.length, 1)), signed: rows.filter((item) => Boolean(item.signatureData)).length };
  }).sort((a, b) => b.count - a.count);
  const nominationById = new Map(nominationRows.map((item) => [item.id, item]));
  const upcomingReviews = assignmentRows.filter((item) => item.status !== "completed").slice(0, 8).map((assignment) => {
    const nomination = nominationById.get(assignment.nominationId);
    const dueAt = assignment.dueAt || new Date(assignment.assignedAt.getTime() + 7 * 24 * 60 * 60 * 1000);
    const daysRemaining = Math.ceil((dueAt.getTime() - now) / (24 * 60 * 60 * 1000));
    return { id: assignment.id, nominationId: assignment.nominationId, name: nomination?.name || "—", programType: nomination?.programType || "excellence", status: assignment.status, assignedAt: assignment.assignedAt.toISOString(), dueAt: dueAt.toISOString(), daysRemaining, isOverdue: daysRemaining < 0, score: nomination?.overallScore ?? null };
  });
  const overdueReviews = upcomingReviews.filter((item) => item.isOverdue).length;
  const upcomingDeadlines = [...upcomingReviews].sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime()).slice(0, 6);
  const improvementOpportunities = criterionReadiness.slice(-5).map((item) => ({ ...item, gap: Math.max(0, 100 - item.average) })).sort((a, b) => b.gap - a.gap).slice(0, 4);

  return {
    kpis: {
      totalUsers: userRows.length,
      activeUsers,
      totalNominations: nominationRows.length,
      pendingReviews: assignmentRows.filter((item) => item.status !== "completed").length,
      completedEvaluations: nominationRows.length,
      freeTrialUsers: userRows.filter((user) => user.trialAttempts < FREE_TRIAL_ATTEMPT_LIMIT).length,
      exhaustedTrialUsers: userRows.filter((user) => user.trialAttempts >= FREE_TRIAL_ATTEMPT_LIMIT).length,
      averageScore,
      averageJudges,
      topScore: nominationRows.length ? Math.max(...nominationRows.map((item) => item.overallScore)) : 0,
      evidenceFiles: evidenceRows.length,
      signedReports: nominationRows.filter((item) => Boolean(item.signatureData)).length,
      unsignedReports: nominationRows.filter((item) => !item.signatureData).length,
      overdueReviews,
      upcomingDeadlines: upcomingDeadlines.length,
    },
    programCounts,
    tierCounts,
    scoreBands,
    monthlyVolume,
    criterionReadiness,
    evidenceReadiness,
    programPerformance,
    upcomingReviews,
    upcomingDeadlines,
    improvementOpportunities,
    recentNominations: nominationRows.slice(0, 8).map((item) => ({ id: item.id, userId: item.userId, name: item.name, awardTitle: item.awardTitle, programType: item.programType, overallScore: item.overallScore, tier: item.tier, fileCount: item.fileCount, judgeCount: item.judgeCount, signatureData: item.signatureData, createdAt: item.createdAt.toISOString() })),
    recentActivity: auditRows.map((item) => ({ ...item, createdAt: item.createdAt.toISOString() })),
    users: userRows.map((user) => ({ ...user, createdAt: user.createdAt.toISOString(), lastSignedIn: user.lastSignedIn?.toISOString() || null, remainingAttempts: Math.max(FREE_TRIAL_ATTEMPT_LIMIT - user.trialAttempts, 0) })),
    samples: sampleRows.map(toAwardSampleView),
  };
}

export type AwardCriterionInput = {
  criterionKey: string;
  nameAr: string;
  nameEn: string;
  descriptionAr?: string;
  descriptionEn?: string;
  weight: number;
  evidenceRequired: boolean;
  evidenceRequirementsAr?: string;
  evidenceRequirementsEn?: string;
  kpiAr?: string;
  kpiEn?: string;
};

export type WeightTemplateInput = { nameAr: string; nameEn: string; programType: string; weights: Record<string, number>; ownerUserId: number };

export type WeightTemplateView = { id: string; name: { ar: string; en: string }; programType: string; weights: Record<string, number>; version: number; ownerUserId: number; status: "draft" | "approved" | "retired"; approvedAt: string | null };

function validateWeightTemplate(weights: Record<string, number>) {
  const values = Object.values(weights);
  if (!values.length || values.some((weight) => !Number.isFinite(weight) || weight < 0)) throw new Error("WEIGHT_TEMPLATE_INVALID_WEIGHTS");
  if (values.reduce((sum, weight) => sum + weight, 0) !== 100) throw new Error("WEIGHT_TEMPLATE_TOTAL_MUST_BE_100");
}

export async function getWeightTemplates(userId: number, includeDraft = false) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db.select().from(weightTemplates).where(includeDraft ? undefined : eq(weightTemplates.status, "approved")).orderBy(desc(weightTemplates.updatedAt));
  return rows.filter((row) => includeDraft || row.ownerUserId === userId || row.status === "approved").map((row): WeightTemplateView => ({ id: row.id, name: { ar: row.nameAr, en: row.nameEn }, programType: row.programType, weights: JSON.parse(row.weightsJson) as Record<string, number>, version: row.version, ownerUserId: row.ownerUserId, status: row.status, approvedAt: row.approvedAt?.toISOString() ?? null }));
}

export async function createWeightTemplate(input: WeightTemplateInput) {
  validateWeightTemplate(input.weights);
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const prior = await db.select({ version: weightTemplates.version }).from(weightTemplates).where(and(eq(weightTemplates.nameEn, input.nameEn), eq(weightTemplates.programType, input.programType), eq(weightTemplates.ownerUserId, input.ownerUserId)));
  const version = Math.max(0, ...prior.map((row) => row.version)) + 1;
  const row: InsertWeightTemplate = { id: crypto.randomUUID(), nameAr: input.nameAr, nameEn: input.nameEn, programType: input.programType, weightsJson: JSON.stringify(input.weights), version, ownerUserId: input.ownerUserId, status: "draft", approvedAt: null, approvedByUserId: null };
  await db.insert(weightTemplates).values(row);
  return getWeightTemplates(input.ownerUserId, true);
}

export async function updateWeightTemplateStatus(id: string, status: "draft" | "approved" | "retired", approvedByUserId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(weightTemplates).set({ status, approvedAt: status === "approved" ? new Date() : null, approvedByUserId: status === "approved" ? approvedByUserId : null }).where(eq(weightTemplates.id, id));
  return getWeightTemplates(approvedByUserId, true);
}

export type AwardEligibilityRuleInput = {
  ruleKey: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  required: boolean;
};

export type AwardCatalogInput = {
  titleAr: string;
  titleEn: string;
  organizerAr: string;
  organizerEn: string;
  countryAr?: string;
  countryEn?: string;
  sector: string;
  level: string;
  category: string;
  eligibilityAr: string;
  eligibilityEn: string;
  deadline?: Date | null;
  status: "draft" | "active" | "closed";
  createdByUserId: number;
  criteria: AwardCriterionInput[];
  eligibilityRules: AwardEligibilityRuleInput[];
};

export function toAwardCatalogView(award: Award, criteria: Array<AwardCriterion | GovernedCriterion>, eligibilityRules: Array<typeof awardEligibilityRules.$inferSelect>) {
  return {
    id: award.id,
    title: { ar: award.titleAr, en: award.titleEn },
    organizer: { ar: award.organizerAr, en: award.organizerEn },
    country: { ar: award.countryAr ?? "", en: award.countryEn ?? "" },
    sector: award.sector,
    level: award.level,
    category: award.category,
    eligibility: { ar: award.eligibilityAr, en: award.eligibilityEn },
    deadline: award.deadline?.toISOString() ?? null,
    status: award.status,
    createdAt: award.createdAt.toISOString(),
    updatedAt: award.updatedAt.toISOString(),
    criteria: criteria.sort((a, b) => (("sortOrder" in a ? a.sortOrder : a.version) - ("sortOrder" in b ? b.sortOrder : b.version))).map((criterion) => ({
      id: criterion.id,
      key: criterion.criterionKey,
      name: { ar: criterion.nameAr, en: criterion.nameEn },
      description: { ar: criterion.descriptionAr ?? "", en: criterion.descriptionEn ?? "" },
      weight: criterion.weight,
      evidenceRequired: Boolean(criterion.evidenceRequired),
      evidenceRequirements: "evidenceRequirementsAr" in criterion ? { ar: criterion.evidenceRequirementsAr, en: criterion.evidenceRequirementsEn } : undefined,
      kpi: "kpiAr" in criterion ? { ar: criterion.kpiAr ?? "", en: criterion.kpiEn ?? "" } : undefined,
    })),
    eligibilityRules: eligibilityRules.sort((a, b) => a.sortOrder - b.sortOrder).map((rule) => ({
      id: rule.id,
      key: rule.ruleKey,
      name: { ar: rule.nameAr, en: rule.nameEn },
      description: { ar: rule.descriptionAr, en: rule.descriptionEn },
      required: Boolean(rule.required),
    })),
  };
}

export async function getAwardsCatalog(includeDraft = false) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const awardRows = await db.select().from(awards).where(includeDraft ? undefined : eq(awards.status, "active")).orderBy(asc(awards.deadline), desc(awards.updatedAt));
  const criterionRows = awardRows.length ? await db.select().from(awardCriteria) : [];
  const eligibilityRows = awardRows.length ? await db.select().from(awardEligibilityRules) : [];
  const criteriaByAward = new Map<string, Array<typeof awardCriteria.$inferSelect>>();
  const eligibilityByAward = new Map<string, Array<typeof awardEligibilityRules.$inferSelect>>();
  for (const criterion of criterionRows) {
    const current = criteriaByAward.get(criterion.awardId) ?? [];
    current.push(criterion);
    criteriaByAward.set(criterion.awardId, current);
  }
  for (const rule of eligibilityRows) {
    const current = eligibilityByAward.get(rule.awardId) ?? [];
    current.push(rule);
    eligibilityByAward.set(rule.awardId, current);
  }
  return awardRows.map((award) => toAwardCatalogView(award, criteriaByAward.get(award.id) ?? [], eligibilityByAward.get(award.id) ?? []));
}

export async function getAwardCatalogById(id: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const awardRows = await db.select().from(awards).where(eq(awards.id, id)).limit(1);
  if (!awardRows[0]) return undefined;
  const criteria = await db.select().from(awardCriteria).where(eq(awardCriteria.awardId, id)).orderBy(asc(awardCriteria.sortOrder));
  const eligibilityRules = await db.select().from(awardEligibilityRules).where(eq(awardEligibilityRules.awardId, id)).orderBy(asc(awardEligibilityRules.sortOrder));
  return toAwardCatalogView(awardRows[0], criteria, eligibilityRules);
}

function validateAwardEligibilityRules(rules: AwardEligibilityRuleInput[]) {
  if (!rules.length) throw new Error("AWARD_ELIGIBILITY_RULES_REQUIRED");
  const keys = new Set<string>();
  for (const rule of rules) {
    if (keys.has(rule.ruleKey)) throw new Error("AWARD_ELIGIBILITY_DUPLICATE");
    keys.add(rule.ruleKey);
  }
}

function validateAwardCriteria(criteria: AwardCriterionInput[]) {
  if (!criteria.length) throw new Error("AWARD_CRITERIA_REQUIRED");
  const total = criteria.reduce((sum, item) => sum + item.weight, 0);
  if (total !== 100) throw new Error("AWARD_WEIGHTS_MUST_TOTAL_100");
  const keys = new Set<string>();
  for (const item of criteria) {
    if (keys.has(item.criterionKey)) throw new Error("AWARD_CRITERIA_DUPLICATE");
    keys.add(item.criterionKey);
  }
}

async function insertAwardEligibilityRules(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, awardId: string, rules: AwardEligibilityRuleInput[]) {
  await db.insert(awardEligibilityRules).values(rules.map((rule, index): InsertAwardEligibilityRule => ({ id: crypto.randomUUID(), awardId, ruleKey: rule.ruleKey, nameAr: rule.nameAr, nameEn: rule.nameEn, descriptionAr: rule.descriptionAr, descriptionEn: rule.descriptionEn, required: rule.required ? 1 : 0, sortOrder: index })));
}

async function insertAwardCriteria(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, awardId: string, criteria: AwardCriterionInput[]) {
  await db.insert(awardCriteria).values(criteria.map((criterion, index): InsertAwardCriterion => ({
    id: crypto.randomUUID(),
    awardId,
    criterionKey: criterion.criterionKey,
    nameAr: criterion.nameAr,
    nameEn: criterion.nameEn,
    descriptionAr: criterion.descriptionAr ?? null,
    descriptionEn: criterion.descriptionEn ?? null,
    weight: criterion.weight,
    evidenceRequired: criterion.evidenceRequired ? 1 : 0,
    sortOrder: index,
  })));
}

async function syncGovernedCriteria(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, awardId: string, criteria: AwardCriterionInput[], ownerUserId: number) {
  const prior = await db.select({ criterionKey: governedCriteria.criterionKey, version: governedCriteria.version }).from(governedCriteria).where(eq(governedCriteria.awardId, awardId));
  const versions = new Map<string, number>();
  for (const row of prior) versions.set(row.criterionKey, Math.max(versions.get(row.criterionKey) ?? 0, row.version));
  await db.insert(governedCriteria).values(criteria.map((criterion, index): InsertGovernedCriterion => ({
    id: crypto.randomUUID(), awardId, criterionKey: criterion.criterionKey, nameAr: criterion.nameAr, nameEn: criterion.nameEn, descriptionAr: criterion.descriptionAr ?? null, descriptionEn: criterion.descriptionEn ?? null, weight: criterion.weight, evidenceRequired: criterion.evidenceRequired ? 1 : 0, evidenceRequirementsAr: criterion.evidenceRequirementsAr ?? "يتطلب دليلاً مناسباً وقابلاً للتتبع.", evidenceRequirementsEn: criterion.evidenceRequirementsEn ?? "Requires appropriate, traceable evidence.", kpiAr: criterion.kpiAr ?? null, kpiEn: criterion.kpiEn ?? null, version: (versions.get(criterion.criterionKey) ?? 0) + 1, ownerUserId, status: "draft", approvedAt: null, approvedByUserId: null,
  })));
}

export type GovernedCriterionView = {
  id: string; awardId: string; awardTitle: { ar: string; en: string }; criterionKey: string; name: { ar: string; en: string }; description: { ar: string; en: string }; weight: number; evidenceRequired: boolean; evidenceRequirements: { ar: string; en: string }; kpi: { ar: string; en: string }; version: number; ownerUserId: number; status: "draft" | "approved" | "retired"; approvedAt: string | null;
};

export async function getGovernedCriteriaRecords() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [criteriaRows, awardRows] = await Promise.all([db.select().from(governedCriteria).orderBy(desc(governedCriteria.updatedAt)), db.select().from(awards)]);
  const awardsById = new Map(awardRows.map((award) => [award.id, award]));
  const latest = new Map<string, typeof governedCriteria.$inferSelect>();
  for (const criterion of criteriaRows) {
    const key = `${criterion.awardId}:${criterion.criterionKey}`;
    if (!latest.has(key)) latest.set(key, criterion);
  }
  return Array.from(latest.values()).map((criterion): GovernedCriterionView => {
    const award = awardsById.get(criterion.awardId);
    return { id: criterion.id, awardId: criterion.awardId, awardTitle: { ar: award?.titleAr ?? "غير معروف", en: award?.titleEn ?? "Unknown award" }, criterionKey: criterion.criterionKey, name: { ar: criterion.nameAr, en: criterion.nameEn }, description: { ar: criterion.descriptionAr ?? "", en: criterion.descriptionEn ?? "" }, weight: criterion.weight, evidenceRequired: Boolean(criterion.evidenceRequired), evidenceRequirements: { ar: criterion.evidenceRequirementsAr, en: criterion.evidenceRequirementsEn }, kpi: { ar: criterion.kpiAr ?? "", en: criterion.kpiEn ?? "" }, version: criterion.version, ownerUserId: criterion.ownerUserId, status: criterion.status, approvedAt: criterion.approvedAt?.toISOString() ?? null };
  });
}

export async function updateGovernedCriterionStatus(id: string, status: "draft" | "approved" | "retired", approvedByUserId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(governedCriteria).set({ status, approvedAt: status === "approved" ? new Date() : null, approvedByUserId: status === "approved" ? approvedByUserId : null }).where(eq(governedCriteria.id, id));
  return getGovernedCriteriaRecords();
}

export async function createAwardRecord(input: AwardCatalogInput) {
  validateAwardCriteria(input.criteria);
  validateAwardEligibilityRules(input.eligibilityRules);
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const id = crypto.randomUUID();
  const award: InsertAward = { id, titleAr: input.titleAr, titleEn: input.titleEn, organizerAr: input.organizerAr, organizerEn: input.organizerEn, countryAr: input.countryAr ?? null, countryEn: input.countryEn ?? null, sector: input.sector, level: input.level, category: input.category, eligibilityAr: input.eligibilityAr, eligibilityEn: input.eligibilityEn, deadline: input.deadline ?? null, status: input.status, createdByUserId: input.createdByUserId };
  await db.insert(awards).values(award);
  await insertAwardCriteria(db, id, input.criteria);
  await insertAwardEligibilityRules(db, id, input.eligibilityRules);
  await syncGovernedCriteria(db, id, input.criteria, input.createdByUserId);
  return getAwardCatalogById(id);
}

export async function updateAwardRecord(id: string, input: Omit<AwardCatalogInput, "createdByUserId">) {
  validateAwardCriteria(input.criteria);
  validateAwardEligibilityRules(input.eligibilityRules);
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db.select({ id: awards.id }).from(awards).where(eq(awards.id, id)).limit(1);
  if (!existing[0]) return undefined;
  await db.update(awards).set({ titleAr: input.titleAr, titleEn: input.titleEn, organizerAr: input.organizerAr, organizerEn: input.organizerEn, countryAr: input.countryAr ?? null, countryEn: input.countryEn ?? null, sector: input.sector, level: input.level, category: input.category, eligibilityAr: input.eligibilityAr, eligibilityEn: input.eligibilityEn, deadline: input.deadline ?? null, status: input.status }).where(eq(awards.id, id));
  await db.delete(awardCriteria).where(eq(awardCriteria.awardId, id));
  await db.delete(awardEligibilityRules).where(eq(awardEligibilityRules.awardId, id));
  await insertAwardCriteria(db, id, input.criteria);
  await insertAwardEligibilityRules(db, id, input.eligibilityRules);
  const ownerUserId = (await db.select({ createdByUserId: awards.createdByUserId }).from(awards).where(eq(awards.id, id)).limit(1))[0]?.createdByUserId ?? 0;
  await syncGovernedCriteria(db, id, input.criteria, ownerUserId);
  return getAwardCatalogById(id);
}

export async function deleteAwardRecord(id: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(awardCriteria).where(eq(awardCriteria.awardId, id));
  await db.delete(awardEligibilityRules).where(eq(awardEligibilityRules.awardId, id));
  const result = await db.delete(awards).where(eq(awards.id, id));
  return Number((result as { affectedRows?: number }).affectedRows ?? 0) > 0;
}

export function toAwardSampleView(row: AwardSample) {
  let tags: AwardTag[] = AWARD_SAMPLE_TAGS[row.id] ?? [];
  if (row.tagsJson) {
    try {
      const parsed = JSON.parse(row.tagsJson);
      if (Array.isArray(parsed)) tags = parsed as AwardTag[];
    } catch {
      // Legacy or manually edited rows keep the maintained illustrative mapping.
    }
  }
  return {
    id: row.id,
    name: { ar: row.nameAr, en: row.nameEn },
    organization: { ar: row.organizationAr, en: row.organizationEn },
    programType: row.programType as "excellence" | "graduation" | "tenders" | "performance",
    score: row.score,
    tier: row.tier as "gold" | "silver" | "bronze",
    award: { ar: row.awardAr, en: row.awardEn },
    summary: { ar: row.summaryAr, en: row.summaryEn },
    rationale: { ar: row.rationaleAr, en: row.rationaleEn },
    metrics: JSON.parse(row.metricsJson) as Array<{ ar: string; en: string }>,
    tags,
  };
}

export async function getAwardSamples() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db.select().from(awardSamples).orderBy(desc(awardSamples.score), asc(awardSamples.createdAt));
  return rows.map(toAwardSampleView);
}

export async function getAwardSampleById(id: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db.select().from(awardSamples).where(eq(awardSamples.id, id)).limit(1);
  return rows[0];
}

export async function updateAwardSampleRecord(id: string, patch: Partial<InsertAwardSample>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.update(awardSamples).set(patch).where(eq(awardSamples.id, id));
  return Number((result as { affectedRows?: number }).affectedRows ?? 0) > 0;
}

export async function deleteAwardSampleRecord(id: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.delete(awardSamples).where(eq(awardSamples.id, id));
  return Number((result as { affectedRows?: number }).affectedRows ?? 0) > 0;
}

// TODO: add feature queries here as your schema grows.
