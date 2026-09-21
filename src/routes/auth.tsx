import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import "@/i18n";
import { initProfile, getMyProfile, regenerateKeys } from "@/lib/friends.functions";
import {
  generateRsaKeypair,
  exportPublicKey,
  encryptPrivateKeyForBackup,
  decryptPrivateKeyFromBackup,
} from "@/lib/crypto";
import { savePrivateKey, loadPrivateKey } from "@/lib/keystore";
import { Lock } from "lucide-react";
import { SUPPORTED_CODES } from "@/i18n/languages";
import { siteUrl } from "@/lib/site";

type Mode = "signin" | "signup" | "forgot";

const searchSchema = z.object({
  mode: z.enum(["signin", "signup", "forgot"]).optional().default("signin"),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Sign in — Right2Privacy" },
      {
        name: "description",
        content: "Sign in or create a Right2Privacy account.",
      },
      { property: "og:title", content: "Sign in — Right2Privacy" },
      { property: "og:description", content: "Sign in or create a Right2Privacy account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { mode } = Route.useSearch();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [tab, setTab] = useState<Mode>(mode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [handle, setHandle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [verifySent, setVerifySent] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [needsRekey, setNeedsRekey] = useState(false);

  const init = useServerFn(initProfile);
  const getProfile = useServerFn(getMyProfile);
  const rekey = useServerFn(regenerateKeys);

  useEffect(() => {
    setTab(mode);
    setError(null);
    setStatus(null);
    setVerifySent(false);
    setResetSent(false);
    setNeedsRekey(false);
  }, [mode]);

  // If already signed in with a profile, jump to app.
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      try {
        const profile = await getProfile();
        if (profile) navigate({ to: "/app" });
      } catch {
        /* ignore */
      }
    })();
  }, [navigate, getProfile]);

  async function onSignUp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (!/^[a-zA-Z0-9_]{3,32}$/.test(handle)) {
        throw new Error(t("auth_err_handle"));
      }
      if (password.length < 8) throw new Error(t("auth_err_password"));

      setStatus(t("auth_creating"));
      const currentLng = SUPPORTED_CODES.includes(i18n.language) ? i18n.language : "en";
      const { error: sErr } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: siteUrl("/confirmed"),
          data: { handle: handle.toLowerCase(), language: currentLng },
        },
      });
      if (sErr) throw sErr;
      setStatus(null);
      setVerifySent(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setStatus(null);
    } finally {
      setBusy(false);
    }
  }

  async function onSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNeedsRekey(false);
    setBusy(true);
    try {
      setStatus(t("auth_signing_in"));
      const { data, error: sErr } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (sErr) {
        const code = (sErr as { code?: string }).code ?? "";
        if (
          code === "email_not_confirmed" ||
          /confirm/i.test(sErr.message)
        ) {
          setStatus(null);
          setError(t("auth_err_not_confirmed"));
          return;
        }
        throw sErr;
      }
      const user = data.user;
      if (!user) throw new Error("No user.");
      const userId = user.id;

      const profile = await getProfile();
      if (profile?.language && SUPPORTED_CODES.includes(profile.language)) {
        void i18n.changeLanguage(profile.language);
      }

      // First sign-in after verification: no profile yet — create it.
      if (!profile) {
        const meta = (user.user_metadata ?? {}) as {
          handle?: string;
          language?: string;
        };
        const metaHandle = meta.handle;
        if (!metaHandle || !/^[a-zA-Z0-9_]{3,32}$/.test(metaHandle)) {
          throw new Error(t("auth_err_handle"));
        }
        setStatus(t("auth_generating"));
        const kp = await generateRsaKeypair();
        const publicKey = await exportPublicKey(kp.publicKey);
        const backup = await encryptPrivateKeyForBackup(kp.privateKey, password);
        setStatus(t("auth_saving"));
        await init({
          data: {
            handle: metaHandle,
            public_key: publicKey,
            ...backup,
            language:
              meta.language && SUPPORTED_CODES.includes(meta.language)
                ? meta.language
                : "en",
          },
        });
        await savePrivateKey(userId, kp.privateKey);
        navigate({ to: "/app" });
        return;
      }

      // Existing profile — restore key from backup if missing locally.
      const existing = await loadPrivateKey(userId);
      if (!existing) {
        setStatus(t("auth_restoring"));
        try {
          const priv = await decryptPrivateKeyFromBackup(
            profile.encrypted_private_key,
            profile.pk_salt,
            profile.pk_iv,
            password,
          );
          await savePrivateKey(userId, priv);
        } catch {
          // Password no longer matches the backup (likely after reset).
          setStatus(null);
          setNeedsRekey(true);
          setError(t("auth_err_wrong_pw_reset"));
          return;
        }
      }
      navigate({ to: "/app" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setStatus(null);
    } finally {
      setBusy(false);
    }
  }

  async function onForgot(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const { error: rErr } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: siteUrl("/reset-password"),
      });
      if (rErr) throw rErr;
      setResetSent(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  async function onResend() {
    setError(null);
    setBusy(true);
    try {
      const { error: rErr } = await supabase.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: siteUrl("/confirmed") },
      });
      if (rErr) throw rErr;
      setStatus(t("auth_verify_resent"));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  async function onRegenerateKeys() {
    setError(null);
    setBusy(true);
    try {
      const { data } = await supabase.auth.getUser();
      const userId = data.user?.id;
      if (!userId) throw new Error(t("auth_err_not_signed_in"));
      setStatus(t("auth_generating"));
      const kp = await generateRsaKeypair();
      const publicKey = await exportPublicKey(kp.publicKey);
      const backup = await encryptPrivateKeyForBackup(kp.privateKey, password);
      setStatus(t("auth_saving"));
      await rekey({
        data: { public_key: publicKey, ...backup },
      });
      await savePrivateKey(userId, kp.privateKey);
      navigate({ to: "/app" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setStatus(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-md px-6 py-16">
        <Link to="/" className="mb-8 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <Lock className="h-4 w-4" /> Right2Privacy
        </Link>
        <h1 className="text-2xl font-semibold">
          {tab === "signup"
            ? t("auth_create_account")
            : tab === "forgot"
              ? t("auth_forgot_title")
              : t("auth_signin")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("brand_tagline")}
        </p>

        {tab !== "forgot" && (
          <div className="mt-6 flex gap-1 rounded-md border border-border p-1 text-sm">
            <button
              onClick={() => setTab("signin")}
              className={`flex-1 rounded-sm px-3 py-1.5 ${tab === "signin" ? "bg-accent" : ""}`}
            >
              {t("auth_signin")}
            </button>
            <button
              onClick={() => setTab("signup")}
              className={`flex-1 rounded-sm px-3 py-1.5 ${tab === "signup" ? "bg-accent" : ""}`}
            >
              {t("auth_signup")}
            </button>
          </div>
        )}

        {tab === "signup" && verifySent ? (
          <div className="mt-6 space-y-4">
            <div className="rounded-md border border-border bg-accent/40 px-4 py-3 text-sm">
              <p className="font-medium">{t("auth_verify_sent_title")}</p>
              <p className="mt-1 text-muted-foreground">
                {t("auth_verify_sent_body", { email })}
              </p>
            </div>
            {status && (
              <div className="text-sm text-muted-foreground">{status}</div>
            )}
            {error && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground">
                {error}
              </div>
            )}
            <button
              type="button"
              onClick={onResend}
              disabled={busy}
              className="w-full rounded-md border border-border px-4 py-2 text-sm hover:bg-accent disabled:opacity-50"
            >
              {busy ? t("auth_working") : t("auth_verify_resend")}
            </button>
            <button
              type="button"
              onClick={() => {
                setVerifySent(false);
                setTab("signin");
              }}
              className="w-full text-sm text-muted-foreground hover:text-foreground"
            >
              {t("auth_back_to_signin")}
            </button>
          </div>
        ) : tab === "forgot" && resetSent ? (
          <div className="mt-6 space-y-4">
            <div className="rounded-md border border-border bg-accent/40 px-4 py-3 text-sm">
              <p className="font-medium">{t("auth_reset_sent_title")}</p>
              <p className="mt-1 text-muted-foreground">
                {t("auth_reset_sent_body", { email })}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setResetSent(false);
                setTab("signin");
              }}
              className="w-full text-sm text-muted-foreground hover:text-foreground"
            >
              {t("auth_back_to_signin")}
            </button>
          </div>
        ) : (
          <form
            onSubmit={
              tab === "signup"
                ? onSignUp
                : tab === "forgot"
                  ? onForgot
                  : onSignIn
            }
            className="mt-6 space-y-4"
          >
            {tab === "signup" && (
              <Field label={t("auth_handle")} hint={t("auth_handle_hint")}>
                <input
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  required
                  minLength={3}
                  maxLength={32}
                  pattern="[a-zA-Z0-9_]+"
                  className="input"
                  placeholder={t("auth_handle_ph")}
                />
              </Field>
            )}
            <Field label={t("auth_email")}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="input"
                autoComplete="email"
              />
            </Field>
            {tab !== "forgot" && (
              <Field
                label={t("auth_password")}
                hint={tab === "signup" ? t("auth_password_hint") : undefined}
              >
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="input"
                  autoComplete={tab === "signup" ? "new-password" : "current-password"}
                />
              </Field>
            )}

            {error && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground">
                {error}
              </div>
            )}
            {status && !error && (
              <div className="text-sm text-muted-foreground">{status}</div>
            )}

            {needsRekey && (
              <button
                type="button"
                onClick={onRegenerateKeys}
                disabled={busy}
                className="w-full rounded-md border border-border px-4 py-2 text-sm hover:bg-accent disabled:opacity-50"
              >
                {t("auth_regenerate_keys_btn")}
              </button>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {busy
                ? t("auth_working")
                : tab === "signup"
                  ? t("auth_create_btn")
                  : tab === "forgot"
                    ? t("auth_send_reset")
                    : t("auth_signin")}
            </button>

            {tab === "signin" && (
              <button
                type="button"
                onClick={() => setTab("forgot")}
                className="w-full text-sm text-muted-foreground hover:text-foreground"
              >
                {t("auth_forgot_link")}
              </button>
            )}
            {tab === "forgot" && (
              <button
                type="button"
                onClick={() => setTab("signin")}
                className="w-full text-sm text-muted-foreground hover:text-foreground"
              >
                {t("auth_back_to_signin")}
              </button>
            )}
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

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1 text-sm font-medium">{label}</div>
      {children}
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </label>
  );
}