import { createFileRoute, Outlet, redirect, Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Bell, BellRing, Eye, History as HistoryIcon, Lock, MessageSquare, MessagesSquare, Users, Settings, LogOut } from "lucide-react";
import { useChatMode } from "@/lib/use-chat-mode";
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
import { HelpDialog } from "@/components/help-dialog";

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
  const { messages, chatMessages, friendRequests, browserAlertsEnabled, enableBrowserAlerts } = useActivity();
  const { mode: chatMode, setMode: setChatMode } = useChatMode();
  const activityCount = messages.length + chatMessages.length;
  const requestCount = friendRequests.length;

  return (
    <div className="min-h-screen bg-background pb-[calc(5.75rem+env(safe-area-inset-bottom))] text-foreground lg:p-6 lg:pb-6">
      <div className="lg:grid lg:min-h-[calc(100vh-3rem)] lg:grid-cols-[5rem_minmax(0,1fr)] lg:overflow-hidden lg:rounded-xl lg:border lg:border-border lg:bg-card lg:shadow-2xl">
      <header className="border-b border-border lg:border-b-0 lg:border-r">
        <div className="mx-auto grid max-w-5xl grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-4 py-3 lg:flex lg:h-full lg:flex-col lg:px-3 lg:py-6">
          <Link to="/app" className="flex min-w-0 items-center gap-2 text-sm font-mono">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Lock className="h-5 w-5" /></span>
            <span className="truncate lg:hidden">Right2Privacy</span>
          </Link>
          <nav className="hidden shrink-0 items-center gap-1 text-sm lg:mt-10 lg:flex lg:flex-1 lg:flex-col lg:gap-3">
            <NavLink to="/app" label={t("nav_messages")} badge={activityCount} icon={<MessageSquare className="h-4 w-4" />} />
            <NavLink to="/friends" label={t("nav_friends")} badge={requestCount} icon={<Users className="h-4 w-4" />} />
            <NavLink to="/settings" label={t("nav_settings")} icon={<Settings className="h-4 w-4" />} />
            <div className="mt-auto flex flex-col gap-2">
            <HelpDialog />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => void setChatMode(chatMode === "chat" ? "legacy" : "chat")}
              title={`${t("chat_mode_title")}: ${chatMode === "chat" ? t("chat_mode_chat") : t("chat_mode_legacy")}`}
              aria-label={`${t("chat_mode_title")}: ${chatMode === "chat" ? t("chat_mode_chat") : t("chat_mode_legacy")}`}
              className={`h-10 w-10 rounded-lg ${chatMode === "chat" ? "text-primary" : "text-muted-foreground"}`}
            >
              {chatMode === "chat" ? <MessagesSquare className="h-4 w-4" /> : <HistoryIcon className="h-4 w-4" />}
            </Button>
            <Link
              to="/watchlist"
              title={t("nav_watchlist")}
              aria-label={t("nav_watchlist")}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <Eye className="h-4 w-4" />
            </Link>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={enableBrowserAlerts}
              title={browserAlertsEnabled ? t("notifications_enabled") : t("notifications_enable")}
              aria-label={browserAlertsEnabled ? t("notifications_enabled") : t("notifications_enable")}
              className="h-10 w-10 rounded-lg text-muted-foreground"
            >
              {browserAlertsEnabled ? <BellRing /> : <Bell />}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onSignOut}
              className="h-10 w-10 rounded-lg text-muted-foreground"
              title={t("nav_signout")}
              aria-label={t("nav_signout")}
            >
              <LogOut className="h-4 w-4" />
            </Button>
            </div>
          </nav>
        </div>
      </header>
      <div className="min-w-0"><Outlet /></div>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[calc(0.5rem+env(safe-area-inset-bottom))] lg:hidden" aria-label="Mobile navigation">
        <div className="grid h-[4.5rem] grid-cols-3 items-stretch rounded-[1.35rem] border border-border bg-card/95 p-1 shadow-2xl backdrop-blur-xl">
          <MobileNavLink to="/app" label={t("nav_messages")} badge={activityCount} icon={<MessageSquare />} />
          <MobileNavLink to="/friends" label={t("nav_friends")} badge={requestCount} icon={<Users />} />
          <MobileNavLink to="/settings" label={t("nav_settings")} icon={<Settings />} />
        </div>
      </nav>
    </div>
  );
}

function MobileNavLink({
  to,
  label,
  icon,
  badge = 0,
}: {
  to: "/app" | "/friends" | "/settings";
  label: string;
  icon: React.ReactNode;
  badge?: number;
}) {
  return (
    <Link
      to={to}
      aria-label={label}
      className="relative flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[10px] font-medium text-muted-foreground transition-colors"
      activeProps={{ className: "relative flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl bg-accent px-1 text-[10px] font-semibold text-primary" }}
    >
      <span className="relative [&_svg]:h-5 [&_svg]:w-5">
        {icon}
        {badge > 0 && (
          <span className="absolute -right-3 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold leading-none text-primary-foreground">
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </span>
      <span className="w-full truncate text-center">{label}</span>
    </Link>
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
      className="relative flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
      activeProps={{ className: "relative flex h-11 w-11 items-center justify-center rounded-lg bg-accent text-primary" }}
    >
      {icon}
      {badge > 0 && (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </Link>
  );
}