import { and, asc, desc, eq } from "drizzle-orm";
import { getDb } from "./db";
import {
  auditEvents,
  criterionScores,
  decisionSignatures,
  evaluationDecisions,
  evidenceItems,
  judgeAssignments,
  nominations,
  type InsertCriterionScore,
  type InsertDecisionSignature,
  type InsertEvidenceItem,
  type InsertEvaluationDecision,
  type InsertNomination,
} from "../drizzle/schema";

export type NormalizedDecisionInput = {
  decision: InsertEvaluationDecision;
  criteria: InsertCriterionScore[];
  signature?: InsertDecisionSignature;
};

export async function createNominationRecord(
  record: InsertNomination,
  evidenceList: InsertEvidenceItem[],
  decisions: NormalizedDecisionInput[] = []
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.transaction(async (tx) => {
    await tx.insert(nominations).values(record);
    if (evidenceList.length > 0) {
      await tx.insert(evidenceItems).values(evidenceList);
    }
    for (const { decision, criteria, signature } of decisions) {
      await tx.insert(evaluationDecisions).values(decision);
      if (criteria.length > 0) await tx.insert(criterionScores).values(criteria);
      if (signature) await tx.insert(decisionSignatures).values(signature);
    }
  });

  return record;
}

export async function getNominationsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select()
    .from(nominations)
    .where(eq(nominations.userId, userId))
    .orderBy(desc(nominations.createdAt));
  return rows;
}

export async function getNominationById(id: string, userId?: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(nominations)
    .where(userId === undefined ? eq(nominations.id, id) : and(eq(nominations.id, id), eq(nominations.userId, userId)))
    .limit(1);
  if (rows.length === 0) return null;

  const nomination = rows[0];
  const items = await db
    .select()
    .from(evidenceItems)
    .where(eq(evidenceItems.nominationId, id))
    .orderBy(asc(evidenceItems.createdAt));
  const decisionRows = await db
    .select()
    .from(evaluationDecisions)
    .where(eq(evaluationDecisions.nominationId, id))
    .orderBy(asc(evaluationDecisions.createdAt));
  const decisionRecords = [];
  for (const decision of decisionRows) {
    const criteria = await db
      .select()
      .from(criterionScores)
      .where(eq(criterionScores.decisionId, decision.id))
      .orderBy(asc(criterionScores.createdAt));
    const signatures = await db
      .select()
      .from(decisionSignatures)
      .where(eq(decisionSignatures.decisionId, decision.id))
      .orderBy(desc(decisionSignatures.signedAt))
      .limit(1);
    decisionRecords.push({ ...decision, criteria, signature: signatures[0] || null });
  }

  return { ...nomination, evidenceItems: items, decisionRecords };
}

export async function updateNominationScores(id: string, overallScore: number, tier: string, criteriaJson: string, signatureData?: string | null) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(nominations).set({ overallScore, tier, criteriaJson, signatureData: signatureData ?? null }).where(eq(nominations.id, id));
  return true;
}

export async function replaceEvaluationDecision(input: NormalizedDecisionInput) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.transaction(async (tx) => {
    await tx.delete(decisionSignatures).where(eq(decisionSignatures.decisionId, input.decision.id));
    await tx.delete(criterionScores).where(eq(criterionScores.decisionId, input.decision.id));
    await tx.delete(evaluationDecisions).where(eq(evaluationDecisions.id, input.decision.id));
    await tx.insert(evaluationDecisions).values(input.decision);
    if (input.criteria.length > 0) await tx.insert(criterionScores).values(input.criteria);
    if (input.signature) await tx.insert(decisionSignatures).values(input.signature);
  });
}

export async function deleteNominationRecord(id: string, userId: number) {
  const db = await getDb();
  if (!db) return false;
  await db.transaction(async (tx) => {
    await tx.delete(decisionSignatures).where(eq(decisionSignatures.nominationId, id));
    await tx.delete(criterionScores).where(eq(criterionScores.nominationId, id));
    await tx.delete(evaluationDecisions).where(eq(evaluationDecisions.nominationId, id));
    await tx.delete(auditEvents).where(eq(auditEvents.nominationId, id));
    await tx.delete(judgeAssignments).where(eq(judgeAssignments.nominationId, id));
    await tx.delete(evidenceItems).where(eq(evidenceItems.nominationId, id));
    await tx.delete(nominations).where(and(eq(nominations.id, id), eq(nominations.userId, userId)));
  });
  return true;
}

export async function deleteAllNominationsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return false;
  const userNoms = await getNominationsByUserId(userId);
  await db.transaction(async (tx) => {
    for (const n of userNoms) {
      await tx.delete(decisionSignatures).where(eq(decisionSignatures.nominationId, n.id));
      await tx.delete(criterionScores).where(eq(criterionScores.nominationId, n.id));
      await tx.delete(evaluationDecisions).where(eq(evaluationDecisions.nominationId, n.id));
      await tx.delete(auditEvents).where(eq(auditEvents.nominationId, n.id));
      await tx.delete(judgeAssignments).where(eq(judgeAssignments.nominationId, n.id));
      await tx.delete(evidenceItems).where(eq(evidenceItems.nominationId, n.id));
    }
    await tx.delete(nominations).where(eq(nominations.userId, userId));
  });
  return true;
}
