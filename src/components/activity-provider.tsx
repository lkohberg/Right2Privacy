import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";

import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { History, MessageSquare, UserPlus, X } from "lucide-react";
import { getActivity } from "@/lib/activity.functions";
import { Button } from "@/components/ui/button";

export type ActivityMessage = {
  id: string;
  message_id: string;
  sender_id: string;
  created_at: string;
  handle: string;
};

export type ChatActivityMessage = {
  id: string;
  sender_id: string;
  created_at: string;
  handle: string;
};

type ActivityValue = {
  messages: ActivityMessage[];
  chatMessages: ChatActivityMessage[];
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
  chatMessages: [],
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
      ...query.data.messages.map((item) => `legacy:${item.id}`),
      ...query.data.chatMessages.map((item) => `chat:${item.id}`),
      ...query.data.friendRequests.map((item) => `friend:${item.id}`),
    ]);
    if (seenRef.current === null) {
      seenRef.current = ids;
      return;
    }
    const newLegacyMessages = query.data.messages.filter(
      (item) => !seenRef.current?.has(`legacy:${item.id}`),
    );
    const newChatMessages = query.data.chatMessages.filter(
      (item) => !seenRef.current?.has(`chat:${item.id}`),
    );
    const newRequests = query.data.friendRequests.filter(
      (item) => !seenRef.current?.has(`friend:${item.id}`),
    );

    const showMessageAlert = (
      item: ActivityMessage | ChatActivityMessage,
      kind: "chat" | "legacy",
    ) => {
      const isChat = kind === "chat";
      const title = t(isChat ? "notification_chat_title" : "notification_legacy_title");
      const body = t(isChat ? "notification_chat_body" : "notification_legacy_body", {
        handle: item.handle,
      });
      const open = () =>
        router.navigate({
          to: "/app",
          search: isChat
            ? { contact: item.sender_id }
            : { contact: item.sender_id, mode: "decrypt" as const },
        });
      toast.custom(
        (toastId) => (
          <div className="flex w-[min(24rem,calc(100vw-2rem))] items-center gap-3 rounded-xl border border-border bg-background/95 p-3 text-foreground shadow-2xl backdrop-blur-xl">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
              {isChat ? <MessageSquare className="h-5 w-5" /> : <History className="h-5 w-5" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-primary">{title}</p>
              <p className="mt-0.5 truncate text-sm font-semibold">@{item.handle}</p>
              <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{body}</p>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                toast.dismiss(toastId);
                void open();
              }}
              className="shrink-0 rounded-full px-3 text-xs"
            >
              {t(isChat ? "notification_chat_action" : "notification_legacy_action")}
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
          tag: `${kind}:${item.id}`,
        });
        notification.onclick = () => {
          window.focus();
          void open();
        };
      }
    };

    for (const item of newChatMessages) showMessageAlert(item, "chat");
    for (const item of newLegacyMessages) showMessageAlert(item, "legacy");

    for (const item of newRequests) {
      const body = t("friends_request_from", { handle: item.handle });
      const open = () => router.navigate({ to: "/friends" });
      toast.custom(
        (toastId) => (
          <div className="flex w-[min(24rem,calc(100vw-2rem))] items-center gap-3 rounded-xl border border-border bg-background/95 p-3 text-foreground shadow-2xl backdrop-blur-xl">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary"><UserPlus className="h-5 w-5" /></span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-primary">{t("notification_friend_title")}</p>
              <p className="mt-0.5 truncate text-sm font-semibold">@{item.handle}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{body}</p>
            </div>
            <Button type="button" size="sm" className="shrink-0 rounded-full px-3 text-xs" onClick={() => { toast.dismiss(toastId); void open(); }}>{t("notification_friend_action")}</Button>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0 rounded-full" aria-label={t("activity_dismiss")} onClick={() => toast.dismiss(toastId)}><X className="h-4 w-4" /></Button>
          </div>
        ),
        { duration: 6000 },
      );
      if (browserAlerts && Notification.permission === "granted") {
        const notification = new Notification(t("notification_friend_title"), { body, tag: `friend:${item.id}` });
        notification.onclick = () => { window.focus(); void open(); };
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
        chatMessages: query.data?.chatMessages ?? [],
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