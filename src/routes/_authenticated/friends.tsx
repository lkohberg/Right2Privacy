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
import { Check, X, UserPlus, Inbox, Send, Users, Trash2 } from "lucide-react";
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

function initials(handle: string) {
  return handle.slice(0, 2).toUpperCase();
}

function Avatar({ handle }: { handle: string }) {
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
      {initials(handle)}
    </div>
  );
}

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
      const clean = handle.trim().toLowerCase().replace(/^@/, "");
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
    <main className="mx-auto max-w-3xl px-5 py-7 lg:px-8 lg:py-9">
      <header>
        <h1 className="text-xl font-semibold tracking-tight lg:text-2xl">
          {t("friends_title")}
        </h1>
        <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted-foreground">
          {t("friends_intro")}
        </p>
      </header>

      <form
        onSubmit={onAdd}
        className="mt-5 rounded-2xl border border-border bg-card p-4 shadow-sm lg:p-5"
      >
        <div className="flex items-center gap-2">
          <div className="relative flex min-w-0 flex-1 items-center">
            <span className="pointer-events-none absolute left-3 text-sm text-muted-foreground">
              @
            </span>
            <input
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              placeholder={t("friends_handle_ph")}
              aria-label={t("friends_add")}
              className="r2p-input h-11 w-full pl-7 font-mono"
            />
          </div>
          <Button
            disabled={busy || handle.trim().length === 0}
            className="h-11 shrink-0 gap-2 rounded-xl px-4"
          >
            <UserPlus className="h-4 w-4" />
            <span className="hidden sm:inline">{t("friends_add")}</span>
          </Button>
        </div>
        {msg && (
          <div className="mt-3 rounded-lg bg-accent px-3 py-2 text-sm text-foreground">
            {msg}
          </div>
        )}
      </form>

      <Section
        icon={<Inbox className="h-4 w-4" />}
        title={t("friends_incoming")}
        count={incoming.length}
        empty={incoming.length === 0 ? t("friends_none") : undefined}
      >
        {incoming.map((r) => (
          <Row key={r.friendship_id}>
            <Avatar handle={r.other.handle} />
            <div className="min-w-0 flex-1">
              <div className="truncate font-mono text-sm font-medium">
                @{r.other.handle}
              </div>
              <div className="mt-0.5 truncate text-xs text-muted-foreground">
                {t("friends_request_from", { handle: r.other.handle })}
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button
                type="button"
                size="sm"
                className="h-9 gap-1.5 rounded-lg"
                onClick={async () => {
                  await respondFn({
                    data: { friendship_id: r.friendship_id, accept: true },
                  });
                  await refreshLists();
                }}
              >
                <Check className="h-4 w-4" />
                <span className="hidden sm:inline">{t("friends_accept")}</span>
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-9 gap-1.5 rounded-lg"
                onClick={async () => {
                  await respondFn({
                    data: { friendship_id: r.friendship_id, accept: false },
                  });
                  await refreshLists();
                }}
              >
                <X className="h-4 w-4" />
                <span className="hidden sm:inline">{t("friends_decline")}</span>
              </Button>
            </div>
          </Row>
        ))}
      </Section>

      <Section
        icon={<Send className="h-4 w-4" />}
        title={t("friends_outgoing")}
        count={outgoing.length}
        empty={outgoing.length === 0 ? t("friends_none") : undefined}
      >
        {outgoing.map((r) => (
          <Row key={r.friendship_id}>
            <Avatar handle={r.other.handle} />
            <div className="min-w-0 flex-1">
              <div className="truncate font-mono text-sm font-medium text-muted-foreground">
                @{r.other.handle}
              </div>
              <div className="mt-0.5 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                {t("friends_waiting")}
              </div>
            </div>
            <IconBtn
              title={t("friends_decline")}
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

      <Section
        icon={<Users className="h-4 w-4" />}
        title={t("friends_list")}
        count={accepted.length}
        empty={accepted.length === 0 ? t("friends_none_yet") : undefined}
      >
        {accepted.map((r) => (
          <Row key={r.friendship_id}>
            <Avatar handle={r.other.handle} />
            <div className="min-w-0 flex-1">
              <div className="truncate font-mono text-sm font-medium">
                @{r.other.handle}
              </div>
            </div>
            <IconBtn
              title={t("friends_confirm_unfriend", { handle: r.other.handle })}
              onClick={async () => {
                if (!confirm(t("friends_confirm_unfriend", { handle: r.other.handle })))
                  return;
                await unfriendFn({ data: { friendship_id: r.friendship_id } });
                qc.invalidateQueries({ queryKey: ["friends"] });
              }}
            >
              <Trash2 className="h-4 w-4" />
            </IconBtn>
          </Row>
        ))}
      </Section>

      <style>{`
        .r2p-input {
          background: var(--color-input);
          color: var(--color-foreground);
          border: 1px solid var(--color-border);
          border-radius: 0.75rem;
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
  icon,
  title,
  count,
  empty,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  empty?: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="mt-6 lg:mt-8">
      <div className="flex items-center gap-2 px-1">
        <span className="text-muted-foreground">{icon}</span>
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
        {count > 0 && (
          <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">
            {count}
          </span>
        )}
      </div>
      <div className="mt-2 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {empty ? (
          <div className="px-4 py-6 text-center text-sm text-muted-foreground">
            {empty}
          </div>
        ) : (
          <div className="divide-y divide-border">{children}</div>
        )}
      </div>
    </section>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-3 py-3 transition-colors hover:bg-accent/40 lg:px-4">
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
      className="h-9 w-9 shrink-0 rounded-lg text-muted-foreground hover:text-foreground"
    >
      {children}
    </Button>
  );
}
