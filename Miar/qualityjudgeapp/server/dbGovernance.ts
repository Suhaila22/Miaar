import { and, desc, eq } from "drizzle-orm";
import { getDb } from "./db";
import { auditEvents, judgeAssignments, type InsertAuditEvent, type InsertJudgeAssignment } from "../drizzle/schema";

export async function addAuditEvent(event: InsertAuditEvent) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(auditEvents).values(event);
  return event;
}

export async function getAuditEventsForNomination(nominationId: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(auditEvents).where(eq(auditEvents.nominationId, nominationId)).orderBy(desc(auditEvents.createdAt));
}

export async function deleteAuditEventsForNomination(nominationId: string) {
  const db = await getDb();
  if (!db) return false;
  await db.delete(auditEvents).where(eq(auditEvents.nominationId, nominationId));
  return true;
}

export async function createJudgeAssignment(assignment: InsertJudgeAssignment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(judgeAssignments).values(assignment);
  return assignment;
}

export async function getAssignmentsForJudge(judgeUserId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(judgeAssignments).where(eq(judgeAssignments.judgeUserId, judgeUserId)).orderBy(desc(judgeAssignments.assignedAt));
}

export async function getAssignmentForJudge(nominationId: string, judgeUserId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(judgeAssignments).where(and(eq(judgeAssignments.nominationId, nominationId), eq(judgeAssignments.judgeUserId, judgeUserId))).limit(1);
  return rows[0] || null;
}

export async function markAssignmentComplete(nominationId: string, judgeUserId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(judgeAssignments).set({ status: "completed", completedAt: new Date() }).where(and(eq(judgeAssignments.nominationId, nominationId), eq(judgeAssignments.judgeUserId, judgeUserId)));
}
