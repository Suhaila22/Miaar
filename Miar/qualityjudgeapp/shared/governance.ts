export type GovernanceRole = "user" | "admin";

export function canAccessEvaluation(role: GovernanceRole, ownsNomination: boolean, hasAssignment: boolean) {
  return role === "admin" || ownsNomination || hasAssignment;
}

export function auditActionLabel(action: string, lang: "ar" | "en") {
  const labels = {
    scores_created: { ar: "تم إنشاء الدرجات", en: "Scores created" },
    scores_modified: { ar: "تم تعديل الدرجات", en: "Scores modified" },
    signature_signed: { ar: "تم اعتماد التوقيع الرقمي", en: "Digital signature added" },
    signature_updated: { ar: "تم تحديث التوقيع الرقمي", en: "Digital signature updated" },
    judge_assigned: { ar: "تم إسناد الترشيح إلى محكّم", en: "Nomination assigned to judge" },
  } as const;
  return labels[action as keyof typeof labels]?.[lang] || action;
}
