import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Stable opaque identifier for the account. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  /** scrypt hash ("salt:hash") for local email+password accounts. Null for admin-provisioned placeholders not yet claimed. */
  passwordHash: varchar("passwordHash", { length: 255 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  trialAttempts: int("trialAttempts").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const nominations = mysqlTable("nominations", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: int("userId").notNull(),
  name: text("name").notNull(),
  awardTitle: text("awardTitle").notNull(),
  programType: varchar("programType", { length: 32 }).default("excellence").notNull(),
  context: text("context"),
  overallScore: int("overallScore").notNull(),
  tier: varchar("tier", { length: 32 }).notNull(),
  criteriaJson: text("criteriaJson").notNull(),
  kpiFindings: text("kpiFindings"),
  strengthsJson: text("strengthsJson"),
  weaknessesJson: text("weaknessesJson"),
  recommendationsJson: text("recommendationsJson"),
  coverageJson: text("coverageJson"),
  fileCount: int("fileCount").notNull(),
  judgeCount: int("judgeCount").notNull().default(1),
  judgesJson: text("judgesJson"),
  weightsJson: text("weightsJson"),
  signatureData: text("signatureData"),
  /** Institutional nomination-lifecycle stage. See nominationApprovals for the audit trail of transitions. */
  workflowStage: mysqlEnum("workflowStage", ["draft", "quality_review", "management_approval", "submitted", "result"]).default("draft").notNull(),
  awardId: varchar("awardId", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Nomination = typeof nominations.$inferSelect;
export type InsertNomination = typeof nominations.$inferInsert;

export const evidenceItems = mysqlTable("evidence_items", {
  id: varchar("id", { length: 64 }).primaryKey(),
  nominationId: varchar("nominationId", { length: 64 }).notNull(),
  fileName: text("fileName").notNull(),
  fileType: varchar("fileType", { length: 64 }).notNull(),
  criterionKey: varchar("criterionKey", { length: 128 }),
  judgeKey: varchar("judgeKey", { length: 64 }),
  uploadedByUserId: int("uploadedByUserId"),
  mimeType: varchar("mimeType", { length: 128 }),
  extractedText: text("extractedText"),
  storageKey: text("storageKey").notNull(),
  storageUrl: text("storageUrl").notNull(),
  fileSize: int("fileSize").notNull(),
  /** Institutional data-classification label applied at upload time. */
  classification: mysqlEnum("classification", ["public", "internal", "confidential", "highly_confidential"]).default("internal").notNull(),
  malwareScanStatus: mysqlEnum("malwareScanStatus", ["pending", "clean", "infected", "skipped"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type EvidenceItem = typeof evidenceItems.$inferSelect;
export type InsertEvidenceItem = typeof evidenceItems.$inferInsert;

/** First-class judge and aggregate decision records. Legacy nominationsJson fields remain as a read fallback. */
export const evaluationDecisions = mysqlTable("evaluation_decisions", {
  id: varchar("id", { length: 64 }).primaryKey(),
  nominationId: varchar("nominationId", { length: 64 }).notNull(),
  judgeUserId: int("judgeUserId"),
  judgeKey: varchar("judgeKey", { length: 64 }),
  decisionType: varchar("decisionType", { length: 32 }).notNull(),
  status: varchar("status", { length: 24 }).notNull().default("submitted"),
  overallScore: int("overallScore").notNull(),
  tier: varchar("tier", { length: 32 }).notNull(),
  decisionText: text("decisionText"),
  metadataJson: text("metadataJson"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EvaluationDecision = typeof evaluationDecisions.$inferSelect;
export type InsertEvaluationDecision = typeof evaluationDecisions.$inferInsert;

export const criterionScores = mysqlTable("criterion_scores", {
  id: varchar("id", { length: 64 }).primaryKey(),
  nominationId: varchar("nominationId", { length: 64 }).notNull(),
  decisionId: varchar("decisionId", { length: 64 }).notNull(),
  criterionKey: varchar("criterionKey", { length: 128 }).notNull(),
  scoreTenths: int("scoreTenths").notNull(),
  note: text("note"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CriterionScore = typeof criterionScores.$inferSelect;
export type InsertCriterionScore = typeof criterionScores.$inferInsert;

export const decisionSignatures = mysqlTable("decision_signatures", {
  id: varchar("id", { length: 64 }).primaryKey(),
  nominationId: varchar("nominationId", { length: 64 }).notNull(),
  decisionId: varchar("decisionId", { length: 64 }).notNull(),
  signerUserId: int("signerUserId").notNull(),
  signatureData: text("signatureData").notNull(),
  signedAt: timestamp("signedAt").defaultNow().notNull(),
});

export type DecisionSignature = typeof decisionSignatures.$inferSelect;
export type InsertDecisionSignature = typeof decisionSignatures.$inferInsert;

export const judgeAssignments = mysqlTable("judge_assignments", {
  id: varchar("id", { length: 64 }).primaryKey(),
  nominationId: varchar("nominationId", { length: 64 }).notNull(),
  judgeUserId: int("judgeUserId").notNull(),
  status: varchar("status", { length: 24 }).notNull().default("assigned"),
  assignedAt: timestamp("assignedAt").defaultNow().notNull(),
  dueAt: timestamp("dueAt"),
  completedAt: timestamp("completedAt"),
});

export type JudgeAssignment = typeof judgeAssignments.$inferSelect;
export type InsertJudgeAssignment = typeof judgeAssignments.$inferInsert;

export const auditEvents = mysqlTable("audit_events", {
  id: varchar("id", { length: 64 }).primaryKey(),
  nominationId: varchar("nominationId", { length: 64 }).notNull(),
  actorUserId: int("actorUserId").notNull(),
  action: varchar("action", { length: 64 }).notNull(),
  previousValue: text("previousValue"),
  newValue: text("newValue"),
  metadataJson: text("metadataJson"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuditEvent = typeof auditEvents.$inferSelect;
export type InsertAuditEvent = typeof auditEvents.$inferInsert;

export const awardSamples = mysqlTable("award_samples", {
  id: varchar("id", { length: 64 }).primaryKey(),
  nameAr: text("nameAr").notNull(),
  nameEn: text("nameEn").notNull(),
  organizationAr: text("organizationAr").notNull(),
  organizationEn: text("organizationEn").notNull(),
  programType: varchar("programType", { length: 32 }).notNull(),
  score: int("score").notNull(),
  tier: varchar("tier", { length: 16 }).notNull(),
  awardAr: text("awardAr").notNull(),
  awardEn: text("awardEn").notNull(),
  summaryAr: text("summaryAr").notNull(),
  summaryEn: text("summaryEn").notNull(),
  rationaleAr: text("rationaleAr").notNull(),
  rationaleEn: text("rationaleEn").notNull(),
  metricsJson: text("metricsJson").notNull(),
  tagsJson: text("tagsJson"),
  isIllustrative: int("isIllustrative").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AwardSample = typeof awardSamples.$inferSelect;
export type InsertAwardSample = typeof awardSamples.$inferInsert;

export const awards = mysqlTable("awards", {
  id: varchar("id", { length: 64 }).primaryKey(),
  titleAr: text("titleAr").notNull(),
  titleEn: text("titleEn").notNull(),
  organizerAr: text("organizerAr").notNull(),
  organizerEn: text("organizerEn").notNull(),
  countryAr: text("countryAr"),
  countryEn: text("countryEn"),
  sector: varchar("sector", { length: 64 }).notNull(),
  level: varchar("level", { length: 32 }).notNull(),
  category: varchar("category", { length: 64 }).notNull(),
  eligibilityAr: text("eligibilityAr").notNull(),
  eligibilityEn: text("eligibilityEn").notNull(),
  deadline: timestamp("deadline"),
  status: mysqlEnum("status", ["draft", "active", "closed"]).default("draft").notNull(),
  createdByUserId: int("createdByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Award = typeof awards.$inferSelect;
export type InsertAward = typeof awards.$inferInsert;

export const awardCriteria = mysqlTable("award_criteria", {
  id: varchar("id", { length: 64 }).primaryKey(),
  awardId: varchar("awardId", { length: 64 }).notNull(),
  criterionKey: varchar("criterionKey", { length: 128 }).notNull(),
  nameAr: text("nameAr").notNull(),
  nameEn: text("nameEn").notNull(),
  descriptionAr: text("descriptionAr"),
  descriptionEn: text("descriptionEn"),
  weight: int("weight").notNull(),
  evidenceRequired: int("evidenceRequired").default(1).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AwardCriterion = typeof awardCriteria.$inferSelect;
export type InsertAwardCriterion = typeof awardCriteria.$inferInsert;

export const governedCriteria = mysqlTable("governed_criteria", {
  id: varchar("id", { length: 64 }).primaryKey(),
  awardId: varchar("awardId", { length: 64 }).notNull(),
  criterionKey: varchar("criterionKey", { length: 128 }).notNull(),
  nameAr: text("nameAr").notNull(),
  nameEn: text("nameEn").notNull(),
  descriptionAr: text("descriptionAr"),
  descriptionEn: text("descriptionEn"),
  weight: int("weight").notNull(),
  evidenceRequired: int("evidenceRequired").default(1).notNull(),
  evidenceRequirementsAr: text("evidenceRequirementsAr").notNull(),
  evidenceRequirementsEn: text("evidenceRequirementsEn").notNull(),
  kpiAr: text("kpiAr"),
  kpiEn: text("kpiEn"),
  version: int("version").default(1).notNull(),
  ownerUserId: int("ownerUserId").notNull(),
  status: mysqlEnum("status", ["draft", "approved", "retired"]).default("draft").notNull(),
  approvedAt: timestamp("approvedAt"),
  approvedByUserId: int("approvedByUserId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type GovernedCriterion = typeof governedCriteria.$inferSelect;
export type InsertGovernedCriterion = typeof governedCriteria.$inferInsert;

export const weightTemplates = mysqlTable("weight_templates", {
  id: varchar("id", { length: 64 }).primaryKey(),
  nameAr: varchar("nameAr", { length: 240 }).notNull(),
  nameEn: varchar("nameEn", { length: 240 }).notNull(),
  programType: varchar("programType", { length: 64 }).notNull(),
  weightsJson: text("weightsJson").notNull(),
  version: int("version").default(1).notNull(),
  ownerUserId: int("ownerUserId").notNull(),
  status: mysqlEnum("status", ["draft", "approved", "retired"]).default("draft").notNull(),
  approvedAt: timestamp("approvedAt"),
  approvedByUserId: int("approvedByUserId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type WeightTemplate = typeof weightTemplates.$inferSelect;
export type InsertWeightTemplate = typeof weightTemplates.$inferInsert;

export const awardEligibilityRules = mysqlTable("award_eligibility_rules", {
  id: varchar("id", { length: 64 }).primaryKey(),
  awardId: varchar("awardId", { length: 64 }).notNull(),
  ruleKey: varchar("ruleKey", { length: 128 }).notNull(),
  nameAr: text("nameAr").notNull(),
  nameEn: text("nameEn").notNull(),
  descriptionAr: text("descriptionAr").notNull(),
  descriptionEn: text("descriptionEn").notNull(),
  required: int("required").default(1).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AwardEligibilityRule = typeof awardEligibilityRules.$inferSelect;
export type InsertAwardEligibilityRule = typeof awardEligibilityRules.$inferInsert;

// ---------------------------------------------------------------------------
// Institutional nomination lifecycle: eligibility outcomes, approval workflow,
// award calendar, judging committees, conflict-of-interest, corrective
// actions, reference data, knowledge base, AI-output governance, and a
// security event log. Added to close the "institutional government platform"
// gaps identified in the platform requirements audit.
// ---------------------------------------------------------------------------

/** Records the outcome of running an award's eligibility rules against a nomination attempt. */
export const eligibilityChecks = mysqlTable("eligibility_checks", {
  id: varchar("id", { length: 64 }).primaryKey(),
  awardId: varchar("awardId", { length: 64 }).notNull(),
  nominationId: varchar("nominationId", { length: 64 }),
  userId: int("userId").notNull(),
  passed: int("passed").default(0).notNull(),
  answersJson: text("answersJson").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type EligibilityCheckRecord = typeof eligibilityChecks.$inferSelect;
export type InsertEligibilityCheckRecord = typeof eligibilityChecks.$inferInsert;

/** Multi-level approval workflow stage log for a nomination's institutional lifecycle. */
export const nominationApprovals = mysqlTable("nomination_approvals", {
  id: varchar("id", { length: 64 }).primaryKey(),
  nominationId: varchar("nominationId", { length: 64 }).notNull(),
  stage: mysqlEnum("stage", ["draft", "quality_review", "management_approval", "submitted", "result"]).notNull(),
  decision: mysqlEnum("decision", ["pending", "approved", "rejected", "reopened"]).default("pending").notNull(),
  actorUserId: int("actorUserId").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type NominationApproval = typeof nominationApprovals.$inferSelect;
export type InsertNominationApproval = typeof nominationApprovals.$inferInsert;

/** Award-cycle calendar milestones (opening, closing, judging window, ceremony, ...). */
export const awardMilestones = mysqlTable("award_milestones", {
  id: varchar("id", { length: 64 }).primaryKey(),
  awardId: varchar("awardId", { length: 64 }).notNull(),
  nameAr: text("nameAr").notNull(),
  nameEn: text("nameEn").notNull(),
  dueDate: timestamp("dueDate").notNull(),
  alertDaysBefore: int("alertDaysBefore").default(7).notNull(),
  status: mysqlEnum("status", ["upcoming", "due_soon", "completed", "missed"]).default("upcoming").notNull(),
  createdByUserId: int("createdByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AwardMilestone = typeof awardMilestones.$inferSelect;
export type InsertAwardMilestone = typeof awardMilestones.$inferInsert;

export const judgingCommittees = mysqlTable("judging_committees", {
  id: varchar("id", { length: 64 }).primaryKey(),
  awardId: varchar("awardId", { length: 64 }).notNull(),
  nameAr: text("nameAr").notNull(),
  nameEn: text("nameEn").notNull(),
  chairUserId: int("chairUserId").notNull(),
  status: mysqlEnum("status", ["forming", "active", "dissolved"]).default("forming").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type JudgingCommittee = typeof judgingCommittees.$inferSelect;
export type InsertJudgingCommittee = typeof judgingCommittees.$inferInsert;

export const committeeMembers = mysqlTable("committee_members", {
  id: varchar("id", { length: 64 }).primaryKey(),
  committeeId: varchar("committeeId", { length: 64 }).notNull(),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", ["chair", "member", "secretary"]).default("member").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CommitteeMember = typeof committeeMembers.$inferSelect;
export type InsertCommitteeMember = typeof committeeMembers.$inferInsert;

export const committeeMeetings = mysqlTable("committee_meetings", {
  id: varchar("id", { length: 64 }).primaryKey(),
  committeeId: varchar("committeeId", { length: 64 }).notNull(),
  heldAt: timestamp("heldAt").notNull(),
  minutesText: text("minutesText"),
  decisionsText: text("decisionsText"),
  createdByUserId: int("createdByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CommitteeMeeting = typeof committeeMeetings.$inferSelect;
export type InsertCommitteeMeeting = typeof committeeMeetings.$inferInsert;

/** A judge's declaration of conflict of interest for a specific nomination. Required before scoring. */
export const conflictOfInterestDeclarations = mysqlTable("conflict_of_interest_declarations", {
  id: varchar("id", { length: 64 }).primaryKey(),
  nominationId: varchar("nominationId", { length: 64 }).notNull(),
  judgeUserId: int("judgeUserId").notNull(),
  hasConflict: int("hasConflict").default(0).notNull(),
  detailsText: text("detailsText"),
  declaredAt: timestamp("declaredAt").defaultNow().notNull(),
});

export type ConflictOfInterestDeclaration = typeof conflictOfInterestDeclarations.$inferSelect;
export type InsertConflictOfInterestDeclaration = typeof conflictOfInterestDeclarations.$inferInsert;

/** Turns an evaluation recommendation/gap into a trackable, ownable corrective action. */
export const correctiveActions = mysqlTable("corrective_actions", {
  id: varchar("id", { length: 64 }).primaryKey(),
  nominationId: varchar("nominationId", { length: 64 }).notNull(),
  sourceRecommendation: text("sourceRecommendation").notNull(),
  titleAr: text("titleAr").notNull(),
  titleEn: text("titleEn").notNull(),
  ownerUserId: int("ownerUserId").notNull(),
  priority: mysqlEnum("priority", ["low", "medium", "high"]).default("medium").notNull(),
  status: mysqlEnum("status", ["open", "in_progress", "done", "overdue"]).default("open").notNull(),
  progressPercent: int("progressPercent").default(0).notNull(),
  dueDate: timestamp("dueDate"),
  closureEvidenceUrl: text("closureEvidenceUrl"),
  closureNotes: text("closureNotes"),
  createdByUserId: int("createdByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CorrectiveAction = typeof correctiveActions.$inferSelect;
export type InsertCorrectiveAction = typeof correctiveActions.$inferInsert;

/** Versioned, admin-managed reference data (categories, sectors, levels, ...) instead of hard-coded lists. */
export const referenceData = mysqlTable("reference_data", {
  id: varchar("id", { length: 64 }).primaryKey(),
  type: mysqlEnum("type", ["category", "sector", "level", "kpi"]).notNull(),
  refKey: varchar("refKey", { length: 128 }).notNull(),
  labelAr: text("labelAr").notNull(),
  labelEn: text("labelEn").notNull(),
  ownerUserId: int("ownerUserId"),
  version: int("version").default(1).notNull(),
  status: mysqlEnum("status", ["draft", "approved", "retired"]).default("draft").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ReferenceDataItem = typeof referenceData.$inferSelect;
export type InsertReferenceDataItem = typeof referenceData.$inferInsert;

/** Institutional knowledge-base sources indexed for grounding AI summaries/recommendations. */
export const knowledgeSources = mysqlTable("knowledge_sources", {
  id: varchar("id", { length: 64 }).primaryKey(),
  titleAr: text("titleAr").notNull(),
  titleEn: text("titleEn").notNull(),
  programType: varchar("programType", { length: 32 }),
  bodyText: text("bodyText").notNull(),
  storageUrl: text("storageUrl"),
  version: int("version").default(1).notNull(),
  reviewStatus: mysqlEnum("reviewStatus", ["pending", "approved", "rejected"]).default("pending").notNull(),
  uploadedByUserId: int("uploadedByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type KnowledgeSource = typeof knowledgeSources.$inferSelect;
export type InsertKnowledgeSource = typeof knowledgeSources.$inferInsert;

/** Governance log for every AI-generated output: which sources grounded it, confidence, and review status. */
export const aiOutputLogs = mysqlTable("ai_output_logs", {
  id: varchar("id", { length: 64 }).primaryKey(),
  feature: varchar("feature", { length: 64 }).notNull(),
  nominationId: varchar("nominationId", { length: 64 }),
  userId: int("userId"),
  outputText: text("outputText").notNull(),
  sourceIdsJson: text("sourceIdsJson"),
  confidence: int("confidence"),
  reviewStatus: mysqlEnum("reviewStatus", ["unreviewed", "approved", "flagged"]).default("unreviewed").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AiOutputLog = typeof aiOutputLogs.$inferSelect;
export type InsertAiOutputLog = typeof aiOutputLogs.$inferInsert;

/** SIEM-ready structured security event log, separate from the business audit trail. */
export const securityEvents = mysqlTable("security_events", {
  id: varchar("id", { length: 64 }).primaryKey(),
  type: varchar("type", { length: 64 }).notNull(),
  actorUserId: int("actorUserId"),
  ip: varchar("ip", { length: 64 }),
  metadataJson: text("metadataJson"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SecurityEvent = typeof securityEvents.$inferSelect;
export type InsertSecurityEvent = typeof securityEvents.$inferInsert;
