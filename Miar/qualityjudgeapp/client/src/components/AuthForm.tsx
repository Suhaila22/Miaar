import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { TRPCClientError } from "@trpc/client";
import { translations, type Lang } from "@shared/i18n";

type Mode = "signin" | "signup";

export function AuthForm({ lang }: { lang: Lang }) {
  const t = translations[lang];
  const utils = trpc.useUtils();
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: data => utils.auth.me.setData(undefined, data.user),
  });
  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: data => utils.auth.me.setData(undefined, data.user),
  });

  const pending = registerMutation.isPending || loginMutation.isPending;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      if (mode === "signup") {
        await registerMutation.mutateAsync({ name, email, password });
      } else {
        await loginMutation.mutateAsync({ email, password });
      }
    } catch (err) {
      const message =
        err instanceof TRPCClientError ? err.message : t.authGenericError;
      setError(message || t.authGenericError);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 text-start">
      {mode === "signup" && (
        <div>
          <Label htmlFor="auth-name" className="mb-1.5 block text-xs font-semibold text-[#344651]">
            {t.fullNameLabel}
          </Label>
          <Input
            id="auth-name"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            minLength={2}
            autoComplete="name"
            className="h-12 rounded-xl"
          />
        </div>
      )}
      <div>
        <Label htmlFor="auth-email" className="mb-1.5 block text-xs font-semibold text-[#344651]">
          {t.emailLabel}
        </Label>
        <Input
          id="auth-email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          autoComplete="email"
          className="h-12 rounded-xl"
        />
      </div>
      <div>
        <Label htmlFor="auth-password" className="mb-1.5 block text-xs font-semibold text-[#344651]">
          {t.passwordLabel}
        </Label>
        <Input
          id="auth-password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          minLength={mode === "signup" ? 8 : 1}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          className="h-12 rounded-xl"
        />
      </div>

      {error && <p className="text-xs font-medium text-red-600">{error}</p>}

      <Button
        type="submit"
        disabled={pending}
        className="h-12 w-full rounded-xl bg-[#0b2140] text-sm font-semibold hover:bg-[#16305a]"
      >
        {mode === "signup" ? t.authSubmitCreateAccount : t.authSubmitSignIn}
      </Button>

      <button
        type="button"
        onClick={() => {
          setError(null);
          setMode(mode === "signup" ? "signin" : "signup");
        }}
        className="w-full text-center text-xs font-semibold text-[#806318] hover:underline"
      >
        {mode === "signup" ? t.authSwitchToSignIn : t.authSwitchToSignUp}
      </button>
    </form>
  );
}
