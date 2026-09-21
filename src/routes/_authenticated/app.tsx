import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import "@/i18n";
import { listFriends, getMyProfile } from "@/lib/friends.functions";
import { postWrappedKey, fetchWrappedKey, archiveMessageKey, fetchArchivedKey } from "@/lib/keys.functions";
import { encryptMessage, parseBlob, unwrapRawKey, wrapRawKeyFor, decryptWithRawKey } from "@/lib/crypto";
import { loadPrivateKey } from "@/lib/keystore";
import { supabase } from "@/integrations/supabase/client";
import { BellRing, Check, Copy, Lock, Unlock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useActivity } from "@/components/activity-provider";
import { dismissMessageReminder } from "@/lib/activity.functions";

export const Route = createFileRoute("/_authenticated/app")({
  head: () => ({
    meta: [
      { title: "Messages — Right2Privacy" },
      { name: "description", content: "Encrypt and decrypt messages." },
      { property: "og:title", content: "Messages — Right2Privacy" },
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
  const [tab, setTab] = useState<"encrypt" | "decrypt">("encrypt");
  const [selectedFriendId, setSelectedFriendId] = useState("");
  const { t } = useTranslation();
  const activity = useActivity();
  const dismissReminder = useServerFn(dismissMessageReminder);
  const listFriendsFn = useServerFn(listFriends);
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

  const waitingByFriend = activity.messages.reduce<Record<string, number>>((counts, item) => {
    counts[item.sender_id] = (counts[item.sender_id] ?? 0) + 1;
    return counts;
  }, {});

  async function dismiss(id: string) {
    await dismissReminder({ data: { id } });
    await activity.refresh();
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <aside className="min-w-0 border-b border-border pb-5 lg:border-r lg:border-b-0 lg:pr-5 lg:pb-0">
          <div className="mb-3 flex items-center justify-between">
            <h1 className="text-xs font-semibold uppercase text-muted-foreground">{t("friends_list")}</h1>
            <span className="text-xs text-muted-foreground">{accepted.length}</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
            {accepted.map((friend) => {
              const count = waitingByFriend[friend.other.id] ?? 0;
              const selected = selectedFriendId === friend.other.id;
              return (
                <Button
                  key={friend.friendship_id}
                  type="button"
                  variant="ghost"
                  onClick={() => setSelectedFriendId(friend.other.id)}
                  className={`h-10 min-w-32 justify-start px-3 font-mono lg:w-full ${selected ? "bg-accent text-accent-foreground" : "text-muted-foreground"}`}
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-[11px] font-semibold uppercase text-secondary-foreground">
                    {friend.other.handle.slice(0, 2)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-left">@{friend.other.handle}</span>
                  {count > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                      {count}
                    </span>
                  )}
                </Button>
              );
            })}
          </div>
        </aside>

        <section className="min-w-0">
      <div className="mb-6 flex gap-1 rounded-md border border-border bg-card p-1 text-sm">
        <Button
          type="button"
          variant="ghost"
          onClick={() => setTab("encrypt")}
          className={`flex-1 ${tab === "encrypt" ? "bg-accent" : ""}`}
        >
          <Lock className="h-4 w-4" /> {t("app_encrypt")}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => setTab("decrypt")}
          className={`flex-1 ${tab === "decrypt" ? "bg-accent" : ""}`}
        >
          <Unlock className="h-4 w-4" /> {t("app_decrypt")}
        </Button>
      </div>

      {activity.messages.length > 0 && (
        <div className="mb-5 border-l-2 border-primary bg-card px-4 py-3">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium">
            <BellRing className="h-4 w-4 text-primary" /> {t("activity_title")}
          </div>
          <div className="space-y-1">
            {activity.messages.map((item) => (
              <div key={item.id} className="flex items-center gap-2 text-sm">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setSelectedFriendId(item.sender_id);
                    setTab("decrypt");
                  }}
                  className="h-auto min-w-0 flex-1 justify-start truncate px-0 py-1 text-left text-muted-foreground hover:bg-transparent hover:text-foreground"
                >
                  {t("activity_key_waiting", { handle: item.handle })}
                </Button>
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => dismiss(item.id)} aria-label={t("activity_dismiss")} title={t("activity_dismiss")}>
                  <X />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {friendsQ.isLoading ? (
        <div className="text-sm text-muted-foreground">{t("app_loading_friends")}</div>
      ) : accepted.length === 0 ? (
        <div className="rounded-md border border-border bg-card p-6 text-sm text-muted-foreground">
          {t("app_no_friends")}
        </div>
      ) : tab === "encrypt" ? (
        <EncryptPanel friends={accepted} selectedFriendId={selectedFriendId} />
      ) : (
        <DecryptPanel friends={accepted} selectedFriendId={selectedFriendId} onActivityConsumed={activity.refresh} />
      )}

      <FieldStyles />
        </section>
      </div>
    </main>
  );
}

function EncryptPanel({ friends, selectedFriendId }: { friends: Friend[]; selectedFriendId: string }) {
  const { t } = useTranslation();
  const [recipientId, setRecipientId] = useState(friends[0]?.other.id ?? "");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [output, setOutput] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const postKey = useServerFn(postWrappedKey);
  const archiveKey = useServerFn(archiveMessageKey);
  const myProfileFn = useServerFn(getMyProfile);

  useEffect(() => {
    if (!recipientId && friends[0]) setRecipientId(friends[0].other.id);
  }, [friends, recipientId]);
  useEffect(() => {
    if (selectedFriendId) setRecipientId(selectedFriendId);
  }, [selectedFriendId]);

  async function onEncrypt() {
    setError(null);
    setOutput(null);
    setBusy(true);
    try {
      const recipient = friends.find((f) => f.other.id === recipientId);
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
    <div className="space-y-4">
      <Field label={t("app_recipient")}>
        <select
          value={recipientId}
          onChange={(e) => setRecipientId(e.target.value)}
          className="r2p-input"
        >
          {friends.map((f) => (
            <option key={f.other.id} value={f.other.id}>
              @{f.other.handle}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t("app_message")}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          className="r2p-input"
          placeholder={t("app_message_ph")}
        />
      </Field>
      <Button
        onClick={onEncrypt}
        disabled={busy}
      >
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

function DecryptPanel({ friends, selectedFriendId, onActivityConsumed }: { friends: Friend[]; selectedFriendId: string; onActivityConsumed: () => Promise<void> }) {
  const { t } = useTranslation();
  const [senderId, setSenderId] = useState(friends[0]?.other.id ?? "");
  const [blob, setBlob] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [output, setOutput] = useState<string | null>(null);
  const [fromArchive, setFromArchive] = useState(false);
  const fetchKey = useServerFn(fetchWrappedKey);
  const fetchArchived = useServerFn(fetchArchivedKey);
  const archiveKey = useServerFn(archiveMessageKey);
  const myProfileFn = useServerFn(getMyProfile);

  useEffect(() => {
    if (!senderId && friends[0]) setSenderId(friends[0].other.id);
  }, [friends, senderId]);
  useEffect(() => {
    if (selectedFriendId) setSenderId(selectedFriendId);
  }, [selectedFriendId]);

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
        data: { message_id: parsed.mid, sender_id: senderId },
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
              counterpart_id: senderId,
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
    <div className="space-y-4">
      <Field label={t("app_sender")}>
        <select
          value={senderId}
          onChange={(e) => setSenderId(e.target.value)}
          className="r2p-input"
        >
          {friends.map((f) => (
            <option key={f.other.id} value={f.other.id}>
              @{f.other.handle}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t("app_ciphertext_input")}>
        <textarea
          value={blob}
          onChange={(e) => setBlob(e.target.value)}
          rows={5}
          className="r2p-input font-mono text-xs"
          placeholder={t("app_ciphertext_ph")}
        />
      </Field>
      <Button
        onClick={onDecrypt}
        disabled={busy}
      >
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
        font-size: 0.9rem;
        outline: none;
      }
      .r2p-input:focus { border-color: var(--color-ring); }
    `}</style>
  );
}