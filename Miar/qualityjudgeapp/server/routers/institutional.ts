import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { adminProcedure, protectedProcedure, router } from "../_core/trpc";
import * as idb from "../institutionalDb";

function requireAdminOr(condition: boolean, message = "Not authorized") {
  if (!condition) throw new TRPCError({ code: "FORBIDDEN", message });
}

export const institutionalRouter = router({
  // --- Eligibility -------------------------------------------------------
  eligibility: router({
    submit: protectedProcedure
      .input(z.object({ awardId: z.string().min(1), nominationId: z.string().optional(), answers: z.record(z.string(), z.boolean()) }))
      .mutation(async ({ ctx, input }) => {
        const passed = Object.values(input.answers).every(Boolean);
        const record = await idb.recordEligibilityCheck({
          awardId: input.awardId,
          nominationId: input.nominationId ?? null,
          userId: ctx.user.id,
          passed,
          answers: input.answers,
        });
        return { ...record, passed };
      }),
    latest: protectedProcedure
      .input(z.object({ awardId: z.string().min(1) }))
      .query(({ ctx, input }) => idb.getLatestEligibilityCheck(input.awardId, ctx.user.id)),
  }),

  // --- Nomination approval workflow --------------------------------------
  workflow: router({
    advance: protectedProcedure
      .input(z.object({ nominationId: z.string().min(1), decision: z.enum(["approved", "rejected", "reopened"]), notes: z.string().max(4000).optional() }))
      .mutation(async ({ ctx, input }) => {
        try {
          const result = await idb.advanceNominationStage({
            nominationId: input.nominationId,
            actorUserId: ctx.user.id,
            decision: input.decision,
            notes: input.notes,
          });
          return result;
        } catch (error) {
          if (error instanceof Error && error.message === "NOMINATION_NOT_FOUND") {
            throw new TRPCError({ code: "NOT_FOUND", message: "Nomination not found" });
          }
          if (error instanceof Error && error.message === "ALREADY_AT_FINAL_STAGE") {
            throw new TRPCError({ code: "BAD_REQUEST", message: "Nomination is already at its final stage" });
          }
          if (error instanceof Error && error.message === "ELIGIBILITY_NOT_CONFIRMED") {
            throw new TRPCError({ code: "BAD_REQUEST", message: "This nomination's award eligibility has not been confirmed yet." });
          }
          if (error instanceof Error && error.message === "CONFLICT_OF_INTEREST_NOT_CLEARED") {
            throw new TRPCError({ code: "BAD_REQUEST", message: "All assigned judges must declare no conflict of interest before submission." });
          }
          throw error;
        }
      }),
    history: protectedProcedure
      .input(z.object({ nominationId: z.string().min(1) }))
      .query(({ input }) => idb.getNominationApprovalHistory(input.nominationId)),
  }),

  // --- Award calendar ------------------------------------------------------
  calendar: router({
    create: adminProcedure
      .input(z.object({ awardId: z.string().min(1), nameAr: z.string().min(1), nameEn: z.string().min(1), dueDate: z.string(), alertDaysBefore: z.number().int().min(0).max(365).optional() }))
      .mutation(({ ctx, input }) =>
        idb.createAwardMilestone({
          awardId: input.awardId,
          nameAr: input.nameAr,
          nameEn: input.nameEn,
          dueDate: new Date(input.dueDate),
          alertDaysBefore: input.alertDaysBefore,
          createdByUserId: ctx.user.id,
        })
      ),
    list: protectedProcedure.input(z.object({ awardId: z.string().optional() })).query(({ input }) => idb.listAwardMilestones(input.awardId)),
    setStatus: adminProcedure
      .input(z.object({ id: z.string().min(1), status: z.enum(["upcoming", "due_soon", "completed", "missed"]) }))
      .mutation(({ input }) => idb.updateAwardMilestoneStatus(input.id, input.status)),
    delete: adminProcedure.input(z.object({ id: z.string().min(1) })).mutation(({ input }) => idb.deleteAwardMilestone(input.id)),
  }),

  // --- Judging committees ---------------------------------------------------
  committees: router({
    create: adminProcedure
      .input(z.object({ awardId: z.string().min(1), nameAr: z.string().min(1), nameEn: z.string().min(1), chairUserId: z.number().int().positive() }))
      .mutation(({ input }) => idb.createCommittee(input)),
    list: protectedProcedure.query(() => idb.listCommittees()),
    addMember: adminProcedure
      .input(z.object({ committeeId: z.string().min(1), userId: z.number().int().positive(), role: z.enum(["chair", "member", "secretary"]).default("member") }))
      .mutation(({ input }) => idb.addCommitteeMember(input)),
    members: protectedProcedure.input(z.object({ committeeId: z.string().min(1) })).query(({ input }) => idb.listCommitteeMembers(input.committeeId)),
    removeMember: adminProcedure.input(z.object({ id: z.string().min(1) })).mutation(({ input }) => idb.removeCommitteeMember(input.id)),
    recordMeeting: adminProcedure
      .input(z.object({ committeeId: z.string().min(1), heldAt: z.string(), minutesText: z.string().max(20000).optional(), decisionsText: z.string().max(20000).optional() }))
      .mutation(({ ctx, input }) =>
        idb.recordCommitteeMeeting({
          committeeId: input.committeeId,
          heldAt: new Date(input.heldAt),
          minutesText: input.minutesText,
          decisionsText: input.decisionsText,
          createdByUserId: ctx.user.id,
        })
      ),
    meetings: protectedProcedure.input(z.object({ committeeId: z.string().min(1) })).query(({ input }) => idb.listCommitteeMeetings(input.committeeId)),
    setStatus: adminProcedure
      .input(z.object({ id: z.string().min(1), status: z.enum(["forming", "active", "dissolved"]) }))
      .mutation(({ input }) => idb.updateCommitteeStatus(input.id, input.status)),
  }),

  // --- Conflict of interest --------------------------------------------------
  conflictOfInterest: router({
    declare: protectedProcedure
      .input(z.object({ nominationId: z.string().min(1), hasConflict: z.boolean(), detailsText: z.string().max(4000).optional() }))
      .mutation(({ ctx, input }) =>
        idb.declareConflictOfInterest({ nominationId: input.nominationId, judgeUserId: ctx.user.id, hasConflict: input.hasConflict, detailsText: input.detailsText })
      ),
    status: protectedProcedure
      .input(z.object({ nominationId: z.string().min(1) }))
      .query(({ ctx, input }) => idb.hasClearedConflictOfInterest(input.nominationId, ctx.user.id)),
    list: adminProcedure.input(z.object({ nominationId: z.string().min(1) })).query(({ input }) => idb.listConflictDeclarations(input.nominationId)),
  }),

  // --- Corrective actions ------------------------------------------------
  correctiveActions: router({
    create: adminProcedure
      .input(
        z.object({
          nominationId: z.string().min(1),
          sourceRecommendation: z.string().min(1),
          titleAr: z.string().min(1),
          titleEn: z.string().min(1),
          ownerUserId: z.number().int().positive(),
          priority: z.enum(["low", "medium", "high"]).default("medium"),
          dueDate: z.string().optional(),
        })
      )
      .mutation(({ ctx, input }) =>
        idb.createCorrectiveAction({
          ...input,
          dueDate: input.dueDate ? new Date(input.dueDate) : null,
          createdByUserId: ctx.user.id,
        })
      ),
    list: protectedProcedure
      .input(z.object({ nominationId: z.string().optional(), mineOnly: z.boolean().optional() }))
      .query(({ ctx, input }) => idb.listCorrectiveActions({ nominationId: input.nominationId, ownerUserId: input.mineOnly ? ctx.user.id : undefined })),
    update: protectedProcedure
      .input(
        z.object({
          id: z.string().min(1),
          status: z.enum(["open", "in_progress", "done", "overdue"]).optional(),
          progressPercent: z.number().int().min(0).max(100).optional(),
          closureEvidenceUrl: z.string().max(2000).optional(),
          closureNotes: z.string().max(4000).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { id, ...patch } = input;
        // Owners can update their own action's progress; admins can update any.
        const rows = await idb.listCorrectiveActions();
        const action = rows.find(r => r.id === id);
        requireAdminOr(!!action && (ctx.user.role === "admin" || action.ownerUserId === ctx.user.id), "You can only update corrective actions assigned to you");
        return idb.updateCorrectiveAction(id, patch);
      }),
  }),

  // --- Reference data --------------------------------------------------
  referenceData: router({
    upsert: adminProcedure
      .input(z.object({ type: z.enum(["category", "sector", "level", "kpi"]), refKey: z.string().min(1), labelAr: z.string().min(1), labelEn: z.string().min(1) }))
      .mutation(({ ctx, input }) => idb.upsertReferenceDataItem({ ...input, ownerUserId: ctx.user.id })),
    list: protectedProcedure.input(z.object({ type: z.enum(["category", "sector", "level", "kpi"]).optional() })).query(({ input }) => idb.listReferenceData(input.type)),
    approve: adminProcedure.input(z.object({ id: z.string().min(1) })).mutation(({ input }) => idb.approveReferenceDataItem(input.id)),
    retire: adminProcedure.input(z.object({ id: z.string().min(1) })).mutation(({ input }) => idb.retireReferenceDataItem(input.id)),
  }),

  // --- Knowledge base --------------------------------------------------
  knowledgeBase: router({
    create: adminProcedure
      .input(z.object({ titleAr: z.string().min(1), titleEn: z.string().min(1), programType: z.string().optional(), bodyText: z.string().min(1).max(50000), storageUrl: z.string().max(2000).optional() }))
      .mutation(({ ctx, input }) => idb.createKnowledgeSource({ ...input, uploadedByUserId: ctx.user.id })),
    list: protectedProcedure
      .input(z.object({ programType: z.string().optional(), reviewStatus: z.enum(["pending", "approved", "rejected"]).optional() }))
      .query(({ input }) => idb.listKnowledgeSources(input)),
    setReviewStatus: adminProcedure
      .input(z.object({ id: z.string().min(1), reviewStatus: z.enum(["pending", "approved", "rejected"]) }))
      .mutation(({ input }) => idb.setKnowledgeSourceReviewStatus(input.id, input.reviewStatus)),
    delete: adminProcedure.input(z.object({ id: z.string().min(1) })).mutation(({ input }) => idb.deleteKnowledgeSource(input.id)),
  }),

  // --- AI output governance --------------------------------------------------
  aiGovernance: router({
    list: adminProcedure.input(z.object({ reviewStatus: z.enum(["unreviewed", "approved", "flagged"]).optional() })).query(({ input }) => idb.listAiOutputLogs(input)),
    setReviewStatus: adminProcedure
      .input(z.object({ id: z.string().min(1), reviewStatus: z.enum(["unreviewed", "approved", "flagged"]) }))
      .mutation(({ input }) => idb.setAiOutputReviewStatus(input.id, input.reviewStatus)),
  }),

  // --- Security events (SIEM-ready log) --------------------------------------------------
  security: router({
    events: adminProcedure.query(() => idb.listSecurityEvents()),
  }),
});
