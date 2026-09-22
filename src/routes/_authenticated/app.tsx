import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import "@/i18n";
import { listFriends, getMyProfile } from "@/lib/friends.functions";
import { postWrappedKey, fetchWrappedKey, archiveMessageKey, fetchArchivedKey } from "@/lib/keys.functions";
import { encryptMessage, parseBlob, unwrapRawKey, wrapRawKeyFor, decryptWithRawKey } from "@/lib/crypto";
import { loadPrivateKey } from "@/lib/keystore";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, BellOff, Check, ChevronRight, Copy, Lock, MessageCircle, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useActivity } from "@/components/activity-provider";
import { clearContactNotifications } from "@/lib/activity.functions";
import { NewsTicker } from "@/components/news-ticker";
import { ChatPanel } from "@/components/chat-panel";
import { useChatMode } from "@/lib/use-chat-mode";
import { countUnreadMessages } from "@/lib/messages.functions";

export const Route = createFileRoute("/_authenticated/app")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { contact?: string; mode?: "decrypt" } => ({
    ...(typeof search.contact === "string" ? { contact: search.contact } : {}),
    ...(search.mode === "decrypt" ? { mode: "decrypt" as const } : {}),
  }),

  head: () => ({
    meta: [
      { title: "Contacts — Right2Privacy" },
      { name: "description", content: "Encrypt and decrypt messages." },
      { property: "og:title", content: "Contacts — Right2Privacy" },
      { property: "og:description", content: "Encrypt and decrypt messages." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Workspace,
});


type Friend = {
  friendship_id: string;
  status: "pending" | "accepted";
  direction: "incoming" | "outgoing";
  other: { id: string; handle: string; public_key: string };
};

function Workspace() {
  const search = Route.useSearch();
  const [tab, setTab] = useState<"encrypt" | "decrypt">("encrypt");
  const [selectedFriendId, setSelectedFriendId] = useState("");
  const [mobileContactOpen, setMobileContactOpen] = useState(false);
  const [clearingNotifications, setClearingNotifications] = useState(false);

  const { t } = useTranslation();
  const activity = useActivity();
  const listFriendsFn = useServerFn(listFriends);
  const clearContactNotificationsFn = useServerFn(clearContactNotifications);
  const friendsQ = useQuery({
    queryKey: ["friends"],
    queryFn: () => listFriendsFn(),
  });
  const accepted = ((friendsQ.data ?? []) as Friend[]).filter(
    (f) => f.status === "accepted",
  );
  useEffect(() => {
    if (!selectedFriendId && accepted[0]) setSelectedFriendId(accepted[0].other.id);
  }, [accepted, selectedFriendId]);

  const requestedContact = search.contact;
  const requestedMode = search.mode;
  useEffect(() => {
    if (!requestedContact) return;
    setSelectedFriendId(requestedContact);
    setTab(requestedMode === "decrypt" ? "decrypt" : "encrypt");
    setMobileContactOpen(true);
  }, [requestedContact, requestedMode]);


  const { mode: chatMode } = useChatMode();
  const myProfileFn = useServerFn(getMyProfile);
  const myProfileQ = useQuery({ queryKey: ["profile"], queryFn: () => myProfileFn() });
  const unreadFn = useServerFn(countUnreadMessages);
  const unreadQ = useQuery({
    queryKey: ["unread-messages"],
    queryFn: () => unreadFn(),
    enabled: chatMode === "chat",
    refetchInterval: 15000,
  });

  const waitingByFriend =
    chatMode === "chat"
      ? ((unreadQ.data ?? {}) as Record<string, number>)
      : activity.messages.reduce<Record<string, number>>((counts, item) => {
          counts[item.sender_id] = (counts[item.sender_id] ?? 0) + 1;
          return counts;
        }, {});

  function openContact(friendId: string, nextTab: "encrypt" | "decrypt" = "encrypt") {
    setSelectedFriendId(friendId);
    setTab(nextTab);
    setMobileContactOpen(true);
  }

  const selectedFriend = accepted.find((friend) => friend.other.id === selectedFriendId);
  const selectedWaitingCount = waitingByFriend[selectedFriendId] ?? 0;

  async function clearSelectedContactNotifications() {
    if (!selectedFriendId || selectedWaitingCount === 0) return;
    setClearingNotifications(true);
    try {
      await clearContactNotificationsFn({ data: { sender_id: selectedFriendId } });
      await activity.refresh();
      toast.success(t("app_notifications_cleared"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("app_err_generic"));
    } finally {
      setClearingNotifications(false);
    }
  }

  return (
    <main className="h-full px-0 py-0">
      <div className="grid h-full lg:min-h-[calc(100vh-3rem)] lg:grid-cols-[20rem_minmax(0,1fr)]">
        <aside className={`${mobileContactOpen ? "hidden" : "block"} min-w-0 lg:block lg:border-r lg:border-border lg:bg-background/30`}>
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 border-b border-border px-4 pb-4 pt-5 lg:px-6 lg:pb-5 lg:pt-7">
            <div className="min-w-0">
              <p className="mb-1 text-xs font-medium uppercase text-primary lg:hidden">Right2Privacy</p>
              <h1 className="truncate text-2xl font-semibold lg:text-xl">{t("nav_messages")}</h1>
            </div>
            <span className="pb-1 text-sm text-muted-foreground">{accepted.length}</span>
          </div>
          <div className="divide-y divide-border lg:flex lg:flex-col lg:gap-1 lg:divide-y-0 lg:p-3">
            {friendsQ.isLoading && (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground lg:hidden">{t("app_loading_friends")}</div>
            )}
            {!friendsQ.isLoading && accepted.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground lg:hidden">{t("app_no_friends")}</div>
            )}
            {accepted.map((friend) => {
              const count = waitingByFriend[friend.other.id] ?? 0;
              const selected = selectedFriendId === friend.other.id;
              return (
                <Button
                  key={friend.friendship_id}
                  type="button"
                  variant="ghost"
                  onClick={() => openContact(friend.other.id, count > 0 ? "decrypt" : "encrypt")}
                  className={`h-[4.75rem] w-full justify-start rounded-none px-4 font-mono lg:h-[4.25rem] lg:min-w-32 lg:rounded-lg lg:px-3 ${selected ? "lg:border lg:border-border lg:bg-accent lg:text-accent-foreground" : "text-foreground lg:text-muted-foreground"}`}
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold uppercase text-secondary-foreground">
                    {friend.other.handle.slice(0, 2)}
                  </span>
                  <span className="min-w-0 flex-1 text-left">
                    <span className="block truncate text-[15px] font-semibold">@{friend.other.handle}</span>
                    <span className="mt-0.5 block truncate font-sans text-xs font-normal text-muted-foreground">
                      {count > 0 ? t("activity_key_waiting", { handle: friend.other.handle }) : t("app_encrypt")}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    {count > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">{count}</span>
                    )}
                    <ChevronRight className="h-4 w-4 text-muted-foreground lg:hidden" />
                  </span>
                </Button>
              );
            })}
          </div>
        </aside>

        <section key={selectedFriendId || "none"} className={`${mobileContactOpen ? "block" : "hidden"} min-w-0 animate-chat-fade px-4 pb-6 pt-3 motion-reduce:animate-none lg:flex lg:min-h-0 lg:flex-col lg:px-0 lg:pb-0 lg:pt-0`}>
      <div className="mb-4 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 border-b border-border pb-3 lg:hidden">
        <Button type="button" variant="ghost" size="icon" onClick={() => setMobileContactOpen(false)} aria-label={t("nav_messages")} className="rounded-full">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary font-mono text-xs font-semibold uppercase text-secondary-foreground">
            {selectedFriend?.other.handle.slice(0, 2) ?? <MessageCircle className="h-4 w-4" />}
          </span>
          <span className="truncate font-mono text-base font-semibold">{selectedFriend ? `@${selectedFriend.other.handle}` : t("nav_messages")}</span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={!selectedFriend || selectedWaitingCount === 0 || clearingNotifications}
          onClick={() => void clearSelectedContactNotifications()}
          className="h-9 gap-1.5 rounded-full px-3 text-xs"
          title={t("app_clear_notifications")}
        >
          <BellOff className="h-4 w-4" />
          <span>{t("app_clear")}</span>
        </Button>
      </div>
      <div className="hidden h-20 shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-border px-8 lg:grid">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary font-mono text-xs font-semibold uppercase text-secondary-foreground">
            {selectedFriend?.other.handle.slice(0, 2) ?? <MessageCircle className="h-4 w-4" />}
          </span>
          <div className="min-w-0">
            <div className="truncate font-mono text-sm font-semibold">{selectedFriend ? `@${selectedFriend.other.handle}` : t("nav_messages")}</div>
            <div className="mt-1 flex items-center gap-2 text-[10px] font-medium uppercase text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" /> AES-GCM 256
            </div>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!selectedFriend || selectedWaitingCount === 0 || clearingNotifications}
          onClick={() => void clearSelectedContactNotifications()}
          className="gap-2 rounded-full px-4"
          title={t("app_clear_notifications")}
        >
          <BellOff className="h-4 w-4" />
          {t("app_clear")}
        </Button>
      </div>
      <div className={`min-h-0 flex-1 lg:px-8 lg:py-7 ${chatMode === "chat" ? "flex flex-col overflow-hidden" : "overflow-y-auto"}`}>
      <div className={`mx-auto w-full max-w-3xl ${chatMode === "chat" ? "flex min-h-0 flex-1 flex-col" : ""}`}>
      {friendsQ.isLoading ? (
        <div className="text-sm text-muted-foreground">{t("app_loading_friends")}</div>
      ) : accepted.length === 0 ? (
        <div className="rounded-md border border-border bg-card p-6 text-sm text-muted-foreground">
          {t("app_no_friends")}
        </div>
      ) : chatMode === "chat" ? (
        selectedFriend ? (
          <ChatPanel
            key={selectedFriend.other.id}
            contactId={selectedFriend.other.id}
            contactPublicKey={selectedFriend.other.public_key}
            myPublicKey={myProfileQ.data?.public_key ?? null}
          />
        ) : (
          <div className="py-10 text-center text-sm text-muted-foreground">{t("chat_empty")}</div>
        )
      ) : (
        <div className="grid grid-cols-2 grid-rows-[minmax(0,1fr)_auto] items-start gap-4 sm:gap-5 lg:grid-cols-[minmax(0,1fr)_5.25rem] lg:grid-rows-1 lg:gap-6">
          <div className="col-span-2 min-w-0 overflow-hidden lg:col-span-1 lg:col-start-1 lg:row-start-1">
            <div
              role="tabpanel"
              aria-hidden={tab !== "encrypt"}
              hidden={tab !== "encrypt"}
              className="animate-message-slide-from-left motion-reduce:animate-none lg:animate-message-roll-down"
            >
              <EncryptPanel friends={accepted} selectedFriendId={selectedFriendId} />
            </div>
            <div
              role="tabpanel"
              aria-hidden={tab !== "decrypt"}
              hidden={tab !== "decrypt"}
              className="animate-message-slide-from-right motion-reduce:animate-none lg:animate-message-roll-up"
            >
              <DecryptPanel selectedFriendId={selectedFriendId} onActivityConsumed={activity.refresh} />
            </div>
          </div>

          <div
            role="tablist"
            aria-label={`${t("app_encrypt")} / ${t("app_decrypt")}`}
            onKeyDown={(event) => {
              if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
                event.preventDefault();
                setTab("encrypt");
              }
              if (event.key === "ArrowDown" || event.key === "ArrowRight") {
                event.preventDefault();
                setTab("decrypt");
              }
            }}
            className="mode-barrel relative col-span-2 grid grid-cols-2 grid-rows-1 overflow-hidden rounded-xl border border-border bg-card p-1 shadow-lg lg:col-span-1 lg:col-start-2 lg:row-start-1 lg:sticky lg:top-0 lg:grid-cols-1 lg:grid-rows-2"
          >
            <span
              aria-hidden="true"
              className={`mode-barrel-indicator pointer-events-none absolute inset-y-1 left-1 w-[calc(50%-0.375rem)] rounded-lg border border-primary/20 bg-accent shadow-sm motion-reduce:transition-none lg:hidden ${tab === "decrypt" ? "mode-barrel-indicator-right" : "mode-barrel-indicator-left"}`}
            />
            <span
              aria-hidden="true"
              className={`mode-barrel-indicator pointer-events-none absolute inset-x-1 top-1 hidden h-[calc(50%-0.375rem)] rounded-lg border border-primary/20 bg-accent shadow-sm motion-reduce:transition-none lg:block ${tab === "decrypt" ? "mode-barrel-indicator-down" : "mode-barrel-indicator-up"}`}
            />
            <Button
              type="button"
              role="tab"
              aria-selected={tab === "encrypt"}
              variant="ghost"
              onClick={() => setTab("encrypt")}
              className={`mode-barrel-option relative z-10 h-11 min-w-0 flex-row gap-2 rounded-lg px-2 text-xs transition-all duration-300 hover:bg-transparent sm:text-sm lg:h-24 lg:flex-col lg:gap-1 lg:px-0.5 lg:text-[11px] ${tab === "encrypt" ? "mode-barrel-option-active text-primary" : "mode-barrel-option-away text-muted-foreground"}`}
            >
              <Lock className="h-4 w-4 shrink-0" />
              <span className="max-w-full truncate">{t("app_encrypt")}</span>
            </Button>
            <Button
              type="button"
              role="tab"
              aria-selected={tab === "decrypt"}
              variant="ghost"
              onClick={() => setTab("decrypt")}
              className={`mode-barrel-option relative z-10 h-11 min-w-0 flex-row gap-2 rounded-lg px-2 text-xs transition-all duration-300 hover:bg-transparent sm:text-sm lg:h-24 lg:flex-col lg:gap-1 lg:px-0.5 lg:text-[11px] ${tab === "decrypt" ? "mode-barrel-option-active text-primary" : "mode-barrel-option-away text-muted-foreground"}`}
            >
              <Unlock className="h-4 w-4 shrink-0" />
              <span className="max-w-full truncate">{t("app_decrypt")}</span>
            </Button>
          </div>

        </div>
      )}

      <FieldStyles />
      </div>
      </div>
      <div className="hidden lg:block">
        <NewsTicker />
      </div>
        </section>
      </div>
    </main>
  );
}

function EncryptPanel({ friends, selectedFriendId }: { friends: Friend[]; selectedFriendId: string }) {
  const { t } = useTranslation();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [output, setOutput] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const postKey = useServerFn(postWrappedKey);
  const archiveKey = useServerFn(archiveMessageKey);
  const myProfileFn = useServerFn(getMyProfile);

  async function onEncrypt() {
    setError(null);
    setOutput(null);
    setBusy(true);
    try {
      const recipient = friends.find((f) => f.other.id === selectedFriendId);
      if (!recipient) throw new Error(t("app_err_pick_recipient"));
      if (!recipient.other.public_key) throw new Error(t("app_err_missing_key"));
      if (!text.trim()) throw new Error(t("app_err_type"));

      const { blob, wrappedKey, messageId, rawKey } = await encryptMessage(
        text,
        recipient.other.public_key,
      );
      await postKey({
        data: {
          message_id: messageId,
          recipient_id: recipient.other.id,
          wrapped_key: wrappedKey,
        },
      });
      try {
        const me = await myProfileFn();
        if (me?.public_key) {
          await archiveKey({
            data: {
              message_id: messageId,
              counterpart_id: recipient.other.id,
              direction: "sent",
              wrapped_key: await wrapRawKeyFor(rawKey, me.public_key),
            },
          });
        }
      } catch {
        // archiving is best-effort; the message itself is already encrypted
      }
      setOutput(blob);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function copyOut() {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="space-y-5">
      <Field label={t("app_message")}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={7}
          className="r2p-input resize-none lg:min-h-44"
          placeholder={t("app_message_ph")}
        />
      </Field>
      <Button
        onClick={onEncrypt}
        disabled={busy}
        className="h-12 w-full gap-2 rounded-full text-sm font-semibold shadow-lg shadow-primary/20 transition-transform active:scale-[0.98] lg:h-11 lg:w-auto lg:px-7"
      >
        <Lock className="h-4 w-4 shrink-0" />
        {busy ? t("app_encrypting") : t("app_encrypt_btn")}
      </Button>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">
          {error}
        </div>
      )}

      {output && (
        <div className="rounded-md border border-border bg-card p-4">
          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>{t("app_ciphertext")}</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={copyOut}
              className="h-7 gap-1 border border-border px-2"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? t("app_copied") : t("app_copy")}
            </Button>
          </div>
          <div className="max-h-60 overflow-auto font-mono text-xs break-all">
            {output}
          </div>
        </div>
      )}
    </div>
  );
}

function DecryptPanel({ selectedFriendId, onActivityConsumed }: { selectedFriendId: string; onActivityConsumed: () => Promise<void> }) {
  const { t } = useTranslation();
  const [blob, setBlob] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [output, setOutput] = useState<string | null>(null);
  const [fromArchive, setFromArchive] = useState(false);
  const fetchKey = useServerFn(fetchWrappedKey);
  const fetchArchived = useServerFn(fetchArchivedKey);
  const archiveKey = useServerFn(archiveMessageKey);
  const myProfileFn = useServerFn(getMyProfile);

  async function onDecrypt() {
    setError(null);
    setOutput(null);
    setFromArchive(false);
    setBusy(true);
    try {
      const parsed = parseBlob(blob);
      const { data: udata } = await supabase.auth.getUser();
      if (!udata.user) throw new Error(t("app_err_signed_out"));
      const priv = await loadPrivateKey(udata.user.id);
      if (!priv) throw new Error(t("app_err_priv_missing"));

      const archived = await fetchArchived({ data: { message_id: parsed.mid } });
      if (archived) {
        const raw = await unwrapRawKey(archived.wrapped_key, priv);
        setOutput(await decryptWithRawKey(parsed, raw));
        setFromArchive(true);
        return;
      }

      const key = await fetchKey({
        data: { message_id: parsed.mid, sender_id: selectedFriendId },
      });
      if (!key) throw new Error(t("app_err_no_key"));
      const raw = await unwrapRawKey(key.wrapped_key, priv);
      setOutput(await decryptWithRawKey(parsed, raw));
      setFromArchive(false);
      await onActivityConsumed();

      try {
        const me = await myProfileFn();
        if (me?.public_key) {
          await archiveKey({
            data: {
              message_id: parsed.mid,
              counterpart_id: selectedFriendId,
              direction: "received",
              wrapped_key: await wrapRawKeyFor(raw, me.public_key),
            },
          });
        }
      } catch {
        // archiving is best-effort
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <Field label={t("app_ciphertext_input")}>
        <textarea
          value={blob}
          onChange={(e) => setBlob(e.target.value)}
          rows={7}
          className="r2p-input resize-none font-mono text-xs lg:min-h-44"
          placeholder={t("app_ciphertext_ph")}
        />
      </Field>
      <Button
        onClick={onDecrypt}
        disabled={busy}
        className="h-12 w-full gap-2 rounded-full text-sm font-semibold shadow-lg shadow-primary/20 transition-transform active:scale-[0.98] lg:h-11 lg:w-auto lg:px-7"
      >
        <Unlock className="h-4 w-4 shrink-0" />
        {busy ? t("app_decrypting") : t("app_decrypt_btn")}
      </Button>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">
          {error}
        </div>
      )}
      {output && (
        <div className="rounded-md border border-border bg-card p-4">
          <div className="mb-2 text-xs text-muted-foreground">
            {fromArchive ? t("app_from_archive") : t("app_plaintext")}
          </div>
          <div className="whitespace-pre-wrap text-sm">{output}</div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1 text-sm font-medium">{label}</div>
      {children}
    </label>
  );
}

function FieldStyles() {
  return (
    <style>{`
      .r2p-input {
        width: 100%;
        background: var(--color-input);
        color: var(--color-foreground);
        border: 1px solid var(--color-border);
        border-radius: 0.375rem;
        padding: 0.5rem 0.75rem;
        font-size: 16px;
        outline: none;
      }
      @media (min-width: 1024px) {
        .r2p-input { font-size: 0.9rem; }
      }
      .r2p-input:focus { border-color: var(--color-ring); }
    `}</style>
  );
}