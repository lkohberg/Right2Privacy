import { createFileRoute, Outlet, redirect, Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Bell, BellRing, Lock, Users, Settings, LogOut } from "lucide-react";
import { clearPrivateKey } from "@/lib/keystore";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import "@/i18n";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getMyProfile } from "@/lib/friends.functions";
import { SUPPORTED_CODES } from "@/i18n/languages";
import { ActivityProvider, useActivity } from "@/components/activity-provider";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  const navigate = useNavigate();
  const { user } = Route.useRouteContext();
  const { t, i18n } = useTranslation();

  const getProfile = useServerFn(getMyProfile);
  const profileQ = useQuery({
    queryKey: ["profile"],
    queryFn: () => getProfile(),
  });

  // Sync UI language to the saved profile language ONCE per session load.
  // After that, the user's active i18n.language wins so an in-app language
  // switch isn't immediately overwritten by a stale profile refetch.
  const syncedRef = useRef(false);
  useEffect(() => {
    if (syncedRef.current) return;
    const lng = profileQ.data?.language;
    if (lng && SUPPORTED_CODES.includes(lng)) {
      if (i18n.language !== lng) void i18n.changeLanguage(lng);
      syncedRef.current = true;
    }
  }, [profileQ.data?.language, i18n]);

  useEffect(() => {
    document.documentElement.lang = i18n.language || "en";
    const onChange = (l: string) => {
      document.documentElement.lang = l || "en";
    };
    i18n.on("languageChanged", onChange);
    return () => i18n.off("languageChanged", onChange);
  }, [i18n]);

  async function signOut() {
    if (user?.id) await clearPrivateKey(user.id).catch(() => {});
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  return (
    <ActivityProvider>
      <AuthenticatedShell onSignOut={signOut} />
    </ActivityProvider>
  );
}

function AuthenticatedShell({ onSignOut }: { onSignOut: () => Promise<void> }) {
  const { t } = useTranslation();
  const { messages, friendRequests, browserAlertsEnabled, enableBrowserAlerts } = useActivity();
  const activityCount = messages.length;
  const requestCount = friendRequests.length;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-3 sm:px-6">
          <Link to="/app" className="flex min-w-0 items-center gap-2 text-sm font-mono">
            <Lock className="h-4 w-4 shrink-0 text-primary" />
            <span className="truncate">Right2Privacy</span>
          </Link>
          <nav className="flex shrink-0 items-center gap-0.5 text-sm sm:gap-1">
            <NavLink to="/app" label={t("nav_messages")} badge={activityCount} icon={<Lock className="h-4 w-4" />} />
            <NavLink to="/friends" label={t("nav_friends")} badge={requestCount} icon={<Users className="h-4 w-4" />} />
            <NavLink to="/settings" label={t("nav_settings")} icon={<Settings className="h-4 w-4" />} />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={enableBrowserAlerts}
              title={browserAlertsEnabled ? t("notifications_enabled") : t("notifications_enable")}
              aria-label={browserAlertsEnabled ? t("notifications_enabled") : t("notifications_enable")}
              className="h-8 w-8 text-muted-foreground"
            >
              {browserAlertsEnabled ? <BellRing /> : <Bell />}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onSignOut}
              className="h-8 w-8 text-muted-foreground"
              title={t("nav_signout")}
              aria-label={t("nav_signout")}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </nav>
        </div>
      </header>
      <Outlet />
    </div>
  );
}

function NavLink({
  to,
  label,
  icon,
  badge = 0,
}: {
  to: "/app" | "/friends" | "/settings";
  label: string;
  icon?: React.ReactNode;
  badge?: number;
}) {
  return (
    <Link
      to={to}
      title={label}
      aria-label={label}
      className="flex items-center gap-1.5 rounded-md px-2 py-1.5 hover:bg-accent sm:px-3"
      activeProps={{ className: "flex items-center gap-1.5 rounded-md px-2 py-1.5 bg-accent sm:px-3" }}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
      {badge > 0 && (
        <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </Link>
  );
}