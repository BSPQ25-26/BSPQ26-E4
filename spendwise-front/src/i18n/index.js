/**
 * @file i18next bootstrap.
 *
 * Initialises the i18next runtime for the SpendWise frontend. The
 * configuration:
 *
 * - Registers the three supported locales: English (default / fallback),
 *   Spanish and Basque.
 * - Plugs in `i18next-browser-languagedetector` so a returning visitor
 *   keeps the language they last picked. Detection order tries
 *   `localStorage` first, then the browser preference.
 * - Stores the user-selected language in `localStorage` under the
 *   project-prefixed key `sw_lang` to keep all SpendWise persistence in
 *   the same namespace as `sw_token`.
 *
 * The module is imported for its side effect from `main.jsx` *before*
 * the React tree mounts, so the very first render already has a
 * resolved language and components can call `useTranslation()` safely.
 *
 * @module i18n
 */

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import en from "./locales/en.json";
import es from "./locales/es.json";
import eu from "./locales/eu.json";

/**
 * Languages exposed by the {@link LanguageSwitcher} component. Each
 * entry maps the i18next language code to the label shown in the
 * dropdown (kept in the language's own spelling so users always
 * recognise their own option even if the rest of the UI is in a
 * different language).
 *
 * @type {Array<{code: string, label: string}>}
 */
export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "eu", label: "Euskara" },
];

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    // Embedded resources: shipping the JSON inline keeps the dev
    // experience zero-config and avoids an extra HTTP request on first
    // paint. The bundles are tiny (~5-10 KB each) so the cost is
    // negligible compared to the lazy-loading machinery of
    // `i18next-http-backend`.
    resources: {
      en: { translation: en },
      es: { translation: es },
      eu: { translation: eu },
    },
    // English is the source of truth: any key missing from `es`/`eu`
    // falls back to its English version so the UI never shows a raw
    // translation key to the user.
    fallbackLng: "en",
    supportedLngs: SUPPORTED_LANGUAGES.map((l) => l.code),
    // React already escapes by default, so disabling i18next's own
    // escaping prevents double-escaping of values interpolated with
    // `{{var}}`.
    interpolation: { escapeValue: false },
    detection: {
      // localStorage wins over the browser preference so a user who
      // explicitly picked a language keeps it across sessions.
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "sw_lang",
      caches: ["localStorage"],
    },
  });

export default i18n;
