import React, { useMemo, useState } from "react";
import { Award, BadgeCheck, BookOpenCheck, Download, Edit3, Search, Sparkles, Trash2, Trophy, WandSparkles, X } from "lucide-react";
import { toast } from "sonner";
import { useLang } from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { JUDGING_PROGRAMS } from "@shared/judge";
import { AWARD_SELECTION_SAMPLES, type IllustrativeSample } from "@shared/sampleData";
import { exportSamplePdf } from "@/lib/sampleExport";
import { filterIllustrativeSamples, type SampleSort } from "@/lib/sampleFilters";

type SampleDraft = Pick<IllustrativeSample, "name" | "organization" | "programType" | "score" | "tier" | "award" | "summary" | "rationale">;

type SampleActions = {
  onExport: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onGenerate?: () => void;
  generating?: boolean;
};

function tierClass(tier: IllustrativeSample["tier"]) {
  if (tier === "gold") return "border-[#e6ce79] bg-[#fffaf0] text-[#8a6d14]";
  if (tier === "silver") return "border-[#d7dee3] bg-[#f3f6f7] text-[#5a6773]";
  return "border-[#e7c6ac] bg-[#f8ece3] text-[#8a4e23]";
}

function scoreClass(score: number) {
  if (score >= 93) return "text-[#12897f]";
  if (score >= 88) return "text-[#5d5bd6]";
  return "text-[#8a6d14]";
}

function programName(sample: IllustrativeSample, lang: "ar" | "en") {
  return JUDGING_PROGRAMS[sample.programType].name[lang];
}

function SampleActionBar({ actions, lang, compact = false }: { actions: SampleActions; lang: "ar" | "en"; compact?: boolean }) {
  const isAr = lang === "ar";
  const buttonClass = "inline-flex items-center gap-1 rounded-lg border border-[#dfe8e9] bg-white px-2 py-1.5 text-[9px] font-bold text-[#53636c] transition hover:border-[#12897f] hover:text-[#12897f] disabled:cursor-wait disabled:opacity-50";
  return <div className={`flex flex-wrap items-center gap-1.5 ${compact ? "mt-3" : "mt-4"}`}>
    <button type="button" className={buttonClass} onClick={actions.onExport}><Download className="h-3 w-3" />{isAr ? "PDF" : "PDF"}</button>
    {actions.onGenerate && <button type="button" className={buttonClass} disabled={actions.generating} onClick={actions.onGenerate}><WandSparkles className={`h-3 w-3 ${actions.generating ? "animate-pulse" : ""}`} />{actions.generating ? (isAr ? "جارٍ الإنشاء" : "Generating") : (isAr ? "وصف Copilot" : "Copilot description")}</button>}
    {actions.onEdit && <button type="button" className={buttonClass} onClick={actions.onEdit}><Edit3 className="h-3 w-3" />{isAr ? "تعديل" : "Edit"}</button>}
    {actions.onDelete && <button type="button" className={`${buttonClass} hover:border-[#b94a48] hover:text-[#b94a48]`} onClick={actions.onDelete}><Trash2 className="h-3 w-3" />{isAr ? "حذف" : "Delete"}</button>}
  </div>;
}

function SampleCard({ sample, lang, actions, compact = false }: { sample: IllustrativeSample; lang: "ar" | "en"; actions: SampleActions; compact?: boolean }) {
  const isAr = lang === "ar";
  return <article className={`group rounded-2xl border border-[#e4ecee] bg-white p-4 shadow-[0_8px_22px_rgba(11,33,64,.035)] transition hover:-translate-y-0.5 hover:border-[#9ad4cd] hover:shadow-[0_14px_30px_rgba(18,137,127,.08)] ${compact ? "h-full" : ""}`}>
    <div className="mb-3 flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eaf6f3] text-[#12897f]"><Award className="h-5 w-5" /></div><div className="min-w-0"><h3 className="truncate text-sm font-bold text-[#0b2140]">{sample.name[lang]}</h3><p className="mt-1 truncate text-[10px] text-[#8b989f]">{sample.organization[lang]}</p></div></div>
      <div className="shrink-0 text-end"><div className={`font-mono text-xl font-bold ${scoreClass(sample.score)}`}>{sample.score}%</div><div className="text-[9px] text-[#8b989f]">{isAr ? "نتيجة نموذجية" : "sample score"}</div></div>
    </div>
    <div className="mb-3 flex flex-wrap items-center gap-2"><span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${tierClass(sample.tier)}`}>{sample.tier === "gold" ? (isAr ? "ذهبي" : "Gold") : sample.tier === "silver" ? (isAr ? "فضي" : "Silver") : (isAr ? "برونزي" : "Bronze")}</span><span className="rounded-full bg-[#f3f7f7] px-2.5 py-1 text-[10px] font-semibold text-[#53636c]">{programName(sample, lang)}</span></div>
    <p className={`${compact ? "line-clamp-2" : "line-clamp-3"} text-xs leading-6 text-[#53636c]`}>{sample.summary[lang]}</p>
    <div className="mt-4 border-t border-[#edf1f2] pt-3"><div className="mb-2 flex items-center gap-1.5 text-[10px] font-bold text-[#12897f]"><BadgeCheck className="h-3.5 w-3.5" />{isAr ? "قرار توضيحي" : "Illustrative decision"}</div><p className="text-[10px] leading-5 text-[#7b8991]">{sample.rationale[lang]}</p></div>
    <SampleActionBar actions={actions} lang={lang} compact={compact} />
  </article>;
}

function SmallAwardCard({ sample, lang, actions }: { sample: IllustrativeSample; lang: "ar" | "en"; actions: SampleActions }) {
  return <div className="rounded-2xl border border-[#e4ecee] bg-white p-4"><div className="mb-3 flex items-center justify-between gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#fff6dc] text-[#9a7610]"><Trophy className="h-4 w-4" /></span><span className={`font-mono text-xl font-bold ${scoreClass(sample.score)}`}>{sample.score}%</span></div><h3 className="truncate text-xs font-bold text-[#0b2140]">{sample.name[lang]}</h3><p className="mt-1 truncate text-[10px] text-[#8b989f]">{sample.award[lang]}</p><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#eef2f3]"><div className="h-full rounded-full bg-gradient-to-r from-[#c9a227] to-[#12897f]" style={{ width: `${sample.score}%` }} /></div><SampleActionBar actions={actions} lang={lang} compact /></div>;
}

export function SampleLibrary({ samples }: { samples: IllustrativeSample[] }) {
  const { lang, t } = useLang();
  const [programFilter, setProgramFilter] = useState("all");
  const [tierFilter, setTierFilter] = useState("all");
  const [sortBy, setSortBy] = useState<SampleSort>("highest");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<SampleDraft | null>(null);
  const isAr = lang === "ar";
  const utils = trpc.useUtils();
  const updateMutation = trpc.evaluation.updateAwardSample.useMutation({ onSuccess: () => { toast.success(t.sampleUpdated); setEditingId(null); setEditDraft(null); void utils.evaluation.adminDashboard.invalidate(); }, onError: () => toast.error(t.resetFailure) });
  const deleteMutation = trpc.evaluation.deleteAwardSample.useMutation({ onSuccess: () => { toast.success(t.sampleDeleted); void utils.evaluation.adminDashboard.invalidate(); }, onError: () => toast.error(t.resetFailure) });
  const generateMutation = trpc.evaluation.generateAwardSampleDescription.useMutation({ onSuccess: () => { toast.success(t.descriptionGenerated); void utils.evaluation.adminDashboard.invalidate(); }, onError: () => toast.error(t.summaryGenerationError) });
  const bestSamples = [...samples].sort((a, b) => b.score - a.score).slice(0, 4);
  const awardSelections = AWARD_SELECTION_SAMPLES.map((entry) => ({ ...entry, sample: samples.find((sample) => sample.id === entry.sampleId) })).filter((entry) => entry.sample) as Array<{ sampleId: string; selection: { ar: string; en: string }; sample: IllustrativeSample }>;
  const filteredSamples = useMemo(() => filterIllustrativeSamples(samples, { search, programFilter, tierFilter, sortBy }), [programFilter, search, samples, sortBy, tierFilter]);

  const beginEdit = (sample: IllustrativeSample) => {
    setEditingId(sample.id);
    setEditDraft({ name: { ...sample.name }, organization: { ...sample.organization }, programType: sample.programType, score: sample.score, tier: sample.tier, award: { ...sample.award }, summary: { ...sample.summary }, rationale: { ...sample.rationale } });
  };
  const saveEdit = () => {
    if (!editingId || !editDraft) return;
    updateMutation.mutate({ id: editingId, nameAr: editDraft.name.ar, nameEn: editDraft.name.en, organizationAr: editDraft.organization.ar, organizationEn: editDraft.organization.en, programType: editDraft.programType, score: editDraft.score, tier: editDraft.tier, awardAr: editDraft.award.ar, awardEn: editDraft.award.en, summaryAr: editDraft.summary.ar, summaryEn: editDraft.summary.en, rationaleAr: editDraft.rationale.ar, rationaleEn: editDraft.rationale.en });
  };
  const deleteSample = (sample: IllustrativeSample) => {
    if (window.confirm(`${t.confirmDeleteSample}\n\n${sample.name[lang]}`)) deleteMutation.mutate({ id: sample.id });
  };
  const actionsFor = (sample: IllustrativeSample): SampleActions => ({
    onExport: () => { if (!exportSamplePdf(sample, lang)) toast.error(isAr ? "تعذر فتح نافذة التصدير" : "Unable to open the export window"); },
    onEdit: () => beginEdit(sample),
    onDelete: () => deleteSample(sample),
    onGenerate: () => generateMutation.mutate({ id: sample.id }),
    generating: generateMutation.isPending && generateMutation.variables?.id === sample.id,
  });

  return <section className="space-y-5 rounded-[26px] border border-[#dfe8e9] bg-[#f8fbfa] p-5 sm:p-6">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#12897f]"><BookOpenCheck className="h-4 w-4" />{t.sampleLibrary}</div><h2 className="text-xl font-bold text-[#0b2140]">{t.sampleLibrary}</h2><p className="mt-2 max-w-3xl text-xs leading-6 text-[#73828b]">{t.sampleLibraryDesc}</p></div><div className="flex items-center gap-2 rounded-full border border-[#e6ce79] bg-[#fffaf0] px-3 py-2 text-[10px] font-bold text-[#8a6d14]"><Sparkles className="h-3.5 w-3.5" />{t.illustrativeData}</div></div>

    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"><div className="rounded-2xl bg-[#0b2140] p-4 text-white md:col-span-2 xl:col-span-1"><div className="mb-3 flex items-center gap-2 text-xs font-bold text-[#c9a227]"><Trophy className="h-4 w-4" />{t.bestAwarded}</div><p className="text-[11px] leading-5 text-white/65">{t.bestAwardedDesc}</p><div className="mt-5 font-mono text-3xl font-bold">{bestSamples.length}</div><div className="text-[10px] text-white/55">{isAr ? "اختيارات نموذجية" : "illustrative selections"}</div></div>{bestSamples.slice(0, 3).map((sample) => <SmallAwardCard key={sample.id} sample={sample} lang={lang} actions={actionsFor(sample)} />)}</div>

    <div className="rounded-2xl border border-[#dfe8e9] bg-white p-5"><div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><div className="mb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#c9a227]">{isAr ? "قرار التحكيم" : "DECISION DESK"}</div><h2 className="text-base font-bold text-[#0b2140]">{t.awardSelection}</h2><p className="mt-1 text-[11px] leading-5 text-[#73828b]">{t.awardSelectionDesc}</p></div><span className="rounded-full bg-[#e4f3f1] px-3 py-1.5 text-[10px] font-bold text-[#12897f]">{awardSelections.length} {isAr ? "قرارات" : "decisions"}</span></div><div className="grid gap-3 lg:grid-cols-2">{awardSelections.map(({ sample, selection }) => <div key={sample.id} className="flex items-start gap-3 rounded-xl border border-[#edf1f2] bg-[#fbfcfc] p-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#fff6dc] text-[#9a7610]"><Trophy className="h-4 w-4" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="truncate text-xs font-bold text-[#0b2140]">{sample.name[lang]}</h3><span className={`font-mono text-sm font-bold ${scoreClass(sample.score)}`}>{sample.score}%</span></div><p className="mt-1 text-[10px] font-semibold text-[#8a6d14]">{selection[lang]}</p><p className="mt-2 text-[10px] leading-5 text-[#7b8991]">{sample.rationale[lang]}</p><SampleActionBar actions={actionsFor(sample)} lang={lang} compact /></div></div>)}</div></div>

    {editingId && editDraft && <div className="rounded-2xl border border-[#9ad4cd] bg-white p-5 shadow-[0_12px_32px_rgba(18,137,127,.08)]"><div className="mb-4 flex items-center justify-between gap-3"><div><div className="mb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#12897f]">{t.sampleManagement}</div><h2 className="text-base font-bold text-[#0b2140]">{isAr ? "تحرير النموذج التوضيحي" : "Edit illustrative sample"}</h2></div><button type="button" onClick={() => { setEditingId(null); setEditDraft(null); }} className="rounded-lg p-2 text-[#8b989f] hover:bg-[#f1f6f6] hover:text-[#0b2140]"><X className="h-4 w-4" /></button></div><div className="grid gap-3 md:grid-cols-2"><label className="text-[10px] font-bold text-[#53636c]">{isAr ? "الاسم بالعربية" : "Arabic name"}<input value={editDraft.name.ar} onChange={(event) => setEditDraft({ ...editDraft, name: { ...editDraft.name, ar: event.target.value } })} className="mt-1 h-9 w-full rounded-xl border border-[#dfe8e9] px-3 text-xs outline-none focus:border-[#12897f]" /></label><label className="text-[10px] font-bold text-[#53636c]">{isAr ? "الاسم بالإنجليزية" : "English name"}<input value={editDraft.name.en} onChange={(event) => setEditDraft({ ...editDraft, name: { ...editDraft.name, en: event.target.value } })} className="mt-1 h-9 w-full rounded-xl border border-[#dfe8e9] px-3 text-xs outline-none focus:border-[#12897f]" /></label><label className="text-[10px] font-bold text-[#53636c]">{isAr ? "اسم الجائزة بالعربية" : "Arabic award"}<input value={editDraft.award.ar} onChange={(event) => setEditDraft({ ...editDraft, award: { ...editDraft.award, ar: event.target.value } })} className="mt-1 h-9 w-full rounded-xl border border-[#dfe8e9] px-3 text-xs outline-none focus:border-[#12897f]" /></label><label className="text-[10px] font-bold text-[#53636c]">{isAr ? "اسم الجائزة بالإنجليزية" : "English award"}<input value={editDraft.award.en} onChange={(event) => setEditDraft({ ...editDraft, award: { ...editDraft.award, en: event.target.value } })} className="mt-1 h-9 w-full rounded-xl border border-[#dfe8e9] px-3 text-xs outline-none focus:border-[#12897f]" /></label><label className="text-[10px] font-bold text-[#53636c]">{isAr ? "الدرجة" : "Score"}<input type="number" min="0" max="100" value={editDraft.score} onChange={(event) => setEditDraft({ ...editDraft, score: Number(event.target.value) })} className="mt-1 h-9 w-full rounded-xl border border-[#dfe8e9] px-3 text-xs outline-none focus:border-[#12897f]" /></label><label className="text-[10px] font-bold text-[#53636c]">{isAr ? "الفئة" : "Tier"}<select value={editDraft.tier} onChange={(event) => setEditDraft({ ...editDraft, tier: event.target.value as IllustrativeSample["tier"] })} className="mt-1 h-9 w-full rounded-xl border border-[#dfe8e9] bg-white px-3 text-xs outline-none focus:border-[#12897f]"><option value="gold">{isAr ? "ذهبي" : "Gold"}</option><option value="silver">{isAr ? "فضي" : "Silver"}</option><option value="bronze">{isAr ? "برونزي" : "Bronze"}</option></select></label><label className="text-[10px] font-bold text-[#53636c] md:col-span-2">{isAr ? "الوصف بالعربية" : "Arabic description"}<textarea rows={3} value={editDraft.summary.ar} onChange={(event) => setEditDraft({ ...editDraft, summary: { ...editDraft.summary, ar: event.target.value } })} className="mt-1 w-full rounded-xl border border-[#dfe8e9] px-3 py-2 text-xs leading-5 outline-none focus:border-[#12897f]" /></label><label className="text-[10px] font-bold text-[#53636c] md:col-span-2">{isAr ? "الوصف بالإنجليزية" : "English description"}<textarea rows={3} value={editDraft.summary.en} onChange={(event) => setEditDraft({ ...editDraft, summary: { ...editDraft.summary, en: event.target.value } })} className="mt-1 w-full rounded-xl border border-[#dfe8e9] px-3 py-2 text-xs leading-5 outline-none focus:border-[#12897f]" /></label></div><div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => { setEditingId(null); setEditDraft(null); }} className="rounded-xl px-4 py-2 text-xs font-bold text-[#73828b] hover:bg-[#f1f6f6]">{t.cancel}</button><button type="button" disabled={updateMutation.isPending} onClick={saveEdit} className="rounded-xl bg-[#12897f] px-4 py-2 text-xs font-bold text-white hover:bg-[#0d7068] disabled:opacity-50">{updateMutation.isPending ? (isAr ? "جارٍ الحفظ..." : "Saving...") : t.saveSample}</button></div></div>}

    <div className="rounded-2xl border border-[#dfe8e9] bg-white p-5"><div className="mb-4 flex flex-col gap-4"><div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between"><div><div className="mb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#12897f]">{isAr ? "المعرض الكامل" : "FULL GALLERY"}</div><h2 className="text-base font-bold text-[#0b2140]">{t.viewSamples} · {filteredSamples.length} {t.resultCount}</h2></div><div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto"><label className="relative block sm:min-w-60"><Search className="pointer-events-none absolute start-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8b989f]" /><input aria-label={t.searchSamples} value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t.searchSamples} className="h-9 w-full rounded-xl border border-[#dfe8e9] bg-[#fbfcfc] ps-9 pe-3 text-xs outline-none transition focus:border-[#12897f] focus:ring-2 focus:ring-[#12897f]/10" /></label><select aria-label={t.filterCategory} value={programFilter} onChange={(event) => setProgramFilter(event.target.value)} className="h-9 rounded-xl border border-[#dfe8e9] bg-[#fbfcfc] px-3 text-xs text-[#344651] outline-none transition focus:border-[#12897f] focus:ring-2 focus:ring-[#12897f]/10"><option value="all">{t.allPrograms}</option>{Object.entries(JUDGING_PROGRAMS).map(([key, program]) => <option key={key} value={key}>{program.name[lang]}</option>)}</select><select aria-label={t.allTiers} value={tierFilter} onChange={(event) => setTierFilter(event.target.value)} className="h-9 rounded-xl border border-[#dfe8e9] bg-[#fbfcfc] px-3 text-xs text-[#344651] outline-none transition focus:border-[#12897f] focus:ring-2 focus:ring-[#12897f]/10"><option value="all">{t.allTiers}</option><option value="gold">{t.goldTier}</option><option value="silver">{t.silverTier}</option><option value="bronze">{t.bronzeTier}</option></select><select aria-label={t.sortBy} value={sortBy} onChange={(event) => setSortBy(event.target.value as SampleSort)} className="h-9 rounded-xl border border-[#dfe8e9] bg-[#fbfcfc] px-3 text-xs text-[#344651] outline-none transition focus:border-[#12897f] focus:ring-2 focus:ring-[#12897f]/10"><option value="highest">{t.highestScore}</option><option value="lowest">{t.lowestScore}</option></select></div></div><div className="flex flex-wrap items-center gap-2" role="group" aria-label={t.filterCategory}><span className="me-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#8b989f]">{t.filterCategory}</span><button type="button" aria-pressed={programFilter === "all"} onClick={() => setProgramFilter("all")} className={`rounded-full border px-3 py-1.5 text-[10px] font-bold transition ${programFilter === "all" ? "border-[#12897f] bg-[#e4f3f1] text-[#12897f]" : "border-[#dfe8e9] bg-white text-[#73828b] hover:border-[#9ad4cd] hover:text-[#12897f]"}`}>{t.allPrograms}</button>{Object.entries(JUDGING_PROGRAMS).map(([key, program]) => <button type="button" key={key} aria-pressed={programFilter === key} onClick={() => setProgramFilter(key)} className={`rounded-full border px-3 py-1.5 text-[10px] font-bold transition ${programFilter === key ? "border-[#12897f] bg-[#e4f3f1] text-[#12897f]" : "border-[#dfe8e9] bg-white text-[#73828b] hover:border-[#9ad4cd] hover:text-[#12897f]"}`}>{program.name[lang]}</button>)}</div></div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{filteredSamples.map((sample) => <SampleCard key={sample.id} sample={sample} lang={lang} actions={actionsFor(sample)} compact />)}</div>{filteredSamples.length === 0 && <div className="py-8 text-center text-xs text-[#8b989f]">{t.noActivity}</div>}</div>
  </section>;
}
