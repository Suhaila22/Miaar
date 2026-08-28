import React, { useMemo, useState } from "react";
import type { ComponentProps } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { useLang } from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Bell,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  Clock3,
  Eye,
  FileCheck2,
  FileText,
  Gauge,
  Layers3,
  LoaderCircle,
  PieChart,
  RefreshCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  UserRound,
  UsersRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { JUDGING_PROGRAMS } from "@shared/judge";
import { auditActionLabel } from "@shared/governance";
import { SampleLibrary } from "@/components/SampleLibrary";

const palette = ["#12897f", "#0b2140", "#c9a227", "#5d5bd6", "#e48a4b"];

const criterionLabels: Record<string, { ar: string; en: string }> = {
  alignment: { ar: "الارتباط الاستراتيجي", en: "Strategic alignment" },
  impact: { ar: "الأثر المجتمعي", en: "Societal impact" },
  continuity: { ar: "الاستمرارية", en: "Continuity" },
  content_quality: { ar: "جودة المحتوى", en: "Content quality" },
  satisfaction: { ar: "رضا المشاركين", en: "Stakeholder satisfaction" },
  documentation: { ar: "التوثيق", en: "Documentation" },
  media_reach: { ar: "الانتشار الإعلامي", en: "Media reach" },
  sustainability: { ar: "الاستدامة", en: "Sustainability" },
  originality: { ar: "الأصالة والابتكار", en: "Originality & innovation" },
  technical_execution: { ar: "التنفيذ التقني والعلمي", en: "Technical execution" },
  practical_feasibility: { ar: "الجدوى وقابلية التطبيق", en: "Practical feasibility" },
  methodology: { ar: "منهجية البحث والتوثيق", en: "Research methodology" },
  presentation: { ar: "جودة العرض والمناقشة", en: "Presentation quality" },
  technical_compliance: { ar: "المطابقة الفنية", en: "Technical compliance" },
  vendor_experience: { ar: "خبرة المورد", en: "Vendor experience" },
  financial_competitiveness: { ar: "التنافسية المالية", en: "Financial competitiveness" },
  delivery_schedule: { ar: "خطة التنفيذ", en: "Delivery schedule" },
  risk_management: { ar: "إدارة المخاطر", en: "Risk management" },
  achievement_results: { ar: "تحقيق الأهداف", en: "Achievement & results" },
  competency_efficiency: { ar: "الكفاءة التشغيلية", en: "Operational competency" },
  initiative_innovation: { ar: "المبادرة والابتكار", en: "Initiative & innovation" },
  teamwork_communication: { ar: "العمل الجماعي والاتصال", en: "Teamwork & communication" },
};

type AdminDashboardData = {
  kpis: {
    totalUsers: number;
    activeUsers: number;
    totalNominations: number;
    pendingReviews: number;
    completedEvaluations: number;
    freeTrialUsers: number;
    exhaustedTrialUsers: number;
    averageScore: number;
    averageJudges: number;
    topScore: number;
    evidenceFiles: number;
    signedReports: number;
    unsignedReports: number;
    overdueReviews: number;
    upcomingDeadlines: number;
  };
  programCounts: Record<string, number>;
  tierCounts: Record<string, number>;
  scoreBands: Record<string, number>;
  monthlyVolume: Array<{ label: string; labelAr: string; value: number }>;
  criterionReadiness: Array<{ key: string; average: number; count: number; label: string }>;
  evidenceReadiness: Array<{ key: string; label: string; value: number }>;
  programPerformance: Array<{ programType: string; count: number; averageScore: number; signed: number }>;
  upcomingReviews: Array<{ id: string; nominationId: string; name: string; programType: string; status: string; assignedAt: string; dueAt: string; daysRemaining: number; isOverdue: boolean; score: number | null }>;
  upcomingDeadlines: Array<{ id: string; nominationId: string; name: string; programType: string; status: string; assignedAt: string; dueAt: string; daysRemaining: number; isOverdue: boolean; score: number | null }>;
  improvementOpportunities: Array<{ key: string; average: number; count: number; label: string; gap: number }>;
  recentNominations: Array<{ id: string; userId: number; name: string; awardTitle: string; programType: string; overallScore: number; tier: string; fileCount: number; judgeCount: number; signatureData: string | null; createdAt: string }>;
  recentActivity: Array<{ id: string; nominationId: string; actorUserId: number; action: string; createdAt: string }>;
  users: Array<{ id: number; name: string | null; email: string | null; role: "admin" | "user"; trialAttempts: number; createdAt: string; lastSignedIn: string | null; remainingAttempts: number }>;
  samples: ComponentProps<typeof SampleLibrary>["samples"];
};

const evidenceLabels: Record<string, { ar: string; en: string }> = {
  agenda: { ar: "أجندات ووثائق المشروع", en: "Project documents" },
  attendance: { ar: "قوائم الحضور", en: "Attendance records" },
  photos: { ar: "صور ونماذج بصرية", en: "Visual evidence" },
  presentations: { ar: "العروض التقديمية", en: "Presentations" },
  certificates: { ar: "الشهادات والاعتمادات", en: "Certificates" },
  satisfaction: { ar: "استبيانات الرضا", en: "Satisfaction surveys" },
  media: { ar: "التغطية الإعلامية", en: "Media coverage" },
  digital_stats: { ar: "الإحصائيات الرقمية", en: "Digital statistics" },
  appreciation: { ar: "خطابات الشكر", en: "Appreciation letters" },
  annual_report: { ar: "التقرير التفصيلي", en: "Detailed report" },
};

function formatDate(value: string | null | undefined, lang: "ar" | "en") {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(lang === "ar" ? "ar-AE" : "en-US", { day: "numeric", month: "short", year: "numeric" });
}

function formatDateTime(value: string | null | undefined, lang: "ar" | "en") {
  if (!value) return "—";
  return new Date(value).toLocaleString(lang === "ar" ? "ar-AE" : "en-US", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

function MetricCard({ label, value, detail, icon: Icon, tone, emphasis = false }: { label: string; value: string | number; detail: string; icon: LucideIcon; tone: "teal" | "navy" | "gold" | "violet" | "orange"; emphasis?: boolean }) {
  const styles = {
    teal: "bg-[#e8f6f3] text-[#12897f]",
    navy: "bg-[#eaf0f7] text-[#0b2140]",
    gold: "bg-[#fff6dc] text-[#9a7610]",
    violet: "bg-[#efedff] text-[#5d5bd6]",
    orange: "bg-[#fff0e3] text-[#c56c2b]",
  };
  return <article className={`group relative overflow-hidden rounded-2xl border border-[#e4ecee] bg-white p-4 shadow-[0_10px_24px_rgba(11,33,64,.04)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_32px_rgba(11,33,64,.09)] ${emphasis ? "ring-1 ring-[#c9a227]/35" : ""}`}><div className="absolute -end-8 -top-8 h-20 w-20 rounded-full bg-[#f8fbfa] transition group-hover:scale-125" /><div className="relative flex items-start justify-between gap-3"><div className="min-w-0"><div className="truncate text-[11px] font-semibold text-[#7d8b92]">{label}</div><div className="mt-2 text-2xl font-bold tracking-tight text-[#0b2140]">{value}</div><div className="mt-1 truncate text-[10px] text-[#8b989f]">{detail}</div></div><div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${styles[tone]}`}><Icon className="h-5 w-5" /></div></div></article>;
}

function SectionHeader({ eyebrow, title, description, action, onAction }: { eyebrow?: string; title: string; description?: string; action?: string; onAction?: () => void }) {
  return <div className="mb-4 flex items-start justify-between gap-3"><div className="min-w-0">{eyebrow && <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#12897f]">{eyebrow}</div>}<h2 className="text-base font-bold text-[#0b2140]">{title}</h2>{description && <p className="mt-1 text-[11px] leading-5 text-[#8b989f]">{description}</p>}</div>{action && <button type="button" onClick={onAction} className="shrink-0 text-[11px] font-bold text-[#12897f] transition hover:text-[#0b2140]">{action}</button>}</div>;
}

function ChartTooltip({ visible, title, value, detail, left = "50%", top = "8%", dark = false }: { visible: boolean; title: string; value: string | number; detail?: string; left?: string; top?: string; dark?: boolean }) {
  if (!visible) return null;
  return <div role="status" aria-live="polite" className={`pointer-events-none absolute z-20 min-w-[112px] rounded-xl px-3 py-2 text-center shadow-[0_12px_28px_rgba(11,33,64,.16)] ${dark ? "bg-[#0b2140] text-white" : "border border-[#dfe8e9] bg-white text-[#0b2140]"}`} style={{ left, top, transform: "translate(-50%, -108%)" }}><div className={`truncate text-[10px] font-semibold ${dark ? "text-white/65" : "text-[#73828b]"}`}>{title}</div><div className={`mt-0.5 font-mono text-sm font-bold ${dark ? "text-[#c9a227]" : "text-[#12897f]"}`}>{value}</div>{detail && <div className={`mt-0.5 text-[9px] ${dark ? "text-white/50" : "text-[#8b989f]"}`}>{detail}</div>}</div>;
}

function MonthlyVolumeChart({ data, lang }: { data: Array<{ label: string; labelAr: string; value: number }>; lang: "ar" | "en" }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const max = Math.max(...data.map((item) => item.value), 1);
  const coords = data.map((item, index) => [index * (100 / Math.max(data.length - 1, 1)), 88 - (item.value / max) * 64] as const);
  const linePath = coords.map(([x, y], index) => `${index === 0 ? "M" : "L"} ${x} ${y}`).join(" ");
  const fillPath = `${linePath} L 100 100 L 0 100 Z`;
  const active = activeIndex === null ? null : data[activeIndex];
  const activePoint = activeIndex === null ? null : coords[activeIndex];
  const show = (index: number) => setActiveIndex(index);
  return <section className="rounded-2xl border border-[#e4ecee] bg-white p-5"><SectionHeader eyebrow={lang === "ar" ? "إيقاع العمل" : "WORK RHYTHM"} title={lang === "ar" ? "حجم التقييمات" : "Evaluation volume"} description={lang === "ar" ? "مرر المؤشر أو استخدم Tab لعرض التفاصيل الشهرية" : "Hover or use Tab to inspect monthly data points"} /><div className="relative h-52"><svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-40 w-full overflow-visible"><defs><linearGradient id="volumeFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#12897f" stopOpacity=".28" /><stop offset="100%" stopColor="#12897f" stopOpacity="0" /></linearGradient></defs>{[24, 48, 72].map((line) => <line key={line} x1="0" x2="100" y1={line} y2={line} stroke="#edf1f2" strokeDasharray="1 3" />)}<path d={fillPath} fill="url(#volumeFill)" /><path d={linePath} fill="none" stroke="#12897f" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />{coords.map(([x, y], index) => <circle key={`${data[index]?.label}-${index}`} cx={x} cy={y} r={activeIndex === index ? 4 : 2.4} fill={activeIndex === index ? "#c9a227" : "#fff"} stroke="#12897f" strokeWidth={activeIndex === index ? 2 : 1.6} className="cursor-pointer transition-all duration-150" tabIndex={0} role="button" aria-label={`${lang === "ar" ? data[index]?.labelAr : data[index]?.label}: ${data[index]?.value} ${lang === "ar" ? "تقييم" : "evaluations"}`} onMouseEnter={() => show(index)} onFocus={() => show(index)} onMouseLeave={() => setActiveIndex(null)} onBlur={() => setActiveIndex(null)} />)}</svg>{active && activePoint && <ChartTooltip visible title={lang === "ar" ? active.labelAr : active.label} value={active.value} detail={lang === "ar" ? "ملفات تقييم محفوظة" : "persisted evaluation files"} left={`${activePoint[0]}%`} top={`${activePoint[1]}%`} />}<div className="pointer-events-none absolute inset-x-0 bottom-1 flex justify-between text-[10px] text-[#8b989f]">{data.map((item) => <span key={item.label}>{lang === "ar" ? item.labelAr : item.label}</span>)}</div></div><div className="mt-1 flex items-center gap-2 text-[10px] text-[#12897f]"><TrendingUp className="h-3.5 w-3.5" />{lang === "ar" ? "بيانات حقيقية من ملفات التقييم المحفوظة" : "Live data from persisted evaluations"}</div></section>;
}

function DonutChart({ title, description, data, labels, lang }: { title: string; description: string; data: Record<string, number>; labels: Record<string, string>; lang: "ar" | "en" }) {
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((sum, [, value]) => sum + value, 0);
  let cursor = 0;
  const segments = entries.map(([, value], index) => { const start = cursor; cursor += total ? (value / total) * 100 : 0; return `${palette[index % palette.length]} ${start}% ${cursor}%`; }).join(", ");
  const activeEntry = entries.find(([key]) => key === activeKey);
  const activePercent = activeEntry && total ? Math.round((activeEntry[1] / total) * 100) : 0;
  const clear = () => setActiveKey(null);
  return <section className="rounded-2xl border border-[#e4ecee] bg-white p-5"><SectionHeader eyebrow={lang === "ar" ? "التوزيع" : "DISTRIBUTION"} title={title} description={description} /><div className="flex flex-col items-center gap-5 sm:flex-row"><div className="relative h-36 w-36 shrink-0 rounded-full transition-transform duration-200 hover:scale-[1.03]" style={{ background: total ? `conic-gradient(${segments})` : "#e9eff0" }} onMouseLeave={clear}><div className="absolute inset-4 flex flex-col items-center justify-center rounded-full bg-white text-center"><span className="text-2xl font-bold text-[#0b2140]">{activeEntry ? activeEntry[1] : total}</span><span className="text-[10px] text-[#8b989f]">{activeEntry ? `${activePercent}%` : (lang === "ar" ? "ملف" : "files")}</span></div><ChartTooltip visible={Boolean(activeEntry)} title={activeEntry ? labels[activeEntry[0]] || activeEntry[0] : ""} value={activeEntry ? `${activeEntry[1]} ${lang === "ar" ? "ملف" : "files"}` : ""} detail={activeEntry ? `${activePercent}% ${lang === "ar" ? "من الإجمالي" : "of total"}` : undefined} top="-2%" dark /></div><div className="w-full min-w-0 space-y-2">{entries.length ? entries.slice(0, 5).map(([key, value], index) => <button type="button" key={key} className={`flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-start text-[11px] transition hover:bg-[#f7faf9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#12897f]/30 ${activeKey === key ? "bg-[#f7faf9]" : ""}`} aria-label={`${labels[key] || key}: ${value} ${lang === "ar" ? "ملف" : "files"}`} onMouseEnter={() => setActiveKey(key)} onFocus={() => setActiveKey(key)} onMouseLeave={clear} onBlur={clear}><span className="flex min-w-0 items-center gap-2 truncate text-[#53636c]"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: palette[index % palette.length] }} />{labels[key] || key}</span><span className="font-mono font-bold text-[#0b2140]">{value}</span></button>) : <div className="text-xs text-[#8b989f]">{lang === "ar" ? "لا توجد بيانات بعد" : "No data yet"}</div>}</div></div></section>;
}

function AverageGauge({ score, lang }: { score: number; lang: "ar" | "en" }) {
  const safeScore = Math.max(0, Math.min(100, score));
  const thresholds = [60, 70, 80, 90];
  const [active, setActive] = useState(false);
  return <section className="rounded-2xl border border-[#e4ecee] bg-[#0b2140] p-5 text-white"><div className="flex items-start justify-between gap-3"><div><div className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#c9a227]">{lang === "ar" ? "معايرة معيار مِعيار" : "MI'YAR CALIBRATION"}</div><h2 className="text-base font-bold">{lang === "ar" ? "متوسط الجاهزية" : "Average readiness"}</h2><p className="mt-1 text-[11px] leading-5 text-white/55">{lang === "ar" ? "النتيجة الموزونة لجميع الملفات" : "Weighted score across all files"}</p></div><Gauge className="h-5 w-5 text-[#c9a227]" /></div><div className="relative mx-auto mt-5 h-28 max-w-[230px] overflow-visible" tabIndex={0} role="img" aria-label={`${lang === "ar" ? "متوسط الجاهزية" : "Average readiness"}: ${safeScore}%`} onMouseEnter={() => setActive(true)} onMouseLeave={() => setActive(false)} onFocus={() => setActive(true)} onBlur={() => setActive(false)}><svg viewBox="0 0 200 120" className="h-full w-full"><path d="M 20 104 A 80 80 0 0 1 180 104" fill="none" stroke="#ffffff1c" strokeWidth="14" strokeLinecap="round" pathLength="100" /><path d="M 20 104 A 80 80 0 0 1 180 104" fill="none" stroke="#12897f" strokeWidth="14" strokeLinecap="round" pathLength="100" strokeDasharray={`${safeScore} ${100 - safeScore}`} /></svg><div className="absolute inset-x-0 bottom-0 text-center"><span className="font-mono text-4xl font-bold">{safeScore}%</span><span className="ms-2 text-[10px] text-white/55">{lang === "ar" ? "من 100" : "of 100"}</span></div><ChartTooltip visible={active} title={lang === "ar" ? "متوسط الدرجة" : "Average score"} value={`${safeScore}%`} detail={lang === "ar" ? "مرجع حدود الفئات" : "Certification-band benchmark"} top="18%" dark /></div><div className="mx-auto mt-1 flex max-w-[230px] justify-between text-[9px] font-mono text-white/40"><span>0</span>{thresholds.map((threshold) => <span key={threshold} className={safeScore >= threshold ? "text-[#c9a227]" : ""}>{threshold}</span>)}<span>100</span></div><div className="mt-3 flex items-center justify-center gap-2 text-[10px] text-[#b9d5d1]"><CheckCircle2 className="h-3.5 w-3.5 text-[#c9a227]" />{lang === "ar" ? "المؤشر مرتبط بحدود الفئات المعتمدة" : "Calibrated against Mi'yar certification bands"}</div></section>;
}

function CertificationLadder({ data, lang, labels }: { data: Record<string, number>; lang: "ar" | "en"; labels: Record<string, string> }) {
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const bands = [{ key: "gold", threshold: "90–100", color: "#c9a227", icon: "01" }, { key: "silver", threshold: "80–89", color: "#8da0a8", icon: "02" }, { key: "bronze", threshold: "70–79", color: "#bb7445", icon: "03" }, { key: "attention", threshold: "<70", color: "#b94a48", icon: "04" }];
  const total = bands.reduce((sum, band) => sum + (data[band.key] || 0), 0);
  const max = Math.max(...bands.map((band) => data[band.key] || 0), 1);
  return <section className="rounded-2xl border border-[#e4ecee] bg-white p-5"><SectionHeader eyebrow={lang === "ar" ? "الفئات" : "CERTIFICATION BANDS"} title={lang === "ar" ? "توزيع النتائج" : "Score distribution"} description={lang === "ar" ? "مرر المؤشر أو استخدم Tab لفحص عدد الملفات وحدود كل فئة" : "Hover or use Tab to inspect band counts and thresholds"} /><div className="mb-5 flex items-end justify-between gap-4"><div><span className="font-mono text-4xl font-bold tracking-tight text-[#0b2140]">{total}</span><span className="ms-2 text-[10px] text-[#8b989f]">{lang === "ar" ? "ملف تقييم" : "evaluations"}</span></div><div className="rounded-xl bg-[#e4f3f1] px-3 py-2 text-end text-[10px] text-[#12897f]"><ShieldCheck className="mb-1 ms-auto h-4 w-4" />{lang === "ar" ? "سلم اعتماد" : "Certification ladder"}</div></div><div className="space-y-3">{bands.map((band) => { const count = data[band.key] || 0; const label = labels[band.key] || band.key; return <div key={band.key} className={`relative grid cursor-help grid-cols-[28px_1fr_38px] items-center gap-3 rounded-xl px-2 py-1 transition hover:bg-[#f7faf9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#12897f]/30 ${activeKey === band.key ? "bg-[#f7faf9]" : ""}`} tabIndex={0} role="button" aria-label={`${label}: ${count} ${lang === "ar" ? "ملف" : "files"}, ${lang === "ar" ? "النطاق" : "range"} ${band.threshold}`} onMouseEnter={() => setActiveKey(band.key)} onMouseLeave={() => setActiveKey(null)} onFocus={() => setActiveKey(band.key)} onBlur={() => setActiveKey(null)}><div className="flex h-7 w-7 items-center justify-center rounded-lg text-[9px] font-black text-white" style={{ background: band.color }}>{band.icon}</div><div><div className="mb-1.5 flex items-center justify-between gap-2 text-[10px]"><span className="font-semibold text-[#344651]">{label}</span><span className="font-mono text-[#8b989f]">{band.threshold}</span></div><div className="h-2 overflow-hidden rounded-full bg-[#eef2f3]"><div className="h-full rounded-full transition-all duration-500" style={{ width: `${(count / max) * 100}%`, background: band.color }} /></div></div><div className="text-end font-mono text-sm font-bold text-[#0b2140]">{count}</div><ChartTooltip visible={activeKey === band.key} title={label} value={`${count} ${lang === "ar" ? "ملف" : "files"}`} detail={`${lang === "ar" ? "النطاق" : "Band"} ${band.threshold}`} top="0%" /></div>; })}</div></section>;
}

function RadarChart({ items, lang }: { items: Array<{ key: string; average: number; label: string }>; lang: "ar" | "en" }) {
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const selected = items.slice(0, 6);
  const count = Math.max(selected.length, 3);
  const point = (index: number, value: number) => { const angle = -Math.PI / 2 + (index * Math.PI * 2) / count; const radius = 35 * Math.max(0, Math.min(100, value)) / 100; return [50 + Math.cos(angle) * radius, 50 + Math.sin(angle) * radius] as const; };
  const grid = (scale: number) => Array.from({ length: count }, (_, index) => { const p = point(index, scale); return `${p[0]},${p[1]}`; }).join(" ");
  const dataPoints = selected.map((item, index) => { const p = point(index, item.average); return `${p[0]},${p[1]}`; }).join(" ");
  const active = selected.find((item) => item.key === activeKey);
  const activeIndex = selected.findIndex((item) => item.key === activeKey);
  const activePoint = activeIndex >= 0 ? point(activeIndex, selected[activeIndex].average) : null;
  const setActive = (key: string) => setActiveKey(key);
  const clear = () => setActiveKey(null);
  return <section className="rounded-2xl border border-[#e4ecee] bg-white p-5"><SectionHeader eyebrow={lang === "ar" ? "المعايير" : "CRITERIA"} title={lang === "ar" ? "جاهزية المعايير الرئيسية" : "Core criteria readiness"} description={lang === "ar" ? "مرر المؤشر أو استخدم Tab لفحص متوسط كل معيار" : "Hover or use Tab to inspect each criterion average"} /><div className="grid gap-4 md:grid-cols-[190px_1fr] md:items-center"><div className="relative mx-auto h-48 w-48"><svg viewBox="0 0 100 100" className="h-full w-full overflow-visible"><polygon points={grid(100)} fill="none" stroke="#dfe8e9" strokeWidth=".7" />{[25, 50, 75].map((scale) => <polygon key={scale} points={grid(scale)} fill="none" stroke="#edf1f2" strokeWidth=".55" strokeDasharray="1.5 2" />)}{Array.from({ length: count }, (_, index) => { const p = point(index, 100); return <line key={index} x1="50" y1="50" x2={p[0]} y2={p[1]} stroke="#edf1f2" strokeWidth=".55" />; })}<polygon points={dataPoints} fill="#12897f" fillOpacity=".18" stroke="#12897f" strokeWidth="1.4" />{selected.map((item, index) => { const p = point(index, item.average); const isActive = activeKey === item.key; return <circle key={item.key} cx={p[0]} cy={p[1]} r={isActive ? 3.3 : 1.8} fill={isActive ? "#c9a227" : "#c9a227"} stroke="#fff" strokeWidth={isActive ? 1.1 : .8} className="cursor-pointer transition-all duration-150" tabIndex={0} role="button" aria-label={`${criterionLabels[item.key]?.[lang] || item.label}: ${item.average}%`} onMouseEnter={() => setActive(item.key)} onMouseLeave={clear} onFocus={() => setActive(item.key)} onBlur={clear} />; })}</svg>{active && activePoint && <ChartTooltip visible title={criterionLabels[active.key]?.[lang] || active.label} value={`${active.average}%`} detail={lang === "ar" ? "متوسط المعيار" : "criterion average"} left={`${activePoint[0]}%`} top={`${activePoint[1]}%`} />}</div><div className="space-y-2">{selected.length ? selected.map((item) => <div key={item.key} className={`flex cursor-help items-center gap-2 rounded-lg px-2 py-1 transition hover:bg-[#f7faf9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#12897f]/30 ${activeKey === item.key ? "bg-[#f7faf9]" : ""}`} tabIndex={0} role="button" aria-label={`${criterionLabels[item.key]?.[lang] || item.label}: ${item.average}%`} onMouseEnter={() => setActive(item.key)} onMouseLeave={clear} onFocus={() => setActive(item.key)} onBlur={clear}><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#eef2f3]"><div className="h-full rounded-full bg-[#12897f] transition-all duration-300" style={{ width: `${item.average}%` }} /></div><span className="w-10 shrink-0 text-end font-mono text-[10px] font-bold text-[#0b2140]">{item.average}%</span><span className="w-28 shrink-0 truncate text-[10px] text-[#53636c]">{criterionLabels[item.key]?.[lang] || item.label}</span></div>) : <div className="py-8 text-center text-xs text-[#8b989f]">{lang === "ar" ? "لا توجد بيانات كافية بعد" : "Not enough data yet"}</div>}</div></div></section>;
}

function ProgressRow({ label, value, tone }: { label: string; value: number; tone: string }) {
  const safeValue = Math.max(0, Math.min(100, value));
  return <div><div className="mb-2 flex items-center justify-between gap-3 text-xs"><span className="font-semibold text-[#53636c]">{label}</span><span className="font-mono font-bold text-[#0b2140]">{safeValue}%</span></div><div className="h-2 overflow-hidden rounded-full bg-[#eef2f3]"><div className="h-full rounded-full transition-all duration-500" style={{ width: `${safeValue}%`, background: tone }} /></div></div>;
}

function ProgramPerformance({ rows, labels, lang }: { rows: Array<{ programType: string; count: number; averageScore: number; signed: number }>; labels: Record<string, string>; lang: "ar" | "en" }) {
  const [activeProgram, setActiveProgram] = useState<string | null>(null);
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  return <section className="rounded-2xl border border-[#e4ecee] bg-white p-5"><SectionHeader eyebrow={lang === "ar" ? "البرامج" : "PROGRAMS"} title={lang === "ar" ? "أداء البرامج" : "Program performance"} description={lang === "ar" ? "مرر المؤشر أو استخدم Tab لفحص الحجم والنتيجة والاعتماد" : "Hover or use Tab to inspect volume, score, and sign-off"} /><div className="space-y-3">{rows.length ? rows.map((row, index) => { const share = total ? Math.round((row.count / total) * 100) : 0; const signedRate = row.count ? Math.round((row.signed / row.count) * 100) : 0; const label = labels[row.programType] || row.programType; return <div key={row.programType} className={`relative rounded-xl px-2 py-2 transition hover:bg-[#f7faf9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#12897f]/30 ${activeProgram === row.programType ? "bg-[#f7faf9]" : ""}`} tabIndex={0} role="button" aria-label={`${label}: ${row.count} ${lang === "ar" ? "ملف" : "files"}, ${row.averageScore}%`} onMouseEnter={() => setActiveProgram(row.programType)} onMouseLeave={() => setActiveProgram(null)} onFocus={() => setActiveProgram(row.programType)} onBlur={() => setActiveProgram(null)}><div className="mb-2 flex items-center justify-between gap-3"><span className="flex min-w-0 items-center gap-2 truncate text-xs font-semibold text-[#344651]"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: palette[index % palette.length] }} />{label}</span><span className="font-mono text-xs font-bold text-[#0b2140]">{row.averageScore}%</span></div><div className="flex items-center gap-2"><div className="h-2 flex-1 overflow-hidden rounded-full bg-[#eef2f3]"><div className="h-full rounded-full transition-all duration-300" style={{ width: `${share}%`, background: palette[index % palette.length] }} /></div><span className="w-9 text-end text-[10px] text-[#8b989f]">{row.count}</span></div><div className="mt-1 text-[10px] text-[#8b989f]">{lang === "ar" ? `نسبة الاعتماد ${signedRate}%` : `${signedRate}% signed`}</div><ChartTooltip visible={activeProgram === row.programType} title={label} value={`${row.averageScore}%`} detail={`${row.count} ${lang === "ar" ? "ملف" : "files"} · ${signedRate}% ${lang === "ar" ? "معتمد" : "signed"}`} top="0%" /></div>; }) : <div className="py-10 text-center text-xs text-[#8b989f]">{lang === "ar" ? "لا توجد بيانات كافية بعد" : "Not enough data yet"}</div>}</div></section>;
}

function ReviewQueue({ reviews, labels, lang, onOpen }: { reviews: Array<{ id: string; nominationId: string; name: string; programType: string; status: string; assignedAt: string; dueAt: string; daysRemaining: number; isOverdue: boolean; score: number | null }>; labels: Record<string, string>; lang: "ar" | "en"; onOpen: () => void }) {
  return <section className="rounded-2xl border border-[#e4ecee] bg-white p-5"><SectionHeader eyebrow={lang === "ar" ? "سير العمل" : "WORKFLOW"} title={lang === "ar" ? "قائمة المراجعة" : "Review queue"} description={lang === "ar" ? "المهام المسندة التي تحتاج إلى مراجعة أو اعتماد" : "Assigned work awaiting review or sign-off"} action={lang === "ar" ? "عرض الكل" : "View all"} onAction={onOpen} /><div className="space-y-2">{reviews.length ? reviews.slice(0, 5).map((review) => <div key={review.id} className="flex items-center gap-3 rounded-xl bg-[#f7faf9] p-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#fff6dc] text-[#9a7610]"><Clock3 className="h-4 w-4" /></div><div className="min-w-0 flex-1"><div className="truncate text-xs font-bold text-[#0b2140]">{review.name}</div><div className="mt-1 truncate text-[10px] text-[#8b989f]">{labels[review.programType] || review.programType} · {formatDate(review.assignedAt, lang)}</div></div><div className="shrink-0 text-end"><div className="rounded-full bg-[#fff6dc] px-2.5 py-1 text-[10px] font-bold text-[#8a6d14]">{review.status === "completed" ? (lang === "ar" ? "مكتملة" : "Completed") : (lang === "ar" ? "مسندة" : "Assigned")}</div>{review.score !== null && <div className="mt-1 font-mono text-[10px] text-[#12897f]">{review.score}%</div>}</div></div>) : <div className="py-10 text-center text-xs text-[#8b989f]"><CalendarClock className="mx-auto mb-2 h-6 w-6 text-[#c9a227]" />{lang === "ar" ? "لا توجد مراجعات قادمة" : "No upcoming reviews"}</div>}</div></section>;
}

function UpcomingDeadlines({ items, labels, lang, onOpen }: { items: Array<{ id: string; nominationId: string; name: string; programType: string; status: string; assignedAt: string; dueAt: string; daysRemaining: number; isOverdue: boolean; score: number | null }>; labels: Record<string, string>; lang: "ar" | "en"; onOpen: () => void }) {
  return <section className="rounded-2xl border border-[#e4ecee] bg-white p-5"><SectionHeader eyebrow={lang === "ar" ? "المواعيد" : "DEADLINES"} title={lang === "ar" ? "المواعيد القادمة" : "Upcoming deadlines"} description={lang === "ar" ? "تواريخ استحقاق محفوظة لمهام التحكيم المفتوحة" : "Persisted due dates for open judging assignments"} action={lang === "ar" ? "فتح قائمة المراجعة" : "Open review queue"} onAction={onOpen} /><div className="space-y-2">{items.length ? items.map((item) => <div key={item.id} className={`flex items-center gap-3 rounded-xl p-3 ${item.isOverdue ? "bg-[#fff1ef]" : "bg-[#f7faf9]"}`}><div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${item.isOverdue ? "bg-[#f6d7d4] text-[#b94a48]" : "bg-[#e4f3f1] text-[#12897f]"}`}><CalendarClock className="h-4 w-4" /></div><div className="min-w-0 flex-1"><div className="truncate text-xs font-bold text-[#0b2140]">{item.name}</div><div className="mt-1 truncate text-[10px] text-[#8b989f]">{labels[item.programType] || item.programType} · {formatDate(item.dueAt, lang)}</div></div><div className="shrink-0 text-end"><div className={`font-mono text-xs font-bold ${item.isOverdue ? "text-[#b94a48]" : item.daysRemaining <= 2 ? "text-[#c56c2b]" : "text-[#12897f]"}`}>{item.isOverdue ? (lang === "ar" ? `متأخرة ${Math.abs(item.daysRemaining)} يوم` : `${Math.abs(item.daysRemaining)}d overdue`) : (lang === "ar" ? `${item.daysRemaining} يوم` : `${item.daysRemaining}d left`)}</div><div className="mt-1 text-[9px] text-[#8b989f]">{lang === "ar" ? "تاريخ الاستحقاق" : "Due date"}</div></div></div>) : <div className="py-10 text-center text-xs text-[#8b989f]"><CalendarClock className="mx-auto mb-2 h-6 w-6 text-[#c9a227]" />{lang === "ar" ? "لا توجد مواعيد مفتوحة" : "No open deadlines"}</div>}</div></section>;
}

function ImprovementOpportunities({ items, lang }: { items: Array<{ key: string; average: number; count: number; label: string; gap: number }>; lang: "ar" | "en" }) {
  return <section className="rounded-2xl border border-[#e4ecee] bg-white p-5"><SectionHeader eyebrow={lang === "ar" ? "الرؤى" : "INSIGHTS"} title={lang === "ar" ? "أفضل فرص التحسين" : "Best improvement opportunities"} description={lang === "ar" ? "أدنى المعايير المسجلة عبر التقييمات المكتملة" : "Lowest recorded criteria across completed evaluations"} /><div className="space-y-4">{items.length ? items.map((item, index) => <div key={item.key}><div className="mb-2 flex items-center justify-between gap-3"><span className="flex min-w-0 items-center gap-2 truncate text-xs font-semibold text-[#344651]"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#fff6dc] font-mono text-[10px] text-[#9a7610]">{index + 1}</span>{criterionLabels[item.key]?.[lang] || item.label}</span><span className="font-mono text-xs font-bold text-[#c56c2b]">{item.gap}% {lang === "ar" ? "فجوة" : "gap"}</span></div><div className="flex items-center gap-2"><div className="h-2 flex-1 overflow-hidden rounded-full bg-[#eef2f3]"><div className="h-full rounded-full bg-[#c56c2b]" style={{ width: `${item.gap}%` }} /></div><span className="w-10 text-end font-mono text-[10px] text-[#8b989f]">{item.average}%</span></div><div className="mt-1 text-[10px] text-[#8b989f]">{item.count} {lang === "ar" ? "ملفات مسجلة" : "recorded files"}</div></div>) : <div className="py-10 text-center text-xs text-[#8b989f]"><Target className="mx-auto mb-2 h-6 w-6 text-[#c9a227]" />{lang === "ar" ? "لا توجد بيانات كافية بعد" : "Not enough data yet"}</div>}</div></section>;
}

function AttentionPanel({ pending, unsigned, exhausted, lang, t }: { pending: number; unsigned: number; exhausted: number; lang: "ar" | "en"; t: Record<string, string> }) {
  const items = [{ icon: ClipboardList, label: t.pendingReviews, value: pending, tone: "text-[#c56c2b] bg-[#fff0e3]" }, { icon: FileText, label: t.signaturesPending, value: unsigned, tone: "text-[#9a7610] bg-[#fff6dc]" }, { icon: Bell, label: lang === "ar" ? "حسابات مستنفدة" : "Exhausted trial accounts", value: exhausted, tone: "text-[#b94a48] bg-[#fff1ef]" }];
  return <section className="rounded-2xl border border-[#f0e0c2] bg-[#fffaf0] p-5"><SectionHeader eyebrow={lang === "ar" ? "المتابعة" : "ATTENTION"} title={t.attentionNeeded} description={lang === "ar" ? "عناصر تشغيلية تحتاج إلى إجراء" : "Operational items that need action"} /><div className="space-y-3">{items.map(({ icon: Icon, label, value, tone }) => <div key={label} className="flex items-center gap-3 rounded-xl border border-[#f2e5bd] bg-white/70 p-3"><div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon className="h-4 w-4" /></div><div className="min-w-0 flex-1 truncate text-xs font-semibold text-[#53636c]">{label}</div><div className="font-mono text-lg font-bold text-[#0b2140]">{value}</div></div>)}</div></section>;
}

export default function AdminDashboard() {
  const { lang, t } = useLang();
  const [, setLocation] = useLocation();
  const [userSearch, setUserSearch] = useState("");
  const [activePanel, setActivePanel] = useState<"overview" | "users">("overview");
  const dashboardQuery = trpc.evaluation.adminDashboard.useQuery(undefined, { retry: false });
  const utils = trpc.useUtils();
  const resetMutation = trpc.evaluation.resetUserTrial.useMutation({ onSuccess: () => { toast.success(t.resetSuccess); void utils.evaluation.adminDashboard.invalidate(); }, onError: () => toast.error(t.resetFailure) });
  const dashboard = dashboardQuery.data as AdminDashboardData | undefined;
  const programLabels = useMemo(() => Object.fromEntries(Object.entries(JUDGING_PROGRAMS).map(([key, value]) => [key, value.name[lang]])), [lang]);
  const filteredUsers = dashboard?.users.filter((user) => `${user.name || ""} ${user.email || ""}`.toLocaleLowerCase().includes(userSearch.toLocaleLowerCase())) || [];
  const isAdminError = dashboardQuery.error?.data?.code === "FORBIDDEN";

  if (dashboardQuery.isLoading) return <div className="flex min-h-screen items-center justify-center text-sm text-[#73828b]"><LoaderCircle className="me-3 h-5 w-5 animate-spin text-[#12897f]" />{t.loadingDashboard}</div>;
  if (isAdminError) return <div className="flex min-h-screen items-center justify-center p-6" dir={lang === "ar" ? "rtl" : "ltr"}><div className="rounded-3xl border border-[#f2e5bd] bg-[#fffaf0] p-8 text-center"><ShieldCheck className="mx-auto mb-3 h-8 w-8 text-[#c9a227]" /><h1 className="text-lg font-bold text-[#0b2140]">{t.adminOnly}</h1></div></div>;
  if (!dashboard) return <div className="p-8 text-sm text-[#73828b]">{t.noActivity}</div>;

  const k = dashboard.kpis;
  const signedRate = k.totalNominations ? Math.round((k.signedReports / k.totalNominations) * 100) : 0;
  const trialHealth = k.totalUsers ? Math.round((k.freeTrialUsers / k.totalUsers) * 100) : 0;
  const evidenceHealth = dashboard.evidenceReadiness.length ? Math.round(dashboard.evidenceReadiness.reduce((sum, item) => sum + item.value, 0) / dashboard.evidenceReadiness.length) : 0;
  const coverageHealth = evidenceHealth;

  return <div dir={lang === "ar" ? "rtl" : "ltr"} className="min-h-screen bg-[#f4f7f8] px-3 py-4 sm:px-6 sm:py-5 lg:px-8"><div className="mx-auto max-w-[1540px] space-y-5">
    <header className="relative overflow-hidden rounded-[26px] bg-[#0b2140] p-5 text-white shadow-[0_18px_50px_rgba(11,33,64,.16)] sm:p-7"><div className="absolute -end-16 -top-24 h-72 w-72 rounded-full bg-[#12897f]/20 blur-3xl" /><div className="absolute -start-12 -bottom-24 h-52 w-52 rounded-full bg-[#c9a227]/10 blur-3xl" /><div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between"><div><div className="mb-4 flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#c9a227]/60 bg-[#c9a227] text-xl font-black text-[#0b2140] shadow-[0_8px_20px_rgba(201,162,39,.2)]">م</div><div><div className="text-[10px] font-black uppercase tracking-[0.26em] text-[#c9a227]">MI'YAR · مِعيار</div><div className="mt-1 text-[10px] text-white/50">{t.appSubtitle}</div></div></div><div className="mb-3 flex items-center gap-2 text-xs font-semibold text-[#b9d5d1]"><Sparkles className="h-4 w-4 text-[#c9a227]" />{t.controlCenterSubtitle}</div><h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t.dashboardGreeting}</h1><p className="mt-2 max-w-2xl text-sm leading-7 text-white/65">{t.dashboardOverview}</p><div className="mt-4 flex flex-wrap items-center gap-2 text-[10px] text-white/55"><span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/10 px-3 py-1.5"><span className="h-2 w-2 rounded-full bg-[#49c7b6]" />{t.liveData}</span><span className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5">{t.lastSixMonths}</span></div></div><div className="flex flex-wrap gap-2"><Button onClick={() => void dashboardQuery.refetch()} variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/15 hover:text-white"><RefreshCcw className="me-2 h-4 w-4" />{t.dashboardRefresh}</Button><Button onClick={() => setLocation("/")} className="bg-[#c9a227] text-[#0b2140] hover:bg-[#ddb736]"><ArrowUpRight className="me-2 h-4 w-4" />{t.openWorkspace}</Button></div></div></header>

    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#dfe8e9] bg-white p-2 shadow-[0_6px_18px_rgba(11,33,64,.025)]"><div className="flex flex-wrap gap-1"><button type="button" aria-pressed={activePanel === "overview"} onClick={() => setActivePanel("overview")} className={`rounded-xl px-4 py-2 text-xs font-bold transition ${activePanel === "overview" ? "bg-[#0b2140] text-white" : "text-[#73828b] hover:bg-[#f1f6f6]"}`}>{t.overview}</button><button type="button" aria-pressed={activePanel === "users"} onClick={() => setActivePanel("users")} className={`rounded-xl px-4 py-2 text-xs font-bold transition ${activePanel === "users" ? "bg-[#0b2140] text-white" : "text-[#73828b] hover:bg-[#f1f6f6]"}`}>{t.trialUsage}</button></div><div className="flex items-center gap-2 px-2 text-[11px] text-[#73828b]"><span className="h-2 w-2 rounded-full bg-[#12897f]" />{t.systemHealth}: <strong className="text-[#12897f]">{t.healthy}</strong></div></div>

    {activePanel === "overview" ? <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6"><MetricCard label={t.totalNominations} value={k.totalNominations} detail={t.completedEvaluations} icon={ClipboardCheck} tone="teal" emphasis /><MetricCard label={t.activeUsers} value={k.activeUsers} detail={`${k.totalUsers} ${t.users}`} icon={UsersRound} tone="navy" /><MetricCard label={t.pendingReviews} value={k.pendingReviews} detail={t.assignedTasks} icon={CalendarDays} tone="gold" /><MetricCard label={t.averageScore} value={`${k.averageScore}%`} detail={t.evaluationVolume} icon={Gauge} tone="violet" /><MetricCard label={t.signedReports} value={k.signedReports} detail={`${signedRate}% ${t.signed}`} icon={FileCheck2} tone="teal" /><MetricCard label={t.topScore} value={`${k.topScore}%`} detail={`${k.averageJudges} ${t.judges}`} icon={Target} tone="orange" /></div>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]"><MonthlyVolumeChart data={dashboard.monthlyVolume} lang={lang} /><div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-2"><AverageGauge score={k.averageScore} lang={lang} /><DonutChart title={t.programDistribution} description={t.dashboardPeriod} data={dashboard.programCounts} labels={programLabels} lang={lang} /></div></div>

      <div className="grid gap-5 xl:grid-cols-2"><CertificationLadder data={dashboard.scoreBands} labels={{ gold: t.gold, silver: t.silver, bronze: t.bronze, attention: t.attentionNeeded }} lang={lang} /><RadarChart items={dashboard.criterionReadiness} lang={lang} /></div>

      <div className="grid gap-5 xl:grid-cols-[.92fr_1.08fr]"><section className="rounded-2xl border border-[#e4ecee] bg-white p-5"><SectionHeader eyebrow={lang === "ar" ? "الجودة والجاهزية" : "QUALITY & READINESS"} title={t.criteriaReadiness} description={t.kpiSubtitle} /><div className="space-y-5"><ProgressRow label={t.signedReports} value={signedRate} tone="#c9a227" /><ProgressRow label={t.evidenceCoverage} value={coverageHealth} tone="#12897f" /><ProgressRow label={t.evidenceReadiness} value={evidenceHealth} tone="#5d5bd6" /><ProgressRow label={t.freeTrials} value={trialHealth} tone="#e48a4b" /></div><div className="mt-5 grid gap-2 sm:grid-cols-3"><div className="rounded-xl bg-[#f7faf9] p-3"><div className="text-[10px] text-[#8b989f]">{t.evidenceFiles}</div><div className="mt-1 font-mono text-lg font-bold text-[#0b2140]">{k.evidenceFiles}</div></div><div className="rounded-xl bg-[#f7faf9] p-3"><div className="text-[10px] text-[#8b989f]">{t.unsignedReports}</div><div className="mt-1 font-mono text-lg font-bold text-[#c56c2b]">{k.unsignedReports}</div></div><div className="rounded-xl bg-[#f7faf9] p-3"><div className="text-[10px] text-[#8b989f]">{t.averageJudges}</div><div className="mt-1 font-mono text-lg font-bold text-[#5d5bd6]">{k.averageJudges}</div></div></div></section><ProgramPerformance rows={dashboard.programPerformance} labels={programLabels} lang={lang} /></div>

      <div className="grid gap-5 xl:grid-cols-[1.05fr_.95fr]"><ReviewQueue reviews={dashboard.upcomingReviews} labels={programLabels} lang={lang} onOpen={() => setActivePanel("users")} /><AttentionPanel pending={k.pendingReviews} unsigned={k.unsignedReports} exhausted={k.exhaustedTrialUsers} lang={lang} t={t as unknown as Record<string, string>} /></div>
      <div className="grid gap-5 xl:grid-cols-[1.05fr_.95fr]"><UpcomingDeadlines items={dashboard.upcomingDeadlines} labels={programLabels} lang={lang} onOpen={() => setActivePanel("users")} /><ImprovementOpportunities items={dashboard.improvementOpportunities} lang={lang} /></div>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]"><section className="rounded-2xl border border-[#e4ecee] bg-white p-5"><SectionHeader eyebrow={lang === "ar" ? "آخر التحديثات" : "LATEST UPDATES"} title={t.recentNominations} action={t.viewAll} onAction={() => setLocation("/")} /><div className="space-y-2">{dashboard.recentNominations.length ? dashboard.recentNominations.slice(0, 6).map((item) => <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl bg-[#f7faf9] p-3"><div className="flex min-w-0 items-center gap-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#e4f3f1] text-[#12897f]"><Layers3 className="h-4 w-4" /></div><div className="min-w-0"><div className="truncate text-xs font-bold text-[#0b2140]">{item.name}</div><div className="mt-1 truncate text-[10px] text-[#8b989f]">{programLabels[item.programType] || item.programType} · {formatDate(item.createdAt, lang)} · {item.fileCount} {t.files}</div></div></div><div className="shrink-0 text-end"><span className="rounded-full bg-white px-2.5 py-1 font-mono text-xs font-bold text-[#12897f]">{item.overallScore}%</span><div className="mt-1 text-[9px] text-[#8b989f]">{item.judgeCount} {t.judges}</div></div></div>) : <div className="py-8 text-center text-xs text-[#8b989f]">{t.noActivity}</div>}</div></section><section className="rounded-2xl border border-[#e4ecee] bg-white p-5"><SectionHeader eyebrow={lang === "ar" ? "السجل الزمني" : "AUDIT TIMELINE"} title={t.recentActivity} description={t.liveData} /><div className="space-y-3">{dashboard.recentActivity.length ? dashboard.recentActivity.slice(0, 6).map((item) => <div key={item.id} className="flex gap-3"><div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[#12897f] ring-4 ring-[#e4f3f1]" /><div><div className="text-xs font-semibold text-[#344651]">{auditActionLabel(item.action, lang)}</div><div className="mt-1 text-[10px] text-[#8b989f]">{formatDateTime(item.createdAt, lang)}</div></div></div>) : <div className="py-8 text-center text-xs text-[#8b989f]">{t.noActivity}</div>}</div></section></div>

      <SampleLibrary samples={dashboard.samples} />
    </> : <section className="rounded-2xl border border-[#e4ecee] bg-white p-5"><SectionHeader eyebrow={lang === "ar" ? "إدارة الوصول" : "ACCESS MANAGEMENT"} title={t.resetForUser} description={lang === "ar" ? "راقب استخدام التجربة المجانية وأعد عداد المحاولات للمستخدمين المصرح لهم عند الحاجة." : "Monitor free-trial usage and reset attempt counters for authorized users when needed."} /><div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex flex-wrap gap-2 text-[10px]"><span className="rounded-full bg-[#e4f3f1] px-3 py-1.5 font-bold text-[#12897f]">{k.freeTrialUsers} {t.freeTrials}</span><span className="rounded-full bg-[#fff1ef] px-3 py-1.5 font-bold text-[#b94a48]">{k.exhaustedTrialUsers} {lang === "ar" ? "مستنفد" : "exhausted"}</span></div><label className="relative block w-full sm:w-72"><Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8b989f]" /><input aria-label={t.searchUsers || "Search users"} value={userSearch} onChange={(event) => setUserSearch(event.target.value)} placeholder={t.searchUsers || (lang === "ar" ? "ابحث عن مستخدم..." : "Search users...")} className="h-10 w-full rounded-xl border border-[#dfe8e9] bg-[#fbfcfc] ps-9 pe-3 text-xs outline-none transition focus:border-[#12897f] focus:ring-2 focus:ring-[#12897f]/10" /></label></div><div className="overflow-x-auto"><table className="w-full min-w-[680px] text-start"><thead><tr className="border-b border-[#edf1f2] text-[10px] text-[#8b989f]"><th className="px-3 py-3 font-semibold">{t.users}</th><th className="px-3 py-3 font-semibold">{t.attempts}</th><th className="px-3 py-3 font-semibold">{t.trialUsage}</th><th className="px-3 py-3 font-semibold">{t.lastActive}</th><th className="px-3 py-3 font-semibold text-end">{t.resetAttempts}</th></tr></thead><tbody>{filteredUsers.map((user) => { const usedPercent = Math.min(100, Math.round((user.trialAttempts / 5) * 100)); return <tr key={user.id} className="border-b border-[#f0f3f4] last:border-0"><td className="px-3 py-3"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eaf0f7] text-[#0b2140]"><UserRound className="h-4 w-4" /></div><div><div className="text-xs font-bold text-[#0b2140]">{user.name || "—"}</div><div className="mt-1 text-[10px] text-[#8b989f]">{user.email || "—"} · {user.role === "admin" ? t.admin : t.user}</div></div></div></td><td className="px-3 py-3"><span className={`rounded-full px-2.5 py-1 font-mono text-xs font-bold ${usedPercent >= 100 ? "bg-[#fff1ef] text-[#b94a48]" : "bg-[#e4f3f1] text-[#12897f]"}`}>{user.trialAttempts}/5</span></td><td className="px-3 py-3"><div className="w-40"><div className="mb-1 flex justify-between text-[10px] text-[#8b989f]"><span>{user.remainingAttempts} {t.remaining}</span><span>{usedPercent}%</span></div><div className="h-1.5 overflow-hidden rounded-full bg-[#eef2f3]"><div className={`h-full rounded-full ${usedPercent >= 100 ? "bg-[#b94a48]" : "bg-[#12897f]"}`} style={{ width: `${usedPercent}%` }} /></div></div></td><td className="px-3 py-3 text-[11px] text-[#73828b]">{formatDate(user.lastSignedIn, lang)}</td><td className="px-3 py-3 text-end"><Button size="sm" variant="outline" disabled={resetMutation.isPending} onClick={() => { if (window.confirm(t.resetConfirm)) resetMutation.mutate({ userId: user.id }); }} className="border-[#dfe8e9] text-xs text-[#0b2140] hover:border-[#12897f] hover:text-[#12897f]"><RefreshCcw className="me-1.5 h-3.5 w-3.5" />{t.reset}</Button></td></tr>; })}</tbody></table>{filteredUsers.length === 0 && <div className="py-10 text-center text-xs text-[#8b989f]"><UsersRound className="mx-auto mb-2 h-6 w-6 text-[#c9a227]" />{t.noActivity}</div>}</div></section>}
    </div></div>;
}
