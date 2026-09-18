import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const postWrappedKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    message_id: string;
    recipient_id: string;
    wrapped_key: string;
  }) =>
    z
      .object({
        message_id: z.string().min(8).max(64),
        recipient_id: z.string().uuid(),
        wrapped_key: z.string().min(1).max(2048),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("pending_keys").insert({
      message_id: data.message_id,
      sender_id: userId,
      recipient_id: data.recipient_id,
      wrapped_key: data.wrapped_key,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const fetchWrappedKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { message_id: string; sender_id: string }) =>
    z
      .object({
        message_id: z.string().min(8).max(64),
        sender_id: z.string().uuid(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("pending_keys")
      .select("id, wrapped_key, sender_id, recipient_id")
      .eq("message_id", data.message_id)
      .eq("sender_id", data.sender_id)
      .eq("recipient_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;
    // Consume: delete after fetching.
    await supabase.from("pending_keys").delete().eq("id", row.id);
    return { wrapped_key: row.wrapped_key };
  });
export const archiveMessageKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    message_id: string;
    counterpart_id: string;
    direction: "sent" | "received";
    wrapped_key: string;
  }) =>
    z
      .object({
        message_id: z.string().min(8).max(64),
        counterpart_id: z.string().uuid(),
        direction: z.enum(["sent", "received"]),
        wrapped_key: z.string().min(1).max(2048),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("message_keys").upsert(
      {
        owner_id: userId,
        message_id: data.message_id,
        counterpart_id: data.counterpart_id,
        direction: data.direction,
        wrapped_key: data.wrapped_key,
      },
      { onConflict: "owner_id,message_id", ignoreDuplicates: true },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const fetchArchivedKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { message_id: string }) =>
    z.object({ message_id: z.string().min(8).max(64) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("message_keys")
      .select("wrapped_key")
      .eq("owner_id", userId)
      .eq("message_id", data.message_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row ? { wrapped_key: row.wrapped_key } : null;
  });
