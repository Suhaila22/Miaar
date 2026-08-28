// Minimal versioned REST layer (/api/v1) over key read endpoints.
//
// The application's primary API is tRPC (see server/routers.ts), which is
// the right fit for the React client. Some institutional/government
// integrations (BI dashboards, external ERP/HR/DMS connectors, simple
// server-to-server polling) expect a conventional JSON-over-HTTP REST API
// instead of a tRPC batch link, so this file exposes a small, explicitly
// versioned ("/api/v1") read-mostly surface over the same data-access
// functions the tRPC routers use — no business logic is duplicated here.
//
// Auth: same session cookie as the rest of the app, OR a bearer token
// (the same JWT session token, so a server-to-server client can send
// `Authorization: Bearer <token>` instead of a cookie).

import { Router, type Request, type Response, type NextFunction } from "express";
import { authenticateRequest } from "../_core/auth";
import type { User } from "../../drizzle/schema";
import { getAwardsCatalog, getAwardCatalogById } from "../db";
import { getNominationsByUserId, getNominationById } from "../dbNomination";
import {
  getLatestEligibilityCheck,
  listAwardMilestones,
  listCommittees,
  listCorrectiveActions,
  listReferenceData,
  listSecurityEvents,
  listAiOutputLogs,
} from "../institutionalDb";

type AuthedRequest = Request & { restUser?: User | null };

async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    req.restUser = await authenticateRequest(req);
    next();
  } catch {
    res.status(401).json({ error: "Unauthorized. Provide a valid session cookie or Authorization: Bearer <token> header." });
  }
}

function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  if (!req.restUser || req.restUser.role !== "admin") {
    res.status(403).json({ error: "Forbidden. This endpoint requires an administrator account." });
    return;
  }
  next();
}

function asyncHandler(fn: (req: AuthedRequest, res: Response) => Promise<unknown>) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
}

export const restRouter = Router();

// --- Awards catalog (public) ------------------------------------------------
restRouter.get(
  "/awards",
  asyncHandler(async (_req, res) => {
    const awards = await getAwardsCatalog(false);
    res.json({ data: awards });
  })
);

restRouter.get(
  "/awards/:id",
  asyncHandler(async (req, res) => {
    const award = await getAwardCatalogById(req.params.id);
    if (!award) return void res.status(404).json({ error: "Award not found" });
    res.json({ data: award });
  })
);

// --- Nominations (authenticated, own records only) --------------------------
restRouter.get(
  "/nominations",
  requireAuth,
  asyncHandler(async (req, res) => {
    const nominations = await getNominationsByUserId(req.restUser!.id);
    res.json({ data: nominations });
  })
);

restRouter.get(
  "/nominations/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const nomination = await getNominationById(req.params.id, req.restUser!.id);
    if (!nomination) return void res.status(404).json({ error: "Nomination not found" });
    res.json({ data: nomination });
  })
);

// --- Eligibility --------------------------------------------------------------
restRouter.get(
  "/eligibility/:awardId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const record = await getLatestEligibilityCheck(req.params.awardId, req.restUser!.id);
    res.json({ data: record });
  })
);

// --- Award calendar / milestones ---------------------------------------------
restRouter.get(
  "/calendar",
  requireAuth,
  asyncHandler(async (req, res) => {
    const milestones = await listAwardMilestones(typeof req.query.awardId === "string" ? req.query.awardId : undefined);
    res.json({ data: milestones });
  })
);

// --- Judging committees --------------------------------------------------------
restRouter.get(
  "/committees",
  requireAuth,
  asyncHandler(async (_req, res) => {
    const committees = await listCommittees();
    res.json({ data: committees });
  })
);

// --- Corrective actions (own, unless admin) -----------------------------------
restRouter.get(
  "/corrective-actions",
  requireAuth,
  asyncHandler(async (req, res) => {
    const mineOnly = req.restUser!.role !== "admin";
    const actions = await listCorrectiveActions({ ownerUserId: mineOnly ? req.restUser!.id : undefined });
    res.json({ data: actions });
  })
);

// --- Reference data (categories/sectors/levels/KPIs) --------------------------
restRouter.get(
  "/reference-data",
  requireAuth,
  asyncHandler(async (req, res) => {
    const type = req.query.type as "category" | "sector" | "level" | "kpi" | undefined;
    const items = await listReferenceData(type);
    res.json({ data: items });
  })
);

// --- AI output governance log (admin only) -------------------------------------
restRouter.get(
  "/ai-governance/logs",
  requireAuth,
  requireAdmin,
  asyncHandler(async (_req, res) => {
    const logs = await listAiOutputLogs({});
    res.json({ data: logs });
  })
);

// --- Security events (SIEM-ready log; admin only) -------------------------------
restRouter.get(
  "/security/events",
  requireAuth,
  requireAdmin,
  asyncHandler(async (_req, res) => {
    const events = await listSecurityEvents();
    res.json({ data: events });
  })
);

restRouter.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[REST v1] Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});
