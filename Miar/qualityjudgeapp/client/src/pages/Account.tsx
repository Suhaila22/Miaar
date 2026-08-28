import React, { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, LockKeyhole, Mail, ShieldCheck, UserRound } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLang } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function Account() {
  const { lang, t } = useLang();
  const { user, logout } = useAuth({ redirectOnUnauthenticated: true });
  const [, setLocation] = useLocation();
  const [name, setName] = useState(user?.name ?? "");
  const [error, setError] = useState("");
  const utils = trpc.useUtils();
  const profileMutation = trpc.auth.updateProfile.useMutation({
    onSuccess: (result) => {
      utils.auth.me.setData(undefined, result.user);
      setName(result.user.name ?? "");
      setError("");
      toast.success(t.profileUpdated);
    },
    onError: (mutationError) => setError(mutationError.message || t.profileUpdateFailure),
  });

  useEffect(() => {
    setName(user?.name ?? "");
  }, [user?.name]);

  const saveProfile = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextName = name.trim();
    if (nextName.length < 2) {
      setError(t.profileNameRequired);
      return;
    }
    profileMutation.mutate({ name: nextName });
  };

  if (!user) return null;

  const roleLabel = user.role === "admin" ? t.admin : t.user;
  const DirectionIcon = lang === "ar" ? ArrowLeft : ArrowRight;

  return (
    <div dir={lang === "ar" ? "rtl" : "ltr"} className="min-h-screen bg-[#f4f7f8] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-5">
        <section className="relative overflow-hidden rounded-[2rem] bg-[#0b2140] p-6 text-white shadow-[0_22px_55px_rgba(11,33,64,.14)] sm:p-8">
          <div className="absolute -end-20 -top-24 h-64 w-64 rounded-full bg-[#12897f]/20 blur-3xl" />
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#b9d5d1]"><UserRound className="h-4 w-4" />{t.accountEyebrow}</div>
              <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{t.accountTitle}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-white/70">{t.accountDesc}</p>
            </div>
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#c9a227] text-2xl font-black text-[#0b2140]">{(user.name || user.email || "م").charAt(0).toUpperCase()}</div>
          </div>
        </section>

        <div className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
          <section className="rounded-3xl border border-[#dfe8e9] bg-white p-5 shadow-[0_14px_35px_rgba(11,33,64,.05)] sm:p-7">
            <div className="mb-6 flex items-start justify-between gap-4"><div><h2 className="text-lg font-bold text-[#0b2140]">{t.profileDetails}</h2><p className="mt-1 text-xs leading-6 text-[#8b989f]">{t.accountDesc}</p></div><div className="rounded-xl bg-[#e4f3f1] p-2.5 text-[#12897f]"><CheckCircle2 className="h-5 w-5" /></div></div>
            <form onSubmit={saveProfile} className="space-y-5">
              <div><label htmlFor="account-profile-name" className="mb-2 block text-xs font-bold text-[#344651]">{t.profileName}</label><input id="account-profile-name" value={name} onChange={(event) => setName(event.target.value)} className="h-12 w-full rounded-xl border border-[#dfe8e9] bg-[#fbfcfc] px-4 text-sm text-[#0b2140] outline-none transition focus:border-[#12897f] focus:ring-2 focus:ring-[#12897f]/10" /></div>
              <div><label htmlFor="account-profile-email" className="mb-2 block text-xs font-bold text-[#344651]">{t.profileEmail}</label><div className="relative"><Mail className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8b989f]" /><input id="account-profile-email" value={user.email ?? ""} readOnly className="h-12 w-full cursor-not-allowed rounded-xl border border-[#dfe8e9] bg-[#f1f4f5] px-4 ps-11 text-sm text-[#73828b] outline-none" /></div><p className="mt-2 text-[11px] leading-5 text-[#8b989f]">{t.oauthManagedAccount}</p></div>
              <div><label htmlFor="account-profile-role" className="mb-2 block text-xs font-bold text-[#344651]">{t.profileRole}</label><div className="relative"><ShieldCheck className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#c9a227]" /><input id="account-profile-role" value={roleLabel} readOnly className="h-12 w-full cursor-not-allowed rounded-xl border border-[#dfe8e9] bg-[#f1f4f5] px-4 ps-11 text-sm font-bold text-[#344651] outline-none" /></div></div>
              {error && <p role="alert" className="rounded-xl bg-[#fff1ef] px-4 py-3 text-xs font-semibold text-[#b94a48]">{error}</p>}
              <Button type="submit" disabled={profileMutation.isPending} className="h-11 w-full rounded-xl bg-[#12897f] text-white hover:bg-[#0e756d]">{t.saveProfile}</Button>
            </form>
          </section>

          <div className="space-y-5">
            <section className="rounded-3xl border border-[#dfe8e9] bg-white p-5 shadow-[0_14px_35px_rgba(11,33,64,.05)] sm:p-7"><div className="flex items-start gap-3"><div className="rounded-xl bg-[#fff7df] p-2.5 text-[#a47b0c]"><LockKeyhole className="h-5 w-5" /></div><div><h2 className="font-bold text-[#0b2140]">{t.accountSecurityTitle ?? t.oauthManagedAccount}</h2><p className="mt-2 text-xs leading-6 text-[#73828b]">{t.accountSecurityDesc ?? t.oauthManagedAccount}</p></div></div><div className="mt-5 rounded-2xl bg-[#f7faf9] p-4 text-xs leading-6 text-[#52636b]">{t.oauthAccountHint}</div></section>
            <section className="rounded-3xl border border-[#f2e5bd] bg-[#fffaf0] p-5 sm:p-7"><h2 className="font-bold text-[#6e570d]">{t.accountDeleteTitle ?? t.deleteUser}</h2><p className="mt-2 text-xs leading-6 text-[#806d35]">{t.accountDeleteAdminOnly}</p>{user.role === "admin" && <Button type="button" variant="outline" onClick={() => setLocation("/users")} className="mt-5 w-full border-[#d7bd64] bg-transparent text-[#6e570d] hover:bg-[#fff4ca]"><DirectionIcon className="me-2 h-4 w-4" />{t.userManagementTitle}</Button>}</section>
            <Button type="button" variant="outline" onClick={() => void logout()} className="h-11 w-full rounded-xl border-[#f1d6d3] bg-white text-[#b94a48] hover:border-[#b94a48] hover:bg-[#fff8f7]"><span>{t.signOut}</span></Button>
          </div>
        </div>
      </div>
    </div>
  );
}
