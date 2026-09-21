import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import "@/i18n";
import { Lock } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password — Right2Privacy" },
      { name: "description", content: "Set a new password for your Right2Privacy account." },
      { property: "og:title", content: "Reset password — Right2Privacy" },
      { property: "og:description", content: "Set a new password for your Right2Privacy account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Supabase parses the recovery hash and emits PASSWORD_RECOVERY on load.
  useEffect(() => {
    let cancelled = false;
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (cancelled) return;
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!cancelled && data.session) setReady(true);
    })();
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError(t("auth_err_password"));
      return;
    }
    if (password !== confirm) {
      setError(t("reset_err_mismatch"));
      return;
    }
    setBusy(true);
    try {
      const { error: uErr } = await supabase.auth.updateUser({ password });
      if (uErr) throw uErr;
      // Sign out so the user must sign in with the new password.
      await supabase.auth.signOut();
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-md px-6 py-16">
        <Link
          to="/"
          className="mb-8 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <Lock className="h-4 w-4" /> Right2Privacy
        </Link>
        <h1 className="text-2xl font-semibold">{t("reset_title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("brand_tagline")}</p>

        <div className="mt-6 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
          <p className="font-medium">{t("reset_warning_title")}</p>
          <p className="mt-1 text-muted-foreground">{t("reset_warning_body")}</p>
        </div>

        {done ? (
          <div className="mt-6 space-y-4">
            <div className="rounded-md border border-border bg-accent/40 px-4 py-3 text-sm">
              <p className="font-medium">{t("reset_done_title")}</p>
              <p className="mt-1 text-muted-foreground">{t("reset_done_body")}</p>
            </div>
            <button
              onClick={() => navigate({ to: "/auth", search: { mode: "signin" } })}
              className="w-full rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground hover:opacity-90"
            >
              {t("auth_signin")}
            </button>
          </div>
        ) : !ready ? (
          <p className="mt-6 text-sm text-muted-foreground">{t("reset_waiting")}</p>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <label className="block">
              <div className="mb-1 text-sm font-medium">{t("reset_new_password")}</div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="input"
                autoComplete="new-password"
              />
            </label>
            <label className="block">
              <div className="mb-1 text-sm font-medium">{t("reset_confirm_password")}</div>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={8}
                className="input"
                autoComplete="new-password"
              />
            </label>
            {error && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {busy ? t("auth_working") : t("reset_submit")}
            </button>
          </form>
        )}
      </div>

      <style>{`
        .input {
          width: 100%;
          background: var(--color-input);
          color: var(--color-foreground);
          border: 1px solid var(--color-border);
          border-radius: 0.375rem;
          padding: 0.5rem 0.75rem;
          font-size: 0.9rem;
          outline: none;
        }
        .input:focus { border-color: var(--color-ring); }
      `}</style>
    </main>
  );
}