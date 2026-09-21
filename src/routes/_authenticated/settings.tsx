import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getMyProfile, updateLanguage } from "@/lib/friends.functions";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { clearPrivateKey, loadPrivateKey } from "@/lib/keystore";
import { useTranslation } from "react-i18next";
import "@/i18n";
import { LANGUAGES, SUPPORTED_CODES } from "@/i18n/languages";
import { Bell, BellRing, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useActivity } from "@/components/activity-provider";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Right2Privacy" },
      { name: "description", content: "Your Right2Privacy account." },
      { property: "og:title", content: "Settings — Right2Privacy" },
      { property: "og:description", content: "Your Right2Privacy account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { browserAlertsEnabled, enableBrowserAlerts } = useActivity();
  const getProfile = useServerFn(getMyProfile);
  const setLangFn = useServerFn(updateLanguage);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["profile"], queryFn: () => getProfile() });
  const [email, setEmail] = useState<string | null>(null);
  const [hasLocalKey, setHasLocalKey] = useState<boolean | null>(null);
  const [savingLng, setSavingLng] = useState<string | null>(null);
  const [savedLng, setSavedLng] = useState(false);
  const [langError, setLangError] = useState<string | null>(null);
  const [selectedLng, setSelectedLng] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setEmail(data.user?.email ?? null);
      if (data.user) {
        const k = await loadPrivateKey(data.user.id);
        setHasLocalKey(!!k);
      }
    })();
  }, []);

  async function onChangeLanguage(code: string) {
    if (!SUPPORTED_CODES.includes(code)) return;
    setSelectedLng(code); // optimistic — dropdown reflects choice immediately
    setSavingLng(code);
    setSavedLng(false);
    setLangError(null);
    // Change UI language immediately so all strings update while we save.
    await i18n.changeLanguage(code);
    try {
      await setLangFn({ data: { language: code } });
      await qc.invalidateQueries({ queryKey: ["profile"] });
      setSavedLng(true);
      setTimeout(() => setSavedLng(false), 1500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setLangError(msg);
    } finally {
      setSavingLng(null);
    }
  }

  const currentLng =
    selectedLng ?? q.data?.language ?? i18n.language ?? "en";

  async function signOut() {
    const { data } = await supabase.auth.getUser();
    if (data.user?.id) await clearPrivateKey(data.user.id).catch(() => {});
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  return (
    <main className="mx-auto max-w-2xl px-5 py-8 lg:px-6">
      <h1 className="text-lg font-semibold lg:text-xl">{t("settings_title")}</h1>
      <div className="mt-5 space-y-3 lg:mt-6 lg:space-y-4">
        <Card title={t("settings_account")}>
          <Row label={t("settings_email")}>{email ?? "—"}</Row>
          <Row label={t("settings_handle")}>
            {q.data ? <span className="font-mono">@{q.data.handle}</span> : "—"}
          </Row>
          <div className="grid gap-2 border-t border-border p-3 lg:hidden">
            <Button type="button" variant="ghost" onClick={enableBrowserAlerts} className="h-11 justify-start gap-3 px-3">
              {browserAlertsEnabled ? <BellRing className="h-5 w-5 text-primary" /> : <Bell className="h-5 w-5" />}
              {browserAlertsEnabled ? t("notifications_enabled") : t("notifications_enable")}
            </Button>
            <Button type="button" variant="ghost" onClick={signOut} className="h-11 justify-start gap-3 px-3 text-destructive hover:text-destructive">
              <LogOut className="h-5 w-5" />
              {t("nav_signout")}
            </Button>
          </div>
        </Card>

        <Card title={t("settings_language")}>
          <div className="px-4 py-3">
            <select
              value={currentLng}
              onChange={(e) => onChangeLanguage(e.target.value)}
              disabled={savingLng !== null}
              className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm"
              style={{
                background: "var(--color-input)",
                color: "var(--color-foreground)",
              }}
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.nativeName} — {l.englishName}
                </option>
              ))}
            </select>
            <div className="mt-2 min-h-[1.25rem] text-xs text-muted-foreground">
              {savingLng
                ? t("settings_saving")
                : savedLng
                  ? t("settings_saved")
                  : ""}
            </div>
            {langError && (
              <div className="mt-1 text-xs text-destructive">{langError}</div>
            )}
          </div>
        </Card>

        <Card title={t("settings_encryption")}>
          <Row label={t("settings_priv_local")}>
            {hasLocalKey === null
              ? "…"
              : hasLocalKey
                ? t("settings_present")
                : t("settings_missing")}
          </Row>
          <Row label={t("settings_backup")}>
            {q.data?.encrypted_private_key
              ? t("settings_present")
              : t("settings_missing")}
          </Row>
          <p className="px-4 pb-4 text-xs text-muted-foreground">
            {t("settings_priv_note")}
          </p>
        </Card>
      </div>
    </main>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-border bg-card">
      <div className="border-b border-border px-4 py-2 text-xs uppercase tracking-wide text-muted-foreground">
        {title}
      </div>
      {children}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm lg:px-4 lg:py-3">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate text-right">{children}</span>
    </div>
  );
}