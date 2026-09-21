import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import "@/i18n";
import {
  listFriends,
  searchByHandle,
  sendFriendRequest,
  respondFriendRequest,
  unfriend,
} from "@/lib/friends.functions";
import { Check, X, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useActivity } from "@/components/activity-provider";

export const Route = createFileRoute("/_authenticated/friends")({
  head: () => ({
    meta: [
      { title: "Friends — Right2Privacy" },
      { name: "description", content: "Manage your Right2Privacy friends." },
      { property: "og:title", content: "Friends — Right2Privacy" },
      { property: "og:description", content: "Manage your Right2Privacy friends." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FriendsPage,
});

function FriendsPage() {
  const { t } = useTranslation();
  const listFn = useServerFn(listFriends);
  const searchFn = useServerFn(searchByHandle);
  const sendFn = useServerFn(sendFriendRequest);
  const respondFn = useServerFn(respondFriendRequest);
  const unfriendFn = useServerFn(unfriend);
  const qc = useQueryClient();
  const activity = useActivity();

  const q = useQuery({ queryKey: ["friends"], queryFn: () => listFn() });

  const [handle, setHandle] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setBusy(true);
    try {
      const clean = handle.trim().toLowerCase();
      if (!/^[a-zA-Z0-9_]{3,32}$/.test(clean)) throw new Error(t("friends_err_invalid"));
      const found = await searchFn({ data: { handle: clean } });
      if (!found) throw new Error(t("friends_err_no_user"));
      const res = await sendFn({ data: { addressee_id: found.id } });
      setMsg(
        res.autoAccepted
          ? t("friends_now_friends", { handle: found.handle })
          : t("friends_request_sent", { handle: found.handle }),
      );
      setHandle("");
      qc.invalidateQueries({ queryKey: ["friends"] });
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const rows = q.data ?? [];
  const incoming = rows.filter(
    (r) => r.status === "pending" && r.direction === "incoming",
  );
  const outgoing = rows.filter(
    (r) => r.status === "pending" && r.direction === "outgoing",
  );
  const accepted = rows.filter((r) => r.status === "accepted");

  async function refreshLists() {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["friends"] }),
      activity.refresh(),
    ]);
  }

  return (
    <main className="mx-auto max-w-2xl px-5 py-8 sm:px-6">
      <h1 className="text-lg font-semibold sm:text-xl">{t("friends_title")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {t("friends_intro")}
      </p>

      <form onSubmit={onAdd} className="mt-5 flex gap-2 sm:mt-6">
        <input
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          placeholder={t("friends_handle_ph")}
          className="r2p-input min-w-0 flex-1"
        />
        <Button
          disabled={busy}
          className="shrink-0 px-3 sm:px-4"
          aria-label={t("friends_add")}
        >
          <UserPlus className="h-4 w-4" /> <span className="hidden sm:inline">{t("friends_add")}</span>
        </Button>
      </form>
      {msg && <div className="mt-2 text-sm text-muted-foreground">{msg}</div>}

      <Section title={t("friends_incoming")} hint={incoming.length === 0 ? t("friends_none") : undefined}>
        {incoming.map((r) => (
          <Row key={r.friendship_id}>
            <div className="min-w-0">
              <div className="truncate font-mono font-medium">@{r.other.handle}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">{t("friends_request_from", { handle: r.other.handle })}</div>
            </div>
            <div className="flex gap-1">
              <IconBtn
                title={t("friends_accept")}
                onClick={async () => {
                  await respondFn({
                    data: { friendship_id: r.friendship_id, accept: true },
                  });
                  await refreshLists();
                }}
              >
                <Check className="h-4 w-4" />
              </IconBtn>
              <IconBtn
                title={t("friends_decline")}
                onClick={async () => {
                  await respondFn({
                    data: { friendship_id: r.friendship_id, accept: false },
                  });
                  await refreshLists();
                }}
              >
                <X className="h-4 w-4" />
              </IconBtn>
            </div>
          </Row>
        ))}
      </Section>

      <Section title={t("friends_outgoing")} hint={outgoing.length === 0 ? t("friends_none") : undefined}>
        {outgoing.map((r) => (
          <Row key={r.friendship_id}>
            <span className="text-muted-foreground">@{r.other.handle} · {t("friends_waiting")}</span>
            <IconBtn
              title={t("friends_none")}
              onClick={async () => {
                await unfriendFn({ data: { friendship_id: r.friendship_id } });
                qc.invalidateQueries({ queryKey: ["friends"] });
              }}
            >
              <X className="h-4 w-4" />
            </IconBtn>
          </Row>
        ))}
      </Section>

      <Section title={t("friends_list")} hint={accepted.length === 0 ? t("friends_none_yet") : undefined}>
        {accepted.map((r) => (
          <Row key={r.friendship_id}>
            <span>@{r.other.handle}</span>
            <IconBtn
              title={t("friends_none")}
              onClick={async () => {
                if (!confirm(t("friends_confirm_unfriend", { handle: r.other.handle }))) return;
                await unfriendFn({ data: { friendship_id: r.friendship_id } });
                qc.invalidateQueries({ queryKey: ["friends"] });
              }}
            >
              <X className="h-4 w-4" />
            </IconBtn>
          </Row>
        ))}
      </Section>

      <style>{`
        .r2p-input {
          background: var(--color-input);
          color: var(--color-foreground);
          border: 1px solid var(--color-border);
          border-radius: 0.375rem;
          padding: 0.5rem 0.75rem;
          font-size: 0.9rem;
          outline: none;
        }
        .r2p-input:focus { border-color: var(--color-ring); }
      `}</style>
    </main>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mt-6 sm:mt-8">
      <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      <div className="mt-2 divide-y divide-border rounded-md border border-border bg-card">
        {hint ? (
          <div className="px-4 py-3 text-sm text-muted-foreground">{hint}</div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 px-3 py-2.5 text-sm sm:px-4 sm:py-3">
      {children}
    </div>
  );
}

function IconBtn({
  onClick,
  title,
  children,
}: {
  onClick: () => void | Promise<void>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={onClick}
      title={title}
      aria-label={title}
      className="h-8 w-8 border border-border"
    >
      {children}
    </Button>
  );
}