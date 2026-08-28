import React, { useMemo, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  AlertCircle,
  ArrowDownToLine,
  Award,
  BarChart3,
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  Download,
  Filter,
  GitCompareArrows,
  CircleHelp,
  Clock3,
  File,
  FileArchive,
  FileSpreadsheet,
  FileText,
  FileUp,
  Image as ImageIcon,
  LoaderCircle,
  Medal,
  MoreHorizontal,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  Trophy,
  UploadCloud,
  X,
} from "lucide-react";
import { filterLeaderboard } from "@shared/leaderboard";
import {
  DEFAULT_AWARD_TITLE,
  DEFAULT_CONTEXT,
  EVIDENCE_TYPES,
  OTHER_TYPE,
  JUDGING_PROGRAMS,
  type JudgingProgramType,
  type RubricCriterion,
  classify,
  type CoverageItem,
  guessEvidenceType,
} from "@shared/judge";
import { useLang } from "@/components/DashboardLayout";
import { TrialGate } from "@/components/TrialGate";
import { useAuth } from "@/_core/hooks/useAuth";

type UploadEvidence = {
  id: string;
  file: File;
  type: string;
};

type CriterionDraft = {
  note: string;
  files: File[];
};

type CopilotSummary = {
  id: string;
  programType: JudgingProgramType;
  generatedAt: string;
  headlineAr: string;
  headlineEn: string;
  nominationSummaryAr: string;
  nominationSummaryEn: string;
  awardSummaryAr: string;
  awardSummaryEn: string;
};

type DetailData = {
  id: string;
  name: string;
  awardTitle: string;
  programType: JudgingProgramType;
  date: string;
  overall: number;
  tier: string;
  criteria: Record<string, { score: number; note: string; evidence?: Array<{ name: string; url: string }> }>;
  kpi_findings: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  coverage: CoverageItem[];
  fileCount: number;
  signatureData?: string | null;
  judgeCount: number;
  judges: Array<{ name: string; criteria: Record<string, { score: number; note: string; evidence?: Array<{ name: string; url: string }> }>; overall: number }>;
  weights: Array<{ key: string; name: string; weight: number }> | null;
  evidenceItems: Array<{ id?: string; fileName: string; fileType: string; criterionKey?: string | null; judgeKey?: string | null; mimeType?: string | null; extractedText?: string | null; storageKey: string; storageUrl: string; fileSize: number }>;
};

const ACCEPTED_EXTENSIONS = ["pdf", "docx", "pptx", "xlsx", "csv", "jpg", "jpeg", "png", "webp"];

function uid() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

function extensionOf(name: string) {
  return name.split(".").pop()?.toLowerCase() || "";
}

function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.onerror = () => reject(reader.error || new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

function formatDate(value: string, lang: string) {
  return new Date(value).toLocaleDateString(lang === "ar" ? "ar-AE" : "en-US", { day: "numeric", month: "short", year: "numeric" });
}

function fileIcon(fileName: string) {
  const ext = extensionOf(fileName);
  if (["jpg", "jpeg", "png", "webp"].includes(ext)) return <ImageIcon className="h-5 w-5" />;
  if (["xlsx", "csv"].includes(ext)) return <FileSpreadsheet className="h-5 w-5" />;
  if (ext === "pptx") return <FileArchive className="h-5 w-5" />;
  if (["pdf", "docx"].includes(ext)) return <FileText className="h-5 w-5" />;
  return <File className="h-5 w-5" />;
}

function TierIcon({ tier }: { tier: string }) {
  if (tier === "gold") return <Trophy className="h-6 w-6 text-[#c9a227]" />;
  if (tier === "silver") return <Medal className="h-6 w-6 text-[#8e99a6]" />;
  if (tier === "bronze") return <Medal className="h-6 w-6 text-[#b5723a]" />;
  return <Award className="h-6 w-6 text-[#12897f]" />;
}

function tierStyle(tier: string) {
  if (tier === "gold") return "border-[#e6ce79] bg-[#fbf3dc] text-[#8a6d14]";
  if (tier === "silver") return "border-[#d7dee3] bg-[#eef1f3] text-[#5a6773]";
  if (tier === "bronze") return "border-[#e7c6ac] bg-[#f6e9dd] text-[#8a4e23]";
  if (tier === "mention") return "border-[#b7dfda] bg-[#e4f3f1] text-[#12897f]";
  return "border-[#edd1cf] bg-[#f9e9e8] text-[#a84745]";
}

function ScoreGauge({ score, size = "large", t }: { score: number; size?: "large" | "small"; t: any }) {
  const dimension = size === "large" ? "h-36 w-36" : "h-14 w-14";
  const text = size === "large" ? "text-4xl" : "text-base";
  return (
    <div className={`${dimension} relative shrink-0 rounded-full`} style={{ background: `conic-gradient(#12897f ${score * 3.6}deg, #e8eef0 0deg)` }}>
      <div className="absolute inset-[7px] flex flex-col items-center justify-center rounded-full bg-white">
        <span className={`${text} font-mono font-semibold tracking-tight text-[#0b2140]`}>{score}</span>
        {size === "large" && <span className="text-xs text-[#6b7b85]">{t.from100}</span>}
      </div>
    </div>
  );
}

export default function Home() {
  const [tab, setTab] = useState<"new" | "board">("new");
  const { lang, t } = useLang();
  const { user } = useAuth();
  const [programType, setProgramType] = useState<JudgingProgramType>("excellence");
  const programConfig = JUDGING_PROGRAMS[programType];
  const activeRubric = programConfig.rubric;

  const [awardTitle, setAwardTitle] = useState(programConfig.defaultTitle[lang]);
  const [context, setContext] = useState(programConfig.defaultContext[lang]);
  const [prevLang, setPrevLang] = useState(lang);
  const [contextOpen, setContextOpen] = useState(true);

  if (lang !== prevLang) {
    setPrevLang(lang);
    setAwardTitle(programConfig.defaultTitle[lang]);
    setContext(programConfig.defaultContext[lang]);
  }
  const [nomineeName, setNomineeName] = useState("");
  const [evidence, setEvidence] = useState<UploadEvidence[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [copilotSummary, setCopilotSummary] = useState<CopilotSummary | null>(null);
  const [auditOpen, setAuditOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [tierFilter, setTierFilter] = useState("all");
  const [perfectOnly, setPerfectOnly] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [judgeCount, setJudgeCount] = useState(1);
  const [customWeights, setCustomWeights] = useState<Record<string, number>>(() => {
    const obj: Record<string, number> = {};
    activeRubric.forEach((r) => { obj[r.key] = r.weight; });
    return obj;
  });
  const [weightsOpen, setWeightsOpen] = useState(false);
  const [criterionDrafts, setCriterionDrafts] = useState<Record<string, CriterionDraft>>(() => Object.fromEntries(activeRubric.map((item: RubricCriterion) => [item.key, { note: "", files: [] }])));
  const [criterionOpen, setCriterionOpen] = useState(false);
  const [activeJudgeTab, setActiveJudgeTab] = useState("judge_1");
  const [judgeCriterionDrafts, setJudgeCriterionDrafts] = useState<Record<string, Record<string, CriterionDraft>>>(() => ({
    judge_1: Object.fromEntries(activeRubric.map((item: RubricCriterion) => [item.key, { note: "", files: [] }])),
    judge_2: Object.fromEntries(activeRubric.map((item: RubricCriterion) => [item.key, { note: "", files: [] }])),
    judge_3: Object.fromEntries(activeRubric.map((item: RubricCriterion) => [item.key, { note: "", files: [] }])),
    judge_4: Object.fromEntries(activeRubric.map((item: RubricCriterion) => [item.key, { note: "", files: [] }])),
    judge_5: Object.fromEntries(activeRubric.map((item: RubricCriterion) => [item.key, { note: "", files: [] }])),
  }));

  function handleProgramChange(nextType: JudgingProgramType) {
    setProgramType(nextType);
    const nextCfg = JUDGING_PROGRAMS[nextType];
    setAwardTitle(nextCfg.defaultTitle[lang]);
    setContext(nextCfg.defaultContext[lang]);
    const defW: Record<string, number> = {};
    nextCfg.rubric.forEach((r) => { defW[r.key] = r.weight; });
    setCustomWeights(defW);
    setJudgeCriterionDrafts({
      judge_1: Object.fromEntries(nextCfg.rubric.map((item: RubricCriterion) => [item.key, { note: "", files: [] }])),
      judge_2: Object.fromEntries(nextCfg.rubric.map((item: RubricCriterion) => [item.key, { note: "", files: [] }])),
      judge_3: Object.fromEntries(nextCfg.rubric.map((item: RubricCriterion) => [item.key, { note: "", files: [] }])),
      judge_4: Object.fromEntries(nextCfg.rubric.map((item: RubricCriterion) => [item.key, { note: "", files: [] }])),
      judge_5: Object.fromEntries(nextCfg.rubric.map((item: RubricCriterion) => [item.key, { note: "", files: [] }])),
    });
  }
  const [templateName, setTemplateName] = useState("");
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const sigCanvasRef = useRef<HTMLCanvasElement>(null);
  const weightTemplatesQuery = trpc.evaluation.weightTemplates.useQuery();
  const savedTemplates = useMemo(() => (weightTemplatesQuery.data ?? []).filter((template) => template.programType === programType && (template.status === "approved" || template.ownerUserId === user?.id)).map((template) => ({ id: template.id, name: template.name[lang], weights: template.weights, version: template.version, status: template.status })), [weightTemplatesQuery.data, programType, lang, user?.id]);
  const inputRef = useRef<HTMLInputElement>(null);

  function saveWeightTemplate() {
    if (!templateName.trim()) return;
    createWeightTemplate.mutate({ nameAr: templateName.trim(), nameEn: templateName.trim(), programType, weights: { ...customWeights } });
  }

  function loadWeightTemplate(weights: Record<string, number>) {
    setCustomWeights({ ...weights });
    toast.success(t.templateLoaded);
  }

  const utils = trpc.useUtils();
  const createWeightTemplate = trpc.evaluation.createWeightTemplate.useMutation({ onSuccess: () => { setTemplateName(""); toast.success(t.templateSaved); utils.evaluation.weightTemplates.invalidate(); }, onError: (error) => toast.error(error.message) });
  const submissions = trpc.evaluation.list.useQuery();
  const trialStatusQuery = trpc.evaluation.trialStatus.useQuery();
  const judgeTasksQuery = trpc.evaluation.judgeTasks.useQuery();
  const detailQuery = trpc.evaluation.getDetail.useQuery({ id: detailId || "" }, { enabled: Boolean(detailId) });
  const auditQuery = trpc.evaluation.auditTrail.useQuery({ nominationId: detailId || "" }, { enabled: Boolean(detailId) && auditOpen });
  const compareAQuery = trpc.evaluation.getDetail.useQuery({ id: compareIds[0] || "" }, { enabled: compareIds.length > 0 });
  const compareBQuery = trpc.evaluation.getDetail.useQuery({ id: compareIds[1] || "" }, { enabled: compareIds.length > 1 });
  const generateSummaryMutation = trpc.evaluation.generateSummary.useMutation({
    onSuccess: (summary) => {
      setCopilotSummary(summary as CopilotSummary);
      toast.success(t.summaryGenerated);
    },
    onError: (error) => toast.error(error.message || t.summaryGenerationError),
  });
  const evaluateMutation = trpc.evaluation.evaluate.useMutation({
    onSuccess: async (result) => {
      await Promise.all([
        utils.evaluation.list.invalidate(),
        utils.evaluation.trialStatus.invalidate(),
      ]);
      setEvidence([]);
      setNomineeName("");
      setJudgeCriterionDrafts({
        judge_1: Object.fromEntries(activeRubric.map((item) => [item.key, { note: "", files: [] }])),
        judge_2: Object.fromEntries(activeRubric.map((item) => [item.key, { note: "", files: [] }])),
        judge_3: Object.fromEntries(activeRubric.map((item) => [item.key, { note: "", files: [] }])),
        judge_4: Object.fromEntries(activeRubric.map((item) => [item.key, { note: "", files: [] }])),
        judge_5: Object.fromEntries(activeRubric.map((item) => [item.key, { note: "", files: [] }])),
      });
      setSignatureData(null);
      const canvas = sigCanvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      setTab("board");
      toast.success(lang === "ar" ? `تم تقييم الترشيح بدرجة ${result.overall}%` : `Nomination evaluated with score ${result.overall}%`);
    },
    onError: async (error) => {
      if (error.data?.code === "FORBIDDEN") {
        await utils.evaluation.trialStatus.invalidate();
        toast.error(t.trialLimitReachedTitle);
        return;
      }
      toast.error(error.message || (lang === "ar" ? "تعذر إكمال التقييم" : "Failed to complete evaluation"));
    },
  });
  const deleteMutation = trpc.evaluation.delete.useMutation({
    onSuccess: async () => {
      await utils.evaluation.list.invalidate();
      if (detailId) setDetailId(null);
      toast.success(lang === "ar" ? "تم حذف الترشيح" : "Nomination deleted");
    },
    onError: () => toast.error(lang === "ar" ? "تعذر حذف الترشيح" : "Failed to delete nomination"),
  });
  const clearMutation = trpc.evaluation.clearAll.useMutation({
    onSuccess: async () => {
      await utils.evaluation.list.invalidate();
      toast.success(lang === "ar" ? "تم مسح لوحة الترشيحات" : "Leaderboard cleared");
    },
  });

  const sortedSubmissions = useMemo(() => [...(submissions.data || [])].sort((a, b) => b.overall - a.overall), [submissions.data]);
  const trialUsedCount = trialStatusQuery.data?.used ?? 0;
  const isTrialExhausted = trialStatusQuery.data?.exhausted === true;

  const filteredSubmissions = useMemo(() => {
    const base = filterLeaderboard(sortedSubmissions, searchTerm, perfectOnly ? "all" : tierFilter);
    return perfectOnly ? base.filter((submission) => Object.values(submission.criteria || {}).some((criterion: any) => criterion?.score === 10)) : base;
  }, [searchTerm, sortedSubmissions, tierFilter, perfectOnly]);

  const perfectDistribution = useMemo(() => activeRubric.map((item) => ({
    ...item,
    count: sortedSubmissions.filter((submission) => submission.criteria?.[item.key]?.score === 10).length,
  })), [sortedSubmissions, activeRubric]);
  const activeEvidenceTypes = useMemo(() => EVIDENCE_TYPES.filter((item) => programConfig.evidenceKeys.includes(item.key)), [programConfig]);
  const coverage = useMemo(() => activeEvidenceTypes.map((item) => ({ ...item, label: t.evidenceTypes[item.key as keyof typeof t.evidenceTypes] || item.label, covered: evidence.some((entry) => entry.type === item.key) })), [activeEvidenceTypes, evidence, t]);
  const coveredCount = coverage.filter((item) => item.covered).length;

  function addFiles(fileList: FileList | File[]) {
    const accepted = Array.from(fileList).filter((file) => ACCEPTED_EXTENSIONS.includes(extensionOf(file.name)));
    if (!accepted.length) {
      toast.error(lang === "ar" ? "يرجى اختيار ملف مدعوم من القائمة الموضحة" : "Please select a supported file type");
      return;
    }
    const next = accepted.map((file) => ({ id: uid(), file, type: guessEvidenceType(file.name) }));
    setEvidence((current) => [...current, ...next]);
  }

  function removeEvidence(id: string) {
    setEvidence((current) => current.filter((entry) => entry.id !== id));
  }

  function updateEvidenceType(id: string, type: string) {
    setEvidence((current) => current.map((entry) => entry.id === id ? { ...entry, type } : entry));
  }

  function updateJudgeCriterionNote(jKey: string, key: string, note: string) {
    setJudgeCriterionDrafts((current) => ({
      ...current,
      [jKey]: {
        ...(current[jKey] || {}),
        [key]: { ...(current[jKey]?.[key] || { note: "", files: [] }), note },
      },
    }));
  }

  function addJudgeCriterionFiles(jKey: string, key: string, files: FileList | File[]) {
    const accepted = Array.from(files).filter((file) => ACCEPTED_EXTENSIONS.includes(extensionOf(file.name)));
    if (!accepted.length) {
      toast.error(lang === "ar" ? "يرجى اختيار ملف مدعوم" : "Please select a supported file");
      return;
    }
    setJudgeCriterionDrafts((current) => ({
      ...current,
      [jKey]: {
        ...(current[jKey] || {}),
        [key]: {
          ...(current[jKey]?.[key] || { note: "", files: [] }),
          files: [...(current[jKey]?.[key]?.files || []), ...accepted],
        },
      },
    }));
  }

  function removeJudgeCriterionFile(jKey: string, key: string, fileIndex: number) {
    setJudgeCriterionDrafts((current) => ({
      ...current,
      [jKey]: {
        ...(current[jKey] || {}),
        [key]: {
          ...(current[jKey]?.[key] || { note: "", files: [] }),
          files: (current[jKey]?.[key]?.files || []).filter((_, index) => index !== fileIndex),
        },
      },
    }));
  }

  async function submitNomination() {
    if (!evidence.length || evaluateMutation.isPending) return;
    const name = nomineeName.trim() || (lang === "ar" ? `ترشيح بدون اسم — ${new Date().toLocaleDateString("ar-AE")}` : `Unnamed Nomination — ${new Date().toLocaleDateString("en-US")}`);
    try {
      const files = await Promise.all(evidence.map(async (entry) => ({
        name: entry.file.name,
        type: entry.type,
        mimeType: entry.file.type || "application/octet-stream",
        contentBase64: await readAsBase64(entry.file),
      })));
      const totalWeight = Object.values(customWeights).reduce((a, b) => a + b, 0);
      if (totalWeight !== 100) {
        toast.error(t.weightsMustEqual100);
        return;
      }
      if (!signatureData) {
        toast.error(t.signatureRequired);
        return;
      }
      const judgeCriterionNotes: Record<string, Record<string, string>> = {};
      const judgeCriterionEvidence: Record<string, Record<string, Array<{ name: string; mimeType: string; contentBase64: string }>>> = {};

      for (let j = 1; j <= judgeCount; j++) {
        const jKey = `judge_${j}`;
        const drafts = judgeCriterionDrafts[jKey] || {};
        judgeCriterionNotes[jKey] = {};
        judgeCriterionEvidence[jKey] = {};
        for (const item of activeRubric) {
          const draft = drafts[item.key];
          if (draft?.note?.trim()) judgeCriterionNotes[jKey][item.key] = draft.note.trim();
          if (draft?.files?.length) {
            judgeCriterionEvidence[jKey][item.key] = await Promise.all(
              draft.files.map(async (file) => ({
                name: file.name,
                mimeType: file.type || "application/octet-stream",
                contentBase64: await readAsBase64(file),
              }))
            );
          }
        }
      }

      evaluateMutation.mutate({
        nomineeName: name,
        awardTitle,
        programType,
        context,
        files,
        weights: customWeights,
        judgeCount,
        judgeCriterionNotes,
        judgeCriterionEvidence,
        signatureData,
      });
    } catch {
      toast.error(lang === "ar" ? "تعذر تجهيز أحد الملفات للتقييم" : "Failed to prepare files for evaluation");
    }
  }

  function clearAll() {
    if (sortedSubmissions.length && window.confirm(t.confirmClear)) clearMutation.mutate();
  }

  function toggleCompare(id: string) {
    setCompareIds((current) => current.includes(id) ? current.filter((item) => item !== id) : current.length < 2 ? [...current, id] : [current[1], id]);
  }

  return (
    <div className={`soft-grid min-h-screen px-4 py-5 text-[#16212b] sm:px-6 lg:px-8 ${lang === "ar" ? "text-right" : "text-left"}`}>
      <div className="mx-auto max-w-[1420px]">
        <header className="fade-up relative mb-5 overflow-hidden rounded-[28px] bg-[#0b2140] px-6 py-7 text-white shadow-[0_20px_55px_rgba(11,33,64,.18)] sm:px-9 sm:py-8">
          <div className="absolute -left-20 -top-28 h-72 w-72 rounded-full bg-[#12897f]/20 blur-2xl" />
          <div className="absolute -bottom-32 right-[42%] h-72 w-72 rounded-full bg-[#c9a227]/15 blur-3xl" />
          <div className="relative flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#c9a227] text-xl font-bold text-[#0b2140] shadow-[0_8px_24px_rgba(201,162,39,.22)]">م</div>
                <div><div className="text-xl font-bold tracking-tight">{t.appName}</div><div className="mt-1 text-xs text-[#b9d5d1]">{t.appSubtitle}</div></div>
              </div>
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-[#88d1c7]"><Sparkles className="h-4 w-4" /> {t.heroBadge}</div>
              <h1 className="max-w-3xl text-3xl font-bold leading-[1.35] tracking-tight sm:text-4xl">{t.heroTitle}</h1>
              <p className="mt-4 max-w-2xl text-sm leading-8 text-[#d4e1e4]">{t.heroDesc}</p>
            </div>
            <div className="w-full max-w-md rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
              <label className="mb-2 block text-[11px] font-semibold text-[#b9d5d1]">{t.awardTitleLabel}</label>
              <Input value={awardTitle} onChange={(event) => setAwardTitle(event.target.value)} className={`h-11 border-white/15 bg-white/10 text-sm text-white placeholder:text-white/40 focus-visible:ring-[#c9a227] ${lang === "ar" ? "text-right" : "text-left"}`} placeholder={t.awardTitlePlaceholder} />
              <div className="mt-3 flex items-center justify-between gap-3 text-[11px] text-[#b9d5d1]"><span>{t.awardTitleHint}</span><ArrowDownToLine className="h-4 w-4 text-[#c9a227]" /></div>
            </div>
          </div>
        </header>

        <section className="fade-up stagger-1 mb-5 rounded-2xl border border-[#b7dfda] bg-white p-5 shadow-[0_10px_32px_rgba(11,33,64,.05)] sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <label className="mb-1 block text-xs font-bold text-[#0b2140]">{t.programTypeLabel || "Judging Program Type"}</label>
              <p className="text-[11px] text-[#73828b]">{t.programTypeHint || "Select judging program to automatically adapt criteria and context"}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(["excellence", "graduation", "tenders", "performance"] as JudgingProgramType[]).map((pKey) => {
                const prog = JUDGING_PROGRAMS[pKey];
                const active = programType === pKey;
                return (
                  <button
                    key={pKey}
                    type="button"
                    onClick={() => handleProgramChange(pKey)}
                    className={`flex flex-col items-start rounded-xl border p-3 text-left transition ${active ? "border-[#12897f] bg-[#e4f3f1] text-[#0b2140] shadow-sm" : "border-[#dfe8e9] bg-[#fbfcfc] text-[#62717c] hover:bg-white"}`}
                  >
                    <span className="text-xs font-bold">{prog.name[lang === "ar" ? "ar" : "en"]}</span>
                    <span className="mt-1 text-[10px] text-[#73828b] line-clamp-1">{prog.description[lang === "ar" ? "ar" : "en"]}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section className="fade-up stagger-1 mb-5 rounded-2xl border border-[#dfe8e9] bg-white shadow-[0_10px_32px_rgba(11,33,64,.05)]">
          <button onClick={() => setContextOpen((value) => !value)} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-inherit sm:px-6" aria-expanded={contextOpen}>
            <span className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#e4f3f1] text-[#12897f]"><CircleHelp className="h-4 w-4" /></span><span><span className="block text-sm font-bold text-[#0b2140]">{t.referenceContext}</span><span className="mt-1 block text-[11px] text-[#73828b]">{t.referenceContextHint}</span></span></span>
            <ChevronDown className={`h-5 w-5 text-[#73828b] transition-transform ${contextOpen ? "rotate-180" : ""}`} />
          </button>
          {contextOpen && <div className="border-t border-[#edf1f2] px-5 pb-5 pt-4 sm:px-6"><Textarea value={context} onChange={(event) => setContext(event.target.value)} className={`min-h-36 resize-y border-[#dfe8e9] bg-[#fbfcfc] text-sm leading-8 focus-visible:ring-[#12897f] ${lang === "ar" ? "text-right" : "text-left"}`} placeholder={t.referenceContextPlaceholder} /><div className="mt-3 flex flex-wrap gap-2">{activeEvidenceTypes.map((item) => <span key={item.key} className="rounded-full bg-[#e4f3f1] px-3 py-1 text-[10px] font-medium text-[#12897f]">{t.evidenceTypes[item.key as keyof typeof t.evidenceTypes] || item.label}</span>)}</div></div>}
        </section>

        {(judgeTasksQuery.data?.length ?? 0) > 0 && <section className="fade-up mb-5 rounded-2xl border border-[#b7dfda] bg-[#f2f9f8] p-5 shadow-[0_10px_32px_rgba(11,33,64,.04)] sm:p-6">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><div className="mb-1 flex items-center gap-2 text-xs font-semibold text-[#12897f]"><ShieldCheck className="h-4 w-4" /> {t.assignedTasks}</div><p className="text-xs text-[#62717c]">{t.assignedTasksDesc}</p></div><span className="rounded-full bg-white px-3 py-1 font-mono text-[11px] font-bold text-[#12897f]">{judgeTasksQuery.data?.filter((task) => task.status === "assigned").length ?? 0} {t.assigned}</span></div>
          <div className="grid gap-3 md:grid-cols-2">{judgeTasksQuery.data?.map((task) => <button key={task.assignmentId} type="button" onClick={() => { setTab("board"); setDetailId(task.nominationId); setCopilotSummary(null); setAuditOpen(false); }} className="flex items-center justify-between gap-3 rounded-xl border border-[#d6ece9] bg-white p-3 text-left transition hover:border-[#12897f] hover:shadow-sm"><div className="min-w-0"><div className="truncate text-xs font-bold text-[#0b2140]">{task.name}</div><div className="mt-1 truncate text-[10px] text-[#73828b]">{task.awardTitle}</div></div><span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${task.status === "completed" ? "bg-[#e4f3f1] text-[#12897f]" : "bg-[#fbf3dc] text-[#8a6d14]"}`}>{task.status === "completed" ? t.completed : t.assigned}</span></button>)}</div>
        </section>}

        <div className="fade-up stagger-2 mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2 rounded-2xl bg-[#e9eff1] p-1.5">
            <button onClick={() => setTab("new")} className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${tab === "new" ? "bg-[#0b2140] text-white shadow-sm" : "text-[#62717c] hover:bg-white/60"}`}><Plus className="h-4 w-4" /> {t.newNomination}</button>
            <button onClick={() => setTab("board")} className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${tab === "board" ? "bg-[#0b2140] text-white shadow-sm" : "text-[#62717c] hover:bg-white/60"}`}><BarChart3 className="h-4 w-4" /> {t.leaderboard} <span className={`rounded-full px-2 py-0.5 text-[10px] ${tab === "board" ? "bg-white/15 text-white" : "bg-white text-[#0b2140]"}`}>{sortedSubmissions.length}</span></button>
          </div>
          <div className="hidden items-center gap-2 text-xs text-[#73828b] md:flex"><ShieldCheck className="h-4 w-4 text-[#12897f]" /> {t.evidenceProtected}</div>
        </div>

        {tab === "new" ? (
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,.9fr)]">
            <section className="fade-up stagger-2 rounded-2xl border border-[#dfe8e9] bg-white p-5 shadow-[0_10px_32px_rgba(11,33,64,.05)] sm:p-6">
              <div className="mb-6 flex items-start justify-between gap-4"><div><div className="mb-2 flex items-center gap-2 text-xs font-semibold text-[#12897f]"><Target className="h-4 w-4" /> {t.step1}</div><h2 className="text-xl font-bold text-[#0b2140]">{t.addInitiativeEvidence}</h2><p className="mt-2 text-xs leading-6 text-[#73828b]">{t.addInitiativeHint}</p></div><div className="hidden h-12 w-12 items-center justify-center rounded-2xl bg-[#fbf3dc] text-[#8a6d14] sm:flex"><FileUp className="h-5 w-5" /></div></div>
              <label className="mb-2 block text-xs font-bold text-[#344651]">{t.nomineeNameLabel} <span className="font-normal text-[#94a0a7]">{t.nomineeNameOptional}</span></label>
              <Input value={nomineeName} onChange={(event) => setNomineeName(event.target.value)} placeholder={t.nomineeNamePlaceholder} className={`h-12 border-[#dfe8e9] bg-[#fbfcfc] text-sm focus-visible:ring-[#12897f] ${lang === "ar" ? "text-right" : "text-left"}`} />
              <div onClick={() => inputRef.current?.click()} onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={(event) => { event.preventDefault(); setIsDragging(false); addFiles(event.dataTransfer.files); }} className={`mt-5 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-5 py-10 text-center transition ${isDragging ? "border-[#12897f] bg-[#e4f3f1]" : "border-[#cfdbde] bg-[#fbfcfc] hover:border-[#12897f] hover:bg-[#f2f9f8]"}`}>
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e4f3f1] text-[#12897f]"><UploadCloud className="h-7 w-7" /></div><div className="text-sm font-bold text-[#0b2140]">{t.dropzoneText}</div><div className="mt-2 text-xs text-[#73828b]">{t.dropzoneFormats}</div><div className="mt-4 rounded-full bg-[#0b2140] px-4 py-2 text-xs font-semibold text-white">{t.chooseFilesBtn}</div><input ref={inputRef} type="file" multiple accept=".pdf,.docx,.pptx,.xlsx,.csv,.jpg,.jpeg,.png,.webp" className="hidden" onChange={(event) => { if (event.target.files) addFiles(event.target.files); event.target.value = ""; }} /></div>

              {evidence.length > 0 && <div className="mt-5 space-y-2">{evidence.map((entry) => <div key={entry.id} className="flex flex-col gap-3 rounded-xl border border-[#e1e8ea] bg-[#fbfcfc] p-3 sm:flex-row sm:items-center"><div className="flex min-w-0 flex-1 items-center gap-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#eef4f4] text-[#12897f]">{fileIcon(entry.file.name)}</div><div className="min-w-0"><div className="truncate text-xs font-bold text-[#20313d]">{entry.file.name}</div><div className="mt-1 text-[10px] text-[#8a979f]">{(entry.file.size / 1024 / 1024).toFixed(2)} MB · {extensionOf(entry.file.name).toUpperCase()}</div></div></div><select value={entry.type} onChange={(event) => updateEvidenceType(entry.id, event.target.value)} className="h-10 rounded-lg border border-[#dfe8e9] bg-white px-3 text-xs text-[#344651] outline-none focus:border-[#12897f] sm:w-64">{activeEvidenceTypes.map((item) => <option key={item.key} value={item.key}>{t.evidenceTypes[item.key as keyof typeof t.evidenceTypes] || item.label}</option>)}<option value={OTHER_TYPE.key}>{t.evidenceTypes.other}</option></select><button onClick={() => removeEvidence(entry.id)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#8a979f] transition hover:bg-[#f9e9e8] hover:text-[#b94a48]" aria-label="Remove file"><X className="h-4 w-4" /></button></div>)}</div>}

              {evidence.length > 0 && <div className="mt-5 rounded-xl border border-[#e1e8ea] bg-[#fbfcfc] p-4"><div className="mb-3 flex items-center justify-between"><div className="text-xs font-bold text-[#0b2140]">{t.evidenceCoverage}</div><div className="font-mono text-[11px] text-[#12897f]">{coveredCount} / {activeEvidenceTypes.length}</div></div><div className="flex flex-wrap gap-2">{coverage.map((item) => <span key={item.key} className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-medium ${item.covered ? "border-transparent bg-[#e4f3f1] text-[#12897f]" : "border-[#dfe8e9] bg-white text-[#8a979f]"}`}>{item.covered && <Check className="h-3 w-3" />}{item.label}</span>)}</div><p className="mt-3 text-[10px] leading-5 text-[#7b8991]">{t.evidenceNote}</p></div>}

              <div className="mt-5 rounded-xl border border-[#dfe8e9] bg-[#fbfcfc] p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-bold text-[#0b2140]">{t.signatureLabel}</span>
                  <button type="button" onClick={() => { setSignatureData(null); const c = sigCanvasRef.current; if (c) { const ctx = c.getContext("2d"); if (ctx) ctx.clearRect(0, 0, c.width, c.height); } }} className="text-[10px] font-semibold text-[#b94a48] hover:underline">
                    {t.clearSignature}
                  </button>
                </div>
                <p className="mb-2 text-[10px] text-[#73828b]">{t.signatureHint}</p>
                <div className="relative overflow-hidden rounded-xl border border-dashed border-[#b7dfda] bg-white">
                  <canvas
                    ref={sigCanvasRef}
                    width={520}
                    height={120}
                    className="w-full cursor-crosshair touch-none"
                    onMouseDown={(e) => {
                      setIsDrawing(true);
                      const canvas = sigCanvasRef.current;
                      if (!canvas) return;
                      const rect = canvas.getBoundingClientRect();
                      const ctx = canvas.getContext("2d");
                      if (!ctx) return;
                      ctx.beginPath();
                      ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
                    }}
                    onMouseMove={(e) => {
                      if (!isDrawing) return;
                      const canvas = sigCanvasRef.current;
                      if (!canvas) return;
                      const rect = canvas.getBoundingClientRect();
                      const ctx = canvas.getContext("2d");
                      if (!ctx) return;
                      ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
                      ctx.strokeStyle = "#0b2140";
                      ctx.lineWidth = 2;
                      ctx.lineCap = "round";
                      ctx.stroke();
                    }}
                    onMouseUp={() => {
                      setIsDrawing(false);
                      const canvas = sigCanvasRef.current;
                      if (canvas) setSignatureData(canvas.toDataURL());
                    }}
                    onMouseLeave={() => {
                      if (isDrawing) {
                        setIsDrawing(false);
                        const canvas = sigCanvasRef.current;
                        if (canvas) setSignatureData(canvas.toDataURL());
                      }
                    }}
                    onTouchStart={(e) => {
                      e.preventDefault();
                      setIsDrawing(true);
                      const canvas = sigCanvasRef.current;
                      if (!canvas) return;
                      const rect = canvas.getBoundingClientRect();
                      const touch = e.touches[0];
                      const ctx = canvas.getContext("2d");
                      if (!ctx || !touch) return;
                      ctx.beginPath();
                      ctx.moveTo(touch.clientX - rect.left, touch.clientY - rect.top);
                    }}
                    onTouchMove={(e) => {
                      e.preventDefault();
                      if (!isDrawing) return;
                      const canvas = sigCanvasRef.current;
                      if (!canvas) return;
                      const rect = canvas.getBoundingClientRect();
                      const touch = e.touches[0];
                      const ctx = canvas.getContext("2d");
                      if (!ctx || !touch) return;
                      ctx.lineTo(touch.clientX - rect.left, touch.clientY - rect.top);
                      ctx.strokeStyle = "#0b2140";
                      ctx.lineWidth = 2;
                      ctx.lineCap = "round";
                      ctx.stroke();
                    }}
                    onTouchEnd={() => {
                      setIsDrawing(false);
                      const canvas = sigCanvasRef.current;
                      if (canvas) setSignatureData(canvas.toDataURL());
                    }}
                  />
                  {!signatureData && <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs font-medium text-[#94a0a7]">{lang === "ar" ? "ارسم توقيعك هنا" : "Draw your signature here"}</div>}
                </div>
              </div>

              {isTrialExhausted ? (
                <TrialGate
                  title={t.trialLimitReachedTitle}
                  description={t.trialLimitReachedDesc}
                  contactLabel={t.subscribeContactUsBtn}
                  contactHref="mailto:soso22083@gmail.com?subject=Subscription%20Inquiry%20-%20Mi%27yar%20Platform"
                  dir={lang === "ar" ? "rtl" : "ltr"}
                  formTitle={t.trialExtensionTitle}
                  nameLabel={t.trialExtensionName}
                  emailLabel={t.trialExtensionEmail}
                  reasonLabel={t.trialExtensionReason}
                  namePlaceholder={t.trialExtensionNamePlaceholder}
                  emailPlaceholder={t.trialExtensionEmailPlaceholder}
                  reasonPlaceholder={t.trialExtensionReasonPlaceholder}
                  submitLabel={t.trialExtensionSubmit}
                  requiredMessage={t.trialExtensionRequired}
                  sentMessage={t.trialExtensionSent}
                />
              ) : (
                <>
                  <div className="mt-4 flex items-center justify-between rounded-xl bg-[#f2f9f8] px-4 py-2.5 text-xs text-[#12897f]">
                    <span>{t.trialStatusInfo.replace("{used}", String(trialUsedCount))}</span>
                    <span className="font-mono font-bold">5 - {trialUsedCount} {lang === "ar" ? "متبقية" : "remaining"}</span>
                  </div>
                  <div className="mt-6 flex flex-col gap-3 border-t border-[#edf1f2] pt-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-2 text-[11px] text-[#73828b]"><ShieldCheck className="h-4 w-4 text-[#12897f]" /> {t.processingSecurity}</div><Button onClick={submitNomination} disabled={!trialStatusQuery.data || !evidence.length || !signatureData || evaluateMutation.isPending} className="h-12 rounded-xl bg-[#0b2140] px-6 text-sm font-bold text-white hover:bg-[#16305a] disabled:cursor-not-allowed disabled:opacity-40">{evaluateMutation.isPending ? <><LoaderCircle className={`${lang === "ar" ? "ml-2" : "mr-2"} h-4 w-4 animate-spin`} /> {t.evaluatingBtn}</> : <><Sparkles className={`${lang === "ar" ? "ml-2" : "mr-2"} h-4 w-4 text-[#c9a227]`} /> {t.evaluateBtn}</>}</Button></div>
                  {evaluateMutation.isPending && <div className="mt-4 flex items-center gap-3 rounded-xl bg-[#e4f3f1] px-4 py-3 text-xs text-[#12897f]"><LoaderCircle className="h-4 w-4 animate-spin" /> {t.evaluatingNotice}</div>}
                </>
              )}
            </section>

            <aside className="fade-up stagger-3 space-y-5">
              <section className="rounded-2xl border border-[#dfe8e9] bg-white p-5 shadow-[0_10px_32px_rgba(11,33,64,.05)] sm:p-6">
                <div className="mb-5 flex items-center justify-between">
                  <div><div className="mb-2 flex items-center gap-2 text-xs font-semibold text-[#12897f]"><BarChart3 className="h-4 w-4" /> {t.step2}</div><h2 className="text-lg font-bold text-[#0b2140]">{t.approvedCriteria}</h2></div>
                  <span className={`rounded-full px-3 py-1 font-mono text-[11px] font-semibold ${Object.values(customWeights).reduce((a, b) => a + b, 0) === 100 ? "bg-[#fbf3dc] text-[#8a6d14]" : "bg-[#f9e9e8] text-[#b94a48]"}`}>
                    {Object.values(customWeights).reduce((a, b) => a + b, 0)}%
                  </span>
                </div>

                <div className="mb-4 space-y-3 rounded-xl border border-[#edf1f2] bg-[#fbfcfc] p-3">
                  <div className="flex items-center justify-between text-xs font-bold text-[#0b2140]">
                    <span>{t.judgeCountLabel}</span>
                    <select value={judgeCount} onChange={(e) => setJudgeCount(Number(e.target.value))} className="h-8 rounded-lg border border-[#dfe8e9] bg-white px-2 font-mono text-xs text-[#0b2140] outline-none focus:border-[#12897f]">
                      <option value={1}>1</option>
                      <option value={3}>3</option>
                      <option value={5}>5</option>
                    </select>
                  </div>
                  <button onClick={() => setWeightsOpen((v) => !v)} className="flex w-full items-center justify-between text-xs font-semibold text-[#12897f]">
                    <span>{t.customizeWeightsBtn}</span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${weightsOpen ? "rotate-180" : ""}`} />
                  </button>
                  {weightsOpen && (
                    <div className="space-y-2 pt-2 border-t border-[#edf1f2]">
                      {activeRubric.map((item) => {
                        const translated = t.rubric[item.key as keyof typeof t.rubric] || { name: item.name };
                        return (
                          <div key={item.key} className="flex items-center justify-between gap-2">
                            <span className="text-[11px] text-[#344651] truncate max-w-[170px]" title={translated.name}>{translated.name}</span>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min={0}
                                max={100}
                                value={customWeights[item.key] ?? item.weight}
                                onChange={(e) => {
                                  const val = Math.max(0, Math.min(100, Number(e.target.value)));
                                  setCustomWeights((cur) => ({ ...cur, [item.key]: val }));
                                }}
                                className="h-7 w-14 rounded-md border border-[#dfe8e9] bg-white text-center font-mono text-xs outline-none focus:border-[#12897f]"
                              />
                              <span className="text-[10px] text-[#8a979f]">%</span>
                            </div>
                          </div>
                        );
                      })}
                      <div className="pt-2 border-t border-[#edf1f2] space-y-2">
                        {savedTemplates.length > 0 && (
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold text-[#73828b]">{t.loadTemplateBtn}:</span>
                            <div className="flex flex-wrap gap-1">
                              {savedTemplates.map((tpl, i) => (
                                <button key={i} onClick={() => loadWeightTemplate(tpl.weights)} className="rounded-md bg-[#e4f3f1] px-2 py-1 text-[10px] font-semibold text-[#12897f] hover:bg-[#12897f] hover:text-white transition">
                                  {tpl.name}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={templateName}
                            onChange={(e) => setTemplateName(e.target.value)}
                            placeholder={t.templateNamePlaceholder}
                            className="h-7 flex-1 rounded-md border border-[#dfe8e9] bg-white px-2 text-[10px] text-[#0b2140] outline-none focus:border-[#12897f]"
                          />
                          <button onClick={saveWeightTemplate} className="h-7 rounded-md bg-[#0b2140] px-2 text-[10px] font-bold text-white hover:bg-[#16305a]">
                            {t.saveTemplateBtn}
                          </button>
                        </div>
                        <div className="flex justify-between pt-1">
                          <button onClick={() => { const def: Record<string, number> = {}; activeRubric.forEach((r) => { def[r.key] = r.weight; }); setCustomWeights(def); }} className="text-[10px] font-semibold text-[#12897f] hover:underline">
                            {t.resetWeights}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mb-4 rounded-xl border border-[#b7dfda] bg-[#f2f9f8] p-3">
                  <button onClick={() => setCriterionOpen((value) => !value)} className="flex w-full items-center justify-between text-xs font-bold text-[#12897f]">
                    <span>{t.criterionEvidenceLabel}</span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${criterionOpen ? "rotate-180" : ""}`} />
                  </button>
                  {criterionOpen && <div className="mt-3 space-y-3 border-t border-[#d6ece9] pt-3">
                    <p className="text-[10px] leading-5 text-[#62717c]">{t.criterionEvidenceHint}</p>
                    {judgeCount > 1 && (
                      <div className="flex flex-wrap gap-1 pb-2 border-b border-[#e4ecee]">
                        {Array.from({ length: judgeCount }).map((_, idx) => {
                          const jKey = `judge_${idx + 1}`;
                          return (
                            <button
                              key={jKey}
                              type="button"
                              onClick={() => setActiveJudgeTab(jKey)}
                              className={`rounded-lg px-2.5 py-1 text-[10px] font-bold transition ${activeJudgeTab === jKey ? "bg-[#0b2140] text-white" : "bg-white text-[#62717c] border border-[#dfe8e9]"}`}
                            >
                              {lang === "ar" ? `المحكّم ${idx + 1}` : `Judge ${idx + 1}`}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {activeRubric.map((item) => {
                      const translated = t.rubric[item.key as keyof typeof t.rubric] || { name: item.name };
                      const currentJKey = judgeCount > 1 ? activeJudgeTab : "judge_1";
                      const draft = judgeCriterionDrafts[currentJKey]?.[item.key] || { note: "", files: [] };
                      return <div key={item.key} className="rounded-xl border border-[#d6ece9] bg-white p-3">
                        <div className="mb-2 flex items-center justify-between gap-2"><span className="text-[11px] font-bold text-[#344651]">{translated.name}</span><span className="font-mono text-[10px] text-[#8a979f]">{draft.files.length} {lang === "ar" ? "ملف" : "files"}</span></div>
                        <Textarea value={draft.note} onChange={(event) => updateJudgeCriterionNote(currentJKey, item.key, event.target.value)} placeholder={t.judgeNotesLabel} className="min-h-16 resize-y border-[#dfe8e9] bg-[#fbfcfc] text-[11px] leading-5" />
                        <div className="mt-2 flex items-center gap-2"><label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#dfe8e9] bg-[#fbfcfc] px-2.5 py-2 text-[10px] font-semibold text-[#12897f] hover:border-[#12897f]"><FileUp className="h-3.5 w-3.5" /> {t.addCriterionEvidence}<input type="file" multiple accept=".pdf,.docx,.pptx,.xlsx,.csv,.jpg,.jpeg,.png,.webp" className="hidden" onChange={(event) => { if (event.target.files) addJudgeCriterionFiles(currentJKey, item.key, event.target.files); event.target.value = ""; }} /></label></div>
                        {draft.files.length > 0 && <div className="mt-2 space-y-1">{draft.files.map((file, index) => <div key={`${file.name}-${index}`} className="flex items-center justify-between gap-2 rounded-lg bg-[#f5f8f8] px-2 py-1.5 text-[10px] text-[#62717c]"><span className="truncate">{file.name}</span><button type="button" onClick={() => removeJudgeCriterionFile(currentJKey, item.key, index)} className="text-[#a84745] hover:underline">{t.removeCriterionEvidence}</button></div>)}</div>}
                      </div>;
                    })}
                  </div>}
                </div>

                <div className="space-y-2">
                  {activeRubric.map((item) => {
                    const translated = t.rubric[item.key as keyof typeof t.rubric] || { name: item.name };
                    const currentWeight = customWeights[item.key] ?? item.weight;
                    return (
                      <div key={item.key} className="rounded-xl border border-[#edf1f2] p-3">
                        <div className="flex items-start justify-between gap-3">
                          <span className="text-xs font-semibold leading-5 text-[#344651]">{translated.name}</span>
                          <span className="shrink-0 rounded-full bg-[#e4f3f1] px-2 py-1 font-mono text-[10px] font-semibold text-[#12897f]">{currentWeight}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 flex items-start gap-2 rounded-xl bg-[#fbf3dc] p-3 text-[10px] leading-5 text-[#8a6d14]">
                  <CircleHelp className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {t.rubricNote}
                </div>
              </section>
              <section className="rounded-2xl border border-[#dfe8e9] bg-[#0b2140] p-5 text-white shadow-[0_10px_32px_rgba(11,33,64,.12)] sm:p-6"><div className="flex items-start gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#12897f]"><ShieldCheck className="h-5 w-5" /></div><div><h3 className="text-sm font-bold">{t.explainableTitle}</h3><p className="mt-2 text-xs leading-6 text-[#c5d5d8]">{t.explainableDesc}</p></div></div></section>
            </aside>
          </div>
        ) : (
          <>
          <section id="excellence-dashboard-card" className="mb-5 rounded-2xl border border-[#dfe8e9] bg-white p-5 shadow-[0_10px_32px_rgba(11,33,64,.05)] sm:p-6">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-[#12897f]"><BarChart3 className="h-4 w-4" /> {t.excellenceSummary}</div>
                <h2 className="text-xl font-bold text-[#0b2140]">{t.excellenceSummary}</h2>
                <p className="mt-2 text-xs text-[#73828b]">{t.excellenceSummaryDesc}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-[#fbf3dc] px-3 py-1 font-mono text-[11px] font-bold text-[#8a6d14]">{perfectDistribution.reduce((sum, item) => sum + item.count, 0)} × 10/10</span>
                <button
                  type="button"
                  onClick={async () => {
                    const el = document.getElementById("excellence-dashboard-card");
                    if (!el) return;
                    try {
                      // Dynamically render chart card to canvas / data url or print
                      const printWindow = window.open("", "_blank");
                      if (!printWindow) return;
                      printWindow.document.write(`<html><head><title>${t.excellenceSummary}</title><style>body{font-family:sans-serif;padding:24px;background:#fbfcfc;direction:${lang === "ar" ? "rtl" : "ltr"}} .card{background:white;border:1px solid #dfe8e9;border-radius:16px;padding:24px;box-shadow:0 10px 32px rgba(0,0,0,0.05)} h2{color:#0b2140;margin-bottom:8px;} p{color:#62717c;font-size:12px;margin-bottom:16px;} .grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;} .item{border:1px solid #edf1f2;border-radius:12px;padding:12px;} .bar{background:#e8eef0;height:8px;border-radius:4px;overflow:hidden;margin-top:8px;} .fill{background:linear-gradient(to left, #c9a227, #12897f);height:100%;border-radius:4px;}</style></head><body>` + el.outerHTML + `</body></html>`);
                      printWindow.document.close();
                      printWindow.focus();
                      setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
                    } catch {
                      toast.error(lang === "ar" ? "تعذر تصدير الرسم البياني" : "Failed to export chart image");
                    }
                  }}
                  className="flex items-center gap-1.5 rounded-xl border border-[#dfe8e9] bg-[#fbfcfc] px-3 py-2 text-xs font-semibold text-[#344651] transition hover:border-[#12897f] hover:text-[#12897f]"
                >
                  <Download className="h-3.5 w-3.5" /> {t.exportChartImage}
                </button>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {perfectDistribution.map((item) => { const translated = t.rubric[item.key as keyof typeof t.rubric] || { name: item.name }; const maxCount = Math.max(...perfectDistribution.map((entry) => entry.count), 1); return <div key={item.key} className="rounded-xl border border-[#edf1f2] bg-[#fbfcfc] p-3"><div className="mb-2 flex items-start justify-between gap-2"><span className="text-[11px] font-semibold leading-4 text-[#344651]">{translated.name}</span><span className="font-mono text-sm font-bold text-[#12897f]">{item.count}</span></div><div className="h-2 overflow-hidden rounded-full bg-[#e8eef0]"><div className="h-full rounded-full bg-gradient-to-l from-[#c9a227] to-[#12897f]" style={{ width: `${(item.count / maxCount) * 100}%` }} /></div><div className="mt-1 text-[9px] text-[#8a979f]">{lang === "ar" ? "مرشحون بدرجة كاملة" : "perfect-score candidates"}</div></div>; })}
            </div>
          </section>
          <section className="print-leaderboard-shell fade-up rounded-2xl border border-[#dfe8e9] bg-white p-5 shadow-[0_10px_32px_rgba(11,33,64,.05)] sm:p-6"><div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><div className="mb-2 flex items-center gap-2 text-xs font-semibold text-[#12897f]"><Trophy className="h-4 w-4" /> {t.leaderboard} / {awardTitle || t.boardTitle}</div><h2 className="text-2xl font-bold text-[#0b2140]">{t.boardTitle}</h2><p className="mt-2 text-xs text-[#73828b]">{t.boardDesc}</p></div><div className="flex flex-wrap items-center gap-2"><div className="relative min-w-[210px]"><Search className={`pointer-events-none absolute ${lang === "ar" ? "right-3" : "left-3"} top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a979f]`} /><Input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder={t.searchPlaceholder} className={`h-10 rounded-xl border-[#dfe8e9] bg-[#fbfcfc] text-xs focus-visible:ring-[#12897f] ${lang === "ar" ? "pr-9" : "pl-9"}`} /></div><div className="relative"><Filter className={`pointer-events-none absolute ${lang === "ar" ? "right-3" : "left-3"} top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8a979f]`} /><select value={tierFilter} onChange={(event) => { const next = event.target.value; setTierFilter(next === "perfect" ? "all" : next); setPerfectOnly(next === "perfect"); }} className={`h-10 appearance-none rounded-xl border border-[#dfe8e9] bg-[#fbfcfc] text-xs text-[#344651] outline-none focus:border-[#12897f] ${lang === "ar" ? "px-8 pl-3" : "pl-8 pr-3"}`}><option value="all">{t.allCategories}</option><option value="gold">{t.gold}</option><option value="silver">{t.silver}</option><option value="bronze">{t.bronze}</option><option value="mention">{t.mention}</option><option value="none">{t.none}</option><option value="perfect">{t.perfectOnly}</option></select></div><button type="button" onClick={() => setPerfectOnly((value) => !value)} className={`h-10 rounded-xl border px-3 text-xs font-semibold transition ${perfectOnly ? "border-[#c9a227] bg-[#fbf3dc] text-[#8a6d14]" : "border-[#dfe8e9] bg-[#fbfcfc] text-[#73828b] hover:border-[#c9a227]"}`}>★ {t.perfectOnly}</button>{compareIds.length > 0 && <span className="flex h-10 items-center gap-1.5 rounded-xl bg-[#e4f3f1] px-3 text-[11px] font-semibold text-[#12897f]"><GitCompareArrows className="h-4 w-4" /> {compareIds.length}/2</span>}
<button onClick={() => {
  if (!sortedSubmissions.length) return;
  const csvRows = [["Rank", "Nominee", "Award", "Overall Score", "Tier", "Date"].join(",")];
  sortedSubmissions.forEach((s, idx) => {
    csvRows.push([idx + 1, `"${s.name}"`, `"${s.awardTitle}"`, s.overall, s.tier, s.date].join(","));
  });
  const blob = new Blob(["\uFEFF" + csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "miyars_leaderboard.csv";
  a.click();
  URL.revokeObjectURL(url);
  toast.success(lang === "ar" ? "تم تصدير ملف CSV بنجاح" : "Leaderboard exported as CSV");
}} className="flex h-10 items-center gap-1.5 rounded-xl border border-[#dfe8e9] bg-[#fbfcfc] px-3 text-xs font-semibold text-[#344651] transition hover:border-[#12897f] hover:text-[#12897f]">
  <FileSpreadsheet className="h-4 w-4 text-[#12897f]" /> {t.exportExcel}
</button>
<button onClick={() => {
  const previousTitle = document.title;
  document.title = `Leaderboard — ${awardTitle}`;
  window.print();
  window.setTimeout(() => { document.title = previousTitle; }, 800);
}} className="flex h-10 items-center gap-1.5 rounded-xl border border-[#dfe8e9] bg-[#fbfcfc] px-3 text-xs font-semibold text-[#344651] transition hover:border-[#12897f] hover:text-[#12897f]">
  <Download className="h-4 w-4 text-[#c9a227]" /> {t.exportLeaderboardPdf}
</button>
<Button onClick={clearAll} disabled={!sortedSubmissions.length || clearMutation.isPending} variant="outline" className="h-10 rounded-xl border-[#e4c9c7] text-xs text-[#b94a48] hover:bg-[#fdf3f2]"><Trash2 className={`${lang === "ar" ? "ml-2" : "mr-2"} h-4 w-4`} /> {t.clearAll}</Button></div></div>
            {submissions.isLoading ? <div className="flex min-h-64 items-center justify-center text-sm text-[#73828b]"><LoaderCircle className={`${lang === "ar" ? "ml-3" : "mr-3"} h-5 w-5 animate-spin text-[#12897f]`} /> {t.loadingBoard}</div> : filteredSubmissions.length === 0 ? <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-[#cfdbde] bg-[#fbfcfc] text-center"><div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#fbf3dc] text-[#8a6d14]"><Trophy className="h-7 w-7" /></div><h3 className="text-sm font-bold text-[#0b2140]">{t.noSubmissionsTitle}</h3><p className="mt-2 text-xs text-[#73828b]">{t.noSubmissionsDesc}</p><Button onClick={() => setTab("new")} className="mt-5 h-10 rounded-xl bg-[#0b2140] text-xs font-bold">{t.addFirstNomination}</Button></div> : <div className="space-y-3">{filteredSubmissions.map((submission, index) => { const tier = classify(submission.overall); return <div role="button" tabIndex={0} key={submission.id} onClick={() => { setDetailId(submission.id); setCopilotSummary(null); }} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setDetailId(submission.id); setCopilotSummary(null); } }} className={`group flex w-full items-center gap-3 rounded-2xl border border-[#e1e8ea] bg-white p-3 text-${lang === "ar" ? "right" : "left"} transition hover:-translate-y-0.5 hover:border-[#8fcfc7] hover:shadow-[0_10px_25px_rgba(18,137,127,.08)] sm:gap-5 sm:p-4`}><div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-mono text-sm font-semibold ${index === 0 ? "bg-[#fbf3dc] text-[#8a6d14]" : index === 1 ? "bg-[#eef1f3] text-[#5a6773]" : index === 2 ? "bg-[#f6e9dd] text-[#8a4e23]" : "bg-[#f4f7f8] text-[#7b8991]"}`}>{String(index + 1).padStart(2, "0")}</div><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#f5f8f8]"> <TierIcon tier={submission.tier} /></div><div className="min-w-0 flex-1"><div className="truncate text-sm font-bold text-[#20313d] group-hover:text-[#12897f]">{submission.name}</div><div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-[#8a979f]"><span className={`rounded-full border px-2.5 py-1 font-semibold ${tierStyle(submission.tier)}`}>{tier.label}</span>
{Object.values(submission.criteria || {}).some((c: any) => c.score === 10) && (
  <span className="rounded-full bg-[#fbf3dc] px-2 py-0.5 text-[10px] font-bold text-[#8a6d14]" title={t.perfectBadge}>
    ★ 10/10
  </span>
)}
<span className="flex items-center gap-1"><Clock3 className="h-3 w-3" /> {formatDate(submission.date, lang)}</span><span className="flex items-center gap-1"><FileText className="h-3 w-3" /> {submission.fileCount} {t.filesCount}</span></div></div><div className={`text-${lang === "ar" ? "left" : "right"}`}><div className="font-mono text-xl font-semibold tracking-tight text-[#0b2140]">{submission.overall}<span className="text-xs text-[#8a979f]">%</span></div><div className="mt-1 text-[10px] text-[#8a979f]">{t.score}</div></div><span role="button" tabIndex={0} onClick={(event) => { event.stopPropagation(); toggleCompare(submission.id); }} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); event.stopPropagation(); toggleCompare(submission.id); } }} className={`flex h-9 shrink-0 items-center gap-1.5 rounded-xl border px-2.5 text-[10px] font-semibold transition ${compareIds.includes(submission.id) ? "border-[#12897f] bg-[#e4f3f1] text-[#12897f]" : "border-[#dfe8e9] bg-white text-[#7b8991] hover:border-[#12897f] hover:text-[#12897f]"}`}><GitCompareArrows className="h-3.5 w-3.5" />{compareIds.includes(submission.id) ? t.selectedForCompare : t.compare}</span><MoreHorizontal className="hidden h-5 w-5 text-[#aab5bb] sm:block" /></div> })}</div>}
              <div className="mt-6 hidden print:block rounded-2xl border border-[#e4ecee] bg-white p-6">
                <h3 className="text-base font-bold text-[#0b2140] mb-4">{t.chartTitle}</h3>
                <div className="space-y-4">
                  {sortedSubmissions.slice(0, 3).map((sub, idx) => (
                    <div key={sub.id} className="space-y-1">
                      <div className="flex justify-between text-xs font-bold text-[#344651]">
                        <span>#{idx + 1} {sub.name}</span>
                        <span className="font-mono text-[#12897f]">{sub.overall}%</span>
                      </div>
                      <div className="h-3 w-full overflow-hidden rounded-full bg-[#f4f7f8]">
                        <div className="h-full rounded-full bg-gradient-to-l from-[#0b2140] to-[#12897f]" style={{ width: `${sub.overall}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              </section>
          {compareIds.length === 2 && <ComparisonPanel details={[compareAQuery.data as DetailData | undefined, compareBQuery.data as DetailData | undefined]} loading={compareAQuery.isLoading || compareBQuery.isLoading} onClear={() => setCompareIds([])} />}
          </>
        )}
      </div>

      {detailId && <NominationDetail detail={detailQuery.data as DetailData | null | undefined} loading={detailQuery.isLoading} auditEvents={auditQuery.data || []} auditLoading={auditQuery.isLoading} auditOpen={auditOpen} onAuditToggle={() => setAuditOpen((value) => !value)} onClose={() => { setDetailId(null); setCopilotSummary(null); setAuditOpen(false); }} onDelete={() => deleteMutation.mutate({ id: detailId })} deleting={deleteMutation.isPending} summary={copilotSummary} onGenerateSummary={() => generateSummaryMutation.mutate({ id: detailId })} generatingSummary={generateSummaryMutation.isPending} />}
    </div>
  );
}

function rubricForDetail(detail: Pick<DetailData, "programType" | "weights">) {
  return detail.weights?.length ? detail.weights : (JUDGING_PROGRAMS[detail.programType]?.rubric || []);
}

function comparisonRubric(left: DetailData, right: DetailData) {
  const byKey = new Map<string, { key: string; name: string; weight: number }>();
  for (const item of [...rubricForDetail(left), ...rubricForDetail(right)]) byKey.set(item.key, item);
  return Array.from(byKey.values());
}

export function NominationDetail({ detail, loading, auditEvents, auditLoading, auditOpen, onAuditToggle, onClose, onDelete, deleting, summary, onGenerateSummary, generatingSummary }: { detail: DetailData | null | undefined; loading: boolean; auditEvents: Array<{ action: string; createdAt: string; actorUserId: number; previousValue: string | null; newValue: string | null }>; auditLoading: boolean; auditOpen: boolean; onAuditToggle: () => void; onClose: () => void; onDelete: () => void; deleting: boolean; summary: CopilotSummary | null; onGenerateSummary: () => void; generatingSummary: boolean }) {
  const { lang, t } = useLang();
  const visibleHeadline = summary ? (lang === "ar" ? summary.headlineAr : summary.headlineEn) : "";
  const visibleNominationSummary = summary ? (lang === "ar" ? summary.nominationSummaryAr : summary.nominationSummaryEn) : "";
  const visibleAwardSummary = summary ? (lang === "ar" ? summary.awardSummaryAr : summary.awardSummaryEn) : "";
  async function copySummary() {
    if (!summary) return;
    const text = `${visibleHeadline}\n\n${t.nominationProfileSummary}\n${visibleNominationSummary}\n\n${t.awardedDecisionSummary}\n${visibleAwardSummary}`;
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t.copiedSummary);
    } catch {
      toast.error(t.summaryGenerationError);
    }
  }
  return <div className="print-report-shell fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#0b2140]/60 p-4 backdrop-blur-sm sm:p-8" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className="print-report-card my-4 w-full max-w-4xl overflow-hidden rounded-[26px] bg-white shadow-[0_28px_90px_rgba(11,33,64,.24)] sm:my-8">{loading || !detail ? <div className="flex min-h-80 items-center justify-center text-sm text-[#73828b]"><LoaderCircle className={`${lang === "ar" ? "ml-3" : "mr-3"} h-5 w-5 animate-spin text-[#12897f]`} /> {t.loadingDetail}</div> : <><div className="border-b border-[#edf1f2] bg-[#fbfcfc] px-5 py-5 sm:px-8"><div className="flex items-start justify-between gap-4"><div><div className="mb-2 flex items-center gap-2 text-xs font-semibold text-[#12897f]"><ShieldCheck className="h-4 w-4" /> {t.verifiedReport}</div><h2 className="max-w-2xl text-xl font-bold leading-8 text-[#0b2140]">{detail.name}</h2><div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-[#73828b]"><span>{detail.awardTitle}</span><span className="text-[#c7d0d4]">•</span><span>{JUDGING_PROGRAMS[detail.programType]?.name[lang === "ar" ? "ar" : "en"] || detail.programType}</span><span className="text-[#c7d0d4]">•</span><span>{formatDate(detail.date, lang)}</span></div></div><div className="flex items-center gap-2"><button onClick={() => { const previousTitle = document.title; document.title = `Evaluation Report — ${detail.name}`; window.print(); window.setTimeout(() => { document.title = previousTitle; }, 800); }} className="flex h-9 items-center gap-1.5 rounded-xl bg-[#0b2140] px-3 text-[10px] font-bold text-white transition hover:bg-[#16305a]" aria-label="Export PDF"><Download className="h-3.5 w-3.5 text-[#c9a227]" /> {t.exportPdf}</button><button onClick={onDelete} disabled={deleting} className="flex h-9 w-9 items-center justify-center rounded-xl text-[#8a979f] transition hover:bg-[#f9e9e8] hover:text-[#b94a48]" aria-label="Delete">{deleting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}</button><button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[#73828b] shadow-sm transition hover:bg-[#e4f3f1] hover:text-[#12897f]" aria-label="Close"><X className="h-4 w-4" /></button></div></div></div><div className="space-y-7 px-5 py-6 sm:px-8"><div className="flex flex-col gap-6 rounded-2xl border border-[#e4ecee] bg-white p-5 sm:flex-row sm:items-center"><ScoreGauge score={detail.overall} t={t} /><div className="flex-1"><div className="mb-3 flex items-center gap-2"><span className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${tierStyle(detail.tier)}`}>{classify(detail.overall).label}</span><span className="text-[11px] text-[#8a979f]">{detail.fileCount} {t.filesCount}</span></div><h3 className="text-lg font-bold text-[#0b2140]">{t.arbitrationSummary}</h3><p className="mt-2 text-sm leading-7 text-[#62717c]">{detail.kpi_findings || "تم تحليل الأدلة المتاحة ومقارنتها بسياق المبادرة ومعايير التقييم."}</p></div></div>
            <section className="rounded-2xl border border-[#b7dfda] bg-gradient-to-br from-[#f2f9f8] to-white p-5 shadow-[0_10px_26px_rgba(18,137,127,.06)]"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><div className="mb-1 flex items-center gap-2 text-xs font-semibold text-[#12897f]"><Sparkles className="h-4 w-4" /> {t.copilotSummary}</div><h3 className="text-lg font-bold text-[#0b2140]">{summary ? visibleHeadline : t.writeWithCopilot}</h3><p className="mt-1 text-[11px] leading-5 text-[#73828b]">{t.summaryEvidenceNote}</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={onGenerateSummary} disabled={generatingSummary} className="inline-flex items-center gap-2 rounded-xl bg-[#0b2140] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#16305a] disabled:cursor-not-allowed disabled:opacity-60"><Sparkles className="h-3.5 w-3.5 text-[#c9a227]" />{generatingSummary ? t.generatingSummary : t.generateSummary}</button>{summary && <button type="button" onClick={() => void copySummary()} className="inline-flex items-center gap-2 rounded-xl border border-[#dfe8e9] bg-white px-4 py-2.5 text-xs font-bold text-[#344651] transition hover:border-[#12897f] hover:text-[#12897f]"><Copy className="h-3.5 w-3.5" />{t.copySummary}</button>}</div></div>{summary && <div className="mt-5 grid gap-4 lg:grid-cols-2"><div className="rounded-xl border border-[#dfe8e9] bg-white p-4"><div className="mb-2 text-xs font-bold text-[#0b2140]">{t.nominationProfileSummary}</div><p className="text-xs leading-7 text-[#344651]">{visibleNominationSummary}</p></div><div className="rounded-xl border border-[#e6ce79] bg-[#fffaf0] p-4"><div className="mb-2 text-xs font-bold text-[#8a6d14]">{t.awardedDecisionSummary}</div><p className="text-xs leading-7 text-[#344651]">{visibleAwardSummary}</p></div></div>}</section>
            <div><div className="mb-4 flex items-end justify-between"><div><div className="mb-1 text-xs font-semibold text-[#12897f]">{t.scoreBreakdown}</div><h3 className="text-lg font-bold text-[#0b2140]">{detail.weights?.length ? `${detail.weights.length} ${lang === "ar" ? "معايير" : "Criteria"}` : t.eightCriteria}</h3></div><span className="font-mono text-[11px] text-[#8a979f]">{t.from10}</span></div><div className="grid gap-x-8 gap-y-5 lg:grid-cols-2">{rubricForDetail(detail).map((item) => { const criterion = detail.criteria?.[item.key] || { score: 0, note: t.noNotes }; const translated = t.rubric[item.key as keyof typeof t.rubric] || { name: item.name }; return <div key={item.key}><div className="mb-2 flex items-start justify-between gap-3"><span className="text-xs font-semibold leading-5 text-[#344651]">{translated.name}</span><span className="shrink-0 font-mono text-xs font-semibold text-[#0b2140]">{criterion.score}/10</span></div><div className="h-2 overflow-hidden rounded-full bg-[#e8eef0]"><div className="h-full rounded-full bg-gradient-to-l from-[#0b2140] to-[#12897f]" style={{ width: `${Math.max(0, Math.min(10, criterion.score)) * 10}%` }} /></div><p className="mt-2 text-[11px] leading-5 text-[#7b8991]">{criterion.note}</p></div> })}</div></div>
            <div><div className="mb-4 flex items-end justify-between"><div><div className="mb-1 text-xs font-semibold text-[#12897f]">{t.sourceTracking}</div><h3 className="text-lg font-bold text-[#0b2140]">{t.evidenceCompleteness}</h3></div><span className="font-mono text-[11px] text-[#12897f]">{detail.coverage.filter((item) => item.covered).length} / {detail.coverage.length}</span></div><div className="grid gap-2 sm:grid-cols-2">{detail.coverage.map((item) => <div key={item.key} className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs ${item.covered ? "border-transparent bg-[#e4f3f1] text-[#12897f]" : "border-[#e7edef] bg-[#fbfcfc] text-[#8a979f]"}`}>{item.covered ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}{t.evidenceTypes[item.key as keyof typeof t.evidenceTypes] || item.label}</div>)}</div></div>

            {detail.evidenceItems && detail.evidenceItems.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <div className="mb-1 text-xs font-semibold text-[#12897f]">{t.sourceTracking}</div>
                    <h3 className="text-lg font-bold text-[#0b2140]">{t.savedEvidence}</h3>
                    <p className="mt-1 text-[11px] leading-5 text-[#73828b]">{t.savedEvidenceHint}</p>
                  </div>
                  <span className="rounded-full bg-[#e4f3f1] px-3 py-1 font-mono text-[10px] font-bold text-[#12897f]">{detail.evidenceItems.length} {t.filesCount}</span>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {detail.evidenceItems.map((item, index) => {
                    const scope = item.judgeKey ? `${lang === "ar" ? "المحكم" : "Judge"} · ${item.judgeKey}` : item.criterionKey ? `${t.criterion} · ${item.criterionKey}` : (lang === "ar" ? "الدليل الأساسي" : "Primary evidence");
                    return <a key={item.id || `${item.storageKey}-${index}`} href={item.storageUrl} target="_blank" rel="noreferrer" className="group flex min-w-0 items-center gap-3 rounded-xl border border-[#e4ecee] bg-[#fbfcfc] p-3 transition hover:border-[#8fcfc7] hover:bg-[#f2f9f8]">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#e4f3f1] text-[#12897f]"><FileText className="h-4 w-4" /></span>
                      <span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold text-[#20313d] group-hover:text-[#12897f]">{item.fileName}</span><span className="mt-1 block truncate text-[10px] text-[#8a979f]">{scope}{item.mimeType ? ` · ${item.mimeType}` : ""}</span></span>
                    </a>;
                  })}
                </div>
              </div>
            )}

            {detail.judges && detail.judges.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="mb-1 text-xs font-semibold text-[#12897f]">{t.panelJudges}</div>
                    <h3 className="text-lg font-bold text-[#0b2140]">{t.judgeBreakdown} ({detail.judgeCount})</h3>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {detail.judges.map((j, idx) => (
                    <div key={idx} className="rounded-2xl border border-[#e4ecee] bg-[#fbfcfc] p-4 space-y-3">
                      <div className="flex items-center justify-between border-b border-[#edf1f2] pb-2">
                        <span className="text-xs font-bold text-[#0b2140]">{j.name}</span>
                        <span className="font-mono text-sm font-bold text-[#12897f]">{j.overall}%</span>
                      </div>
                      <div className="space-y-2">
                        {rubricForDetail(detail).map((item) => {
                          const cData = j.criteria?.[item.key] || { score: 0, note: "" };
                          const translated = t.rubric[item.key as keyof typeof t.rubric] || { name: item.name };
                          return (
                            <div key={item.key} className="rounded-lg border border-[#e4ecee] bg-white p-2 space-y-1">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="font-semibold text-[#344651] truncate max-w-[150px]" title={translated.name}>{translated.name}</span>
                                <span className="font-mono font-bold text-[#12897f]">{cData.score}/10</span>
                              </div>
                              {cData.note && (
                                <p className="text-[10px] leading-4 text-[#7b8991]" title={cData.note}>
                                  <span className="font-bold text-[#0b2140]">{t.judgeNotesLabel}:</span> {cData.note}
                                </p>
                              )}
                              {cData.evidence && cData.evidence.length > 0 && (
                                <div className="mt-1 space-y-1 pt-1 border-t border-[#edf1f2]">
                                  <span className="text-[9px] font-bold text-[#12897f]">{t.criterionEvidenceLabel}:</span>
                                  {cData.evidence.map((att: any, attIdx: number) => (
                                    <a key={attIdx} href={att.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[9px] text-[#20313d] underline hover:text-[#12897f] truncate">
                                      <FileText className="h-3 w-3 shrink-0" /> {att.name}
                                    </a>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="rounded-2xl border border-[#e4ecee] bg-[#fbfcfc] p-4">
              <button type="button" onClick={onAuditToggle} className="flex w-full items-center justify-between gap-3 text-left">
                <span><span className="mb-1 block text-xs font-semibold text-[#12897f]">{t.auditTrail}</span><span className="text-[11px] text-[#73828b]">{detail.signatureData ? (lang === "ar" ? "التوقيع محفوظ ضمن سجل الترشيح" : "Signature is stored with this nomination") : (lang === "ar" ? "لا يوجد توقيع مسجل" : "No signature recorded")}</span></span>
                <ChevronDown className={`h-4 w-4 text-[#73828b] transition-transform ${auditOpen ? "rotate-180" : ""}`} />
              </button>
              {auditOpen && <div className="mt-3 space-y-2 border-t border-[#e4ecee] pt-3">{auditLoading ? <div className="flex items-center gap-2 text-xs text-[#73828b]"><LoaderCircle className="h-3.5 w-3.5 animate-spin" /> {t.loadingDetail}</div> : auditEvents.length ? auditEvents.map((event, index) => { const label = event.action === "scores_modified" || event.action === "scores_created" ? t.scoreModified : event.action === "signature_updated" ? t.signatureUpdated : event.action === "signature_signed" ? t.signatureSigned : event.action === "judge_assigned" ? t.judgeAssigned : event.action; return <div key={`${event.action}-${event.createdAt}-${index}`} className="flex items-start justify-between gap-3 rounded-xl border border-[#edf1f2] bg-white p-3"><div><div className="text-xs font-semibold text-[#344651]">{label}</div><div className="mt-1 text-[10px] text-[#8a979f]">{lang === "ar" ? "المستخدم" : "Actor"} #{event.actorUserId}</div></div><time className="shrink-0 font-mono text-[10px] text-[#8a979f]" dateTime={event.createdAt}>{new Date(event.createdAt).toLocaleString(lang === "ar" ? "ar-AE" : "en-US")}</time></div> }) : <div className="text-xs text-[#8a979f]">{lang === "ar" ? "لا توجد أحداث مسجلة بعد" : "No audit events recorded yet"}</div>}</div>}
            </div>
            <div className="grid gap-6 lg:grid-cols-2"><InsightList title={t.strengths} items={detail.strengths} tone="teal" icon={<CheckCircle2 className="h-4 w-4" />} /><InsightList title={t.weaknesses} items={detail.weaknesses} tone="gold" icon={<AlertCircle className="h-4 w-4" />} /></div><div><div className="mb-3 flex items-center gap-2 text-sm font-bold text-[#0b2140]"><Target className="h-4 w-4 text-[#12897f]" /> {t.recommendations}</div><div className="space-y-2">{detail.recommendations.length ? detail.recommendations.map((item, index) => <div key={`${item}-${index}`} className="flex items-start gap-3 rounded-xl border border-[#e4ecee] bg-[#fbfcfc] p-3 text-xs leading-6 text-[#344651]"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#0b2140] font-mono text-[10px] text-white">{index + 1}</span>{item}</div>) : <div className="text-xs text-[#8a979f]">{t.noRecommendations}</div>}</div></div>
          </div></>}</div></div>;
}

function InsightList({ title, items, tone, icon }: { title: string; items: string[]; tone: "teal" | "gold"; icon: React.ReactNode }) {
  const { t } = useLang();
  const container = tone === "teal" ? "bg-[#f2f9f8] border-[#d6ece9]" : "bg-[#fffaf0] border-[#f2e5bd]";
  const color = tone === "teal" ? "text-[#12897f]" : "text-[#8a6d14]";
  return <div><div className={`mb-3 flex items-center gap-2 text-sm font-bold ${color}`}>{icon}{title}</div><div className={`rounded-2xl border p-4 ${container}`}>{items.length ? <ul className="space-y-3">{items.map((item, index) => <li key={`${item}-${index}`} className="flex items-start gap-2 text-xs leading-6 text-[#344651]"><span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${tone === "teal" ? "bg-[#12897f]" : "bg-[#c9a227]"}`} />{item}</li>)}</ul> : <div className="text-xs text-[#8a979f]">{t.noNotes}</div>}</div></div>;
}

function ComparisonPanel({ details, loading, onClear }: { details: [DetailData | undefined, DetailData | undefined]; loading: boolean; onClear: () => void }) {
  const { lang, t } = useLang();
  const [left, right] = details;
  return (
    <section className="mt-5 rounded-2xl border border-[#b7dfda] bg-white p-5 shadow-[0_12px_32px_rgba(18,137,127,.08)] sm:p-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-[#12897f]"><GitCompareArrows className="h-4 w-4" /> {t.comparisonTitle}</div>
          <h2 className="text-xl font-bold text-[#0b2140]">{t.comparisonSubtitle}</h2>
          <p className="mt-2 text-xs leading-6 text-[#73828b]">{t.comparisonDesc}</p>
        </div>
        <button onClick={onClear} className="self-start rounded-xl border border-[#dfe8e9] px-3 py-2 text-xs font-semibold text-[#73828b] transition hover:border-[#12897f] hover:text-[#12897f]">{t.cancelComparison}</button>
      </div>
      {loading || !left || !right ? <div className="flex min-h-40 items-center justify-center text-sm text-[#73828b]"><LoaderCircle className="ml-3 h-5 w-5 animate-spin text-[#12897f]" /> {t.preparingComparison}</div> : <>
        <div className="mb-5 grid gap-3 md:grid-cols-2">
          {[left, right].map((candidate) => <div key={candidate.id} className="flex items-center justify-between rounded-2xl bg-[#f5f8f8] p-4"><div className="min-w-0"><div className="truncate text-sm font-bold text-[#0b2140]">{candidate.name}</div><div className="mt-1 flex items-center gap-2 text-[10px] text-[#8a979f]"><span className={`rounded-full border px-2.5 py-1 font-semibold ${tierStyle(candidate.tier)}`}>{classify(candidate.overall).label}</span><span>{candidate.fileCount} {t.filesCount}</span></div></div><ScoreGauge score={candidate.overall} size="small" t={t} /></div>)}
        </div>
        <div className="overflow-hidden rounded-2xl border border-[#e4ecee]">
          <div className={`grid grid-cols-[minmax(0,1fr)_72px_130px_72px_minmax(0,1fr)] items-center border-b border-[#e4ecee] bg-[#fbfcfc] px-3 py-3 text-[10px] font-semibold text-[#8a979f] sm:grid-cols-[minmax(0,1fr)_76px_150px_76px_minmax(0,1fr)] sm:px-5`}><div className={`text-${lang === "ar" ? "right" : "left"}`}>{left.name}</div><div className="text-center">{t.score}</div><div className="text-center">{t.criterion}</div><div className="text-center">{t.score}</div><div className={`text-${lang === "ar" ? "left" : "right"}`}>{right.name}</div></div>
          {comparisonRubric(left, right).map((item) => {
            const a = left.criteria?.[item.key]?.score || 0;
            const b = right.criteria?.[item.key]?.score || 0;
            const aWins = a > b;
            const bWins = b > a;
            const translated = t.rubric[item.key as keyof typeof t.rubric] || { name: item.name };
            return <div key={item.key} className="grid grid-cols-[minmax(0,1fr)_72px_130px_72px_minmax(0,1fr)] items-center gap-1 border-b border-[#edf1f2] px-3 py-4 last:border-0 sm:grid-cols-[minmax(0,1fr)_76px_150px_76px_minmax(0,1fr)] sm:px-5"><div className={`text-${lang === "ar" ? "right" : "left"} text-[10px] leading-5 ${aWins ? "font-bold text-[#12897f]" : "text-[#73828b]"}`}>{left.criteria?.[item.key]?.note || t.noNotes}</div><div className={`text-center font-mono text-sm font-bold ${aWins ? "text-[#12897f]" : "text-[#0b2140]"}`}>{a}/10</div><div className="text-center"><div className="text-[11px] font-bold text-[#344651]">{translated.name}</div><div className="mt-1 font-mono text-[9px] text-[#8a979f]">{item.weight}%</div></div><div className={`text-center font-mono text-sm font-bold ${bWins ? "text-[#12897f]" : "text-[#0b2140]"}`}>{b}/10</div><div className={`text-${lang === "ar" ? "left" : "right"} text-[10px] leading-5 ${bWins ? "font-bold text-[#12897f]" : "text-[#73828b]"}`}>{right.criteria?.[item.key]?.note || t.noNotes}</div></div>;
          })}
        </div>
      </>}
    </section>
  );
}
