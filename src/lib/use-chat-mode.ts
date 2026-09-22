import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getMyProfile, updateChatMode } from "@/lib/friends.functions";

export type ChatMode = "chat" | "legacy";

export function useChatMode() {
  const getProfile = useServerFn(getMyProfile);
  const setModeFn = useServerFn(updateChatMode);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["profile"], queryFn: () => getProfile() });
  const mode: ChatMode = q.data?.chat_mode === "legacy" ? "legacy" : "chat";

  async function setMode(next: ChatMode) {
    qc.setQueryData(["profile"], (old: unknown) =>
      old && typeof old === "object" ? { ...(old as object), chat_mode: next } : old,
    );
    await setModeFn({ data: { chat_mode: next } });
    await qc.invalidateQueries({ queryKey: ["profile"] });
  }

  return { mode, setMode, isLoading: q.isLoading };
}
