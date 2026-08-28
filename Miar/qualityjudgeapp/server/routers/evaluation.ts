import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { invokeLLM } from "../_core/llm";
import { storagePut, scanBufferForMalware } from "../storage";
import { extractEvidenceText } from "../extraction";
import { createCorrectiveAction, logAiOutput } from "../institutionalDb";
import {
  createNominationRecord,
  getNominationsByUserId,
  getNominationById,
  updateNominationScores,
  deleteNominationRecord,
  deleteAllNominationsByUserId,
  replaceEvaluationDecision,
  type NormalizedDecisionInput,
} from "../dbNomination";
import {
  addAuditEvent,
  createJudgeAssignment,
  getAssignmentsForJudge,
  getAssignmentForJudge,
  getAuditEventsForNomination,
  deleteAuditEventsForNomination,
  markAssignmentComplete,
} from "../dbGovernance";
import { JUDGING_PROGRAMS, RUBRIC, computeOverall, classify, EVIDENCE_TYPES } from "../../shared/judge";
import { canAccessEvaluation } from "../../shared/governance";
import { FREE_TRIAL_ATTEMPT_LIMIT } from "../../shared/trial";
import { ADMIN_PROVISIONED_LOGIN_METHOD, consumeTrialAttempt, getTrialStatus, releaseTrialAttempt, getAdminDashboardData, getAdminUsersData, resetTrialAttempts, updateUserRole, getUserById, createManagedUser, updateManagedUser, deleteUserAccount, getAwardSamples, getAwardSampleById, updateAwardSampleRecord, deleteAwardSampleRecord, toAwardSampleView, getAwardsCatalog, createAwardRecord, updateAwardRecord, deleteAwardRecord, getGovernedCriteriaRecords, updateGovernedCriterionStatus, getWeightTemplates, createWeightTemplate, updateWeightTemplateStatus } from "../db";

const weightTemplateInput = z.object({
  nameAr: z.string().trim().min(2).max(240),
  nameEn: z.string().trim().min(2).max(240),
  programType: z.string().trim().min(2).max(64),
  weights: z.record(z.string(), z.number().min(0).max(100)).refine((weights) => Object.values(weights).reduce((sum, weight) => sum + weight, 0) === 100, "Weights must total 100%"),
});

const awardCatalogInput = z.object({
  titleAr: z.string().trim().min(2).max(240),
  titleEn: z.string().trim().min(2).max(240),
  organizerAr: z.string().trim().min(2).max(240),
  organizerEn: z.string().trim().min(2).max(240),
  countryAr: z.string().trim().max(120).optional(),
  countryEn: z.string().trim().max(120).optional(),
  sector: z.string().trim().min(2).max(64),
  level: z.string().trim().min(2).max(32),
  category: z.string().trim().min(2).max(64),
  eligibilityAr: z.string().trim().min(10).max(2000),
  eligibilityEn: z.string().trim().min(10).max(2000),
  deadline: z.string().datetime().nullable().optional(),
  status: z.enum(["draft", "active", "closed"]),
  criteria: z.array(z.object({
    criterionKey: z.string().trim().min(1).max(128),
    nameAr: z.string().trim().min(2).max(240),
    nameEn: z.string().trim().min(2).max(240),
    descriptionAr: z.string().trim().max(1000).optional(),
    descriptionEn: z.string().trim().max(1000).optional(),
    weight: z.number().int().min(1).max(100),
    evidenceRequired: z.boolean(),
    evidenceRequirementsAr: z.string().trim().min(5).max(1200).optional(),
    evidenceRequirementsEn: z.string().trim().min(5).max(1200).optional(),
    kpiAr: z.string().trim().max(500).optional(),
    kpiEn: z.string().trim().max(500).optional(),
  })).min(1).max(30),
  eligibilityRules: z.array(z.object({
    ruleKey: z.string().trim().min(1).max(128),
    nameAr: z.string().trim().min(2).max(240),
    nameEn: z.string().trim().min(2).max(240),
    descriptionAr: z.string().trim().min(5).max(1200),
    descriptionEn: z.string().trim().min(5).max(1200),
    required: z.boolean(),
  })).min(1).max(30),
});

function awardCatalogError(error: unknown): never {
  if (error instanceof Error && error.message === "AWARD_WEIGHTS_MUST_TOTAL_100") throw new TRPCError({ code: "BAD_REQUEST", message: "Award criteria weights must total 100%" });
  if (error instanceof Error && error.message === "AWARD_CRITERIA_DUPLICATE") throw new TRPCError({ code: "BAD_REQUEST", message: "Award criteria keys must be unique" });
  if (error instanceof Error && error.message === "AWARD_CRITERIA_REQUIRED") throw new TRPCError({ code: "BAD_REQUEST", message: "At least one award criterion is required" });
  if (error instanceof Error && error.message === "AWARD_ELIGIBILITY_RULES_REQUIRED") throw new TRPCError({ code: "BAD_REQUEST", message: "At least one eligibility rule is required" });
  if (error instanceof Error && error.message === "AWARD_ELIGIBILITY_DUPLICATE") throw new TRPCError({ code: "BAD_REQUEST", message: "Eligibility rule keys must be unique" });
  throw error;
}

export const evaluationRouter = router({
  trialStatus: protectedProcedure.query(({ ctx }) => getTrialStatus(ctx.user.id)),

  adminDashboard: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Only administrators can access the control center" });
    return getAdminDashboardData();
  }),

  adminUsers: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Only administrators can manage users" });
    return getAdminUsersData();
  }),

  awardLibrary: protectedProcedure.query(async () => getAwardSamples()),

  awardCatalog: protectedProcedure.query(async ({ ctx }) => getAwardsCatalog(ctx.user.role === "admin")),

  governedCriteria: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Only administrators can manage governed criteria" });
    return getGovernedCriteriaRecords();
  }),

  updateGovernedCriterionStatus: protectedProcedure.input(z.object({ id: z.string().min(1), status: z.enum(["draft", "approved", "retired"]) })).mutation(async ({ ctx, input }) => {
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Only administrators can update criteria status" });
    return updateGovernedCriterionStatus(input.id, input.status, ctx.user.id);
  }),

  weightTemplates: protectedProcedure.query(async ({ ctx }) => getWeightTemplates(ctx.user.id, ctx.user.role === "admin")),

  createWeightTemplate: protectedProcedure.input(weightTemplateInput).mutation(async ({ ctx, input }) => {
    return createWeightTemplate({ ...input, ownerUserId: ctx.user.id });
  }),

  updateWeightTemplateStatus: protectedProcedure.input(z.object({ id: z.string().min(1), status: z.enum(["draft", "approved", "retired"]) })).mutation(async ({ ctx, input }) => {
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Only administrators can approve weight templates" });
    return updateWeightTemplateStatus(input.id, input.status, ctx.user.id);
  }),

  createAward: protectedProcedure
    .input(awardCatalogInput)
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Only administrators can create awards" });
      try {
        return await createAwardRecord({ ...input, countryAr: input.countryAr || undefined, countryEn: input.countryEn || undefined, deadline: input.deadline ? new Date(input.deadline) : null, createdByUserId: ctx.user.id });
      } catch (error) {
        return awardCatalogError(error);
      }
    }),

  updateAward: protectedProcedure
    .input(awardCatalogInput.extend({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Only administrators can update awards" });
      try {
        const { id, ...patch } = input;
        const updated = await updateAwardRecord(id, { ...patch, countryAr: patch.countryAr || undefined, countryEn: patch.countryEn || undefined, deadline: patch.deadline ? new Date(patch.deadline) : null });
        if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "Award not found" });
        return updated;
      } catch (error) {
        return awardCatalogError(error);
      }
    }),

  deleteAward: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Only administrators can delete awards" });
      const deleted = await deleteAwardRecord(input.id);
      if (!deleted) throw new TRPCError({ code: "NOT_FOUND", message: "Award not found" });
      return { success: true, id: input.id };
    }),

  awardSamples: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Only administrators can manage award samples" });
    return getAwardSamples();
  }),

  updateAwardSample: protectedProcedure
    .input(z.object({
      id: z.string().min(1),
      nameAr: z.string().min(1),
      nameEn: z.string().min(1),
      organizationAr: z.string().min(1),
      organizationEn: z.string().min(1),
      programType: z.enum(["excellence", "graduation", "tenders", "performance"]),
      score: z.number().int().min(0).max(100),
      tier: z.enum(["gold", "silver", "bronze"]),
      awardAr: z.string().min(1),
      awardEn: z.string().min(1),
      summaryAr: z.string().min(1),
      summaryEn: z.string().min(1),
      rationaleAr: z.string().min(1),
      rationaleEn: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Only administrators can edit award samples" });
      const updated = await updateAwardSampleRecord(input.id, {
        nameAr: input.nameAr,
        nameEn: input.nameEn,
        organizationAr: input.organizationAr,
        organizationEn: input.organizationEn,
        programType: input.programType,
        score: input.score,
        tier: input.tier,
        awardAr: input.awardAr,
        awardEn: input.awardEn,
        summaryAr: input.summaryAr,
        summaryEn: input.summaryEn,
        rationaleAr: input.rationaleAr,
        rationaleEn: input.rationaleEn,
      });
      if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "Award sample not found" });
      const row = await getAwardSampleById(input.id);
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Award sample not found" });
      return toAwardSampleView(row);
    }),

  deleteAwardSample: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Only administrators can delete award samples" });
      const deleted = await deleteAwardSampleRecord(input.id);
      if (!deleted) throw new TRPCError({ code: "NOT_FOUND", message: "Award sample not found" });
      return { success: true, id: input.id };
    }),

  generateAwardSampleDescription: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Only administrators can generate award-sample descriptions" });
      const row = await getAwardSampleById(input.id);
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Award sample not found" });
      const source = JSON.stringify({
        nameAr: row.nameAr,
        nameEn: row.nameEn,
        organizationAr: row.organizationAr,
        organizationEn: row.organizationEn,
        programType: row.programType,
        score: row.score,
        tier: row.tier,
        awardAr: row.awardAr,
        awardEn: row.awardEn,
        rationaleAr: row.rationaleAr,
        rationaleEn: row.rationaleEn,
        metrics: JSON.parse(row.metricsJson),
      }).slice(0, 12000);
      const response = await invokeLLM({
        messages: [
          { role: "system", content: "You are Mi'yar Copilot. Write brief, evidence-grounded descriptions for clearly labeled illustrative award samples. Use only the supplied fields. Never invent organizations, outcomes, metrics, dates, or beneficiaries. Return valid JSON only." },
          { role: "user", content: `Write a concise 25-45 word description in Arabic and English for this illustrative award sample. Mention the type of work, its strongest demonstrated value, and that the result is illustrative when appropriate. SOURCE:\n${source}` },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "award_sample_descriptions",
            strict: true,
            schema: {
              type: "object",
              properties: {
                summaryAr: { type: "string", description: "Brief Arabic sample description" },
                summaryEn: { type: "string", description: "Brief English sample description" },
              },
              required: ["summaryAr", "summaryEn"],
              additionalProperties: false,
            },
          },
        },
      });
      const rawContent = (response.choices[0]?.message?.content as string) || "{}";
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(rawContent);
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "تعذر قراءة الوصف الذكي للنموذج." });
      }
      if (typeof parsed.summaryAr !== "string" || !parsed.summaryAr.trim() || typeof parsed.summaryEn !== "string" || !parsed.summaryEn.trim()) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "أعاد Copilot وصفاً غير مكتمل للنموذج." });
      }
      const updated = await updateAwardSampleRecord(input.id, { summaryAr: parsed.summaryAr.trim(), summaryEn: parsed.summaryEn.trim() });
      if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "Award sample not found" });
      const updatedRow = await getAwardSampleById(input.id);
      if (!updatedRow) throw new TRPCError({ code: "NOT_FOUND", message: "Award sample not found" });
      void logAiOutput({ feature: "award_sample_description", userId: ctx.user.id, outputText: `${parsed.summaryAr}\n${parsed.summaryEn}` });
      return { sample: toAwardSampleView(updatedRow), generatedAt: new Date().toISOString() };
    }),

  resetUserTrial: protectedProcedure
    .input(z.object({ userId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Only administrators can reset trial attempts" });
      const reset = await resetTrialAttempts(input.userId);
      if (!reset) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      return { success: true, userId: input.userId, remainingAttempts: 5 };
    }),

  updateUserRole: protectedProcedure
    .input(z.object({ userId: z.number().int().positive(), role: z.enum(["admin", "user"]) }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Only administrators can manage user roles" });
      if (ctx.user.id === input.userId) throw new TRPCError({ code: "FORBIDDEN", message: "You cannot change your own administrator role" });
      const updated = await updateUserRole(input.userId, input.role);
      if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      return { success: true, userId: input.userId, role: input.role };
    }),

  createUser: protectedProcedure
    .input(z.object({ name: z.string().trim().min(2).max(120), email: z.string().trim().email().max(320), role: z.enum(["admin", "user"]), trialAttempts: z.number().int().min(0).max(FREE_TRIAL_ATTEMPT_LIMIT) }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Only administrators can create users" });
      try {
        const created = await createManagedUser(input);
        return { success: true, userId: created.id, provisioned: true };
      } catch (error) {
        if (error instanceof Error && error.message === "USER_EMAIL_EXISTS") throw new TRPCError({ code: "CONFLICT", message: "A user with this email already exists" });
        throw error;
      }
    }),

  updateUser: protectedProcedure
    .input(z.object({ userId: z.number().int().positive(), name: z.string().trim().min(2).max(120), email: z.string().trim().email().max(320), role: z.enum(["admin", "user"]), trialAttempts: z.number().int().min(0).max(FREE_TRIAL_ATTEMPT_LIMIT) }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Only administrators can edit users" });
      if (ctx.user.id === input.userId && input.role !== ctx.user.role) throw new TRPCError({ code: "FORBIDDEN", message: "You cannot change your own administrator role" });
      const current = await getUserById(input.userId);
      if (!current) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      const normalizedEmail = input.email.trim().toLowerCase();
      if (current.loginMethod !== ADMIN_PROVISIONED_LOGIN_METHOD && normalizedEmail !== (current.email || "").trim().toLowerCase()) {
        throw new TRPCError({ code: "FORBIDDEN", message: "OAuth-managed email addresses cannot be changed here" });
      }
      try {
        const updated = await updateManagedUser(input.userId, { name: input.name, email: normalizedEmail, role: input.role, trialAttempts: input.trialAttempts });
        if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
        return { success: true, userId: input.userId };
      } catch (error) {
        if (error instanceof Error && error.message === "USER_EMAIL_EXISTS") throw new TRPCError({ code: "CONFLICT", message: "A user with this email already exists" });
        throw error;
      }
    }),

  deleteUser: protectedProcedure
    .input(z.object({ userId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Only administrators can delete users" });
      if (ctx.user.id === input.userId) throw new TRPCError({ code: "FORBIDDEN", message: "You cannot delete your current account" });
      const deleted = await deleteUserAccount(input.userId);
      if (!deleted) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      return { success: true, userId: input.userId };
    }),

  judgeTasks: protectedProcedure.query(async ({ ctx }) => {
    const assignments = await getAssignmentsForJudge(ctx.user.id);
    const tasks = [];
    for (const assignment of assignments) {
      const nomination = await getNominationById(assignment.nominationId);
      if (!nomination) continue;
      tasks.push({
        assignmentId: assignment.id,
        nominationId: assignment.nominationId,
        status: assignment.status,
        assignedAt: assignment.assignedAt.toISOString(),
        dueAt: assignment.dueAt?.toISOString() || null,
        completedAt: assignment.completedAt?.toISOString() || null,
        name: nomination.name,
        awardTitle: nomination.awardTitle,
        overall: nomination.overallScore,
        tier: nomination.tier,
      });
    }
    return tasks;
  }),

  assignJudge: protectedProcedure
    .input(z.object({ nominationId: z.string(), judgeUserId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Only administrators can assign judges" });
      const nomination = await getNominationById(input.nominationId);
      if (!nomination) throw new TRPCError({ code: "NOT_FOUND", message: "Nomination not found" });
      const assignment = {
        id: crypto.randomUUID(),
        nominationId: input.nominationId,
        judgeUserId: input.judgeUserId,
        status: "assigned",
        dueAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      } as const;
      await createJudgeAssignment(assignment);
      await addAuditEvent({
        id: crypto.randomUUID(),
        nominationId: input.nominationId,
        actorUserId: ctx.user.id,
        action: "judge_assigned",
        previousValue: null,
        newValue: JSON.stringify({ judgeUserId: input.judgeUserId, dueAt: assignment.dueAt.toISOString() }),
        metadataJson: JSON.stringify({ assignmentId: assignment.id }),
      });
      return assignment;
    }),

  auditTrail: protectedProcedure
    .input(z.object({ nominationId: z.string() }))
    .query(async ({ ctx, input }) => {
      const owned = await getNominationById(input.nominationId, ctx.user.id);
      const assigned = await getAssignmentForJudge(input.nominationId, ctx.user.id);
      if (!canAccessEvaluation(ctx.user.role, Boolean(owned), Boolean(assigned))) throw new TRPCError({ code: "FORBIDDEN", message: "You do not have access to this audit trail" });
      const events = await getAuditEventsForNomination(input.nominationId);
      return events.map((event) => ({ ...event, createdAt: event.createdAt.toISOString() }));
    }),

  updateScores: protectedProcedure
    .input(z.object({
      nominationId: z.string(),
      criteria: z.record(z.string(), z.object({ score: z.number().min(0).max(10), note: z.string() })),
      signatureData: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const owned = await getNominationById(input.nominationId, ctx.user.id);
      const assignment = await getAssignmentForJudge(input.nominationId, ctx.user.id);
      const nomination = owned || (assignment ? await getNominationById(input.nominationId) : null);
      if (!nomination && !canAccessEvaluation(ctx.user.role, Boolean(owned), Boolean(assignment))) throw new TRPCError({ code: "FORBIDDEN", message: "You do not have access to update this evaluation" });
      if (!nomination) throw new TRPCError({ code: "NOT_FOUND", message: "Nomination not found" });

      const persistedProgram = JUDGING_PROGRAMS[nomination.programType as keyof typeof JUDGING_PROGRAMS] || JUDGING_PROGRAMS.excellence;
      const weights = nomination.weightsJson ? JSON.parse(nomination.weightsJson) as Array<{ key: string; weight: number }> : persistedProgram.rubric;
      const totalWeight = weights.reduce((sum, item) => sum + item.weight, 0) || 100;
      const overall = Math.round(weights.reduce((sum, item) => sum + ((input.criteria[item.key]?.score || 0) / 10) * item.weight, 0) / totalWeight * 100);
      const tier = classify(overall).key;
      const previousValue = JSON.stringify({ overall: nomination.overallScore, criteria: JSON.parse(nomination.criteriaJson || "{}") });
      const effectiveSignature = input.signatureData ?? nomination.signatureData ?? null;
      const decisionId = assignment ? `dec_${input.nominationId}_assigned_${ctx.user.id}` : `dec_${input.nominationId}_aggregate`;
      await updateNominationScores(input.nominationId, overall, tier, JSON.stringify(input.criteria), effectiveSignature);
      await replaceEvaluationDecision({
        decision: {
          id: decisionId,
          nominationId: input.nominationId,
          judgeUserId: assignment ? ctx.user.id : null,
          judgeKey: assignment ? `user_${ctx.user.id}` : "aggregate",
          decisionType: assignment ? "judge" : "aggregate",
          status: "final",
          overallScore: overall,
          tier,
          decisionText: null,
          metadataJson: JSON.stringify({ source: "score_update", mode: assignment ? "assigned_judge" : "owner" }),
        },
        criteria: Object.entries(input.criteria).map(([criterionKey, criterion]) => ({
          id: `score_${decisionId}_${criterionKey}`,
          nominationId: input.nominationId,
          decisionId,
          criterionKey,
          scoreTenths: Math.round(criterion.score * 10),
          note: criterion.note || null,
        })),
        signature: effectiveSignature ? {
          id: `sig_${decisionId}`,
          nominationId: input.nominationId,
          decisionId,
          signerUserId: ctx.user.id,
          signatureData: effectiveSignature,
        } : undefined,
      });
      await addAuditEvent({
        id: crypto.randomUUID(),
        nominationId: input.nominationId,
        actorUserId: ctx.user.id,
        action: "scores_modified",
        previousValue,
        newValue: JSON.stringify({ overall, criteria: input.criteria }),
        metadataJson: JSON.stringify({ source: assignment ? "assigned_judge" : "owner" }),
      });
      if (input.signatureData) {
        await addAuditEvent({
          id: crypto.randomUUID(),
          nominationId: input.nominationId,
          actorUserId: ctx.user.id,
          action: nomination.signatureData ? "signature_updated" : "signature_signed",
          previousValue: nomination.signatureData ? "signed" : "unsigned",
          newValue: "signed",
          metadataJson: JSON.stringify({ timestamp: new Date().toISOString() }),
        });
      }
      if (assignment) await markAssignmentComplete(input.nominationId, ctx.user.id);
      return { overall, tier, signedAt: input.signatureData ? new Date().toISOString() : null };
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    const rows = await getNominationsByUserId(ctx.user.id);
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      awardTitle: r.awardTitle,
      programType: r.programType || "excellence",
      date: r.createdAt.toISOString(),
      overall: r.overallScore,
      tier: r.tier,
      fileCount: r.fileCount,
      criteria: r.criteriaJson ? JSON.parse(r.criteriaJson) : {},
    }));
  }),

  getDetail: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const r = await getNominationById(input.id, ctx.user.id);
      if (!r) return null;
      const legacyCriteria = r.criteriaJson ? JSON.parse(r.criteriaJson) : {};
      const legacyJudges = r.judgesJson ? JSON.parse(r.judgesJson) : [];
      const aggregateDecision = r.decisionRecords?.find((decision) => decision.decisionType === "aggregate");
      const evidenceForCriterion = (criterionKey: string, judgeKey?: string | null) => (r.evidenceItems || [])
        .filter((item) => item.criterionKey === criterionKey && (!judgeKey || !item.judgeKey || item.judgeKey === judgeKey))
        .map((item) => ({ name: item.fileName, url: item.storageUrl, storageKey: item.storageKey }));
      const normalizedCriteria = aggregateDecision ? Object.fromEntries(aggregateDecision.criteria.map((score) => [score.criterionKey, { score: score.scoreTenths / 10, note: score.note || "", evidence: evidenceForCriterion(score.criterionKey) }])) : null;
      const normalizedJudges = (r.decisionRecords || [])
        .filter((decision) => decision.decisionType === "judge")
        .map((decision) => ({
          name: (() => {
            try { return JSON.parse(decision.metadataJson || "{}").judgeName || decision.judgeKey || "Judge"; } catch { return decision.judgeKey || "Judge"; }
          })(),
          overall: decision.overallScore,
          criteria: Object.fromEntries(decision.criteria.map((score) => [score.criterionKey, { score: score.scoreTenths / 10, note: score.note || "", evidence: evidenceForCriterion(score.criterionKey, decision.judgeKey) }]))
        }));
      return {
        id: r.id,
        name: r.name,
        awardTitle: r.awardTitle,
        programType: r.programType || "excellence",
        date: r.createdAt.toISOString(),
        overall: aggregateDecision?.overallScore ?? r.overallScore,
        tier: aggregateDecision?.tier ?? r.tier,
        criteria: normalizedCriteria || legacyCriteria,
        kpi_findings: aggregateDecision?.decisionText || r.kpiFindings || "",
        strengths: r.strengthsJson ? JSON.parse(r.strengthsJson) : [],
        weaknesses: r.weaknessesJson ? JSON.parse(r.weaknessesJson) : [],
        recommendations: r.recommendationsJson ? JSON.parse(r.recommendationsJson) : [],
        coverage: JSON.parse(r.coverageJson || "[]"),
        fileCount: r.fileCount,
        judgeCount: r.judgeCount,
        judges: normalizedJudges.length ? normalizedJudges : legacyJudges,
        weights: r.weightsJson ? JSON.parse(r.weightsJson) : null,
        signatureData: aggregateDecision?.signature?.signatureData || r.signatureData || null,
        evidenceItems: r.evidenceItems || [],
        normalizedDecisionCount: r.decisionRecords?.length || 0,
      };
    }),

  generateSummary: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const owned = await getNominationById(input.id, ctx.user.id);
      const assignment = await getAssignmentForJudge(input.id, ctx.user.id);
      const nomination = owned || (assignment ? await getNominationById(input.id) : null);
      if (!nomination) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Nomination not found" });
      }

      const programConfig = JUDGING_PROGRAMS[nomination.programType as keyof typeof JUDGING_PROGRAMS] || JUDGING_PROGRAMS.excellence;
      const rubric = nomination.weightsJson ? JSON.parse(nomination.weightsJson) : programConfig.rubric;
      const criteria = nomination.criteriaJson ? JSON.parse(nomination.criteriaJson) : {};
      const strengths = nomination.strengthsJson ? JSON.parse(nomination.strengthsJson) : [];
      const weaknesses = nomination.weaknessesJson ? JSON.parse(nomination.weaknessesJson) : [];
      const recommendations = nomination.recommendationsJson ? JSON.parse(nomination.recommendationsJson) : [];
      const judges = nomination.judgesJson ? JSON.parse(nomination.judgesJson) : [];
      const coverage = nomination.coverageJson ? JSON.parse(nomination.coverageJson) : [];
      const evidenceSummary = coverage.map((item: { key: string; label?: string; covered?: boolean }) => `${item.key}: ${item.covered ? "covered" : "not covered"}`).join("\\n");
      const sourceData = JSON.stringify({
        nomination: { name: nomination.name, awardTitle: nomination.awardTitle, programType: nomination.programType, overallScore: nomination.overallScore, tier: nomination.tier, fileCount: nomination.fileCount, judgeCount: nomination.judgeCount },
        program: { ar: programConfig.name.ar, en: programConfig.name.en },
        rubric,
        criteria,
        kpiFindings: nomination.kpiFindings || "",
        strengths,
        weaknesses,
        recommendations,
        judges,
        evidenceCoverage: evidenceSummary,
      }).slice(0, 28000);

      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: "You are Mi'yar Copilot, an evidence-grounded professional evaluation writer. Use only the supplied evaluation data. Never invent achievements, metrics, participants, dates, organizations, or facts. If information is missing, describe the limitation neutrally. Return only valid JSON matching the schema.",
          },
          {
            role: "user",
            content: `Write two concise but polished summaries for this evaluated nomination. The first is a nomination profile summary explaining what was submitted, its purpose, evidence coverage, and strongest demonstrated value. The second is an awarded-decision summary explaining why the result and tier were reached, referencing only recorded strengths, scores, evidence coverage, and recommendations. Produce both Arabic and English versions. Keep each summary between 80 and 150 words, professional and suitable for an official report. Do not claim that the nomination won an award unless the recorded tier supports that wording; otherwise call it an evaluation decision.\n\nSOURCE EVALUATION DATA:\n${sourceData}`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "miyar_evaluation_summaries",
            strict: true,
            schema: {
              type: "object",
              properties: {
                headlineAr: { type: "string", description: "Short Arabic report headline" },
                headlineEn: { type: "string", description: "Short English report headline" },
                nominationSummaryAr: { type: "string", description: "Arabic nomination profile summary" },
                nominationSummaryEn: { type: "string", description: "English nomination profile summary" },
                awardSummaryAr: { type: "string", description: "Arabic award or evaluation decision summary" },
                awardSummaryEn: { type: "string", description: "English award or evaluation decision summary" },
              },
              required: ["headlineAr", "headlineEn", "nominationSummaryAr", "nominationSummaryEn", "awardSummaryAr", "awardSummaryEn"],
              additionalProperties: false,
            },
          },
        },
      });

      const rawContent = (response.choices[0]?.message?.content as string) || "{}";
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(rawContent);
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "تعذر قراءة الملخص الذكي. يرجى المحاولة مرة أخرى." });
      }

      const requiredKeys = ["headlineAr", "headlineEn", "nominationSummaryAr", "nominationSummaryEn", "awardSummaryAr", "awardSummaryEn"];
      if (requiredKeys.some((key) => typeof parsed[key] !== "string" || !(parsed[key] as string).trim())) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "أعاد المساعد الذكي ملخصاً غير مكتمل. يرجى المحاولة مرة أخرى." });
      }

      // AI-output governance: log this generated summary against the source
      // evaluation data it was grounded in, for later admin review.
      void logAiOutput({
        feature: "nomination_summary",
        nominationId: nomination.id,
        userId: ctx.user.id,
        outputText: `${parsed.nominationSummaryEn}\n${parsed.awardSummaryEn}`,
      });

      return {
        id: nomination.id,
        programType: nomination.programType || "excellence",
        generatedAt: new Date().toISOString(),
        headlineAr: parsed.headlineAr as string,
        headlineEn: parsed.headlineEn as string,
        nominationSummaryAr: parsed.nominationSummaryAr as string,
        nominationSummaryEn: parsed.nominationSummaryEn as string,
        awardSummaryAr: parsed.awardSummaryAr as string,
        awardSummaryEn: parsed.awardSummaryEn as string,
      };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await deleteNominationRecord(input.id, ctx.user.id);
      return { success: true };
    }),

  clearAll: protectedProcedure.mutation(async ({ ctx }) => {
    await deleteAllNominationsByUserId(ctx.user.id);
    return { success: true };
  }),

  evaluate: protectedProcedure
    .input(
      z.object({
        nomineeName: z.string(),
        awardTitle: z.string(),
        programType: z.enum(["excellence", "graduation", "tenders", "performance"]).default("excellence"),
        context: z.string(),
        files: z.array(
          z.object({
            name: z.string(),
            type: z.string(),
            contentBase64: z.string(),
            mimeType: z.string().optional(),
          })
        ),
        weights: z.record(z.string(), z.number()).optional(),
        judgeCount: z.number().int().min(1).max(5).default(1),
        criterionNotes: z.record(z.string(), z.string()).optional(),
        criterionEvidence: z.record(z.string(), z.array(z.object({ name: z.string(), mimeType: z.string().optional(), contentBase64: z.string() }))).optional(),
        judgeCriterionNotes: z.record(z.string(), z.record(z.string(), z.string())).optional(),
        judgeCriterionEvidence: z.record(z.string(), z.record(z.string(), z.array(z.object({ name: z.string(), mimeType: z.string().optional(), contentBase64: z.string() })))).optional(),
        signatureData: z.string().optional(),
        classification: z.enum(["public", "internal", "confidential", "highly_confidential"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const trialStatus = await getTrialStatus(ctx.user.id);
      if (trialStatus.exhausted) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "لقد استنفدت المحاولات الـ 5 المتاحة في النسخة التجريبية المجانية. يرجى التواصل معنا للاشتراك.",
        });
      }

      const programConfig = JUDGING_PROGRAMS[input.programType];
      const activeRubric = programConfig.rubric.map((item) => ({
        ...item,
        weight: input.weights?.[item.key] ?? item.weight,
      }));

      const sumWeights = activeRubric.reduce((acc, cur) => acc + cur.weight, 0);
      if (sumWeights !== 100) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "مجموع أوزان المعايير يجب أن يساوي 100%",
        });
      }
      // 1. Process files and store in S3 while compiling text bundle and images
      let textBundle = "";
      const images: Array<{ type: "image_url"; image_url: { url: string; detail?: string } }> = [];
      const presentTypes = new Set<string>();
      const evidenceMetadataList: Array<{
        id: string;
        nominationId: string;
        fileName: string;
        fileType: string;
        storageKey: string;
        storageUrl: string;
        fileSize: number;
        criterionKey?: string | null;
        judgeKey?: string | null;
        uploadedByUserId?: number | null;
        mimeType?: string | null;
        extractedText?: string | null;
        classification?: "public" | "internal" | "confidential" | "highly_confidential";
        malwareScanStatus?: "pending" | "clean" | "infected" | "skipped";
      }> = [];

      const nominationId = "nom_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);

      for (const f of input.files) {
        if (f.type && f.type !== "other") presentTypes.add(f.type);
        const buffer = Buffer.from(f.contentBase64, "base64");
        let storageKey = `${ctx.user.id}-evidence/${f.name}`;
        let storageUrl = "";
        try {
          const putRes = await storagePut(storageKey, buffer, f.mimeType || "application/octet-stream");
          storageKey = putRes.key;
          storageUrl = putRes.url;
        } catch (err) {
          console.error("Storage upload warning:", err);
          storageUrl = `/uploads/${storageKey}`;
        }
        const malwareScanStatus = await scanBufferForMalware(buffer).catch(() => "skipped" as const);

        let extractedText: string | null = null;
        const ext = f.name.split(".").pop()?.toLowerCase() || "";
        const isImage = ["jpg", "jpeg", "png", "webp"].includes(ext);

        if (isImage) {
          if (images.length < 4) {
            images.push({
              type: "image_url",
              image_url: {
                url: `data:${f.mimeType || "image/jpeg"};base64,${f.contentBase64}`,
                detail: "auto",
              },
            });
          }
        } else {
          try {
            const typeLabel = EVIDENCE_TYPES.find((e) => e.key === f.type)?.label || "دليل";
            const extracted = await extractEvidenceText(f.name, buffer);
            extractedText = extracted ? extracted.slice(0, 5000) : null;
            textBundle += `\n== [${typeLabel}] ${f.name} ==\n${(extracted || "تم رفع الملف بنجاح دون نص قابل للاستخراج").slice(0, 5000)}\n`;
          } catch (e) {
            extractedText = null;
            textBundle += `\n== [ملف] ${f.name} ==\n(تم رفع الملف بنجاح، وتعذر استخراج نصه)\n`;
          }
        }

        evidenceMetadataList.push({
          id: "ev_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
          nominationId,
          fileName: f.name,
          fileType: f.type || "other",
          storageKey,
          storageUrl,
          fileSize: buffer.length,
          criterionKey: null,
          judgeKey: null,
          uploadedByUserId: ctx.user.id,
          mimeType: f.mimeType || null,
          extractedText,
          classification: input.classification || "internal",
          malwareScanStatus,
        });
      }

      const criterionEvidenceSummary: Record<string, Array<{ name: string; url: string; storageKey: string }>> = {};
      for (const [criterionKey, attachments] of Object.entries(input.criterionEvidence || {})) {
        criterionEvidenceSummary[criterionKey] = [];
        for (const attachment of attachments) {
          const buffer = Buffer.from(attachment.contentBase64, "base64");
          let storageKey = `${ctx.user.id}-criterion-evidence/${criterionKey}/${attachment.name}`;
          let storageUrl = "";
          try {
            const putRes = await storagePut(storageKey, buffer, attachment.mimeType || "application/octet-stream");
            storageKey = putRes.key;
            storageUrl = putRes.url;
          } catch (err) {
            console.error("Criterion evidence storage warning:", err);
            storageUrl = `/uploads/${storageKey}`;
          }
          criterionEvidenceSummary[criterionKey].push({ name: attachment.name, url: storageUrl, storageKey });
          const criterionMalwareScanStatus = await scanBufferForMalware(buffer).catch(() => "skipped" as const);
          let extractedText: string | null = null;
          try {
            const extracted = await extractEvidenceText(attachment.name, buffer);
            extractedText = extracted ? extracted.slice(0, 3000) : null;
            textBundle += `\\n== [دليل معيار ${criterionKey}] ${attachment.name} ==\\n${(extracted || "تم رفع الدليل دون نص قابل للاستخراج").slice(0, 3000)}\\n`;
          } catch {
            textBundle += `\\n== [دليل معيار ${criterionKey}] ${attachment.name} ==\\n(تم رفع الملف بنجاح، وتعذر استخراج نصه)\\n`;
          }
          evidenceMetadataList.push({
            id: "ev_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
            nominationId,
            fileName: attachment.name,
            fileType: `criterion:${criterionKey}`,
            storageKey,
            storageUrl,
            fileSize: buffer.length,
            criterionKey,
            judgeKey: null,
            uploadedByUserId: ctx.user.id,
            mimeType: attachment.mimeType || null,
            extractedText,
            classification: input.classification || "internal",
            malwareScanStatus: criterionMalwareScanStatus,
          });
        }
      }

      textBundle = textBundle.slice(0, 14000);

      const systemPrompt = `أنت محكّم خبير ومقيّم معتمد لأنظمة التحكيم المتعددة (التميز، مشاريع التخرج، العطاءات، والأداء). مهمتك هي تقييم ملف الترشيح أو العمل بدقة عالية بناءً على الأدلة المرفقة، وسياق التقييم المرجعي، ومعايير التقييم المعتمدة.
يجب أن يكون ردك حصرياً بصيغة JSON متوافقة تماماً مع الـ Schema المطلوبة وبدون أي نصوص إضافية خارج الـ JSON.`;

      const userPrompt = `اسم المبادرة / المرشّح: ${input.nomineeName}
عنوان الجائزة: ${input.awardTitle}

سياق المبادرة المرجعي:
${input.context}

النص المستخرج من ملفات الأدلة المرفقة:
${textBundle || "لا توجد نصوص نصية مستخرجة، يرجى الاعتماد على الصور المرفقة إن وجدت."}

	معايير التقييم وأوزانها المخصصة:
	${JSON.stringify(activeRubric, null, 2)}

قم بتقييم كل معيار من 0 إلى 10 مع كتابة ملاحظة توضيحية دقيقة باللغة العربية، واستخرج مؤشرات الأداء (KPI Findings)، ونقاط القوة، ونقاط تحتاج تحسيناً، والتوصيات التطويرية.`;

      const messages: Array<{ role: "system" | "user" | "assistant"; content: any }> = [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: userPrompt },
            ...images,
          ],
        },
      ];

      const llmResponse = await invokeLLM({
        messages: messages as any,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "nomination_evaluation",
            strict: true,
            schema: {
              type: "object",
              properties: {
                criteria: {
                  type: "object",
                  properties: Object.fromEntries(
                    activeRubric.map((item) => [
                      item.key,
                      {
                        type: "object",
                        properties: {
                          score: { type: "integer", description: `Score for ${item.name} from 0 to 10` },
                          note: { type: "string", description: `Evaluation note for ${item.name} in Arabic` },
                        },
                        required: ["score", "note"],
                        additionalProperties: false,
                      },
                    ])
                  ),
                  required: activeRubric.map((item) => item.key),
                  additionalProperties: false,
                },
                kpi_findings: { type: "string", description: "Key KPI findings summary in Arabic" },
                strengths: {
                  type: "array",
                  items: { type: "string" },
                  description: "Key strengths points in Arabic",
                },
                weaknesses: {
                  type: "array",
                  items: { type: "string" },
                  description: "Areas for improvement in Arabic",
                },
                recommendations: {
                  type: "array",
                  items: { type: "string" },
                  description: "Strategic recommendations in Arabic",
                },
              },
              required: [
                "criteria",
                "kpi_findings",
                "strengths",
                "weaknesses",
                "recommendations",
              ],
              additionalProperties: false,
            },
          },
        },
      });

      const rawContent = (llmResponse.choices[0]?.message?.content as string) || "{}";
      let parsedEval: {
        criteria: Record<string, { score: number; note: string }>;
        kpi_findings: string;
        strengths: string[];
        weaknesses: string[];
        recommendations: string[];
      };
      try {
        parsedEval = JSON.parse(rawContent);
      } catch {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "تعذر قراءة تقرير الذكاء الاصطناعي. لم يتم حفظ الترشيح، يرجى المحاولة مرة أخرى.",
        });
      }

      const computeCustomOverall = (criteria: Record<string, { score: number }>) => {
        let totalWeighted = 0;
        let totalWeight = 0;
        for (const item of activeRubric) {
          const score = criteria[item.key]?.score ?? 0;
          totalWeighted += score * item.weight;
          totalWeight += item.weight;
        }
        if (totalWeight === 0) return 0;
        return Math.round((totalWeighted / totalWeight) * 10);
      };

      // Apply judge-authored criterion notes and preserve criterion-level evidence references.
      const judgesList: Array<{ name: string; criteria: Record<string, { score: number; note: string; evidence?: Array<{ name: string; url: string; storageKey: string }> }>; overall: number }> = [];
      const baseCriteria = parsedEval.criteria || {};
      for (const [key, note] of Object.entries(input.criterionNotes || {})) {
        if (!baseCriteria[key]) baseCriteria[key] = { score: 0, note: "" };
        if (note.trim()) baseCriteria[key].note = [baseCriteria[key].note, `ملاحظة المحكم: ${note.trim()}`].filter(Boolean).join(" | ");
      }

      for (let j = 1; j <= input.judgeCount; j++) {
        const judgeKey = `judge_${j}`;
        const specificNotes = input.judgeCriterionNotes?.[judgeKey] || {};
        const specificEvidence = input.judgeCriterionEvidence?.[judgeKey] || {};
        const judgeCriteria: Record<string, { score: number; note: string; evidence?: Array<{ name: string; url: string; storageKey: string }> }> = {};
        
        for (const key of Object.keys(baseCriteria)) {
          const orig = baseCriteria[key];
          const variance = j === 1 ? 0 : (j % 2 === 0 ? 0.5 : -0.5);
          const adjScore = Math.max(0, Math.min(10, Math.round((orig.score + variance) * 10) / 10));
          
          let judgeNote = orig.note;
          if (specificNotes[key]?.trim()) {
            judgeNote = [judgeNote, `ملاحظة المحكم ${j}: ${specificNotes[key].trim()}`].filter(Boolean).join(" | ");
          }

          const judgeAttachments: Array<{ name: string; url: string; storageKey: string }> = [...(criterionEvidenceSummary[key] || [])];
          const judgeFiles = specificEvidence[key] || [];
          for (const att of judgeFiles) {
            const buf = Buffer.from(att.contentBase64, "base64");
            let sKey = `${ctx.user.id}-judge-${j}-criterion/${key}/${att.name}`;
            let sUrl = "";
            try {
              const pRes = await storagePut(sKey, buf, att.mimeType || "application/octet-stream");
              sKey = pRes.key;
              sUrl = pRes.url;
            } catch {
              sUrl = `/uploads/${sKey}`;
            }
            judgeAttachments.push({ name: att.name, url: sUrl, storageKey: sKey });
            const judgeMalwareScanStatus = await scanBufferForMalware(buf).catch(() => "skipped" as const);
            let extractedText: string | null = null;
            try {
              const extracted = await extractEvidenceText(att.name, buf);
              extractedText = extracted ? extracted.slice(0, 3000) : null;
            } catch {
              extractedText = null;
            }
            evidenceMetadataList.push({
              id: "ev_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
              nominationId,
              fileName: att.name,
              fileType: `judge:${j}:criterion:${key}`,
              storageKey: sKey,
              storageUrl: sUrl,
              fileSize: buf.length,
              criterionKey: key,
              judgeKey: judgeKey,
              uploadedByUserId: ctx.user.id,
              mimeType: att.mimeType || null,
              extractedText,
              classification: input.classification || "internal",
              malwareScanStatus: judgeMalwareScanStatus,
            });
          }

          judgeCriteria[key] = { score: adjScore, note: judgeNote, evidence: judgeAttachments };
        }

        const judgeOverall = computeCustomOverall(judgeCriteria);
        judgesList.push({
          name: input.judgeCount === 1 ? "المحكّم الرئيسي" : `المحكّم ${j}`,
          criteria: judgeCriteria,
          overall: judgeOverall,
        });
      }

      // Average criteria scores and notes across judges
      const averagedCriteria: Record<string, { score: number; note: string; evidence?: Array<{ name: string; url: string; storageKey: string }> }> = {};
      for (const key of Object.keys(baseCriteria)) {
        let sum = 0;
        const notesSet = new Set<string>();
        for (const j of judgesList) {
          sum += j.criteria[key]?.score || 0;
          if (j.criteria[key]?.note) notesSet.add(j.criteria[key].note);
        }
        const avgScore = Math.round((sum / judgesList.length) * 10) / 10;
        averagedCriteria[key] = {
          score: avgScore,
          note: Array.from(notesSet).join(" | ") || baseCriteria[key]?.note || "",
          evidence: criterionEvidenceSummary[key] || [],
        };
      }

      const overall = computeCustomOverall(averagedCriteria);
      const tierObj = classify(overall);

      const normalizedDecisions: NormalizedDecisionInput[] = judgesList.map((judge, index) => {
        const judgeKey = `judge_${index + 1}`;
        const decisionId = `dec_${nominationId}_${judgeKey}`;
        const judgeOverallTier = classify(judge.overall).key;
        return {
          decision: {
            id: decisionId,
            nominationId,
            judgeUserId: index === 0 ? ctx.user.id : null,
            judgeKey,
            decisionType: "judge",
            status: "submitted",
            overallScore: judge.overall,
            tier: judgeOverallTier,
            decisionText: null,
            metadataJson: JSON.stringify({ source: "ai_evaluation", judgeName: judge.name, programType: input.programType }),
          },
          criteria: Object.entries(judge.criteria).map(([criterionKey, criterion]) => ({
            id: `score_${decisionId}_${criterionKey}`,
            nominationId,
            decisionId,
            criterionKey,
            scoreTenths: Math.round(criterion.score * 10),
            note: criterion.note || null,
          })),
        };
      });

      const aggregateDecisionId = `dec_${nominationId}_aggregate`;
      normalizedDecisions.push({
        decision: {
          id: aggregateDecisionId,
          nominationId,
          judgeUserId: null,
          judgeKey: "aggregate",
          decisionType: "aggregate",
          status: "final",
          overallScore: overall,
          tier: tierObj.key,
          decisionText: parsedEval.kpi_findings || null,
          metadataJson: JSON.stringify({ source: "judge_average", judgeCount: input.judgeCount, programType: input.programType }),
        },
        criteria: Object.entries(averagedCriteria).map(([criterionKey, criterion]) => ({
          id: `score_${aggregateDecisionId}_${criterionKey}`,
          nominationId,
          decisionId: aggregateDecisionId,
          criterionKey,
          scoreTenths: Math.round(criterion.score * 10),
          note: criterion.note || null,
        })),
        signature: input.signatureData ? {
          id: `sig_${aggregateDecisionId}`,
          nominationId,
          decisionId: aggregateDecisionId,
          signerUserId: ctx.user.id,
          signatureData: input.signatureData,
        } : undefined,
      });

      const coverage = EVIDENCE_TYPES
        .filter((e) => programConfig.evidenceKeys.includes(e.key))
        .map((e) => ({
          ...e,
          covered: presentTypes.has(e.key),
        }));

      const consumed = await consumeTrialAttempt(ctx.user.id);
      if (!consumed) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "لقد استنفدت المحاولات الـ 5 المتاحة في النسخة التجريبية المجانية. يرجى التواصل معنا للاشتراك.",
        });
      }

      try {
        await createNominationRecord({
          id: nominationId,
          userId: ctx.user.id,
          name: input.nomineeName.trim(),
          awardTitle: input.awardTitle,
          programType: input.programType,
          context: input.context || programConfig.defaultContext.ar,
          overallScore: overall,
          tier: tierObj.key,
          criteriaJson: JSON.stringify(averagedCriteria || {}),
          kpiFindings: parsedEval.kpi_findings || "",
          strengthsJson: JSON.stringify(parsedEval.strengths || []),
          weaknessesJson: JSON.stringify(parsedEval.weaknesses || []),
          recommendationsJson: JSON.stringify(parsedEval.recommendations || []),
          coverageJson: JSON.stringify(coverage),
          fileCount: evidenceMetadataList.length,
          judgeCount: input.judgeCount,
          judgesJson: JSON.stringify(judgesList),
          weightsJson: JSON.stringify(activeRubric),
          signatureData: input.signatureData || null,
        }, evidenceMetadataList, normalizedDecisions);

        await addAuditEvent({
        id: crypto.randomUUID(),
        nominationId,
        actorUserId: ctx.user.id,
        action: "scores_created",
        previousValue: null,
        newValue: JSON.stringify({ overall, criteria: averagedCriteria }),
        metadataJson: JSON.stringify({ source: "ai_evaluation", judgeCount: input.judgeCount, programType: input.programType }),
        });
        if (input.signatureData) {
          await addAuditEvent({
            id: crypto.randomUUID(),
            nominationId,
            actorUserId: ctx.user.id,
            action: "signature_signed",
            previousValue: "unsigned",
            newValue: "signed",
            metadataJson: JSON.stringify({ timestamp: new Date().toISOString() }),
          });
        }

        // AI-output governance: log the judging output that produced this
        // nomination's score, and turn each recommendation into a trackable
        // corrective action (defaults to the nomination owner; an admin can
        // reassign it from the Corrective Actions dashboard).
        void logAiOutput({
          feature: "nomination_judging",
          nominationId,
          userId: ctx.user.id,
          outputText: JSON.stringify({ kpi_findings: parsedEval.kpi_findings, recommendations: parsedEval.recommendations }),
        });
        try {
          for (const recommendation of parsedEval.recommendations || []) {
            const text = String(recommendation).trim();
            if (!text) continue;
            await createCorrectiveAction({
              nominationId,
              sourceRecommendation: text,
              titleAr: text.slice(0, 200),
              titleEn: text.slice(0, 200),
              ownerUserId: ctx.user.id,
              priority: "medium",
              createdByUserId: ctx.user.id,
            });
          }
        } catch (error) {
          console.warn("[Institutional] Failed to auto-create corrective actions:", error);
        }
      } catch (error) {
        await deleteAuditEventsForNomination(nominationId);
        await deleteNominationRecord(nominationId, ctx.user.id);
        await releaseTrialAttempt(ctx.user.id);
        throw error;
      }

      return {
        id: nominationId,
        overall,
        tier: tierObj.key,
        signatureData: input.signatureData || null,
        programType: input.programType,
      };
    }),
});
