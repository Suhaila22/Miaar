import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Activity, ArrowLeft, ArrowRight, CheckCircle2, Clock3, Filter, KeyRound, LoaderCircle, Pencil, Plus, RefreshCcw, Search, ShieldCheck, Trash2, UserRound, UsersRound } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLang } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";

type UserRole = "admin" | "user";
type StatusFilter = "all" | "available" | "exhausted" | "active" | "inactive";

type ManagedUser = {
  id: number;
  name: string | null;
  email: string | null;
  loginMethod: string | null;
  role: UserRole;
  trialAttempts: number;
  trialLimit: number;
  remainingAttempts: number;
  createdAt: string;
  lastSignedIn: string | null;
  lastActivityAt: string | null;
  lastEvaluationAt: string | null;
  evaluations: number;
  assignedTasks: number;
  completedTasks: number;
  isActive: boolean;
};

type AdminUsersData = {
  kpis: {
    totalUsers: number;
    admins: number;
    regularUsers: number;
    activeUsers: number;
    availableTrialUsers: number;
    exhaustedTrialUsers: number;
  };
  users: ManagedUser[];
};

function formatDate(value: string | null, lang: "ar" | "en") {
  if (!value) return lang === "ar" ? "لم يسجل بعد" : "Not recorded";
  return new Intl.DateTimeFormat(lang === "ar" ? "ar-AE" : "en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function initials(user: ManagedUser) {
  const source = user.name || user.email || "م";
  return source.trim().split(/\s+/).slice(0, 2).map((part) => part.charAt(0)).join("").toUpperCase();
}

function StatCard({ label, value, detail, icon: Icon, tone }: { label: string; value: number; detail: string; icon: typeof UsersRound; tone: "navy" | "teal" | "gold" | "rose" }) {
  const tones = {
    navy: "bg-[#0b2140] text-white",
    teal: "bg-[#e4f3f1] text-[#0d716a]",
    gold: "bg-[#fff7df] text-[#8d6a08]",
    rose: "bg-[#fff1ef] text-[#a84f4c]",
  };
  const iconTones = { navy: "bg-white/10 text-[#c9a227]", teal: "bg-white text-[#12897f]", gold: "bg-white text-[#b58b13]", rose: "bg-white text-[#b94a48]" };
  return <article className={`rounded-2xl p-4 shadow-[0_10px_30px_rgba(11,33,64,.05)] ${tones[tone]}`}><div className="flex items-start justify-between gap-3"><div><p className={`text-[10px] font-bold uppercase tracking-[0.12em] ${tone === "navy" ? "text-white/60" : "text-[#73828b]"}`}>{label}</p><p className="mt-2 font-mono text-2xl font-bold tracking-tight">{value}</p><p className={`mt-1 text-[10px] ${tone === "navy" ? "text-white/60" : "text-[#8b989f]"}`}>{detail}</p></div><span className={`flex h-9 w-9 items-center justify-center rounded-xl ${iconTones[tone]}`}><Icon className="h-4 w-4" /></span></div></article>;
}

function TrialBar({ user, remainingLabel }: { user: ManagedUser; remainingLabel: string }) {
  const usedPercent = Math.min(100, Math.round((user.trialAttempts / user.trialLimit) * 100));
  const exhausted = user.trialAttempts >= user.trialLimit;
  return <div className="min-w-[150px]"><div className="mb-1 flex items-center justify-between gap-2 text-[10px] text-[#8b989f]"><span>{user.remainingAttempts} {remainingLabel}</span><span className="font-mono">{user.trialAttempts}/{user.trialLimit}</span></div><div className="h-2 overflow-hidden rounded-full bg-[#eef2f3]"><div className={`h-full rounded-full transition-all ${exhausted ? "bg-[#b94a48]" : "bg-[#12897f]"}`} style={{ width: `${usedPercent}%` }} /></div></div>;
}

type UserFormValues = { name: string; email: string; role: UserRole; trialAttempts: number };

function UserEditorDialog({ open, user, pending, lang, t, onOpenChange, onSubmit }: { open: boolean; user: ManagedUser | null; pending: boolean; lang: "ar" | "en"; t: ReturnType<typeof useLang>["t"]; onOpenChange: (open: boolean) => void; onSubmit: (values: UserFormValues) => void }) {
  const [form, setForm] = useState<UserFormValues>({ name: "", email: "", role: "user", trialAttempts: 0 });
  const [error, setError] = useState("");
  const isEdit = Boolean(user);
  const oauthEmailLocked = Boolean(user && user.loginMethod !== "admin_provisioned");

  useEffect(() => {
    if (!open) return;
    setForm({ name: user?.name || "", email: user?.email || "", role: user?.role || "user", trialAttempts: user?.trialAttempts || 0 });
    setError("");
  }, [open, user]);

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    if (name.length < 2) return setError(t.invalidUserName);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError(t.invalidUserEmail);
    setError("");
    onSubmit({ name, email, role: form.role, trialAttempts: Math.max(0, Math.min(5, form.trialAttempts)) });
  };

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent dir={lang === "ar" ? "rtl" : "ltr"} className="max-w-lg border-[#dfe8e9] bg-white"><DialogHeader><DialogTitle className="text-[#0b2140]">{isEdit ? t.editUserTitle : t.createUserTitle}</DialogTitle><DialogDescription className="text-xs leading-6 text-[#73828b]">{isEdit ? t.userManagementDesc : t.provisionedUserNotice}</DialogDescription></DialogHeader><form onSubmit={submit} className="space-y-4"><div><label className="mb-1.5 block text-xs font-bold text-[#344651]" htmlFor="managed-user-name">{t.userName}</label><input id="managed-user-name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder={t.userNamePlaceholder} className="h-10 w-full rounded-xl border border-[#dfe8e9] bg-[#fbfcfc] px-3 text-sm outline-none focus:border-[#12897f] focus:ring-2 focus:ring-[#12897f]/10" /></div><div><label className="mb-1.5 block text-xs font-bold text-[#344651]" htmlFor="managed-user-email">{t.userEmail}</label><input id="managed-user-email" type="email" value={form.email} disabled={oauthEmailLocked} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} placeholder={t.userEmailPlaceholder} className="h-10 w-full rounded-xl border border-[#dfe8e9] bg-[#fbfcfc] px-3 text-sm outline-none focus:border-[#12897f] focus:ring-2 focus:ring-[#12897f]/10 disabled:cursor-not-allowed disabled:bg-[#f0f3f4] disabled:text-[#8b989f]" />{oauthEmailLocked && <p className="mt-1.5 text-[10px] text-[#8b989f]">{t.oauthEmailNotice}</p>}</div><div className="grid gap-4 sm:grid-cols-2"><div><label className="mb-1.5 block text-xs font-bold text-[#344651]" htmlFor="managed-user-role">{t.userRole}</label><select id="managed-user-role" value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value as UserRole }))} className="h-10 w-full rounded-xl border border-[#dfe8e9] bg-[#fbfcfc] px-3 text-sm font-semibold text-[#344651] outline-none focus:border-[#12897f]"><option value="user">{t.user}</option><option value="admin">{t.admin}</option></select></div><div><label className="mb-1.5 block text-xs font-bold text-[#344651]" htmlFor="managed-user-trial">{t.trialAttemptsUsed}</label><input id="managed-user-trial" type="number" min={0} max={5} value={form.trialAttempts} onChange={(event) => setForm((current) => ({ ...current, trialAttempts: Number(event.target.value) }))} className="h-10 w-full rounded-xl border border-[#dfe8e9] bg-[#fbfcfc] px-3 text-sm font-mono outline-none focus:border-[#12897f]" /><p className="mt-1.5 text-[10px] text-[#8b989f]">{t.trialAttemptsHint}</p></div></div>{error && <p role="alert" className="rounded-xl bg-[#fff1ef] px-3 py-2 text-xs font-semibold text-[#b94a48]">{error}</p>}<DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="border-[#dfe8e9]">{t.cancel}</Button><Button type="submit" disabled={pending} className="bg-[#0b2140] text-white hover:bg-[#16305a]">{pending && <LoaderCircle className="me-2 h-4 w-4 animate-spin" />}{t.saveUser}</Button></DialogFooter></form></DialogContent></Dialog>;
}

function DeleteUserDialog({ open, user, pending, lang, t, onOpenChange, onConfirm }: { open: boolean; user: ManagedUser | null; pending: boolean; lang: "ar" | "en"; t: ReturnType<typeof useLang>["t"]; onOpenChange: (open: boolean) => void; onConfirm: () => void }) {
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent dir={lang === "ar" ? "rtl" : "ltr"} className="max-w-md border-[#f1d6d3] bg-white"><DialogHeader><DialogTitle className="flex items-center gap-2 text-[#a84f4c]"><Trash2 className="h-5 w-5" />{t.deleteUser}</DialogTitle><DialogDescription className="text-sm leading-7 text-[#73828b]">{user ? `${user.name || t.unnamedUser} · ${user.email || t.noEmail}` : ""}<br />{t.deleteUserConfirm}</DialogDescription></DialogHeader><DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="border-[#dfe8e9]">{t.cancel}</Button><Button type="button" disabled={pending} onClick={onConfirm} className="bg-[#b94a48] text-white hover:bg-[#a13d3b]">{pending && <LoaderCircle className="me-2 h-4 w-4 animate-spin" />}{t.confirmDelete}</Button></DialogFooter></DialogContent></Dialog>;
}

export default function UserManagement() {
  const { lang, t } = useLang();
  const { user: currentUser } = useAuth();
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | UserRole>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [deletingUser, setDeletingUser] = useState<ManagedUser | null>(null);
  const usersQuery = trpc.evaluation.adminUsers.useQuery(undefined, { retry: false });
  const utils = trpc.useUtils();
  const resetMutation = trpc.evaluation.resetUserTrial.useMutation({
    onSuccess: () => {
      toast.success(t.resetSuccess);
      void utils.evaluation.adminUsers.invalidate();
      void utils.evaluation.adminDashboard.invalidate();
    },
    onError: () => toast.error(t.resetFailure),
  });
  const roleMutation = trpc.evaluation.updateUserRole.useMutation({
    onSuccess: () => {
      toast.success(t.roleUpdatedSuccess);
      void utils.evaluation.adminUsers.invalidate();
      void utils.evaluation.adminDashboard.invalidate();
    },
    onError: () => toast.error(t.roleUpdatedFailure),
  });
  const createMutation = trpc.evaluation.createUser.useMutation({
    onSuccess: () => {
      toast.success(t.createUserSuccess);
      setEditorOpen(false);
      setEditingUser(null);
      void utils.evaluation.adminUsers.invalidate();
      void utils.evaluation.adminDashboard.invalidate();
    },
    onError: (error) => toast.error(error.message || t.createUserFailure),
  });
  const updateMutation = trpc.evaluation.updateUser.useMutation({
    onSuccess: () => {
      toast.success(t.updateUserSuccess);
      setEditorOpen(false);
      setEditingUser(null);
      void utils.evaluation.adminUsers.invalidate();
      void utils.evaluation.adminDashboard.invalidate();
    },
    onError: (error) => toast.error(error.message || t.updateUserFailure),
  });
  const deleteMutation = trpc.evaluation.deleteUser.useMutation({
    onSuccess: () => {
      setDeletingUser(null);
      toast.success(t.deleteUserSuccess);
      void utils.evaluation.adminUsers.invalidate();
      void utils.evaluation.adminDashboard.invalidate();
    },
    onError: (error) => toast.error(error.message || t.deleteUserFailure),
  });
  const data = usersQuery.data as AdminUsersData | undefined;
  const isAdminError = usersQuery.error?.data?.code === "FORBIDDEN";
  const normalizedSearch = search.trim().toLocaleLowerCase();
  const filteredUsers = useMemo(() => {
    if (!data) return [];
    return data.users.filter((user) => {
      const matchesSearch = !normalizedSearch || `${user.name || ""} ${user.email || ""}`.toLocaleLowerCase().includes(normalizedSearch);
      const matchesRole = roleFilter === "all" || user.role === roleFilter;
      const matchesStatus = statusFilter === "all" || (statusFilter === "available" && user.trialAttempts < user.trialLimit) || (statusFilter === "exhausted" && user.trialAttempts >= user.trialLimit) || (statusFilter === "active" && user.isActive) || (statusFilter === "inactive" && !user.isActive);
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [data, normalizedSearch, roleFilter, statusFilter]);

  const handleRoleChange = (user: ManagedUser, nextRole: UserRole) => {
    if (nextRole === user.role || roleMutation.isPending) return;
    if (!window.confirm(t.roleChangeConfirm)) return;
    roleMutation.mutate({ userId: user.id, role: nextRole });
  };

  const openCreate = () => {
    setEditingUser(null);
    setEditorOpen(true);
  };

  const openEdit = (user: ManagedUser) => {
    setEditingUser(user);
    setEditorOpen(true);
  };

  const saveUser = (values: UserFormValues) => {
    if (editingUser) updateMutation.mutate({ userId: editingUser.id, ...values });
    else createMutation.mutate(values);
  };

  const requestDelete = (user: ManagedUser) => {
    if (currentUser?.id === user.id) {
      toast.error(t.cannotDeleteSelf);
      return;
    }
    setDeletingUser(user);
  };

  const confirmDelete = () => {
    if (!deletingUser) return;
    deleteMutation.mutate({ userId: deletingUser.id });
  };

  if (usersQuery.isLoading) return <div className="flex min-h-screen items-center justify-center text-sm text-[#73828b]"><LoaderCircle className="me-3 h-5 w-5 animate-spin text-[#12897f]" />{t.loadingUsers}</div>;
  if (isAdminError) return <div dir={lang === "ar" ? "rtl" : "ltr"} className="flex min-h-screen items-center justify-center p-6"><div className="max-w-md rounded-3xl border border-[#f2e5bd] bg-[#fffaf0] p-8 text-center shadow-[0_18px_50px_rgba(11,33,64,.08)]"><ShieldCheck className="mx-auto mb-3 h-9 w-9 text-[#c9a227]" /><h1 className="text-lg font-bold text-[#0b2140]">{t.adminOnly}</h1><p className="mt-2 text-sm leading-6 text-[#73828b]">{t.userManagementDesc}</p><Button onClick={() => setLocation("/")} className="mt-6 bg-[#0b2140] text-white hover:bg-[#16305a]">{t.openWorkspace}</Button></div></div>;
  if (!data) return <div className="p-8 text-sm text-[#73828b]">{t.noActivity}</div>;

  const BackIcon = lang === "ar" ? ArrowRight : ArrowLeft;
  return <div dir={lang === "ar" ? "rtl" : "ltr"} className="min-h-screen bg-[#f4f7f8] px-3 py-4 sm:px-6 sm:py-5 lg:px-8"><div className="mx-auto max-w-[1540px] space-y-5">
    <header className="relative overflow-hidden rounded-[26px] bg-[#0b2140] p-5 text-white shadow-[0_18px_50px_rgba(11,33,64,.16)] sm:p-7"><div className="absolute -end-16 -top-24 h-72 w-72 rounded-full bg-[#12897f]/20 blur-3xl" /><div className="absolute -start-12 -bottom-24 h-52 w-52 rounded-full bg-[#c9a227]/10 blur-3xl" /><div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between"><div><div className="mb-4 flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#c9a227]/60 bg-[#c9a227] text-xl font-black text-[#0b2140]">م</div><div><div className="text-[10px] font-black uppercase tracking-[0.26em] text-[#c9a227]">MI'YAR · مِعيار</div><div className="mt-1 text-[10px] text-white/50">{t.appSubtitle}</div></div></div><div className="mb-3 flex items-center gap-2 text-xs font-semibold text-[#b9d5d1]"><UsersRound className="h-4 w-4 text-[#c9a227]" />{t.userManagementEyebrow}</div><h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t.userManagementTitle}</h1><p className="mt-2 max-w-2xl text-sm leading-7 text-white/65">{t.userManagementDesc}</p></div><div className="relative flex flex-wrap gap-2"><Button onClick={openCreate} className="bg-[#c9a227] text-[#0b2140] hover:bg-[#d8b63b]"><Plus className="me-2 h-4 w-4" />{t.addUser}</Button><Button onClick={() => setLocation("/admin")} variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/15 hover:text-white"><BackIcon className="me-2 h-4 w-4" />{t.backToControlCenter}</Button></div></div></header>

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6"><StatCard label={t.totalAccounts} value={data.kpis.totalUsers} detail={t.usersCount} icon={UsersRound} tone="navy" /><StatCard label={t.adminsCount} value={data.kpis.admins} detail={t.manageRole} icon={ShieldCheck} tone="gold" /><StatCard label={t.activeUsers} value={data.kpis.activeUsers} detail={t.activeRecently} icon={Activity} tone="teal" /><StatCard label={t.user} value={data.kpis.regularUsers} detail={t.regularUsersDetail} icon={UserRound} tone="teal" /><StatCard label={t.availableTrial} value={data.kpis.availableTrialUsers} detail={t.trialAvailable} icon={Clock3} tone="gold" /><StatCard label={t.exhaustedTrial} value={data.kpis.exhaustedTrialUsers} detail={t.trialExhausted} icon={KeyRound} tone="rose" /></section>

    <section className="rounded-2xl border border-[#e4ecee] bg-white p-4 shadow-[0_10px_30px_rgba(11,33,64,.035)] sm:p-5"><div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#12897f]"><Filter className="h-3.5 w-3.5" />{t.directoryFilters}</div><h2 className="mt-1 text-lg font-bold text-[#0b2140]">{t.usersDirectory}</h2><p className="mt-1 text-xs text-[#8b989f]">{filteredUsers.length} {t.ofUsers} {data.users.length}</p></div><div className="flex flex-col gap-2 sm:flex-row"><label className="relative block min-w-0 sm:w-72"><Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8b989f]" /><input aria-label={t.searchUsers} value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t.searchUsers} className="h-10 w-full rounded-xl border border-[#dfe8e9] bg-[#fbfcfc] ps-9 pe-3 text-xs outline-none transition focus:border-[#12897f] focus:ring-2 focus:ring-[#12897f]/10" /></label><select aria-label={t.roleFilter} value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as "all" | UserRole)} className="h-10 rounded-xl border border-[#dfe8e9] bg-[#fbfcfc] px-3 text-xs font-semibold text-[#344651] outline-none focus:border-[#12897f]"><option value="all">{t.allRoles}</option><option value="admin">{t.admin}</option><option value="user">{t.user}</option></select><select aria-label={t.statusFilter} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)} className="h-10 rounded-xl border border-[#dfe8e9] bg-[#fbfcfc] px-3 text-xs font-semibold text-[#344651] outline-none focus:border-[#12897f]"><option value="all">{t.allStatuses}</option><option value="available">{t.trialAvailable}</option><option value="exhausted">{t.trialExhausted}</option><option value="active">{t.activeRecently}</option><option value="inactive">{t.inactiveUsers}</option></select></div></div>

      <div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[940px] text-start"><thead><tr className="border-b border-[#edf1f2] text-[10px] text-[#8b989f]"><th className="px-3 py-3 font-semibold">{t.users}</th><th className="px-3 py-3 font-semibold">{t.roleFilter}</th><th className="px-3 py-3 font-semibold">{t.trialUsage}</th><th className="px-3 py-3 font-semibold">{t.evaluations}</th><th className="px-3 py-3 font-semibold">{t.assignedReviews}</th><th className="px-3 py-3 font-semibold">{t.lastActive}</th><th className="px-3 py-3 text-end font-semibold">{t.manageRole}</th></tr></thead><tbody>{filteredUsers.map((user) => <tr key={user.id} className="border-b border-[#f0f3f4] align-middle last:border-0"><td className="px-3 py-4"><div className="flex items-center gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eaf0f7] text-xs font-bold text-[#0b2140]">{initials(user)}</div><div className="min-w-0"><div className="truncate text-xs font-bold text-[#0b2140]">{user.name || t.unnamedUser}</div><div className="mt-1 truncate text-[10px] text-[#8b989f]">{user.email || t.noEmail}</div></div></div></td><td className="px-3 py-4"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ${user.role === "admin" ? "bg-[#fff7df] text-[#8d6a08]" : "bg-[#eaf0f7] text-[#315273]"}`}><ShieldCheck className="h-3 w-3" />{user.role === "admin" ? t.admin : t.user}</span></td><td className="px-3 py-4"><div className="flex items-center gap-3"><TrialBar user={user} remainingLabel={t.remaining} /><span className={`shrink-0 rounded-full px-2 py-1 font-mono text-[10px] font-bold ${user.trialAttempts >= user.trialLimit ? "bg-[#fff1ef] text-[#b94a48]" : "bg-[#e4f3f1] text-[#12897f]"}`}>{user.trialAttempts}/{user.trialLimit}</span></div></td><td className="px-3 py-4"><div className="font-mono text-sm font-bold text-[#0b2140]">{user.evaluations}</div><div className="mt-1 text-[10px] text-[#8b989f]">{t.evaluations}</div></td><td className="px-3 py-4"><div className="font-mono text-sm font-bold text-[#0b2140]">{user.completedTasks}/{user.assignedTasks}</div><div className="mt-1 text-[10px] text-[#8b989f]">{t.completedReviews}</div></td><td className="px-3 py-4 text-[11px] text-[#73828b]">{formatDate(user.lastActivityAt, lang)}</td><td className="px-3 py-4 text-end"><div className="flex justify-end gap-2"><Button size="sm" variant="outline" onClick={() => openEdit(user)} className="border-[#dfe8e9] text-xs text-[#0b2140] hover:border-[#12897f] hover:text-[#12897f]"><Pencil className="me-1.5 h-3.5 w-3.5" />{t.editUser}</Button><Button size="sm" variant="outline" onClick={() => requestDelete(user)} disabled={deleteMutation.isPending || currentUser?.id === user.id} className="border-[#f1d6d3] text-xs text-[#b94a48] hover:border-[#b94a48] hover:text-[#b94a48]"><Trash2 className="me-1.5 h-3.5 w-3.5" />{t.deleteUser}</Button><Button size="sm" variant="outline" disabled={resetMutation.isPending || user.trialAttempts === 0} onClick={() => { if (window.confirm(t.resetConfirm)) resetMutation.mutate({ userId: user.id }); }} className="border-[#dfe8e9] text-xs text-[#0b2140] hover:border-[#12897f] hover:text-[#12897f]"><RefreshCcw className="me-1.5 h-3.5 w-3.5" />{t.reset}</Button><select aria-label={`${t.manageRole}: ${user.name || user.email || user.id}`} disabled={roleMutation.isPending} value={user.role} onChange={(event) => handleRoleChange(user, event.target.value as UserRole)} className="h-8 rounded-lg border border-[#dfe8e9] bg-white px-2 text-[11px] font-semibold text-[#344651] outline-none focus:border-[#12897f]"><option value="user">{t.user}</option><option value="admin">{t.admin}</option></select></div></td></tr>)}</tbody></table></div>
      <div className="space-y-3 md:hidden">{filteredUsers.map((user) => <article key={user.id} className="rounded-2xl border border-[#edf1f2] bg-[#fbfcfc] p-4"><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eaf0f7] text-xs font-bold text-[#0b2140]">{initials(user)}</div><div className="min-w-0"><div className="truncate text-sm font-bold text-[#0b2140]">{user.name || t.unnamedUser}</div><div className="mt-1 truncate text-[10px] text-[#8b989f]">{user.email || t.noEmail}</div></div></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${user.role === "admin" ? "bg-[#fff7df] text-[#8d6a08]" : "bg-[#eaf0f7] text-[#315273]"}`}>{user.role === "admin" ? t.admin : t.user}</span></div><div className="mt-4 grid grid-cols-2 gap-3 text-xs"><div className="rounded-xl bg-white p-3"><div className="text-[10px] text-[#8b989f]">{t.trialUsage}</div><div className="mt-1 font-mono font-bold text-[#0b2140]">{user.trialAttempts}/{user.trialLimit}</div><div className="mt-2"><TrialBar user={user} remainingLabel={t.remaining} /></div></div><div className="rounded-xl bg-white p-3"><div className="text-[10px] text-[#8b989f]">{t.evaluations}</div><div className="mt-1 font-mono text-lg font-bold text-[#0b2140]">{user.evaluations}</div><div className="mt-1 text-[10px] text-[#8b989f]">{user.completedTasks}/{user.assignedTasks} {t.completedReviews}</div></div></div><div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[10px] text-[#8b989f]"><span>{t.lastActive}: {formatDate(user.lastActivityAt, lang)}</span><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => openEdit(user)} className="border-[#dfe8e9] text-[11px] text-[#0b2140]"><Pencil className="me-1.5 h-3.5 w-3.5" />{t.editUser}</Button><Button size="sm" variant="outline" onClick={() => requestDelete(user)} disabled={deleteMutation.isPending || currentUser?.id === user.id} className="border-[#f1d6d3] text-[11px] text-[#b94a48]"><Trash2 className="me-1.5 h-3.5 w-3.5" />{t.deleteUser}</Button><Button size="sm" variant="outline" disabled={resetMutation.isPending || user.trialAttempts === 0} onClick={() => { if (window.confirm(t.resetConfirm)) resetMutation.mutate({ userId: user.id }); }} className="border-[#dfe8e9] text-[11px] text-[#0b2140]"><RefreshCcw className="me-1.5 h-3.5 w-3.5" />{t.reset}</Button><select aria-label={`${t.manageRole}: ${user.name || user.email || user.id}`} disabled={roleMutation.isPending} value={user.role} onChange={(event) => handleRoleChange(user, event.target.value as UserRole)} className="h-8 rounded-lg border border-[#dfe8e9] bg-white px-2 text-[11px] font-semibold text-[#344651] outline-none focus:border-[#12897f]"><option value="user">{t.user}</option><option value="admin">{t.admin}</option></select></div></div></article>)}</div>
      {filteredUsers.length === 0 && <div className="py-14 text-center text-xs text-[#8b989f]"><UsersRound className="mx-auto mb-3 h-8 w-8 text-[#c9a227]" /><p className="font-semibold text-[#344651]">{t.noUsers}</p><p className="mt-1">{t.noUsersDesc}</p></div>}
    </section>
    <UserEditorDialog open={editorOpen} user={editingUser} pending={createMutation.isPending || updateMutation.isPending} lang={lang} t={t} onOpenChange={setEditorOpen} onSubmit={saveUser} />
    <DeleteUserDialog open={Boolean(deletingUser)} user={deletingUser} pending={deleteMutation.isPending} lang={lang} t={t} onOpenChange={(open) => { if (!open) setDeletingUser(null); }} onConfirm={confirmDelete} />
  </div></div>;
}
