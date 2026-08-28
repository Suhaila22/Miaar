import type { JudgingProgramType } from "./judge";

export type AwardTag = {
  key: string;
  ar: string;
  en: string;
};

export const AWARD_TAGS = {
  sustainability: { key: "sustainability", ar: "الاستدامة", en: "Sustainability" },
  innovation: { key: "innovation", ar: "الابتكار", en: "Innovation" },
  digitalTransformation: { key: "digital_transformation", ar: "التحول الرقمي", en: "Digital transformation" },
  communityImpact: { key: "community_impact", ar: "الأثر المجتمعي", en: "Community impact" },
  appliedResearch: { key: "applied_research", ar: "البحث التطبيقي", en: "Applied research" },
  technicalCompliance: { key: "technical_compliance", ar: "المطابقة الفنية", en: "Technical compliance" },
  operationalExcellence: { key: "operational_excellence", ar: "التميز التشغيلي", en: "Operational excellence" },
  customerExperience: { key: "customer_experience", ar: "تجربة المتعامل", en: "Customer experience" },
  knowledgeSharing: { key: "knowledge_sharing", ar: "نشر المعرفة", en: "Knowledge sharing" },
  riskReadiness: { key: "risk_readiness", ar: "الجاهزية وإدارة المخاطر", en: "Risk readiness" },
  employeeGrowth: { key: "employee_growth", ar: "تطوير الموظفين", en: "Employee growth" },
  serviceQuality: { key: "service_quality", ar: "جودة الخدمة", en: "Service quality" },
} as const satisfies Record<string, AwardTag>;

export type IllustrativeSample = {
  id: string;
  name: { ar: string; en: string };
  organization: { ar: string; en: string };
  programType: JudgingProgramType;
  score: number;
  tier: "gold" | "silver" | "bronze";
  award: { ar: string; en: string };
  summary: { ar: string; en: string };
  rationale: { ar: string; en: string };
  metrics: { ar: string; en: string }[];
  tags?: AwardTag[];
};

/** Demonstration-only content; not customer data, testimonials, or real award results. */
export const ILLUSTRATIVE_SAMPLES: IllustrativeSample[] = [
  {
    id: "sample-green-path",
    name: { ar: "منصة المسار الأخضر", en: "Green Path Platform" },
    organization: { ar: "نموذج توضيحي · التميز المؤسسي", en: "Illustrative · Institutional Excellence" },
    programType: "excellence",
    score: 96,
    tier: "gold",
    award: { ar: "جائزة التميز المؤسسي", en: "Institutional Excellence Award" },
    summary: { ar: "منصة توضح كيف يمكن ربط مبادرات الاستدامة بقياس أثر تشغيلي واضح.", en: "A demonstration platform linking sustainability initiatives to measurable operational impact." },
    rationale: { ar: "حصلت على أعلى ترتيب نموذجي بفضل وضوح المؤشرات، قوة التوثيق، وقابلية التوسع.", en: "Top illustrative ranking based on clear indicators, strong documentation, and scalability." },
    metrics: [{ ar: "خفض استهلاك الموارد", en: "Resource efficiency" }, { ar: "لوحة مؤشرات لحظية", en: "Live KPI dashboard" }],
  },
  {
    id: "sample-government-lab",
    name: { ar: "مختبر التحول الحكومي", en: "Government Transformation Lab" },
    organization: { ar: "نموذج توضيحي · التميز المؤسسي", en: "Illustrative · Institutional Excellence" },
    programType: "excellence",
    score: 92,
    tier: "gold",
    award: { ar: "جائزة الابتكار الحكومي", en: "Government Innovation Award" },
    summary: { ar: "نموذج تشغيلي لتجربة حلول التحول الرقمي قبل تعميمها على الخدمات.", en: "An operating model for testing digital transformation solutions before service-wide rollout." },
    rationale: { ar: "تميز في الابتكار والمواءمة الاستراتيجية مع توثيق جيد لمراحل التجربة.", en: "Strong innovation and strategic alignment with well-documented experimentation stages." },
    metrics: [{ ar: "مراحل تجريب موثقة", en: "Documented pilots" }, { ar: "رحلة مستفيد محسنة", en: "Improved user journey" }],
  },
  {
    id: "sample-community-knowledge",
    name: { ar: "جسر المعرفة المجتمعية", en: "Community Knowledge Bridge" },
    organization: { ar: "نموذج توضيحي · التميز المؤسسي", en: "Illustrative · Institutional Excellence" },
    programType: "excellence",
    score: 89,
    tier: "silver",
    award: { ar: "جائزة نشر المعرفة", en: "Knowledge Sharing Award" },
    summary: { ar: "سلسلة لقاءات معرفية تربط الخبرات المتخصصة باحتياجات المجتمع.", en: "A knowledge series connecting specialist expertise with community needs." },
    rationale: { ar: "أثر مجتمعي مقنع مع فرصة لتعزيز قياس النتائج طويلة الأجل.", en: "Convincing community impact with an opportunity to strengthen long-term measurement." },
    metrics: [{ ar: "جلسات معرفية", en: "Knowledge sessions" }, { ar: "استبيانات رضا", en: "Satisfaction surveys" }],
  },
  {
    id: "sample-smart-clinic",
    name: { ar: "عيادة الرعاية الذكية", en: "Smart Care Clinic" },
    organization: { ar: "نموذج توضيحي · مشروع تخرج", en: "Illustrative · Graduation Project" },
    programType: "graduation",
    score: 94,
    tier: "gold",
    award: { ar: "أفضل مشروع تخرج تطبيقي", en: "Best Applied Graduation Project" },
    summary: { ar: "نظام تخرج يربط الفرز الصحي بالمواعيد والتنبيهات الرقمية.", en: "A graduation system connecting clinical triage with appointments and digital alerts." },
    rationale: { ar: "جمع بين أصالة الحل، تنفيذ تقني قابل للعرض، ومنهجية اختبار واضحة.", en: "Combined solution originality, demonstrable technical execution, and a clear testing method." },
    metrics: [{ ar: "نموذج أولي عامل", en: "Working prototype" }, { ar: "اختبارات مستخدمين", en: "User testing" }],
  },
  {
    id: "sample-water-ai",
    name: { ar: "مختبر الذكاء المائي", en: "Water Intelligence Lab" },
    organization: { ar: "نموذج توضيحي · مشروع تخرج", en: "Illustrative · Graduation Project" },
    programType: "graduation",
    score: 91,
    tier: "gold",
    award: { ar: "جائزة البحث التطبيقي", en: "Applied Research Award" },
    summary: { ar: "مشروع بحثي يستخدم التحليل التنبؤي لمراقبة استهلاك المياه.", en: "A research project using predictive analysis to monitor water consumption." },
    rationale: { ar: "منهجية علمية قوية ونموذج قابل للتطوير مع حاجة لتوسيع العينة.", en: "Strong scientific method and a scalable model, with room to broaden the sample." },
    metrics: [{ ar: "نموذج تنبؤي", en: "Predictive model" }, { ar: "بيانات تشغيلية", en: "Operational dataset" }],
  },
  {
    id: "sample-heritage-atlas",
    name: { ar: "الأطلس الرقمي للتراث", en: "Digital Heritage Atlas" },
    organization: { ar: "نموذج توضيحي · مشروع تخرج", en: "Illustrative · Graduation Project" },
    programType: "graduation",
    score: 87,
    tier: "silver",
    award: { ar: "تنويه التصميم الرقمي", en: "Digital Design Commendation" },
    summary: { ar: "تجربة رقمية تحفظ القصص المحلية عبر خرائط وتوثيق بصري.", en: "A digital experience preserving local stories through maps and visual documentation." },
    rationale: { ar: "قيمة ثقافية وتصميم جذاب مع فرصة لتحسين خطة الاستدامة التقنية.", en: "Cultural value and engaging design, with an opportunity to improve technical sustainability." },
    metrics: [{ ar: "خرائط تفاعلية", en: "Interactive maps" }, { ar: "أرشيف بصري", en: "Visual archive" }],
  },
  {
    id: "sample-procurement-cloud",
    name: { ar: "سحابة المشتريات الرقمية", en: "Digital Procurement Cloud" },
    organization: { ar: "نموذج توضيحي · العطاءات", en: "Illustrative · Tender Evaluation" },
    programType: "tenders",
    score: 93,
    tier: "gold",
    award: { ar: "أفضل عرض تقني", en: "Best Technical Offer" },
    summary: { ar: "عرض افتراضي لمنصة مشتريات تدعم الشفافية وسرعة دورة التوريد.", en: "A fictional procurement platform offer focused on transparency and faster sourcing cycles." },
    rationale: { ar: "مطابقة فنية عالية، خطة تنفيذ متدرجة، وضمانات تشغيل واضحة.", en: "High technical compliance, a phased delivery plan, and clear operating assurances." },
    metrics: [{ ar: "مصفوفة مطابقة", en: "Compliance matrix" }, { ar: "خطة تنفيذ", en: "Delivery plan" }],
  },
  {
    id: "sample-smart-facilities",
    name: { ar: "المرافق الذكية", en: "Smart Facilities RFP" },
    organization: { ar: "نموذج توضيحي · العطاءات", en: "Illustrative · Tender Evaluation" },
    programType: "tenders",
    score: 88,
    tier: "silver",
    award: { ar: "العرض المتوازن", en: "Balanced Value Offer" },
    summary: { ar: "عرض افتراضي لإدارة المرافق يجمع الصيانة الوقائية والتحليلات.", en: "A fictional facilities-management offer combining preventive maintenance and analytics." },
    rationale: { ar: "توازن جيد بين الخبرة والتكلفة مع حاجة لتفصيل مؤشرات الخدمة.", en: "Good balance of experience and cost, with a need for more detailed service indicators." },
    metrics: [{ ar: "مؤشرات مستوى الخدمة", en: "Service-level indicators" }, { ar: "جدول صيانة", en: "Maintenance schedule" }],
  },
  {
    id: "sample-continuity-rfp",
    name: { ar: "استمرارية الخدمات الأساسية", en: "Essential Services Continuity RFP" },
    organization: { ar: "نموذج توضيحي · العطاءات", en: "Illustrative · Tender Evaluation" },
    programType: "tenders",
    score: 84,
    tier: "bronze",
    award: { ar: "تنويه الجاهزية", en: "Readiness Commendation" },
    summary: { ar: "عرض افتراضي يركز على خطط التعافي واستمرارية الخدمات.", en: "A fictional offer focused on recovery plans and service continuity." },
    rationale: { ar: "خطة مخاطر واضحة، مع فجوة في تفاصيل الموارد والجدول الزمني.", en: "Clear risk planning, with a gap in resource and timeline detail." },
    metrics: [{ ar: "سجل مخاطر", en: "Risk register" }, { ar: "سيناريوهات تعافٍ", en: "Recovery scenarios" }],
  },
  {
    id: "sample-growth-sprint",
    name: { ar: "تحدي نمو الموظفين", en: "Employee Growth Sprint" },
    organization: { ar: "نموذج توضيحي · الأداء الوظيفي", en: "Illustrative · Employee Performance" },
    programType: "performance",
    score: 95,
    tier: "gold",
    award: { ar: "نجم الأداء والإنجاز", en: "Performance & Delivery Star" },
    summary: { ar: "خطة أداء تحول الأهداف الفردية إلى مخرجات أسبوعية قابلة للمتابعة.", en: "A performance plan translating individual goals into trackable weekly outcomes." },
    rationale: { ar: "تحقيق أهداف مرتفع، انضباط تشغيلي، ومبادرة واضحة في حل العوائق.", en: "High goal attainment, operating discipline, and clear initiative in removing blockers." },
    metrics: [{ ar: "نسبة إنجاز الأهداف", en: "Goal attainment" }, { ar: "مراجعات أسبوعية", en: "Weekly reviews" }],
  },
  {
    id: "sample-care-catalyst",
    name: { ar: "محفز تجربة المتعامل", en: "Customer Care Catalyst" },
    organization: { ar: "نموذج توضيحي · الأداء الوظيفي", en: "Illustrative · Employee Performance" },
    programType: "performance",
    score: 90,
    tier: "gold",
    award: { ar: "جائزة أثر الخدمة", en: "Service Impact Award" },
    summary: { ar: "مبادرة أداء تحسن الاستجابة وتحوّل ملاحظات المتعاملين إلى إجراءات.", en: "A performance initiative improving response time and turning customer feedback into action." },
    rationale: { ar: "أثر مباشر على الخدمة وتعاون قوي مع الفرق المعنية.", en: "Direct service impact and strong collaboration with partner teams." },
    metrics: [{ ar: "زمن الاستجابة", en: "Response time" }, { ar: "إغلاق الملاحظات", en: "Issue closure" }],
  },
  {
    id: "sample-operations-cycle",
    name: { ar: "دورة التميز التشغيلي", en: "Operations Excellence Cycle" },
    organization: { ar: "نموذج توضيحي · الأداء الوظيفي", en: "Illustrative · Employee Performance" },
    programType: "performance",
    score: 86,
    tier: "silver",
    award: { ar: "تنويه التحسين المستمر", en: "Continuous Improvement Commendation" },
    summary: { ar: "ممارسة أداء تراجع العمليات دورياً وتوثق فرص التحسين.", en: "A performance practice reviewing operations regularly and documenting improvements." },
    rationale: { ar: "اتساق جيد في التنفيذ مع فرصة لتقوية الأدلة المقارنة قبل وبعد.", en: "Consistent execution with an opportunity to strengthen before-and-after evidence." },
    metrics: [{ ar: "دورات تحسين", en: "Improvement cycles" }, { ar: "سجل إجراءات", en: "Action log" }],
  },
];

export const AWARD_SAMPLE_TAGS: Record<string, AwardTag[]> = {
  "sample-green-path": [AWARD_TAGS.sustainability, AWARD_TAGS.operationalExcellence, AWARD_TAGS.innovation],
  "sample-government-lab": [AWARD_TAGS.innovation, AWARD_TAGS.digitalTransformation, AWARD_TAGS.customerExperience],
  "sample-community-knowledge": [AWARD_TAGS.knowledgeSharing, AWARD_TAGS.communityImpact, AWARD_TAGS.serviceQuality],
  "sample-smart-clinic": [AWARD_TAGS.innovation, AWARD_TAGS.digitalTransformation, AWARD_TAGS.customerExperience],
  "sample-water-ai": [AWARD_TAGS.appliedResearch, AWARD_TAGS.sustainability, AWARD_TAGS.innovation],
  "sample-heritage-atlas": [AWARD_TAGS.digitalTransformation, AWARD_TAGS.communityImpact, AWARD_TAGS.knowledgeSharing],
  "sample-procurement-cloud": [AWARD_TAGS.technicalCompliance, AWARD_TAGS.digitalTransformation, AWARD_TAGS.operationalExcellence],
  "sample-smart-facilities": [AWARD_TAGS.technicalCompliance, AWARD_TAGS.sustainability, AWARD_TAGS.serviceQuality],
  "sample-continuity-rfp": [AWARD_TAGS.riskReadiness, AWARD_TAGS.operationalExcellence, AWARD_TAGS.serviceQuality],
  "sample-growth-sprint": [AWARD_TAGS.employeeGrowth, AWARD_TAGS.operationalExcellence, AWARD_TAGS.serviceQuality],
  "sample-care-catalyst": [AWARD_TAGS.customerExperience, AWARD_TAGS.serviceQuality, AWARD_TAGS.communityImpact],
  "sample-operations-cycle": [AWARD_TAGS.operationalExcellence, AWARD_TAGS.sustainability, AWARD_TAGS.knowledgeSharing],
};

export const BEST_AWARDED_SAMPLE_IDS = ["sample-green-path", "sample-smart-clinic", "sample-procurement-cloud", "sample-growth-sprint"];

export const AWARD_SELECTION_SAMPLES = [
  { sampleId: "sample-green-path", selection: { ar: "الفائز النموذجي · جائزة الاستدامة", en: "Illustrative winner · Sustainability Award" } },
  { sampleId: "sample-smart-clinic", selection: { ar: "الاختيار النموذجي · أفضل مشروع تخرج", en: "Illustrative selection · Best Graduation Project" } },
  { sampleId: "sample-procurement-cloud", selection: { ar: "الاختيار النموذجي · أفضل عرض فني", en: "Illustrative selection · Best Technical Offer" } },
  { sampleId: "sample-growth-sprint", selection: { ar: "الفائز النموذجي · الأداء والإنجاز", en: "Illustrative winner · Performance & Delivery" } },
];

export function getIllustrativeSample(id: string) {
  return ILLUSTRATIVE_SAMPLES.find((sample) => sample.id === id);
}
