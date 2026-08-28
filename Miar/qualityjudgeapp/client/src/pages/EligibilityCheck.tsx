import React, { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, ClipboardCheck, ShieldCheck, XCircle } from "lucide-react";
import { useLang } from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import type { AwardCatalog } from "./AwardsCatalog";

type Rule = { id: string; key: string; name: { ar: string; en: string }; description: { ar: string; en: string }; required: boolean };

export default function EligibilityCheck() {
  const { lang } = useLang();
  const isAr = lang === "ar";
  const [, setLocation] = React.useState("");
  const catalog = trpc.evaluation.awardCatalog.useQuery();
  const submitEligibility = trpc.institutional.eligibility.submit.useMutation();
  const activeAwards = useMemo(() => ((catalog.data ?? []) as AwardCatalog[]).filter((award) => award.status === "active"), [catalog.data]);
  const [selectedId, setSelectedId] = useState("");
  const selected = activeAwards.find((award) => award.id === selectedId) ?? activeAwards[0];
  const rules = selected?.eligibilityRules ?? [];
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [verified, setVerified] = useState(false);
  const requiredRules = rules.filter((rule) => rule.required);
  const passed = requiredRules.length > 0 && requiredRules.every((rule) => checked[rule.key]);
  const chooseAward = (id: string) => { setSelectedId(id); setChecked({}); setVerified(false); };
  const verifyEligibility = () => {
    setVerified(true);
    if (selected) submitEligibility.mutate({ awardId: selected.id, answers: checked });
  };

  if (catalog.isLoading) return <div className="flex min-h-screen items-center justify-center bg-[#f4f7f8] text-sm text-[#53636c]">{isAr ? "جارٍ تحميل شروط الأهلية..." : "Loading eligibility rules..."}</div>;
  if (catalog.error) return <div className="flex min-h-screen items-center justify-center bg-[#f4f7f8] p-6"><div className="rounded-3xl bg-white p-8 text-center shadow-sm"><p className="font-bold text-[#0b2140]">{isAr ? "تعذر تحميل شروط الأهلية" : "Unable to load eligibility rules"}</p><p className="mt-2 text-sm text-[#73828b]">{catalog.error.message}</p></div></div>;

  return <div dir={isAr ? "rtl" : "ltr"} className="min-h-screen bg-[#f4f7f8] px-3 py-5 sm:px-6 lg:px-8"><div className="mx-auto max-w-[1100px] space-y-5">
    <section className="rounded-[28px] bg-[#0b2140] px-5 py-7 text-white shadow-[0_18px_45px_rgba(11,33,64,.14)] sm:px-8 sm:py-9"><div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.18em] text-[#c9a227]"><ShieldCheck className="h-4 w-4" />{isAr ? "بوابة ما قبل الترشيح" : "PRE-NOMINATION GATE"}</div><h1 className="text-2xl font-bold sm:text-4xl">{isAr ? "فحص أهلية المشاركة" : "Participation Eligibility Check"}</h1><p className="mt-3 max-w-3xl text-sm leading-7 text-white/65">{isAr ? "تحقق من شروط الجائزة قبل بدء إعداد ملف الترشيح، وسجل نتيجة واضحة قابلة للمراجعة." : "Check an award's participation rules before preparing a nomination and receive a clear readiness result."}</p></section>
    {!activeAwards.length ? <div className="rounded-[24px] border border-dashed border-[#cbdcdd] bg-white p-12 text-center text-sm text-[#73828b]">{isAr ? "لا توجد جوائز نشطة مزودة بشروط أهلية حالياً." : "There are no active awards with eligibility rules yet."}</div> : <>
      <section className="rounded-[24px] border border-[#dfe8e9] bg-white p-5"><label className="text-xs font-bold text-[#53636c]">{isAr ? "اختر الجائزة" : "Select an award"}<select value={selected?.id ?? ""} onChange={(event) => chooseAward(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-[#dfe8e9] bg-[#fbfcfc] px-3 text-sm font-normal text-[#344651] outline-none focus:border-[#12897f]">{activeAwards.map((award) => <option key={award.id} value={award.id}>{award.title[lang]} · {award.organizer[lang]}</option>)}</select></label></section>
      {selected && <section className="rounded-[24px] border border-[#dfe8e9] bg-white p-5 sm:p-7"><div className="flex items-start gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#e7f5f2] text-[#12897f]"><ClipboardCheck className="h-5 w-5" /></div><div><h2 className="text-xl font-bold text-[#0b2140]">{selected.title[lang]}</h2><p className="mt-1 text-xs text-[#73828b]">{selected.organizer[lang]} · {selected.category}</p></div></div><div className="mt-6 space-y-3">{rules.map((rule) => <label key={rule.id} className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${checked[rule.key] ? "border-[#9ad4cd] bg-[#f2faf8]" : "border-[#e6eeee] bg-[#fbfdfd] hover:border-[#b8d9d5]"}`}><input type="checkbox" checked={Boolean(checked[rule.key])} onChange={(event) => { setChecked((current) => ({ ...current, [rule.key]: event.target.checked })); setVerified(false); }} className="mt-1 h-4 w-4 accent-[#12897f]" /><span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2 text-sm font-bold text-[#344651]">{rule.name[lang]}{rule.required ? <span className="rounded-full bg-[#fff4d4] px-2 py-0.5 text-[9px] text-[#8a6d14]">{isAr ? "إلزامي" : "Required"}</span> : <span className="rounded-full bg-[#edf3f4] px-2 py-0.5 text-[9px] text-[#73828b]">{isAr ? "اختياري" : "Optional"}</span>}</span><span className="mt-1 block text-xs leading-6 text-[#73828b]">{rule.description[lang]}</span></span></label>)}</div><div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-[#73828b]">{requiredRules.length} {isAr ? "شروط إلزامية" : "required rules"} · {Object.values(checked).filter(Boolean).length} {isAr ? "تم تأكيدها" : "confirmed"}</p><button type="button" onClick={verifyEligibility} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0b2140] px-5 py-3 text-xs font-bold text-white hover:bg-[#16345c]"><ClipboardCheck className="h-4 w-4" />{isAr ? "تحقق من الأهلية" : "Verify eligibility"}</button></div>{verified && <div className={`mt-5 flex items-start gap-3 rounded-2xl border p-4 ${passed ? "border-[#a8d9d0] bg-[#effaf7] text-[#12786e]" : "border-[#f0d0cd] bg-[#fff7f6] text-[#a14f49]"}`}>{passed ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" /> : <XCircle className="mt-0.5 h-5 w-5 shrink-0" />}<div><div className="font-bold">{passed ? (isAr ? "مؤهل مبدئياً" : "Preliminarily eligible") : (isAr ? "لم تكتمل الأهلية" : "Eligibility not complete")}</div><p className="mt-1 text-xs leading-6">{passed ? (isAr ? "تم تأكيد جميع الشروط الإلزامية. يمكن الانتقال إلى إعداد ملف الترشيح، مع بقاء الاعتماد النهائي خاضعاً للمراجعة." : "All required rules are confirmed. You can proceed to prepare a nomination, subject to final review.") : (isAr ? "راجع الشروط الإلزامية غير المؤكدة قبل بدء ملف الترشيح." : "Review the required rules that remain unconfirmed before starting a nomination.")}</p></div></div>}</section>}
    </>}
  </div></div>;
}
