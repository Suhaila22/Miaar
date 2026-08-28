import React, { useState } from "react";
import { Clock3, Mail, Send } from "lucide-react";

type TrialGateProps = {
  title: string;
  description: string;
  contactLabel: string;
  contactHref: string;
  dir?: "ltr" | "rtl";
  formTitle?: string;
  nameLabel?: string;
  emailLabel?: string;
  reasonLabel?: string;
  namePlaceholder?: string;
  emailPlaceholder?: string;
  reasonPlaceholder?: string;
  submitLabel?: string;
  requiredMessage?: string;
  sentMessage?: string;
};

export function TrialGate({
  title,
  description,
  contactLabel,
  contactHref,
  dir = "ltr",
  formTitle = "Request a trial extension",
  nameLabel = "Name",
  emailLabel = "Email",
  reasonLabel = "Reason for extension",
  namePlaceholder = "Enter your name",
  emailPlaceholder = "name@example.com",
  reasonPlaceholder = "Tell us why you need additional attempts...",
  submitLabel = "Send extension request",
  requiredMessage = "Please complete the required fields.",
  sentMessage = "Your request is ready in your email client.",
}: TrialGateProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState<"idle" | "sent" | "invalid">("idle");

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim() || !email.trim() || !reason.trim()) {
      setStatus("invalid");
      return;
    }

    const recipient = contactHref.replace(/^mailto:/, "").split("?")[0];
    const subject = encodeURIComponent(`${title} — ${name.trim()}`);
    const body = encodeURIComponent(`${nameLabel}: ${name.trim()}\n${emailLabel}: ${email.trim()}\n\n${reasonLabel}:\n${reason.trim()}`);
    window.location.href = `mailto:${recipient}?subject=${subject}&body=${body}`;
    setStatus("sent");
  };

  return (
    <div dir={dir} className="mt-6 space-y-4 rounded-2xl border border-[#f2e5bd] bg-[#fffaf0] p-5 text-center">
      <div className="flex items-center justify-center gap-2 text-sm font-bold text-[#8a6d14]">
        <Clock3 className="h-5 w-5" />
        <span>{title}</span>
      </div>
      <p className="text-xs leading-6 text-[#62717c]">{description}</p>
      <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-3 rounded-2xl border border-[#f2e5bd] bg-white/75 p-4 text-start">
        <div className="flex items-center gap-2 text-xs font-bold text-[#0b2140]"><Mail className="h-4 w-4 text-[#12897f]" />{formTitle}</div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1.5 text-xs font-semibold text-[#344651]">
            <span>{nameLabel}</span>
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder={namePlaceholder} className="h-10 w-full rounded-xl border border-[#dfe8e9] bg-white px-3 text-sm font-normal outline-none transition focus:border-[#12897f] focus:ring-2 focus:ring-[#12897f]/15" />
          </label>
          <label className="space-y-1.5 text-xs font-semibold text-[#344651]">
            <span>{emailLabel}</span>
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder={emailPlaceholder} className="h-10 w-full rounded-xl border border-[#dfe8e9] bg-white px-3 text-sm font-normal outline-none transition focus:border-[#12897f] focus:ring-2 focus:ring-[#12897f]/15" />
          </label>
        </div>
        <label className="block space-y-1.5 text-xs font-semibold text-[#344651]">
          <span>{reasonLabel}</span>
          <textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder={reasonPlaceholder} rows={3} className="w-full resize-none rounded-xl border border-[#dfe8e9] bg-white px-3 py-2 text-sm font-normal leading-6 outline-none transition focus:border-[#12897f] focus:ring-2 focus:ring-[#12897f]/15" />
        </label>
        {status === "invalid" && <p className="text-xs font-semibold text-[#b94a48]" role="alert">{requiredMessage}</p>}
        {status === "sent" && <p className="text-xs font-semibold text-[#12897f]" role="status">{sentMessage}</p>}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
          <button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-[#0b2140] px-5 py-3 text-xs font-bold text-white transition hover:bg-[#16305a] focus:outline-none focus:ring-2 focus:ring-[#c9a227]">
            <Send className="h-3.5 w-3.5 text-[#c9a227]" />
            {submitLabel}
          </button>
          <a href={contactHref} className="inline-flex items-center gap-2 rounded-xl border border-[#0b2140] px-5 py-3 text-xs font-bold text-[#0b2140] transition hover:bg-[#0b2140] hover:text-white">
            {contactLabel}
          </a>
        </div>
      </form>
    </div>
  );
}
