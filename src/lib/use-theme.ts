import { useEffect } from "react";
import { usePreferences } from "@/lib/use-preferences";

/**
 * Applies the saved appearance preference to <html>.
 * The default palette lives on :root (dark); the .light class overrides it.
 */
export function useApplyTheme() {
  const { preferences } = usePreferences();
  const theme = preferences.theme;

  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia("(prefers-color-scheme: light)");
    const apply = () => {
      const light = theme === "light" || (theme === "system" && media.matches);
      root.classList.toggle("light", light);
    };
    apply();
    if (theme !== "system") return;
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme]);
}
