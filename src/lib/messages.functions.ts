import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const sendMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    recipient_id: string;
    ciphertext: string;
    wrapped_key_sender: string;
    wrapped_key_recipient: string;
  }) =>
    z
      .object({
        recipient_id: z.string().uuid(),
        ciphertext: z.string().min(1).max(200_000),
        wrapped_key_sender: z.string().min(1).max(2048),
        wrapped_key_recipient: z.string().min(1).max(2048),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("messages")
      .insert({
        sender_id: userId,
        recipient_id: data.recipient_id,
        ciphertext: data.ciphertext,
        wrapped_key_sender: data.wrapped_key_sender,
        wrapped_key_recipient: data.wrapped_key_recipient,
      })
      .select("id, created_at")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const listConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { contact_id: string }) =>
    z.object({ contact_id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: rows, error } = await supabase
      .from("messages")
      .select(
        "id, sender_id, recipient_id, ciphertext, wrapped_key_sender, wrapped_key_recipient, created_at, read_at",
      )
      .or(
        `and(sender_id.eq.${userId},recipient_id.eq.${data.contact_id}),and(sender_id.eq.${data.contact_id},recipient_id.eq.${userId})`,
      )
      .order("created_at", { ascending: true })
      .limit(300);
    if (error) throw new Error(error.message);
    return (rows ?? []).map((row) => ({
      id: row.id,
      mine: row.sender_id === userId,
      ciphertext: row.ciphertext,
      wrapped_key: row.sender_id === userId ? row.wrapped_key_sender : row.wrapped_key_recipient,
      created_at: row.created_at,
      read_at: row.read_at,
    }));
  });

export const markConversationRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { contact_id: string }) =>
    z.object({ contact_id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("recipient_id", userId)
      .eq("sender_id", data.contact_id)
      .is("read_at", null);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const countUnreadMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: rows, error } = await supabase
      .from("messages")
      .select("sender_id")
      .eq("recipient_id", userId)
      .is("read_at", null)
      .limit(500);
    if (error) throw new Error(error.message);
    const counts: Record<string, number> = {};
    for (const row of rows ?? []) {
      counts[row.sender_id] = (counts[row.sender_id] ?? 0) + 1;
    }
    return counts;
  });
