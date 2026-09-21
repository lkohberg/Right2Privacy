import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getActivity = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: keys, error: keysError }, { data: requests, error: requestsError }] =
      await Promise.all([
        supabase
          .from("pending_keys")
          .select("id, message_id, sender_id, created_at")
          .eq("recipient_id", userId)
          .order("created_at", { ascending: false }),
        supabase
          .from("friendships")
          .select("id, requester_id, created_at")
          .eq("addressee_id", userId)
          .eq("status", "pending")
          .order("created_at", { ascending: false }),
      ]);

    if (keysError) throw new Error(keysError.message);
    if (requestsError) throw new Error(requestsError.message);

    const profileIds = Array.from(
      new Set([
        ...(keys ?? []).map((item) => item.sender_id),
        ...(requests ?? []).map((item) => item.requester_id),
      ]),
    );
    const handles = new Map<string, string>();
    if (profileIds.length > 0) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: profiles, error: profilesError } = await supabaseAdmin
        .from("profiles")
        .select("id, handle")
        .in("id", profileIds);
      if (profilesError) throw new Error(profilesError.message);
      for (const profile of profiles ?? []) handles.set(profile.id, profile.handle);
    }

    return {
      messages: (keys ?? []).map((item) => ({
        ...item,
        handle: handles.get(item.sender_id) ?? "unknown",
      })),
      friendRequests: (requests ?? []).map((item) => ({
        ...item,
        handle: handles.get(item.requester_id) ?? "unknown",
      })),
    };
  });

export const dismissMessageReminder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) =>
    z.object({ id: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("pending_keys")
      .update({ dismissed_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("recipient_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });