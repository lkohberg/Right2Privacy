import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { translations } from "./translations";
import { activityTranslations } from "./activity-translations";
import { helpGuideTranslations } from "./help-guide-translations";
import { notificationTranslations } from "./notification-translations";
import { chatStatusTranslations } from "./chat-status-translations";
import { SUPPORTED_CODES } from "./languages";

const resources = Object.fromEntries(
  Object.entries(translations).map(([code, dict]) => [
    code,
    {
      translation: {
        ...dict,
        ...(activityTranslations[code] ?? {}),
        ...(helpGuideTranslations[code] ?? {}),
        ...(notificationTranslations[code] ?? {}),
        ...(chatStatusTranslations[code] ?? {}),
      },
    },
  ]),
);

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources,
    lng: "en",
    fallbackLng: "en",
    supportedLngs: SUPPORTED_CODES,
    interpolation: { escapeValue: false },
    returnEmptyString: false,
    // If a key is missing in the active language, i18next normally falls back
    // to `fallbackLng`. If it's ALSO missing there, return a humanised
    // version of the key instead of leaking the raw key to the UI.
    parseMissingKeyHandler: (key) => {
      const last = key.split(".").pop() ?? key;
      return last
        .replace(/^[a-z]+_/, "")
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
    },
  });
}

export { i18n };
export default i18n;