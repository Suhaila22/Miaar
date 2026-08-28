export const DEFAULT_AWARD_TITLE = "معيار التميز";

export type JudgingProgramType = "excellence" | "graduation" | "tenders" | "performance";

export interface RubricCriterion {
  key: string;
  name: string;
  weight: number;
}

export const JUDGING_PROGRAMS: Record<JudgingProgramType, {
  name: { ar: string; en: string };
  description: { ar: string; en: string };
  defaultTitle: { ar: string; en: string };
  defaultContext: { ar: string; en: string };
  rubric: RubricCriterion[];
  evidenceKeys: string[];
}> = {
  excellence: {
    name: { ar: "التميز المؤسسي", en: "Institutional Excellence" },
    description: { ar: "تقييم مبادرات التميز والابتكار واستدامة الأثر المجتمعي.", en: "Evaluate excellence initiatives, innovation, and sustainable impact." },
    defaultTitle: { ar: "جائزة التميز المؤسسي", en: "Institutional Excellence Award" },
    defaultContext: {
      ar: "تسعى هذه المبادرة إلى تعزيز معايير التميز المؤسسي والابتكار المستدام من خلال تقديم قيمة مضافة نوعية وقابلة للقياس للمستفيدين والجهات المستهدفة.\n\nتستند المبادرة إلى أهداف استراتيجية واضحة تركز على رفع كفاءة الأداء، تبني أفضل الممارسات، ونشر ثقافة الجودة والتطوير المستمر ضمن بيئة العمل والمجتمع.\n\nالأثر المجتمعي والتشغيلي: تحقيق نتائج ملموسة وفعالة تسهم في تحسين جودة الحياة، دعم القدرات التنافسية، وترسيخ الوعي بالتميز والابتكار.\n\nمؤشرات الأداء الرئيسية: تتضمن قياس نسب الإنجاز، أعداد المستفيدين الفعليين، مؤشرات رضا المعنيين، ومؤشرات استدامة المخرجات والقيمة المضافة بمرور الوقت.",
      en: "This initiative promotes institutional excellence and sustainable innovation by delivering measurable value to beneficiaries and target stakeholders.\n\nBuilt upon clear strategic objectives focused on performance efficiency, best practice adoption, and quality culture.\n\nSocietal & Operational Impact: Delivering tangible results that improve quality of life, competitiveness, and culture of excellence.\n\nKey Performance Indicators: Completion rates, active beneficiaries, stakeholder satisfaction, and long-term value sustainability."
    },
    rubric: [
      { key: "alignment", name: "الارتباط الاستراتيجي", weight: 10 },
      { key: "impact", name: "الأثر المجتمعي", weight: 20 },
      { key: "continuity", name: "الاستمرارية", weight: 10 },
      { key: "content_quality", name: "جودة المحتوى", weight: 15 },
      { key: "satisfaction", name: "رضا المشاركين", weight: 10 },
      { key: "documentation", name: "التوثيق", weight: 20 },
      { key: "media_reach", name: "الانتشار الإعلامي", weight: 10 },
      { key: "sustainability", name: "الاستدامة", weight: 5 },
    ],
    evidenceKeys: ["agenda", "attendance", "photos", "presentations", "certificates", "satisfaction", "media", "digital_stats", "appreciation", "annual_report"],
  },
  graduation: {
    name: { ar: "مشاريع التخرج الأكاديمية", en: "Graduation Projects" },
    description: { ar: "تقييم الابتكار التقني، الجدوى العلمية، وقابلية التطبيق العملي لمشاريع التخرج.", en: "Evaluate technical innovation, scientific rigor, and practical applicability." },
    defaultTitle: { ar: "تقييم مشاريع التخرج الأكاديمية", en: "Academic Graduation Projects" },
    defaultContext: {
      ar: "يهدف تقييم مشاريع التخرج إلى قياس جودة الأبحاث والتطبيقات العملية التي انجزها الطلاب لحل تحديات حقيقية في المجتمع أو قطاع الأعمال.\n\nالمعايير الأساسية: الأصالة والابتكار، جودة التنفيذ التقني أو العلمي، اكتمال المنهجية البحثية، الجدوى الاقتصادية وقابلية التسويق والتطبيق العملي، ووضوح العرض والتوثيق.",
      en: "Graduation project evaluation measures research quality and practical solutions developed by students to address real-world challenges.\n\nCore criteria: Originality & innovation, technical/scientific execution, methodology rigor, practical applicability and commercial viability, and presentation quality."
    },
    rubric: [
      { key: "originality", name: "الأصالة والابتكار", weight: 25 },
      { key: "technical_execution", name: "التنفيذ التقني والعلمي", weight: 25 },
      { key: "practical_feasibility", name: "الجدوى وقابلية التطبيق", weight: 20 },
      { key: "methodology", name: "منهجية البحث والتوثيق", weight: 15 },
      { key: "presentation", name: "جودة العرض والمناقشة", weight: 15 },
    ],
    evidenceKeys: ["presentations", "annual_report", "photos", "digital_stats", "certificates"],
  },
  tenders: {
    name: { ar: "تحكيم العطاءات والمناقصات", en: "Tenders & Bids" },
    description: { ar: "تقييم العروض الفنية والمالية والقدرة التشغيلية للموردين والمقاولين.", en: "Evaluate technical proposals, financial efficiency, and operational capability." },
    defaultTitle: { ar: "لجنة تحكيم العطاءات والمناقصات", en: "Tenders & Proposals Evaluation" },
    defaultContext: {
      ar: "يختص هذا البرنامج بتقييم العروض الفنية والمالية المقدمة للمنافسات والعطاءات الحكومية والخاصة لضمان اختيار العرض الأفضل وفق معايير الشفافية والكفاءة.\n\nمعايير التقييم: كفاءة العرض الفني، خبرة وسوابق أعمال المورد، تنافسية التكلفة والجدول الزمني، الالتزام بالمعايير الاشتراطية، وتقييم المخاطر التشغيلية.",
      en: "Evaluates technical and financial proposals for public and private tenders to ensure optimal selection based on transparency and efficiency.\n\nCriteria: Technical proposal adequacy, vendor experience, cost competitiveness and timeline, compliance with specifications, and risk mitigation."
    },
    rubric: [
      { key: "technical_compliance", name: "المطابقة الفنية للمواصفات", weight: 30 },
      { key: "vendor_experience", name: "خبرة وسوابق أعمال المورد", weight: 20 },
      { key: "financial_competitiveness", name: "التنافسية المالية والتكلفة", weight: 20 },
      { key: "delivery_schedule", name: "الجدول الزمني وخطة التنفيذ", weight: 15 },
      { key: "risk_management", name: "إدارة المخاطر وضمان الجودة", weight: 15 },
    ],
    evidenceKeys: ["agenda", "annual_report", "certificates", "digital_stats", "appreciation"],
  },
  performance: {
    name: { ar: "تقييم الأداء الوظيفي", en: "Employee & Role Performance" },
    description: { ar: "تقييم كفاءة الأداء الوظيفي، الإنجازات، والمهارات القيادية والسلوكية.", en: "Evaluate job performance, achievements, leadership, and core competencies." },
    defaultTitle: { ar: "تقييم الأداء السنوي والمؤسسي", en: "Performance Appraisal & Evaluation" },
    defaultContext: {
      ar: "برنامج تقييم الأداء الوظيفي والمؤسسي لقياس مدى تحقيق الأهداف التشغيلية، الكفاءة في إنجاز المهام، والمهارات القيادية والعمل الجماعي.\n\nالمعايير: جودة وحجم الإنجازات، الالتزام بالكفاءات الوظيفية، التطوير المستمر والتعلم، والعمل الجماعي والاتصال.",
      en: "Performance appraisal program measuring operational goal achievement, task execution efficiency, leadership, and teamwork.\n\nCriteria: Quality and volume of achievements, core competencies, continuous learning, and teamwork."
    },
    rubric: [
      { key: "achievement_results", name: "تحقيق الأهداف والمخرجات", weight: 35 },
      { key: "competency_efficiency", name: "الكفاءة التشغيلية والمهارات", weight: 25 },
      { key: "initiative_innovation", name: "المبادرة والابتكار في العمل", weight: 20 },
      { key: "teamwork_communication", name: "العمل الجماعي والاتصال", weight: 20 },
    ],
    evidenceKeys: ["attendance", "annual_report", "certificates", "satisfaction", "appreciation"],
  },
};

export const RUBRIC = JUDGING_PROGRAMS.excellence.rubric;
export const DEFAULT_CONTEXT = JUDGING_PROGRAMS.excellence.defaultContext.ar;

export const EVIDENCE_TYPES = [
  { key: "agenda", label: "أجندات ووثائق المشروع", extensions: ["pdf", "docx", "xlsx"] },
  { key: "attendance", label: "قوائم الحضور / التقارير الإجرائية", extensions: ["xlsx", "csv", "pdf"] },
  { key: "photos", label: "صور ونماذج بصرية توضيحية", extensions: ["jpg", "jpeg", "png", "webp"] },
  { key: "presentations", label: "عروض تقديمية وملفات شرح", extensions: ["pptx", "pdf"] },
  { key: "certificates", label: "شهادات واعتمادات رسمية", extensions: ["pdf", "png", "jpg"] },
  { key: "satisfaction", label: "نتائج استبيانات ورضا المستفيدين", extensions: ["xlsx", "csv", "pdf"] },
  { key: "media", label: "تقارير إعلامية وتغطيات", extensions: ["pdf", "jpg", "png", "webp"] },
  { key: "digital_stats", label: "إحصائيات رقمية ومؤشرات أداء", extensions: ["xlsx", "csv"] },
  { key: "appreciation", label: "خطابات شكر وتوصيات", extensions: ["pdf", "jpg", "png"] },
  { key: "annual_report", label: "تقرير تفصيلي شامل", extensions: ["pdf", "docx"] },
];

export const OTHER_TYPE = { key: "other", label: "أدلة ومستندات أخرى متنوعة" };

export function guessEvidenceType(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  if (["jpg", "jpeg", "png", "webp"].includes(ext)) return "photos";
  if (ext === "pptx") return "presentations";
  if (["xlsx", "csv"].includes(ext)) return "attendance";
  if (["pdf", "docx"].includes(ext)) return "annual_report";
  return OTHER_TYPE.key;
}

export interface CriterionEval {
  score: number; // 0 to 10
  note: string;
}

export interface EvaluationResult {
  criteria: Record<string, CriterionEval>;
  kpi_findings: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}

export interface CoverageItem {
  key: string;
  label: string;
  covered: boolean;
}

export function computeOverall(criteria: Record<string, CriterionEval>, rubricOverride?: RubricCriterion[]): number {
  const activeRubric = rubricOverride || RUBRIC;
  let weightedSum = 0;
  let totalWeight = 0;
  for (const r of activeRubric) {
    const c = criteria[r.key];
    const score = c && typeof c.score === "number" ? Math.max(0, Math.min(10, c.score)) : 0;
    weightedSum += score * r.weight;
    totalWeight += r.weight;
  }
  if (totalWeight === 0) return 0;
  return Math.round((weightedSum / totalWeight) * 10); // 0 to 100
}

export function classify(overall: number): { key: string; label: string; tagClass: string } {
  if (overall >= 90) return { key: "gold", label: "درجة التميز الذهبي (🥇 90%+)", tagClass: "tag-gold" };
  if (overall >= 80) return { key: "silver", label: "درجة التميز الفضي (🥈 80-89%)", tagClass: "tag-silver" };
  if (overall >= 70) return { key: "bronze", label: "درجة التميز البرونزي (🥉 70-79%)", tagClass: "tag-bronze" };
  if (overall >= 60) return { key: "mention", label: "شهادة تقدير وتنويه (🏅 60-69%)", tagClass: "tag-mention" };
  return { key: "none", label: "دون الحد الأدنى للترشيح (<60%)", tagClass: "tag-none" };
}
