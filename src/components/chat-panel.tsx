import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Check, CheckCheck, Send, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { loadPrivateKey } from "@/lib/keystore";
import { usePreferences } from "@/lib/use-preferences";
import {
  decryptWithRawKey,
  encryptMessage,
  parseBlob,
  unwrapRawKey,
  wrapRawKeyFor,
} from "@/lib/crypto";
import {
  deleteConversation,
  deleteMessages,
  listConversation,
  markMessagesRead,
  sendMessage,
} from "@/lib/messages.functions";

type Row = {
  id: string;
  mine: boolean;
  ciphertext: string;
  wrapped_key: string;
  created_at: string;
  read_at: string | null;
};

export function ChatPanel({
  contactId,
  contactPublicKey,
  myPublicKey,
  onActivityConsumed,
}: {
  contactId: string;
  contactPublicKey: string;
  myPublicKey: string | null;
  onActivityConsumed: () => Promise<void>;
}) {
  const { t } = useTranslation();
  const { preferences } = usePreferences();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [privKey, setPrivKey] = useState<CryptoKey | null>(null);
  const [keyChecked, setKeyChecked] = useState(false);
  const [plain, setPlain] = useState<Record<string, string>>({});
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const messageListRef = useRef<HTMLDivElement>(null);
  const markingReadRef = useRef(new Set<string>());

  const listFn = useServerFn(listConversation);
  const sendFn = useServerFn(sendMessage);
  const markReadFn = useServerFn(markMessagesRead);
  const deleteMessagesFn = useServerFn(deleteMessages);
  const deleteConversationFn = useServerFn(deleteConversation);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      const key = data.user ? await loadPrivateKey(data.user.id) : null;
      if (!active) return;
      setPrivKey(key);
      setKeyChecked(true);
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setSelectMode(false);
    setSelected([]);
  }, [contactId]);

  const conversationQ = useQuery({
    queryKey: ["conversation", contactId],
    queryFn: () => listFn({ data: { contact_id: contactId } }),
    enabled: !!contactId,
    refetchInterval: 8000,
  });

  const rows = useMemo(() => (conversationQ.data ?? []) as Row[], [conversationQ.data]);
  const refetchConversation = conversationQ.refetch;

  useEffect(() => {
    if (!privKey || rows.length === 0) return;
    let active = true;
    (async () => {
      const next: Record<string, string> = {};
      for (const row of rows) {
        if (plain[row.id]) continue;
        try {
          const blob = parseBlob(row.ciphertext);
          const raw = await unwrapRawKey(row.wrapped_key, privKey);
          next[row.id] = await decryptWithRawKey(blob, raw);
        } catch {
          next[row.id] = "🔒";
        }
      }
      if (active && Object.keys(next).length > 0) {
        setPlain((prev) => ({ ...prev, ...next }));
      }
    })();
    return () => {
      active = false;
    };
  }, [rows, privKey, plain]);

  useEffect(() => {
    if (!preferences.read_receipts) return;
    const readableUnreadIds = rows
      .filter((row) => !row.mine && !row.read_at && plain[row.id] && plain[row.id] !== "🔒" && !markingReadRef.current.has(row.id))
      .map((row) => row.id);
    if (readableUnreadIds.length === 0) return;
    readableUnreadIds.forEach((id) => markingReadRef.current.add(id));
    void markReadFn({ data: { message_ids: readableUnreadIds } })
      .then(async () => {
        await Promise.all([refetchConversation(), onActivityConsumed()]);
      })
      .catch(() => readableUnreadIds.forEach((id) => markingReadRef.current.delete(id)));
  }, [rows, plain, markReadFn, onActivityConsumed, refetchConversation, preferences.read_receipts]);

  useEffect(() => {
    const messageList = messageListRef.current;
    if (messageList) messageList.scrollTop = messageList.scrollHeight;
  }, [rows.length, plain]);

  function toggleSelected(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function onDeleteSelected() {
    if (selected.length === 0 || deleting) return;
    if (!window.confirm(t("chat_delete_selected_confirm", { count: selected.length }))) return;
    setDeleting(true);
    try {
      await deleteMessagesFn({ data: { message_ids: selected } });
      setSelected([]);
      setSelectMode(false);
      await refetchConversation();
      toast.success(t("chat_deleted"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setDeleting(false);
    }
  }

  async function onDeleteConversation() {
    if (deleting || rows.length === 0) return;
    if (!window.confirm(t("chat_delete_chat_confirm"))) return;
    setDeleting(true);
    try {
      await deleteConversationFn({ data: { contact_id: contactId } });
      setSelected([]);
      setSelectMode(false);
      await refetchConversation();
      toast.success(t("chat_deleted"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setDeleting(false);
    }
  }

  async function onSend() {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const { blob, rawKey } = await encryptMessage(body, contactPublicKey);
      const wrappedSelf = myPublicKey
        ? await wrapRawKeyFor(rawKey, myPublicKey)
        : await wrapRawKeyFor(rawKey, contactPublicKey);
      const wrappedRecipient = await wrapRawKeyFor(rawKey, contactPublicKey);
      await sendFn({
        data: {
          recipient_id: contactId,
          ciphertext: blob,
          wrapped_key_sender: wrappedSelf,
          wrapped_key_recipient: wrappedRecipient,
        },
      });
      setText("");
      await conversationQ.refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="mb-1 flex shrink-0 items-center justify-end gap-2">
        {selectMode ? (
          <>
            <span className="mr-auto text-xs text-muted-foreground">
              {t("chat_selected_count", { count: selected.length })}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={selected.length === 0 || deleting}
              onClick={() => void onDeleteSelected()}
              className="h-8 gap-1.5 rounded-full px-3 text-xs text-destructive hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {t("chat_delete_selected")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectMode(false);
                setSelected([]);
              }}
              className="h-8 gap-1.5 rounded-full px-3 text-xs"
            >
              <X className="h-3.5 w-3.5" />
              {t("common_cancel")}
            </Button>
          </>
        ) : (
          <>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={rows.length === 0}
              onClick={() => setSelectMode(true)}
              className="h-8 gap-1.5 rounded-full px-3 text-xs text-muted-foreground"
            >
              <Check className="h-3.5 w-3.5" />
              {t("chat_select")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={rows.length === 0 || deleting}
              onClick={() => void onDeleteConversation()}
              className="h-8 gap-1.5 rounded-full px-3 text-xs text-destructive hover:text-destructive"
              title={t("chat_delete_chat")}
            >
              <Trash2 className="h-3.5 w-3.5" />
              {t("chat_delete_chat")}
            </Button>
          </>
        )}
      </div>
      <div ref={messageListRef} className="scrollbar-hidden min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain pb-4 pr-1">
        {keyChecked && !privKey && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">
            {t("chat_locked")}
          </div>
        )}
        {rows.length === 0 && !conversationQ.isLoading && (
          <div className="py-10 text-center text-sm text-muted-foreground">{t("chat_empty")}</div>
        )}
        {rows.map((row) => {
          const isSelected = selected.includes(row.id);
          return (
            <div key={row.id} className={`flex ${row.mine ? "justify-end" : "justify-start"}`}>
              <div
                role={selectMode ? "button" : undefined}
                tabIndex={selectMode ? 0 : undefined}
                onClick={selectMode ? () => toggleSelected(row.id) : undefined}
                onKeyDown={
                  selectMode
                    ? (event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          toggleSelected(row.id);
                        }
                      }
                    : undefined
                }
                className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm shadow-sm ${
                  row.mine
                    ? "rounded-br-md bg-primary text-primary-foreground"
                    : "rounded-bl-md bg-secondary text-secondary-foreground"
                } ${selectMode ? "cursor-pointer" : ""} ${
                  isSelected ? "ring-2 ring-destructive ring-offset-2 ring-offset-background" : ""
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{plain[row.id] ?? "…"}</p>
                <div className="mt-1 flex items-center justify-end gap-1 text-[10px] opacity-70">
                  <span>
                    {new Date(row.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  {row.mine && (
                    <span
                      className={`inline-flex items-center ${row.read_at ? "text-read" : ""}`}
                      title={t(row.read_at ? "chat_status_read" : "chat_status_sent")}
                      aria-label={t(row.read_at ? "chat_status_read" : "chat_status_sent")}
                    >
                      {row.read_at ? <CheckCheck className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <div className="sticky bottom-0 shrink-0 pb-1 pt-3">
        <div className="flex items-end gap-2 rounded-3xl border border-border bg-card px-2 py-1.5 shadow-sm focus-within:border-ring">
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void onSend();
            }
          }}
          rows={1}
          placeholder={t("chat_ph")}
          className="max-h-32 min-h-10 flex-1 resize-none border-0 bg-transparent px-2 py-2 text-base text-foreground outline-none placeholder:text-muted-foreground lg:text-sm"
        />
        <Button
          type="button"
          onClick={() => void onSend()}
          disabled={sending || !text.trim()}
          aria-label={t("chat_send")}
          className="h-10 w-10 shrink-0 rounded-full p-0 shadow-lg shadow-primary/20"
        >
          <Send className="h-4 w-4" />
        </Button>
        </div>
      </div>
    </div>
  );
}
