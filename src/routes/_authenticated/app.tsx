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
import { Copy, Check, Lock, Unlock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app")({
  head: () => ({
    meta: [
      { title: "Messages — Right2Privacy" },
      { name: "description", content: "Encrypt and decrypt messages." },
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
  const { t } = useTranslation();
  const listFriendsFn = useServerFn(listFriends);
  const friendsQ = useQuery({
    queryKey: ["friends"],
    queryFn: () => listFriendsFn(),
  });
  const accepted = ((friendsQ.data ?? []) as Friend[]).filter(
    (f) => f.status === "accepted",
  );

  return (
    <main className="mx-auto max-w-3xl px-5 py-8 sm:px-6">
      <div className="mb-6 flex gap-1 rounded-md border border-border p-1 text-sm">
        <button
          onClick={() => setTab("encrypt")}
          className={`flex-1 flex items-center justify-center gap-2 rounded-sm px-3 py-2 ${tab === "encrypt" ? "bg-accent" : ""}`}
        >
          <Lock className="h-4 w-4" /> {t("app_encrypt")}
        </button>
        <button
          onClick={() => setTab("decrypt")}
          className={`flex-1 flex items-center justify-center gap-2 rounded-sm px-3 py-2 ${tab === "decrypt" ? "bg-accent" : ""}`}
        >
          <Unlock className="h-4 w-4" /> {t("app_decrypt")}
        </button>
      </div>

      {friendsQ.isLoading ? (
        <div className="text-sm text-muted-foreground">{t("app_loading_friends")}</div>
      ) : accepted.length === 0 ? (
        <div className="rounded-md border border-border bg-card p-6 text-sm text-muted-foreground">
          {t("app_no_friends")}
        </div>
      ) : tab === "encrypt" ? (
        <EncryptPanel friends={accepted} />
      ) : (
        <DecryptPanel friends={accepted} />
      )}

      <FieldStyles />
    </main>
  );
}

function EncryptPanel({ friends }: { friends: Friend[] }) {
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
      <button
        onClick={onEncrypt}
        disabled={busy}
        className="rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        {busy ? t("app_encrypting") : t("app_encrypt_btn")}
      </button>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">
          {error}
        </div>
      )}

      {output && (
        <div className="rounded-md border border-border bg-card p-4">
          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>{t("app_ciphertext")}</span>
            <button
              onClick={copyOut}
              className="flex items-center gap-1 rounded-md border border-border px-2 py-1 hover:bg-accent"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? t("app_copied") : t("app_copy")}
            </button>
          </div>
          <div className="max-h-60 overflow-auto font-mono text-xs break-all">
            {output}
          </div>
        </div>
      )}
    </div>
  );
}

function DecryptPanel({ friends }: { friends: Friend[] }) {
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
      <button
        onClick={onDecrypt}
        disabled={busy}
        className="rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        {busy ? t("app_decrypting") : t("app_decrypt_btn")}
      </button>

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