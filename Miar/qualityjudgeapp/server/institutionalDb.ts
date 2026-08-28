// Data-access layer for the institutional-platform modules added to close
// the gaps identified in the platform requirements audit: eligibility
// outcomes, multi-level approval workflow, award calendar, judging
// committees, conflict-of-interest declarations, corrective actions,
// reference data, knowledge base, AI-output governance, and the security
// event log.
import { and, desc, eq } from "drizzle-orm";
import {
  aiOutputLogs,
  awardMilestones,
  committeeMeetings,
  committeeMembers,
  conflictOfInterestDeclarations,
  correctiveActions,
  eligibilityChecks,
  judgeAssignments,
  judgingCommittees,
  knowledgeSources,
  nominationApprovals,
  nominations,
  referenceData,
  securityEvents,
  type InsertAiOutputLog,
  type InsertAwardMilestone,
  type InsertCommitteeMeeting,
  type InsertCommitteeMember,
  type InsertConflictOfInterestDeclaration,
  type InsertCorrectiveAction,
  type InsertEligibilityCheckRecord,
  type InsertJudgingCommittee,
  type InsertKnowledgeSource,
  type InsertNominationApproval,
  type InsertReferenceDataItem,
  type InsertSecurityEvent,
} from "../drizzle/schema";
import { getDb } from "./db";

const newId = () => crypto.randomUUID();

// --- Eligibility -------------------------------------------------------

export async function recordEligibilityCheck(input: {
  awardId: string;
  nominationId?: string | null;
  userId: number;
  passed: boolean;
  answers: Record<string, boolean>;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const row: InsertEligibilityCheckRecord = {
    id: newId(),
    awardId: input.awardId,
    nominationId: input.nominationId ?? null,
    userId: input.userId,
    passed: input.passed ? 1 : 0,
    answersJson: JSON.stringify(input.answers),
  };
  await db.insert(eligibilityChecks).values(row);
  return row;
}

export async function getLatestEligibilityCheck(awardId: string, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(eligibilityChecks)
    .where(and(eq(eligibilityChecks.awardId, awardId), eq(eligibilityChecks.userId, userId)))
    .orderBy(desc(eligibilityChecks.createdAt))
    .limit(1);
  return rows[0];
}

// --- Nomination approval workflow --------------------------------------

export type WorkflowStage = "draft" | "quality_review" | "management_approval" | "submitted" | "result";

const STAGE_ORDER: WorkflowStage[] = ["draft", "quality_review", "management_approval", "submitted", "result"];

export function nextWorkflowStage(current: WorkflowStage): WorkflowStage | null {
  const idx = STAGE_ORDER.indexOf(current);
  if (idx === -1 || idx === STAGE_ORDER.length - 1) return null;
  return STAGE_ORDER[idx + 1];
}

export async function advanceNominationStage(input: {
  nominationId: string;
  actorUserId: number;
  decision: "approved" | "rejected" | "reopened";
  notes?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [nomination] = await db.select().from(nominations).where(eq(nominations.id, input.nominationId)).limit(1);
  if (!nomination) throw new Error("NOMINATION_NOT_FOUND");

  const currentStage = nomination.workflowStage as WorkflowStage;
  let targetStage: WorkflowStage;
  if (input.decision === "reopened") {
    targetStage = "draft";
  } else if (input.decision === "rejected") {
    targetStage = currentStage;
  } else {
    const next = nextWorkflowStage(currentStage);
    if (!next) throw new Error("ALREADY_AT_FINAL_STAGE");
    targetStage = next;
  }

  // Institutional guardrail: a nomination cannot enter the "submitted" stage
  // unless its award eligibility has been confirmed and every assigned judge
  // has cleared conflict of interest for it.
  if (targetStage === "submitted") {
    if (nomination.awardId) {
      const eligibility = await getLatestEligibilityCheck(nomination.awardId, nomination.userId);
      if (!eligibility || eligibility.passed !== 1) {
        throw new Error("ELIGIBILITY_NOT_CONFIRMED");
      }
    }
    const assignments = await db.select().from(judgeAssignments).where(eq(judgeAssignments.nominationId, input.nominationId));
    for (const assignment of assignments) {
      const cleared = await hasClearedConflictOfInterest(input.nominationId, assignment.judgeUserId);
      if (!cleared) throw new Error("CONFLICT_OF_INTEREST_NOT_CLEARED");
    }
  }

  const row: InsertNominationApproval = {
    id: newId(),
    nominationId: input.nominationId,
    stage: currentStage,
    decision: input.decision,
    actorUserId: input.actorUserId,
    notes: input.notes ?? null,
  };
  await db.insert(nominationApprovals).values(row);
  await db.update(nominations).set({ workflowStage: targetStage }).where(eq(nominations.id, input.nominationId));
  return { ...row, newStage: targetStage };
}

export async function getNominationApprovalHistory(nominationId: string) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(nominationApprovals)
    .where(eq(nominationApprovals.nominationId, nominationId))
    .orderBy(desc(nominationApprovals.createdAt));
}

// --- Award calendar ------------------------------------------------------

export async function createAwardMilestone(input: {
  awardId: string;
  nameAr: string;
  nameEn: string;
  dueDate: Date;
  alertDaysBefore?: number;
  createdByUserId: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const row: InsertAwardMilestone = {
    id: newId(),
    awardId: input.awardId,
    nameAr: input.nameAr,
    nameEn: input.nameEn,
    dueDate: input.dueDate,
    alertDaysBefore: input.alertDaysBefore ?? 7,
    status: "upcoming",
    createdByUserId: input.createdByUserId,
  };
  await db.insert(awardMilestones).values(row);
  return row;
}

export async function listAwardMilestones(awardId?: string) {
  const db = await getDb();
  if (!db) return [];
  const rows = awardId
    ? await db.select().from(awardMilestones).where(eq(awardMilestones.awardId, awardId))
    : await db.select().from(awardMilestones);
  const now = Date.now();
  return rows
    .map(row => {
      if (row.status === "completed") return row;
      const dueMs = row.dueDate.getTime();
      const alertMs = row.alertDaysBefore * 24 * 60 * 60 * 1000;
      const status = dueMs < now ? "missed" : dueMs - now <= alertMs ? "due_soon" : "upcoming";
      return { ...row, status: status as typeof row.status };
    })
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
}

export async function updateAwardMilestoneStatus(id: string, status: "upcoming" | "due_soon" | "completed" | "missed") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(awardMilestones).set({ status }).where(eq(awardMilestones.id, id));
}

export async function deleteAwardMilestone(id: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.delete(awardMilestones).where(eq(awardMilestones.id, id));
  return Number((result as { affectedRows?: number }).affectedRows ?? 0) > 0;
}

// --- Judging committees ---------------------------------------------------

export async function createCommittee(input: { awardId: string; nameAr: string; nameEn: string; chairUserId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const row: InsertJudgingCommittee = {
    id: newId(),
    awardId: input.awardId,
    nameAr: input.nameAr,
    nameEn: input.nameEn,
    chairUserId: input.chairUserId,
    status: "forming",
  };
  await db.insert(judgingCommittees).values(row);
  const memberRow: InsertCommitteeMember = { id: newId(), committeeId: row.id, userId: input.chairUserId, role: "chair" };
  await db.insert(committeeMembers).values(memberRow);
  return row;
}

export async function listCommittees() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(judgingCommittees).orderBy(desc(judgingCommittees.createdAt));
}

export async function addCommitteeMember(input: { committeeId: string; userId: number; role: "chair" | "member" | "secretary" }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const row: InsertCommitteeMember = { id: newId(), committeeId: input.committeeId, userId: input.userId, role: input.role };
  await db.insert(committeeMembers).values(row);
  return row;
}

export async function listCommitteeMembers(committeeId: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(committeeMembers).where(eq(committeeMembers.committeeId, committeeId));
}

export async function removeCommitteeMember(id: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(committeeMembers).where(eq(committeeMembers.id, id));
}

export async function recordCommitteeMeeting(input: {
  committeeId: string;
  heldAt: Date;
  minutesText?: string;
  decisionsText?: string;
  createdByUserId: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const row: InsertCommitteeMeeting = {
    id: newId(),
    committeeId: input.committeeId,
    heldAt: input.heldAt,
    minutesText: input.minutesText ?? null,
    decisionsText: input.decisionsText ?? null,
    createdByUserId: input.createdByUserId,
  };
  await db.insert(committeeMeetings).values(row);
  return row;
}

export async function listCommitteeMeetings(committeeId: string) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(committeeMeetings)
    .where(eq(committeeMeetings.committeeId, committeeId))
    .orderBy(desc(committeeMeetings.heldAt));
}

export async function updateCommitteeStatus(id: string, status: "forming" | "active" | "dissolved") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(judgingCommittees).set({ status }).where(eq(judgingCommittees.id, id));
}

// --- Conflict of interest --------------------------------------------------

export async function declareConflictOfInterest(input: {
  nominationId: string;
  judgeUserId: number;
  hasConflict: boolean;
  detailsText?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const row: InsertConflictOfInterestDeclaration = {
    id: newId(),
    nominationId: input.nominationId,
    judgeUserId: input.judgeUserId,
    hasConflict: input.hasConflict ? 1 : 0,
    detailsText: input.detailsText ?? null,
  };
  await db.insert(conflictOfInterestDeclarations).values(row);
  return row;
}

/** A judge may only score a nomination after declaring no conflict of interest for it. */
export async function hasClearedConflictOfInterest(nominationId: string, judgeUserId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const rows = await db
    .select()
    .from(conflictOfInterestDeclarations)
    .where(and(eq(conflictOfInterestDeclarations.nominationId, nominationId), eq(conflictOfInterestDeclarations.judgeUserId, judgeUserId)))
    .orderBy(desc(conflictOfInterestDeclarations.declaredAt))
    .limit(1);
  return rows[0] ? rows[0].hasConflict === 0 : false;
}

export async function listConflictDeclarations(nominationId: string) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(conflictOfInterestDeclarations)
    .where(eq(conflictOfInterestDeclarations.nominationId, nominationId))
    .orderBy(desc(conflictOfInterestDeclarations.declaredAt));
}

// --- Corrective actions ------------------------------------------------

export async function createCorrectiveAction(input: {
  nominationId: string;
  sourceRecommendation: string;
  titleAr: string;
  titleEn: string;
  ownerUserId: number;
  priority: "low" | "medium" | "high";
  dueDate?: Date | null;
  createdByUserId: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const row: InsertCorrectiveAction = {
    id: newId(),
    nominationId: input.nominationId,
    sourceRecommendation: input.sourceRecommendation,
    titleAr: input.titleAr,
    titleEn: input.titleEn,
    ownerUserId: input.ownerUserId,
    priority: input.priority,
    status: "open",
    progressPercent: 0,
    dueDate: input.dueDate ?? null,
    createdByUserId: input.createdByUserId,
  };
  await db.insert(correctiveActions).values(row);
  return row;
}

export async function listCorrectiveActions(filter?: { nominationId?: string; ownerUserId?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filter?.nominationId) conditions.push(eq(correctiveActions.nominationId, filter.nominationId));
  if (filter?.ownerUserId) conditions.push(eq(correctiveActions.ownerUserId, filter.ownerUserId));
  const rows = conditions.length
    ? await db.select().from(correctiveActions).where(and(...conditions))
    : await db.select().from(correctiveActions);

  const now = Date.now();
  return rows
    .map(row => {
      if (row.status === "done" || !row.dueDate) return row;
      const overdue = row.dueDate.getTime() < now;
      return overdue && row.status !== "overdue" ? { ...row, status: "overdue" as const } : row;
    })
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function updateCorrectiveAction(
  id: string,
  input: Partial<{ status: "open" | "in_progress" | "done" | "overdue"; progressPercent: number; closureEvidenceUrl: string; closureNotes: string; ownerUserId: number; dueDate: Date | null }>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(correctiveActions).set(input).where(eq(correctiveActions.id, id));
  const rows = await db.select().from(correctiveActions).where(eq(correctiveActions.id, id)).limit(1);
  return rows[0];
}

// --- Reference data --------------------------------------------------

export async function upsertReferenceDataItem(input: {
  type: "category" | "sector" | "level" | "kpi";
  refKey: string;
  labelAr: string;
  labelEn: string;
  ownerUserId?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db
    .select()
    .from(referenceData)
    .where(and(eq(referenceData.type, input.type), eq(referenceData.refKey, input.refKey)))
    .limit(1);

  if (existing[0]) {
    const nextVersion = existing[0].version + 1;
    await db
      .update(referenceData)
      .set({ labelAr: input.labelAr, labelEn: input.labelEn, version: nextVersion, status: "draft" })
      .where(eq(referenceData.id, existing[0].id));
    return { ...existing[0], labelAr: input.labelAr, labelEn: input.labelEn, version: nextVersion, status: "draft" as const };
  }

  const row: InsertReferenceDataItem = {
    id: newId(),
    type: input.type,
    refKey: input.refKey,
    labelAr: input.labelAr,
    labelEn: input.labelEn,
    ownerUserId: input.ownerUserId ?? null,
    version: 1,
    status: "draft",
  };
  await db.insert(referenceData).values(row);
  return row;
}

export async function listReferenceData(type?: "category" | "sector" | "level" | "kpi") {
  const db = await getDb();
  if (!db) return [];
  return type
    ? db.select().from(referenceData).where(eq(referenceData.type, type))
    : db.select().from(referenceData);
}

export async function approveReferenceDataItem(id: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(referenceData).set({ status: "approved" }).where(eq(referenceData.id, id));
}

export async function retireReferenceDataItem(id: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(referenceData).set({ status: "retired" }).where(eq(referenceData.id, id));
}

// --- Knowledge base --------------------------------------------------

export async function createKnowledgeSource(input: {
  titleAr: string;
  titleEn: string;
  programType?: string;
  bodyText: string;
  storageUrl?: string;
  uploadedByUserId: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const row: InsertKnowledgeSource = {
    id: newId(),
    titleAr: input.titleAr,
    titleEn: input.titleEn,
    programType: input.programType ?? null,
    bodyText: input.bodyText,
    storageUrl: input.storageUrl ?? null,
    version: 1,
    reviewStatus: "pending",
    uploadedByUserId: input.uploadedByUserId,
  };
  await db.insert(knowledgeSources).values(row);
  return row;
}

export async function listKnowledgeSources(filter?: { programType?: string; reviewStatus?: "pending" | "approved" | "rejected" }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filter?.programType) conditions.push(eq(knowledgeSources.programType, filter.programType));
  if (filter?.reviewStatus) conditions.push(eq(knowledgeSources.reviewStatus, filter.reviewStatus));
  const rows = conditions.length
    ? await db.select().from(knowledgeSources).where(and(...conditions))
    : await db.select().from(knowledgeSources);
  return rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function setKnowledgeSourceReviewStatus(id: string, reviewStatus: "pending" | "approved" | "rejected") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(knowledgeSources).set({ reviewStatus }).where(eq(knowledgeSources.id, id));
}

export async function deleteKnowledgeSource(id: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(knowledgeSources).where(eq(knowledgeSources.id, id));
}

/** Best-effort grounding: pulls approved knowledge sources relevant to a program so AI prompts can cite them. */
export async function findGroundingSources(programType: string, limit = 5) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select()
    .from(knowledgeSources)
    .where(and(eq(knowledgeSources.reviewStatus, "approved"), eq(knowledgeSources.programType, programType)));
  return rows.slice(0, limit);
}

// --- AI output governance --------------------------------------------------

export async function logAiOutput(input: {
  feature: string;
  nominationId?: string | null;
  userId?: number | null;
  outputText: string;
  sourceIds?: string[];
  confidence?: number | null;
}) {
  // Best-effort, fire-and-forget logging: must never break (or throw past)
  // the AI feature it observes, including in unit tests where "./db" is
  // frequently mocked without a getDb export.
  try {
    const db = await getDb();
    if (!db) return null;
    const row: InsertAiOutputLog = {
      id: newId(),
      feature: input.feature,
      nominationId: input.nominationId ?? null,
      userId: input.userId ?? null,
      outputText: input.outputText.slice(0, 20000),
      sourceIdsJson: input.sourceIds && input.sourceIds.length ? JSON.stringify(input.sourceIds) : null,
      confidence: input.confidence ?? null,
      reviewStatus: "unreviewed",
    };
    await db.insert(aiOutputLogs).values(row);
    return row;
  } catch (error) {
    console.warn("[AI Governance] Failed to log AI output:", error);
    return null;
  }
}

export async function listAiOutputLogs(filter?: { reviewStatus?: "unreviewed" | "approved" | "flagged" }) {
  const db = await getDb();
  if (!db) return [];
  const rows = filter?.reviewStatus
    ? await db.select().from(aiOutputLogs).where(eq(aiOutputLogs.reviewStatus, filter.reviewStatus))
    : await db.select().from(aiOutputLogs);
  return rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 200);
}

export async function setAiOutputReviewStatus(id: string, reviewStatus: "unreviewed" | "approved" | "flagged") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(aiOutputLogs).set({ reviewStatus }).where(eq(aiOutputLogs.id, id));
}

// --- Security event log (SIEM-ready) --------------------------------------------------

export async function logSecurityEvent(input: {
  type: string;
  actorUserId?: number | null;
  ip?: string | null;
  metadata?: Record<string, unknown>;
}) {
  // Best-effort, fire-and-forget logging: security events must never break
  // (or even slow down) the request they're observing, including in unit
  // tests where "./db" is frequently mocked without a getDb export.
  try {
    const db = await getDb();
    if (!db) return;
    const row: InsertSecurityEvent = {
      id: newId(),
      type: input.type,
      actorUserId: input.actorUserId ?? null,
      ip: input.ip ?? null,
      metadataJson: input.metadata ? JSON.stringify(input.metadata) : null,
    };
    await db.insert(securityEvents).values(row);
  } catch (error) {
    console.warn("[Security] Failed to log security event:", error);
  }
}

export async function listSecurityEvents(limit = 200) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(securityEvents);
  return rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, limit);
}
