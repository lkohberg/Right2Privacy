import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const handleSchema = z.string().trim().min(3).max(32).regex(/^[a-zA-Z0-9_]+$/);

export const initProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    handle: string;
    public_key: string;
    encrypted_private_key: string;
    pk_salt: string;
    pk_iv: string;
    language?: string;
  }) =>
    z
      .object({
        handle: handleSchema,
        public_key: z.string().min(1).max(4096),
        encrypted_private_key: z.string().min(1).max(8192),
        pk_salt: z.string().min(1).max(128),
        pk_iv: z.string().min(1).max(128),
        language: z.string().regex(/^[a-z]{2}$/).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("profiles").insert({
      id: userId,
      handle: data.handle.toLowerCase(),
      public_key: data.public_key,
      encrypted_private_key: data.encrypted_private_key,
      pk_salt: data.pk_salt,
      pk_iv: data.pk_iv,
      language: data.language ?? "en",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("profiles")
      .select("id, handle, public_key, encrypted_private_key, pk_salt, pk_iv, language, created_at")
      .eq("id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

export const updateLanguage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { language: string }) =>
    z.object({ language: z.string().regex(/^[a-z]{2}$/) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("profiles")
      .update({ language: data.language })
      .eq("id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const regenerateKeys = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    public_key: string;
    encrypted_private_key: string;
    pk_salt: string;
    pk_iv: string;
  }) =>
    z
      .object({
        public_key: z.string().min(1).max(4096),
        encrypted_private_key: z.string().min(1).max(8192),
        pk_salt: z.string().min(1).max(128),
        pk_iv: z.string().min(1).max(128),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("profiles")
      .update({
        public_key: data.public_key,
        encrypted_private_key: data.encrypted_private_key,
        pk_salt: data.pk_salt,
        pk_iv: data.pk_iv,
      })
      .eq("id", userId);
    if (error) throw new Error(error.message);
    // Old wrapped keys can no longer be decrypted; clear them.
    await supabase.from("pending_keys").delete().eq("recipient_id", userId);
    return { ok: true };
  });

export const searchByHandle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { handle: string }) =>
    z.object({ handle: handleSchema }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: found, error } = await supabaseAdmin
      .from("profiles")
      .select("id, handle")
      .eq("handle", data.handle.toLowerCase())
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!found || found.id === userId) return null;
    return { id: found.id, handle: found.handle };
  });

export const sendFriendRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { addressee_id: string }) =>
    z.object({ addressee_id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.addressee_id === userId) throw new Error("Cannot friend yourself");

    // If the other party already sent us a request, auto-accept it.
    const { data: incoming } = await supabase
      .from("friendships")
      .select("id, status")
      .eq("requester_id", data.addressee_id)
      .eq("addressee_id", userId)
      .maybeSingle();
    if (incoming) {
      if (incoming.status === "pending") {
        const { error: uerr } = await supabase
          .from("friendships")
          .update({ status: "accepted" })
          .eq("id", incoming.id);
        if (uerr) throw new Error(uerr.message);
      }
      return { ok: true, autoAccepted: true };
    }

    // Already sent (or already friends) — report it instead of succeeding silently.
    const { data: existing } = await supabase
      .from("friendships")
      .select("id, status")
      .eq("requester_id", userId)
      .eq("addressee_id", data.addressee_id)
      .maybeSingle();
    if (existing) {
      return {
        ok: false,
        reason: existing.status === "accepted" ? "already_friends" : "already_requested",
      } as const;
    }

    const { error } = await supabase.from("friendships").insert({
      requester_id: userId,
      addressee_id: data.addressee_id,
      status: "pending",
    });
    if (error) throw new Error(error.message);
    return { ok: true, autoAccepted: false, already: false };

  });

export const respondFriendRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { friendship_id: string; accept: boolean }) =>
    z
      .object({ friendship_id: z.string().uuid(), accept: z.boolean() })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.accept) {
      const { error } = await supabase
        .from("friendships")
        .update({ status: "accepted" })
        .eq("id", data.friendship_id)
        .eq("addressee_id", userId);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase
        .from("friendships")
        .delete()
        .eq("id", data.friendship_id)
        .eq("addressee_id", userId);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const unfriend = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { friendship_id: string }) =>
    z.object({ friendship_id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("friendships")
      .delete()
      .eq("id", data.friendship_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listFriends = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    // All friendships involving me
    const { data: rows, error } = await supabase
      .from("friendships")
      .select("id, requester_id, addressee_id, status, created_at")
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const otherIds = Array.from(
      new Set(
        (rows ?? []).map((r) =>
          r.requester_id === userId ? r.addressee_id : r.requester_id,
        ),
      ),
    );
    let profilesById = new Map<string, { id: string; handle: string; public_key: string }>();
    if (otherIds.length) {
      // The signed-in user is allowed to know the handle behind any request
      // involving them, even before accepting it. Keep this narrow projection
      // server-side rather than widening the profiles read policy.
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: profs } = await supabaseAdmin
        .from("profiles")
        .select("id, handle, public_key")
        .in("id", otherIds);
      (profs ?? []).forEach((p) =>
        profilesById.set(p.id, {
          id: p.id,
          handle: p.handle,
          public_key: p.public_key,
        }),
      );
    }

    return (rows ?? []).map((r) => {
      const otherId = r.requester_id === userId ? r.addressee_id : r.requester_id;
      const prof = profilesById.get(otherId);
      const direction: "incoming" | "outgoing" =
        r.addressee_id === userId ? "incoming" : "outgoing";
      return {
        friendship_id: r.id,
        status: r.status as "pending" | "accepted",
        direction,
        other: prof ?? { id: otherId, handle: "(unknown)", public_key: "" },
      };
    });
  });