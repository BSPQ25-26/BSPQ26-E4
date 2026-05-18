/**
 * @file Language switcher.
 *
 * Small dropdown that lets the user change the UI language at any
 * point. Mounted in three places:
 *
 * - The login and register pages (so unauthenticated users can read the
 *   forms in their preferred language before signing up).
 * - The dashboard navbar (for quick access while using the app).
 * - The Settings tab (so the preference is visible alongside the rest
 *   of the profile fields).
 *
 * Behaviour:
 *
 * - Changing the value calls `i18n.changeLanguage()`, which also
 *   persists the choice to `localStorage` (key `sw_lang`) via the
 *   detector configured in {@link module:i18n}.
 * - If the user is authenticated, the choice is also pushed to the
 *   backend through `updateUser({ language })` so the preference
 *   follows the account across devices. Network failures are
 *   intentionally swallowed: the language has already been applied
 *   locally and the next successful profile update will retry.
 *
 * @module components/LanguageSwitcher
 */

import { useTranslation } from "react-i18next";

import { useAuth } from "../context/AuthContext";
import { SUPPORTED_LANGUAGES } from "../i18n";

/**
 * Render a small `<select>` with the available languages.
 *
 * @param {Object} [props]
 * @param {"compact"|"full"} [props.variant="compact"] - `compact` shows
 *   only the select (used in the navbar). `full` shows a label above
 *   the select and stretches to the container width (used in Settings).
 * @param {string} [props.className] - Extra Tailwind classes appended
 *   to the wrapper.
 * @returns {JSX.Element}
 */
export default function LanguageSwitcher({ variant = "compact", className = "" }) {
  const { i18n, t } = useTranslation();
  const auth = useAuth();
  // `useAuth` returns `null` when the component is rendered outside the
  // AuthProvider (for instance from a Storybook story or an isolated
  // unit test). The switcher must still work in that case, so we treat
  // the absence of a user as "anonymous" rather than crashing.
  const user = auth?.user ?? null;
  const updateUser = auth?.updateUser;

  /**
   * Apply the new language locally and, if a session exists, persist it
   * to the user profile on the backend.
   *
   * @param {string} code - i18next language code, e.g. `"es"`.
   * @returns {Promise<void>}
   */
  async function handleChange(code) {
    await i18n.changeLanguage(code);
    if (user && updateUser) {
      // Best-effort sync to Supabase: the local switch has already
      // taken effect, so a transient network failure must not block
      // the UI or roll back the user-visible change.
      updateUser({ language: code }).catch(() => {});
    }
  }

  if (variant === "full") {
    return (
      <div className={className}>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          {t("settings.language")}
        </label>
        <select
          aria-label={t("language.label")}
          value={i18n.resolvedLanguage || i18n.language}
          onChange={(e) => handleChange(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
        >
          {SUPPORTED_LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <select
      aria-label={t("language.label")}
      value={i18n.resolvedLanguage || i18n.language}
      onChange={(e) => handleChange(e.target.value)}
      className={`border border-gray-300 rounded-md text-sm py-1 px-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white ${className}`}
    >
      {SUPPORTED_LANGUAGES.map((lang) => (
        <option key={lang.code} value={lang.code}>
          {lang.label}
        </option>
      ))}
    </select>
  );
}
