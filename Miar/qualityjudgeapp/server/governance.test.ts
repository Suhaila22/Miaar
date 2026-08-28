import { describe, expect, it } from "vitest";
import { auditActionLabel, canAccessEvaluation } from "../shared/governance";

describe("judge governance", () => {
  it("allows owners, assigned judges, and administrators to access evaluations", () => {
    expect(canAccessEvaluation("user", true, false)).toBe(true);
    expect(canAccessEvaluation("user", false, true)).toBe(true);
    expect(canAccessEvaluation("admin", false, false)).toBe(true);
    expect(canAccessEvaluation("user", false, false)).toBe(false);
  });

  it("provides bilingual labels for score and signature audit events", () => {
    expect(auditActionLabel("scores_modified", "ar")).toBe("تم تعديل الدرجات");
    expect(auditActionLabel("signature_signed", "en")).toBe("Digital signature added");
    expect(auditActionLabel("unknown_event", "en")).toBe("unknown_event");
  });
});
