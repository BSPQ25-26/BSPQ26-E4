/**
 * @file Registration page.
 *
 * Collects the email, password and (optional) full name needed to
 * create a new account, delegates the call to
 * {@link module:services/authService}, shows a success notice, and
 * redirects the user to the login page after a short delay so they
 * can read the email-verification reminder.
 *
 * @module pages/RegisterPage
 */

import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { register } from "../services/authService";
import LanguageSwitcher from "../components/LanguageSwitcher";

/**
 * Registration page component. Holds local state for the form fields,
 * loading state, and either an error message or a success message
 * displayed inline below the form.
 *
 * After a successful submission the page waits 3 seconds and then
 * routes to `/login`, giving the user a chance to read the "check
 * your email" notice.
 *
 * @returns {JSX.Element}
 */
export default function RegisterPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  /**
   * Submit handler: calls the registration endpoint, then either
   * surfaces the backend error inline or shows a success message and
   * schedules the navigation to `/login`.
   *
   * @param {Event} e
   * @returns {Promise<void>}
   */
  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      await register(email, password, fullName);
      setSuccess(t("auth.register.success"));
      setTimeout(() => navigate("/login"), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex justify-end mb-4">
          <LanguageSwitcher />
        </div>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{t("common.appName")}</h1>
          <p className="text-gray-500 mt-1">{t("auth.register.subtitle")}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("auth.register.fullName")}
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={t("auth.register.fullNamePlaceholder")}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("auth.register.email")}
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("auth.register.emailPlaceholder")}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("auth.register.password")}
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("auth.register.passwordPlaceholder")}
                minLength={6}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg">
                {error}
              </p>
            )}
            {success && (
              <p className="text-sm text-green-700 bg-green-50 px-4 py-2 rounded-lg">
                {success}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors text-sm"
            >
              {loading ? t("auth.register.submitting") : t("auth.register.submit")}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            {t("auth.register.haveAccount")}{" "}
            <Link to="/login" className="text-indigo-600 hover:underline font-medium">
              {t("auth.register.signIn")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
