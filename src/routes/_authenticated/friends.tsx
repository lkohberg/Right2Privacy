import { createFileRoute, Link } from "@tanstack/react-router";
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
import {
  Check,
  X,
  UserPlus,
  Inbox,
  Send,
  Users,
  Trash2,
  MessageSquare,
  Clock,
} from "lucide-react";
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

type FriendRow = {
  friendship_id: string;
  status: string;
  direction: string;
  other: { handle: string };
};

function initials(handle: string) {
  return handle.slice(0, 2).toUpperCase();
}

function Avatar({ handle, large }: { handle: string; large?: boolean }) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary ${
        large ? "h-12 w-12 text-sm" : "h-10 w-10 text-xs"
      }`}
    >
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

  const rows: FriendRow[] = q.data ?? [];
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

  const addForm = (
    <form onSubmit={onAdd}>
      <div className="flex items-center gap-2">
        <div className="flex min-w-0 flex-1 items-center">
          <input
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            placeholder={t("friends_handle_ph")}
            aria-label={t("friends_add")}
            className="r2p-input h-12 w-full px-4 font-mono"
          />
        </div>
        <Button
          disabled={busy || handle.trim().length === 0}
          className="h-12 shrink-0 gap-2 rounded-2xl px-5"
        >
          <UserPlus className="h-4 w-4" />
          <span className="hidden sm:inline">{t("friends_add")}</span>
        </Button>
      </div>
      {msg && (
        <div className="mt-3 rounded-xl bg-accent px-3.5 py-2.5 text-sm text-foreground">
          {msg}
        </div>
      )}
    </form>
  );

  const requestsBlock = (
    <>
      {incoming.length > 0 && (
        <section aria-label={t("friends_incoming")}>
          <div className="flex items-center gap-2 px-1">
            <Inbox className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold tracking-tight">
              {t("friends_incoming")}
            </h2>
            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">
              {incoming.length}
            </span>
          </div>
          <div className="mt-3 space-y-3">
            {incoming.map((r) => (
              <div
                key={r.friendship_id}
                className="rounded-2xl border border-primary/25 bg-primary/[0.06] p-4 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <Avatar handle={r.other.handle} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-mono text-sm font-medium">
                      @{r.other.handle}
                    </div>
                    <div className="mt-0.5 truncate text-xs text-muted-foreground">
                      {t("friends_request_from", { handle: r.other.handle })}
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    className="h-9 flex-1 gap-1.5 rounded-xl"
                    onClick={async () => {
                      await respondFn({
                        data: { friendship_id: r.friendship_id, accept: true },
                      });
                      await refreshLists();
                    }}
                  >
                    <Check className="h-4 w-4" />
                    {t("friends_accept")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-9 flex-1 gap-1.5 rounded-xl"
                    onClick={async () => {
                      await respondFn({
                        data: { friendship_id: r.friendship_id, accept: false },
                      });
                      await refreshLists();
                    }}
                  >
                    <X className="h-4 w-4" />
                    {t("friends_decline")}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {outgoing.length > 0 && (
        <section aria-label={t("friends_outgoing")} className="mt-8">
          <div className="flex items-center gap-2 px-1">
            <Send className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold tracking-tight">
              {t("friends_outgoing")}
            </h2>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
              {outgoing.length}
            </span>
          </div>
          <div className="mt-3 space-y-2">
            {outgoing.map((r) => (
              <div
                key={r.friendship_id}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-sm"
              >
                <Avatar handle={r.other.handle} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-mono text-sm font-medium text-muted-foreground">
                    @{r.other.handle}
                  </div>
                  <div className="mt-0.5 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
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
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );

  const friendsBlock = (
    <section aria-label={t("friends_list")}>
      <div className="flex items-center gap-2 px-1">
        <Users className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold tracking-tight">{t("friends_list")}</h2>
        {accepted.length > 0 && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
            {accepted.length}
          </span>
        )}
      </div>

      {accepted.length === 0 ? (
        <div className="mt-3 flex flex-col items-center rounded-2xl border border-dashed border-border px-6 py-12 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <p className="mt-4 text-sm font-medium">{t("friends_none_yet")}</p>
          <p className="mt-1.5 max-w-xs text-xs leading-relaxed text-muted-foreground">
            {t("friends_intro")}
          </p>
        </div>
      ) : (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {accepted.map((r) => (
            <div
              key={r.friendship_id}
              className="group rounded-2xl border border-border bg-card p-4 shadow-sm transition-colors hover:border-primary/30"
            >
              <div className="flex items-center gap-3">
                <Avatar handle={r.other.handle} large />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-mono text-sm font-semibold">
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
              </div>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="mt-3.5 h-9 w-full gap-1.5 rounded-xl"
              >
                <Link to="/app">
                  <MessageSquare className="h-4 w-4" />
                  {t("nav_messages")}
                </Link>
              </Button>
            </div>
          ))}
        </div>
      )}
    </section>
  );

  return (
    <main className="mx-auto max-w-5xl px-5 py-7 lg:px-10 lg:py-10">
      <header className="max-w-xl">
        <h1 className="text-xl font-semibold tracking-tight lg:text-2xl">
          {t("friends_title")}
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          {t("friends_intro")}
        </p>
      </header>

      {/* Phone & tablet: single column, add bar first */}
      <div className="mt-6 space-y-8 lg:hidden">
        {addForm}
        {requestsBlock}
        {friendsBlock}
      </div>

      {/* Desktop: requests rail on the left, friends grid on the right */}
      <div className="mt-8 hidden gap-10 lg:grid lg:grid-cols-[20rem_minmax(0,1fr)]">
        <aside className="space-y-8">
          {addForm}
          {requestsBlock}
        </aside>
        <div>{friendsBlock}</div>
      </div>

      <style>{`
        .r2p-input {
          background: var(--color-input);
          color: var(--color-foreground);
          border: 1px solid var(--color-border);
          border-radius: 1rem;
          padding: 0.5rem 0.75rem;
          font-size: 0.9rem;
          outline: none;
        }
        .r2p-input:focus { border-color: var(--color-ring); }
      `}</style>
    </main>
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
      className="h-9 w-9 shrink-0 rounded-xl text-muted-foreground hover:text-foreground"
    >
      {children}
    </Button>
  );
}
