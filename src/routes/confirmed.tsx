import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { initProfile, getMyProfile } from "@/lib/friends.functions";
import {
  generateRsaKeypair,
  exportPublicKey,
  encryptPrivateKeyForBackup,
} from "@/lib/crypto";
import { savePrivateKey } from "@/lib/keystore";
import { SUPPORTED_CODES } from "@/i18n/languages";

export const Route = createFileRoute("/confirmed")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Email confirmed — Right2Privacy" },
      {
        name: "description",
        content:
          "Your Right2Privacy email address is confirmed. Finish setting up your encryption keys.",
      },
      { property: "og:title", content: "Email confirmed — Right2Privacy" },
      {
        property: "og:description",
        content: "Your Right2Privacy email address is confirmed.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ConfirmedPage,
});

function ConfirmedPage() {
  const navigate = useNavigate();
  const getProfile = useServerFn(getMyProfile);
  const init = useServerFn(initProfile);

  const [phase, setPhase] = useState<"checking" | "setup" | "nosession">("checking");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Supabase parses the confirmation link (hash tokens or ?code=) on load.
      for (let i = 0; i < 20 && !cancelled; i++) {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          try {
            const profile = await getProfile();
            if (cancelled) return;
            if (profile) {
              navigate({ to: "/app" });
              return;
            }
          } catch {
            /* ignore */
          }
          if (!cancelled) setPhase("setup");
          return;
        }
        await new Promise((r) => setTimeout(r, 250));
      }
      if (!cancelled) setPhase("nosession");
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate, getProfile]);

  async function onFinish(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) throw new Error("Session expired. Please sign in again.");
      const meta = (user.user_metadata ?? {}) as { handle?: string; language?: string };
      const handle = meta.handle;
      if (!handle || !/^[a-zA-Z0-9_]{3,32}$/.test(handle)) {
        throw new Error("Missing username on this account. Please sign in instead.");
      }
      if (password.length < 8) throw new Error("Password must be at least 8 characters.");

      setStatus("Generating your encryption keys…");
      const kp = await generateRsaKeypair();
      const publicKey = await exportPublicKey(kp.publicKey);
      const backup = await encryptPrivateKeyForBackup(kp.privateKey, password);
      setStatus("Saving your account…");
      await init({
        data: {
          handle,
          public_key: publicKey,
          ...backup,
          language:
            meta.language && SUPPORTED_CODES.includes(meta.language) ? meta.language : "en",
        },
      });
      await savePrivateKey(user.id, kp.privateKey);
      navigate({ to: "/app" });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus(null);
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

        {phase === "checking" && (
          <p className="text-sm text-muted-foreground">Confirming your email…</p>
        )}

        {phase === "nosession" && (
          <>
            <h1 className="text-2xl font-semibold">Link expired</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              This confirmation link is no longer valid. Sign in to continue.
            </p>
            <Link
              to="/auth"
              className="mt-6 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Sign in
            </Link>
          </>
        )}

        {phase === "setup" && (
          <>
            <h1 className="text-2xl font-semibold">Email confirmed</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              You're signed in. Enter your password once so we can generate your encryption keys —
              they never leave your device unencrypted.
            </p>
            <form onSubmit={onFinish} className="mt-6 space-y-4">
              <label className="block">
                <div className="mb-1 text-sm font-medium">Password</div>
                <input
                  type="password"
                  value={password}
                  onChange={(ev) => setPassword(ev.target.value)}
                  required
                  minLength={8}
                  autoComplete="current-password"
                  className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm outline-none focus:border-ring"
                />
              </label>
              {error && (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground">
                  {error}
                </div>
              )}
              {status && !error && (
                <div className="text-sm text-muted-foreground">{status}</div>
              )}
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                {busy ? "Working…" : "Finish setup"}
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}