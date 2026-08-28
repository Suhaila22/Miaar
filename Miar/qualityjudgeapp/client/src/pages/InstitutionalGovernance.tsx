import React, { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, CalendarClock, ClipboardList, FileWarning, Gavel, Library, ShieldAlert, ShieldCheck, UsersRound } from "lucide-react";
import { useLocation } from "wouter";
import { useLang } from "@/components/DashboardLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import type { AwardCatalog } from "./AwardsCatalog";

// A functional (not deeply polished) admin console for the institutional
// governance modules added to close the platform-requirements gap audit:
// award calendar/milestones, judging committees, corrective-action
// tracking, versioned reference data, the knowledge base, AI-output
// governance review, conflict-of-interest declarations, and the
// SIEM-ready security event log. Mirrors the data model documented in
// server/routers/institutional.ts.

type TabKey = "calendar" | "committees" | "corrective" | "reference" | "knowledge" | "coi" | "ai" | "security";

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-[#e4ecee] bg-white p-4 sm:p-5">{children}</div>;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="mb-1 block text-[11px] font-bold text-[#53636c]">{children}</label>;
}

const inputCls = "h-9 w-full rounded-lg border border-[#dfe8e9] bg-[#fbfcfc] px-3 text-xs text-[#344651] outline-none focus:border-[#12897f]";

function Empty({ text }: { text: string }) {
  return <div className="rounded-xl border border-dashed border-[#cbdcdd] bg-[#fbfcfc] p-8 text-center text-xs text-[#8b989f]">{text}</div>;
}

// --- Award calendar ----------------------------------------------------------
function CalendarTab({ isAr, isAdmin, awards }: { isAr: boolean; isAdmin: boolean; awards: AwardCatalog[] }) {
  const utils = trpc.useUtils();
  const list = trpc.institutional.calendar.list.useQuery({});
  const create = trpc.institutional.calendar.create.useMutation({
    onSuccess: () => { toast.success(isAr ? "تمت إضافة المعلم الزمني" : "Milestone added"); void utils.institutional.calendar.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const setStatus = trpc.institutional.calendar.setStatus.useMutation({
    onSuccess: () => void utils.institutional.calendar.list.invalidate(),
    onError: (e) => toast.error(e.message),
  });
  const [form, setForm] = useState({ awardId: "", nameAr: "", nameEn: "", dueDate: "" });

  return <div className="space-y-4">
    {isAdmin && <Card>
      <h3 className="mb-3 text-sm font-bold text-[#0b2140]">{isAr ? "إضافة معلم زمني" : "Add a milestone"}</h3>
      <form onSubmit={(e) => { e.preventDefault(); if (!form.awardId || !form.nameAr || !form.nameEn || !form.dueDate) return; create.mutate({ ...form }); setForm({ awardId: "", nameAr: "", nameEn: "", dueDate: "" }); }} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div><FieldLabel>{isAr ? "الجائزة" : "Award"}</FieldLabel><select value={form.awardId} onChange={(e) => setForm((f) => ({ ...f, awardId: e.target.value }))} className={inputCls}><option value="">{isAr ? "اختر" : "Select"}</option>{awards.map((a) => <option key={a.id} value={a.id}>{a.title[isAr ? "ar" : "en"]}</option>)}</select></div>
        <div><FieldLabel>{isAr ? "الاسم (عربي)" : "Name (Arabic)"}</FieldLabel><input className={inputCls} value={form.nameAr} onChange={(e) => setForm((f) => ({ ...f, nameAr: e.target.value }))} /></div>
        <div><FieldLabel>{isAr ? "الاسم (إنجليزي)" : "Name (English)"}</FieldLabel><input className={inputCls} value={form.nameEn} onChange={(e) => setForm((f) => ({ ...f, nameEn: e.target.value }))} /></div>
        <div><FieldLabel>{isAr ? "تاريخ الاستحقاق" : "Due date"}</FieldLabel><input type="date" className={inputCls} value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} /></div>
        <div className="sm:col-span-2 lg:col-span-4"><Button type="submit" size="sm" disabled={create.isPending} className="bg-[#0b2140] text-white hover:bg-[#16345c]">{isAr ? "إضافة" : "Add"}</Button></div>
      </form>
    </Card>}
    <Card>
      <h3 className="mb-3 text-sm font-bold text-[#0b2140]">{isAr ? "المعالم الزمنية" : "Milestones"}</h3>
      {!list.data?.length ? <Empty text={isAr ? "لا توجد معالم زمنية بعد." : "No milestones yet."} /> : <div className="space-y-2">
        {list.data.map((m: any) => <div key={m.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#edf1f2] p-3 text-xs">
          <div><div className="font-bold text-[#0b2140]">{isAr ? m.nameAr : m.nameEn}</div><div className="mt-0.5 text-[10px] text-[#8b989f]">{new Date(m.dueDate).toLocaleDateString(isAr ? "ar-AE" : "en-US")}</div></div>
          {isAdmin ? <select value={m.status} onChange={(e) => setStatus.mutate({ id: m.id, status: e.target.value as any })} className="h-8 rounded-lg border border-[#dfe8e9] bg-white px-2 text-[11px] font-semibold"><option value="upcoming">{isAr ? "قادم" : "Upcoming"}</option><option value="due_soon">{isAr ? "مستحق قريباً" : "Due soon"}</option><option value="completed">{isAr ? "مكتمل" : "Completed"}</option><option value="missed">{isAr ? "فائت" : "Missed"}</option></select> : <span className="rounded-full bg-[#eef2f3] px-2.5 py-1 text-[10px] font-bold text-[#344651]">{m.status}</span>}
        </div>)}
      </div>}
    </Card>
  </div>;
}

// --- Judging committees --------------------------------------------------------
function CommitteesTab({ isAr, isAdmin, awards, users }: { isAr: boolean; isAdmin: boolean; awards: AwardCatalog[]; users: Array<{ id: number; name: string | null; email: string | null }> }) {
  const utils = trpc.useUtils();
  const list = trpc.institutional.committees.list.useQuery();
  const create = trpc.institutional.committees.create.useMutation({
    onSuccess: () => { toast.success(isAr ? "تم إنشاء اللجنة" : "Committee created"); void utils.institutional.committees.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const [form, setForm] = useState({ awardId: "", nameAr: "", nameEn: "", chairUserId: "" });

  return <div className="space-y-4">
    {isAdmin && <Card>
      <h3 className="mb-3 text-sm font-bold text-[#0b2140]">{isAr ? "إنشاء لجنة تحكيم" : "Create a judging committee"}</h3>
      <form onSubmit={(e) => { e.preventDefault(); if (!form.awardId || !form.nameAr || !form.nameEn || !form.chairUserId) return; create.mutate({ awardId: form.awardId, nameAr: form.nameAr, nameEn: form.nameEn, chairUserId: Number(form.chairUserId) }); setForm({ awardId: "", nameAr: "", nameEn: "", chairUserId: "" }); }} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div><FieldLabel>{isAr ? "الجائزة" : "Award"}</FieldLabel><select value={form.awardId} onChange={(e) => setForm((f) => ({ ...f, awardId: e.target.value }))} className={inputCls}><option value="">{isAr ? "اختر" : "Select"}</option>{awards.map((a) => <option key={a.id} value={a.id}>{a.title[isAr ? "ar" : "en"]}</option>)}</select></div>
        <div><FieldLabel>{isAr ? "الاسم (عربي)" : "Name (Arabic)"}</FieldLabel><input className={inputCls} value={form.nameAr} onChange={(e) => setForm((f) => ({ ...f, nameAr: e.target.value }))} /></div>
        <div><FieldLabel>{isAr ? "الاسم (إنجليزي)" : "Name (English)"}</FieldLabel><input className={inputCls} value={form.nameEn} onChange={(e) => setForm((f) => ({ ...f, nameEn: e.target.value }))} /></div>
        <div><FieldLabel>{isAr ? "رئيس اللجنة" : "Chair"}</FieldLabel><select value={form.chairUserId} onChange={(e) => setForm((f) => ({ ...f, chairUserId: e.target.value }))} className={inputCls}><option value="">{isAr ? "اختر" : "Select"}</option>{users.map((u) => <option key={u.id} value={u.id}>{u.name || u.email}</option>)}</select></div>
        <div className="sm:col-span-2 lg:col-span-4"><Button type="submit" size="sm" disabled={create.isPending} className="bg-[#0b2140] text-white hover:bg-[#16345c]">{isAr ? "إنشاء" : "Create"}</Button></div>
      </form>
    </Card>}
    <Card>
      <h3 className="mb-3 text-sm font-bold text-[#0b2140]">{isAr ? "اللجان" : "Committees"}</h3>
      {!list.data?.length ? <Empty text={isAr ? "لا توجد لجان بعد." : "No committees yet."} /> : <div className="space-y-2">
        {list.data.map((c: any) => <div key={c.id} className="rounded-xl border border-[#edf1f2] p-3 text-xs"><div className="flex items-center justify-between gap-2"><div className="font-bold text-[#0b2140]">{isAr ? c.nameAr : c.nameEn}</div><span className="rounded-full bg-[#eef2f3] px-2.5 py-1 text-[10px] font-bold text-[#344651]">{c.status}</span></div></div>)}
      </div>}
    </Card>
  </div>;
}

// --- Corrective actions ---------------------------------------------------------
function CorrectiveTab({ isAr, isAdmin }: { isAr: boolean; isAdmin: boolean }) {
  const utils = trpc.useUtils();
  const list = trpc.institutional.correctiveActions.list.useQuery({ mineOnly: !isAdmin });
  const update = trpc.institutional.correctiveActions.update.useMutation({
    onSuccess: () => void utils.institutional.correctiveActions.list.invalidate(),
    onError: (e) => toast.error(e.message),
  });

  return <Card>
    <h3 className="mb-3 text-sm font-bold text-[#0b2140]">{isAr ? "الإجراءات التصحيحية" : "Corrective actions"}</h3>
    <p className="mb-3 text-[11px] text-[#8b989f]">{isAr ? "تُنشأ تلقائياً من توصيات المحكمين عند اكتمال التحكيم بالذكاء الاصطناعي، وتُسند لصاحبها للمتابعة حتى الإغلاق." : "Auto-generated from AI-judging recommendations and assigned to an owner for follow-up through closure."}</p>
    {!list.data?.length ? <Empty text={isAr ? "لا توجد إجراءات تصحيحية بعد." : "No corrective actions yet."} /> : <div className="space-y-2">
      {list.data.map((a: any) => <div key={a.id} className="rounded-xl border border-[#edf1f2] p-3 text-xs">
        <div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><div className="font-bold text-[#0b2140]">{isAr ? a.titleAr : a.titleEn}</div><div className="mt-1 text-[10px] text-[#8b989f]">{a.sourceRecommendation}</div></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${a.priority === "high" ? "bg-[#fff1ef] text-[#b94a48]" : a.priority === "medium" ? "bg-[#fff7df] text-[#8d6a08]" : "bg-[#eef2f3] text-[#344651]"}`}>{a.priority}</span></div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <select value={a.status} onChange={(e) => update.mutate({ id: a.id, status: e.target.value as any })} className="h-8 rounded-lg border border-[#dfe8e9] bg-white px-2 text-[11px] font-semibold"><option value="open">{isAr ? "مفتوح" : "Open"}</option><option value="in_progress">{isAr ? "قيد التنفيذ" : "In progress"}</option><option value="done">{isAr ? "منجز" : "Done"}</option><option value="overdue">{isAr ? "متأخر" : "Overdue"}</option></select>
          <input type="number" min={0} max={100} value={a.progressPercent} onChange={(e) => update.mutate({ id: a.id, progressPercent: Number(e.target.value) })} className="h-8 w-20 rounded-lg border border-[#dfe8e9] bg-white px-2 text-[11px]" />
          <span className="text-[10px] text-[#8b989f]">%</span>
        </div>
      </div>)}
    </div>}
  </Card>;
}

// --- Reference data (categories/sectors/levels/KPIs) ------------------------------
function ReferenceTab({ isAr }: { isAr: boolean }) {
  const utils = trpc.useUtils();
  const list = trpc.institutional.referenceData.list.useQuery({});
  const upsert = trpc.institutional.referenceData.upsert.useMutation({
    onSuccess: () => { toast.success(isAr ? "تم الحفظ" : "Saved"); void utils.institutional.referenceData.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const approve = trpc.institutional.referenceData.approve.useMutation({ onSuccess: () => void utils.institutional.referenceData.list.invalidate() });
  const retire = trpc.institutional.referenceData.retire.useMutation({ onSuccess: () => void utils.institutional.referenceData.list.invalidate() });
  const [form, setForm] = useState({ type: "category" as "category" | "sector" | "level" | "kpi", refKey: "", labelAr: "", labelEn: "" });

  return <div className="space-y-4">
    <Card>
      <h3 className="mb-3 text-sm font-bold text-[#0b2140]">{isAr ? "إضافة/تحديث بيانات مرجعية" : "Add / update reference data"}</h3>
      <form onSubmit={(e) => { e.preventDefault(); if (!form.refKey || !form.labelAr || !form.labelEn) return; upsert.mutate(form); setForm({ type: form.type, refKey: "", labelAr: "", labelEn: "" }); }} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div><FieldLabel>{isAr ? "النوع" : "Type"}</FieldLabel><select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as any }))} className={inputCls}><option value="category">{isAr ? "فئة" : "Category"}</option><option value="sector">{isAr ? "قطاع" : "Sector"}</option><option value="level">{isAr ? "مستوى" : "Level"}</option><option value="kpi">{isAr ? "مؤشر أداء" : "KPI"}</option></select></div>
        <div><FieldLabel>{isAr ? "المفتاح" : "Key"}</FieldLabel><input className={inputCls} value={form.refKey} onChange={(e) => setForm((f) => ({ ...f, refKey: e.target.value }))} /></div>
        <div><FieldLabel>{isAr ? "التسمية (عربي)" : "Label (Arabic)"}</FieldLabel><input className={inputCls} value={form.labelAr} onChange={(e) => setForm((f) => ({ ...f, labelAr: e.target.value }))} /></div>
        <div><FieldLabel>{isAr ? "التسمية (إنجليزي)" : "Label (English)"}</FieldLabel><input className={inputCls} value={form.labelEn} onChange={(e) => setForm((f) => ({ ...f, labelEn: e.target.value }))} /></div>
        <div className="sm:col-span-2 lg:col-span-4"><Button type="submit" size="sm" disabled={upsert.isPending} className="bg-[#0b2140] text-white hover:bg-[#16345c]">{isAr ? "حفظ" : "Save"}</Button></div>
      </form>
    </Card>
    <Card>
      <h3 className="mb-3 text-sm font-bold text-[#0b2140]">{isAr ? "البيانات المرجعية" : "Reference data"}</h3>
      {!list.data?.length ? <Empty text={isAr ? "لا توجد بيانات مرجعية بعد." : "No reference data yet."} /> : <div className="space-y-2">
        {list.data.map((r: any) => <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#edf1f2] p-3 text-xs">
          <div><span className="me-2 rounded-full bg-[#eef2f3] px-2 py-0.5 text-[10px] font-bold text-[#344651]">{r.type}</span><span className="font-bold text-[#0b2140]">{isAr ? r.labelAr : r.labelEn}</span> <span className="text-[10px] text-[#8b989f]">v{r.version} · {r.status}</span></div>
          <div className="flex gap-2">{r.status !== "approved" && <Button size="sm" variant="outline" onClick={() => approve.mutate({ id: r.id })} className="h-7 border-[#dfe8e9] text-[10px]">{isAr ? "اعتماد" : "Approve"}</Button>}{r.status !== "retired" && <Button size="sm" variant="outline" onClick={() => retire.mutate({ id: r.id })} className="h-7 border-[#f1d6d3] text-[10px] text-[#b94a48]">{isAr ? "إيقاف" : "Retire"}</Button>}</div>
        </div>)}
      </div>}
    </Card>
  </div>;
}

// --- Knowledge base (RAG grounding sources) --------------------------------------
function KnowledgeTab({ isAr }: { isAr: boolean }) {
  const utils = trpc.useUtils();
  const list = trpc.institutional.knowledgeBase.list.useQuery({});
  const create = trpc.institutional.knowledgeBase.create.useMutation({
    onSuccess: () => { toast.success(isAr ? "تمت الإضافة" : "Added"); void utils.institutional.knowledgeBase.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const setStatus = trpc.institutional.knowledgeBase.setReviewStatus.useMutation({ onSuccess: () => void utils.institutional.knowledgeBase.list.invalidate() });
  const [form, setForm] = useState({ titleAr: "", titleEn: "", programType: "", bodyText: "" });

  return <div className="space-y-4">
    <Card>
      <h3 className="mb-3 text-sm font-bold text-[#0b2140]">{isAr ? "إضافة مصدر معرفي" : "Add a knowledge source"}</h3>
      <p className="mb-3 text-[11px] text-[#8b989f]">{isAr ? "تُستخدم هذه المصادر لتأصيل مخرجات الذكاء الاصطناعي (RAG) حسب نوع البرنامج." : "Used to ground AI outputs (RAG) by program type."}</p>
      <form onSubmit={(e) => { e.preventDefault(); if (!form.titleAr || !form.titleEn || !form.bodyText) return; create.mutate({ ...form, programType: form.programType || undefined }); setForm({ titleAr: "", titleEn: "", programType: "", bodyText: "" }); }} className="grid gap-3 sm:grid-cols-2">
        <div><FieldLabel>{isAr ? "العنوان (عربي)" : "Title (Arabic)"}</FieldLabel><input className={inputCls} value={form.titleAr} onChange={(e) => setForm((f) => ({ ...f, titleAr: e.target.value }))} /></div>
        <div><FieldLabel>{isAr ? "العنوان (إنجليزي)" : "Title (English)"}</FieldLabel><input className={inputCls} value={form.titleEn} onChange={(e) => setForm((f) => ({ ...f, titleEn: e.target.value }))} /></div>
        <div><FieldLabel>{isAr ? "نوع البرنامج (اختياري)" : "Program type (optional)"}</FieldLabel><input className={inputCls} value={form.programType} onChange={(e) => setForm((f) => ({ ...f, programType: e.target.value }))} /></div>
        <div className="sm:col-span-2"><FieldLabel>{isAr ? "المحتوى" : "Body text"}</FieldLabel><textarea rows={4} className={`${inputCls} h-auto py-2`} value={form.bodyText} onChange={(e) => setForm((f) => ({ ...f, bodyText: e.target.value }))} /></div>
        <div className="sm:col-span-2"><Button type="submit" size="sm" disabled={create.isPending} className="bg-[#0b2140] text-white hover:bg-[#16345c]">{isAr ? "إضافة" : "Add"}</Button></div>
      </form>
    </Card>
    <Card>
      <h3 className="mb-3 text-sm font-bold text-[#0b2140]">{isAr ? "قاعدة المعرفة" : "Knowledge base"}</h3>
      {!list.data?.length ? <Empty text={isAr ? "لا توجد مصادر بعد." : "No sources yet."} /> : <div className="space-y-2">
        {list.data.map((k: any) => <div key={k.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#edf1f2] p-3 text-xs">
          <div><div className="font-bold text-[#0b2140]">{isAr ? k.titleAr : k.titleEn}</div><div className="mt-0.5 text-[10px] text-[#8b989f]">{k.programType || (isAr ? "عام" : "General")}</div></div>
          <select value={k.reviewStatus} onChange={(e) => setStatus.mutate({ id: k.id, reviewStatus: e.target.value as any })} className="h-8 rounded-lg border border-[#dfe8e9] bg-white px-2 text-[11px] font-semibold"><option value="pending">{isAr ? "قيد المراجعة" : "Pending"}</option><option value="approved">{isAr ? "معتمد" : "Approved"}</option><option value="rejected">{isAr ? "مرفوض" : "Rejected"}</option></select>
        </div>)}
      </div>}
    </Card>
  </div>;
}

// --- Conflict of interest ----------------------------------------------------------
function CoiTab({ isAr }: { isAr: boolean }) {
  const utils = trpc.useUtils();
  const declare = trpc.institutional.conflictOfInterest.declare.useMutation({
    onSuccess: () => { toast.success(isAr ? "تم تسجيل الإقرار" : "Declaration recorded"); void utils.institutional.conflictOfInterest.status.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const [nominationId, setNominationId] = useState("");
  const status = trpc.institutional.conflictOfInterest.status.useQuery({ nominationId }, { enabled: Boolean(nominationId) });
  const [details, setDetails] = useState("");

  return <Card>
    <h3 className="mb-2 text-sm font-bold text-[#0b2140]">{isAr ? "إقرار تضارب المصالح" : "Conflict-of-interest declaration"}</h3>
    <p className="mb-3 text-[11px] text-[#8b989f]">{isAr ? "على كل محكّم مُسند إلى ترشيح تقديم هذا الإقرار قبل السماح باعتماد نتيجة الترشيح." : "Every judge assigned to a nomination must submit this declaration before that nomination's result can be finalized."}</p>
    <div className="grid gap-3 sm:grid-cols-2">
      <div><FieldLabel>{isAr ? "رقم الترشيح" : "Nomination ID"}</FieldLabel><input className={inputCls} value={nominationId} onChange={(e) => setNominationId(e.target.value)} placeholder="nom_..." /></div>
      <div><FieldLabel>{isAr ? "ملاحظات (إن وجدت)" : "Details (if any)"}</FieldLabel><input className={inputCls} value={details} onChange={(e) => setDetails(e.target.value)} /></div>
    </div>
    {nominationId && status.data !== undefined && <p className="mt-2 text-[11px]">{status.data ? (isAr ? "✔ تم تصفية هذا الترشيح من تضارب المصالح." : "✔ Cleared for this nomination.") : (isAr ? "لم يتم تقديم إقرار بعد لهذا الترشيح." : "No declaration submitted yet for this nomination.")}</p>}
    <div className="mt-3 flex gap-2">
      <Button size="sm" disabled={!nominationId || declare.isPending} onClick={() => declare.mutate({ nominationId, hasConflict: false, detailsText: details || undefined })} className="bg-[#12897f] text-white hover:bg-[#0d716a]">{isAr ? "لا يوجد تضارب مصالح" : "No conflict"}</Button>
      <Button size="sm" variant="outline" disabled={!nominationId || declare.isPending} onClick={() => declare.mutate({ nominationId, hasConflict: true, detailsText: details || undefined })} className="border-[#f1d6d3] text-[#b94a48]">{isAr ? "يوجد تضارب مصالح" : "Has conflict"}</Button>
    </div>
  </Card>;
}

// --- AI-output governance -----------------------------------------------------------
function AiGovernanceTab({ isAr }: { isAr: boolean }) {
  const utils = trpc.useUtils();
  const list = trpc.institutional.aiGovernance.list.useQuery({});
  const setStatus = trpc.institutional.aiGovernance.setReviewStatus.useMutation({ onSuccess: () => void utils.institutional.aiGovernance.list.invalidate() });

  return <Card>
    <h3 className="mb-2 text-sm font-bold text-[#0b2140]">{isAr ? "حوكمة مخرجات الذكاء الاصطناعي" : "AI output governance"}</h3>
    <p className="mb-3 text-[11px] text-[#8b989f]">{isAr ? "سجل تدقيقي لكل مخرج ذكاء اصطناعي (تحكيم، ملخصات، نماذج) مع إمكانية مراجعته والتنبيه إلى أي مخرج يستدعي الانتباه." : "Audit log of every AI-generated output (judging, summaries, samples), reviewable and flaggable."}</p>
    {!list.data?.length ? <Empty text={isAr ? "لا توجد سجلات بعد." : "No log entries yet."} /> : <div className="space-y-2">
      {list.data.map((row: any) => <div key={row.id} className="rounded-xl border border-[#edf1f2] p-3 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-bold text-[#0b2140]">{row.feature}</span><select value={row.reviewStatus} onChange={(e) => setStatus.mutate({ id: row.id, reviewStatus: e.target.value as any })} className="h-8 rounded-lg border border-[#dfe8e9] bg-white px-2 text-[11px] font-semibold"><option value="unreviewed">{isAr ? "غير مُراجع" : "Unreviewed"}</option><option value="approved">{isAr ? "معتمد" : "Approved"}</option><option value="flagged">{isAr ? "مُعلَّم" : "Flagged"}</option></select></div>
        <p className="mt-2 line-clamp-2 text-[11px] text-[#73828b]">{row.outputText}</p>
      </div>)}
    </div>}
  </Card>;
}

// --- Security events (SIEM-ready) ---------------------------------------------------
function SecurityTab({ isAr }: { isAr: boolean }) {
  const list = trpc.institutional.security.events.useQuery();
  return <Card>
    <h3 className="mb-2 text-sm font-bold text-[#0b2140]">{isAr ? "سجل الأحداث الأمنية" : "Security event log"}</h3>
    <p className="mb-3 text-[11px] text-[#8b989f]">{isAr ? "سجل منظم قابل للتصدير إلى أنظمة SIEM خارجية (تسجيل الدخول، محاولات الدخول الفاشلة، رفض الصلاحيات)." : "Structured, SIEM-export-ready log (logins, failed attempts, permission denials)."}</p>
    {!list.data?.length ? <Empty text={isAr ? "لا توجد أحداث مسجلة بعد." : "No events recorded yet."} /> : <div className="max-h-[480px] space-y-1.5 overflow-y-auto">
      {list.data.map((e: any) => <div key={e.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#fbfcfc] px-3 py-2 text-[11px]"><span className="font-mono font-bold text-[#0b2140]">{e.type}</span><span className="text-[#8b989f]">{e.ip || "—"}</span><span className="text-[#8b989f]">{new Date(e.createdAt).toLocaleString(isAr ? "ar-AE" : "en-US")}</span></div>)}
    </div>}
  </Card>;
}

export default function InstitutionalGovernance() {
  const { lang } = useLang();
  const isAr = lang === "ar";
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [, setLocation] = useLocation();
  const [tab, setTab] = useState<TabKey>("calendar");
  const catalog = trpc.evaluation.awardCatalog.useQuery();
  const awards = (catalog.data ?? []) as AwardCatalog[];
  const usersQuery = trpc.evaluation.adminUsers.useQuery(undefined, { retry: false, enabled: isAdmin });
  const users = (usersQuery.data as any)?.users ?? [];
  const BackIcon = isAr ? ArrowRight : ArrowLeft;

  const tabs: Array<{ key: TabKey; label: string; icon: typeof CalendarClock; adminOnly?: boolean }> = [
    { key: "calendar", label: isAr ? "التقويم" : "Calendar", icon: CalendarClock },
    { key: "committees", label: isAr ? "اللجان" : "Committees", icon: Gavel },
    { key: "corrective", label: isAr ? "الإجراءات التصحيحية" : "Corrective actions", icon: ClipboardList },
    { key: "coi", label: isAr ? "تضارب المصالح" : "Conflict of interest", icon: ShieldAlert },
    { key: "reference", label: isAr ? "البيانات المرجعية" : "Reference data", icon: Library, adminOnly: true },
    { key: "knowledge", label: isAr ? "قاعدة المعرفة" : "Knowledge base", icon: Library, adminOnly: true },
    { key: "ai", label: isAr ? "حوكمة الذكاء الاصطناعي" : "AI governance", icon: ShieldCheck, adminOnly: true },
    { key: "security", label: isAr ? "الأمن" : "Security", icon: ShieldCheck, adminOnly: true },
  ];
  const visibleTabs = tabs.filter((t) => !t.adminOnly || isAdmin);
  const activeTab = visibleTabs.some((t) => t.key === tab) ? tab : visibleTabs[0]?.key;

  return <div dir={isAr ? "rtl" : "ltr"} className="min-h-screen bg-[#f4f7f8] px-3 py-5 sm:px-6 lg:px-8">
    <div className="mx-auto max-w-[1200px] space-y-5">
      <section className="rounded-[26px] bg-[#0b2140] px-5 py-7 text-white shadow-[0_18px_45px_rgba(11,33,64,.14)] sm:px-8 sm:py-9">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div><div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.18em] text-[#c9a227]"><ShieldCheck className="h-4 w-4" />{isAr ? "الحوكمة المؤسسية" : "INSTITUTIONAL GOVERNANCE"}</div><h1 className="text-2xl font-bold sm:text-3xl">{isAr ? "لوحة الحوكمة والامتثال" : "Governance & Compliance Console"}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-white/65">{isAr ? "التقويم، اللجان، الإجراءات التصحيحية، تضارب المصالح، البيانات المرجعية، قاعدة المعرفة، حوكمة الذكاء الاصطناعي، والسجل الأمني." : "Calendar, committees, corrective actions, conflict of interest, reference data, knowledge base, AI governance, and the security log."}</p></div>
          <Button onClick={() => setLocation("/admin")} variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/15 hover:text-white"><BackIcon className="me-2 h-4 w-4" />{isAr ? "العودة للوحة التحكم" : "Back to control center"}</Button>
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        {visibleTabs.map((t) => <button key={t.key} type="button" onClick={() => setTab(t.key)} className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition ${activeTab === t.key ? "bg-[#0b2140] text-white" : "bg-white text-[#344651] hover:border-[#12897f]"} border border-[#dfe8e9]`}><t.icon className="h-3.5 w-3.5" />{t.label}</button>)}
      </div>

      {activeTab === "calendar" && <CalendarTab isAr={isAr} isAdmin={isAdmin} awards={awards} />}
      {activeTab === "committees" && <CommitteesTab isAr={isAr} isAdmin={isAdmin} awards={awards} users={users} />}
      {activeTab === "corrective" && <CorrectiveTab isAr={isAr} isAdmin={isAdmin} />}
      {activeTab === "coi" && <CoiTab isAr={isAr} />}
      {activeTab === "reference" && isAdmin && <ReferenceTab isAr={isAr} />}
      {activeTab === "knowledge" && isAdmin && <KnowledgeTab isAr={isAr} />}
      {activeTab === "ai" && isAdmin && <AiGovernanceTab isAr={isAr} />}
      {activeTab === "security" && isAdmin && <SecurityTab isAr={isAr} />}
    </div>
  </div>;
}
