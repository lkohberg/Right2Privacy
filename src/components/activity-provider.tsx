import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";

import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { MessageSquare, X } from "lucide-react";
import { getActivity } from "@/lib/activity.functions";
import { Button } from "@/components/ui/button";

export type ActivityMessage = {
  id: string;
  message_id: string;
  sender_id: string;
  created_at: string;
  handle: string;
};

type ActivityValue = {
  messages: ActivityMessage[];
  friendRequests: Array<{
    id: string;
    requester_id: string;
    created_at: string;
    handle: string;
  }>;
  isLoading: boolean;
  refresh: () => Promise<void>;
  browserAlertsEnabled: boolean;
  enableBrowserAlerts: () => Promise<void>;
};

const fallbackActivity: ActivityValue = {
  messages: [],
  friendRequests: [],
  isLoading: false,
  refresh: async () => {},
  browserAlertsEnabled: false,
  enableBrowserAlerts: async () => {},
};

const ActivityContext = createContext<ActivityValue | null>(null);

export function ActivityProvider({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const router = useRouter();

  const getActivityFn = useServerFn(getActivity);
  const queryClient = useQueryClient();
  const seenRef = useRef<Set<string> | null>(null);
  const [browserAlerts, setBrowserAlerts] = useState(false);
  const query = useQuery({
    queryKey: ["activity"],
    queryFn: () => getActivityFn(),
    refetchInterval: 20_000,
    refetchIntervalInBackground: true,
  });

  useEffect(() => {
    setBrowserAlerts(localStorage.getItem("r2p-browser-alerts") === "enabled");
  }, []);

  useEffect(() => {
    if (!query.data) return;
    const ids = new Set([
      ...query.data.messages.map((item) => `message:${item.id}`),
      ...query.data.friendRequests.map((item) => `friend:${item.id}`),
    ]);
    if (seenRef.current === null) {
      seenRef.current = ids;
      return;
    }
    const newMessages = query.data.messages.filter(
      (item) => !seenRef.current?.has(`message:${item.id}`),
    );
    const newRequests = query.data.friendRequests.filter(
      (item) => !seenRef.current?.has(`friend:${item.id}`),
    );

    for (const item of newMessages) {
      const body = t("activity_key_waiting", { handle: item.handle });
      const open = () =>
        router.navigate({
          to: "/app",
          search: { contact: item.sender_id, mode: "decrypt" as const },
        });
      toast.custom(
        (toastId) => (
          <div className="flex w-[min(24rem,calc(100vw-2rem))] items-center gap-3 rounded-xl border border-border bg-background/95 p-3 text-foreground shadow-2xl backdrop-blur-xl">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
              <MessageSquare className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-primary">{t("activity_title")}</p>
              <p className="mt-0.5 truncate text-sm font-semibold">@{item.handle}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{body}</p>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                toast.dismiss(toastId);
                void open();
              }}
              className="shrink-0 rounded-full px-3"
            >
              {t("app_decrypt")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => toast.dismiss(toastId)}
              aria-label={t("activity_dismiss")}
              className="h-8 w-8 shrink-0 rounded-full"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ),
        { duration: 6000 },
      );
      if (browserAlerts && Notification.permission === "granted") {
        const notification = new Notification("Right2Privacy", {
          body,
          tag: `message:${item.id}`,
        });
        notification.onclick = () => {
          window.focus();
          void open();
        };
      }
    }

    for (const item of newRequests) {
      const body = t("friends_request_from", { handle: item.handle });
      toast(body);
      if (browserAlerts && Notification.permission === "granted") {
        new Notification("Right2Privacy", { body, tag: `friend:${item.id}` });
      }
    }
    seenRef.current = ids;
  }, [browserAlerts, query.data, t]);

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["activity"] });
  }

  async function enableBrowserAlerts() {
    if (!("Notification" in window)) {
      toast.error(t("notifications_unsupported"));
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      localStorage.setItem("r2p-browser-alerts", "enabled");
      setBrowserAlerts(true);
      toast.success(t("notifications_enabled"));
      return;
    }
    setBrowserAlerts(false);
    toast.error(t("notifications_denied"));
  }

  return (
    <ActivityContext.Provider
      value={{
        messages: query.data?.messages ?? [],
        friendRequests: query.data?.friendRequests ?? [],
        isLoading: query.isLoading,
        refresh,
        browserAlertsEnabled: browserAlerts,
        enableBrowserAlerts,
      }}
    >
      {children}
    </ActivityContext.Provider>
  );
}

export function useActivity() {
  return useContext(ActivityContext) ?? fallbackActivity;
}