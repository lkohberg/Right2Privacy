import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getMyProfile, updatePreferences } from "@/lib/friends.functions";

export type ThemePreference = "dark" | "light" | "system";
export type NotifyDetail = "full" | "minimal";

export type Preferences = {
  read_receipts: boolean;
  theme: ThemePreference;
  notify_detail: NotifyDetail;
  auto_delete_hours: number;
};

export const AUTO_DELETE_OPTIONS = [0, 1, 24, 168, 720] as const;

export function usePreferences() {
  const getProfile = useServerFn(getMyProfile);
  const updateFn = useServerFn(updatePreferences);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["profile"], queryFn: () => getProfile() });

  const data = q.data as Partial<Preferences> | null | undefined;
  const preferences: Preferences = {
    read_receipts: data?.read_receipts ?? true,
    theme: (data?.theme as ThemePreference) ?? "dark",
    notify_detail: (data?.notify_detail as NotifyDetail) ?? "full",
    auto_delete_hours: data?.auto_delete_hours ?? 0,
  };

  async function update(patch: Partial<Preferences>) {
    qc.setQueryData(["profile"], (old: unknown) =>
      old && typeof old === "object" ? { ...(old as object), ...patch } : old,
    );
    await updateFn({ data: patch });
    await qc.invalidateQueries({ queryKey: ["profile"] });
  }

  return { preferences, update, isLoading: q.isLoading };
}
