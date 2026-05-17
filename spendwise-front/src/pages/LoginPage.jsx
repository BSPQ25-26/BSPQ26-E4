/**
 * @file Login page.
 *
 * Renders the email/password form used by existing users to sign in,
 * delegates the actual API call to the {@link module:services/authService}
 * module, stores the resulting session via the {@link useAuth} context,
 * and navigates to `/dashboard` on success.
 *
 * @module pages/LoginPage
 */

import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { login } from "../services/authService";
import { useAuth } from "../context/AuthContext";
import LanguageSwitcher from "../components/LanguageSwitcher";

/**
 * Login page component. Holds local form state for email and password,
 * surfaces backend errors inline, and disables the submit button while
 * a request is in flight.
 *
 * On successful login the access token plus a minimal user object
 * (`{email, id}`) are pushed into the auth context — the full profile
 * is then refetched by `AuthProvider` via the `/auth/me` endpoint.
 *
 * @returns {JSX.Element}
 */
export default function LoginPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login: setAuth } = useAuth();
  const navigate = useNavigate();

  /**
   * Handle the form submit event: call the auth service, hand the
   * session to the context, and navigate on success. Any thrown error
   * is rendered inline in red.
   *
   * @param {Event} e
   * @returns {Promise<void>}
   */
  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await login(email, password);
      setAuth(data.access_token, { email: data.email, id: data.user_id });
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Language switcher sits above the card so unauthenticated
            users can pick their language before reading the form. */}
        <div className="flex justify-end mb-4">
          <LanguageSwitcher />
        </div>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{t("common.appName")}</h1>
          <p className="text-gray-500 mt-1">{t("auth.login.subtitle")}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("auth.login.email")}
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("auth.login.emailPlaceholder")}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("auth.login.password")}
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("auth.login.passwordPlaceholder")}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors text-sm"
            >
              {loading ? t("auth.login.submitting") : t("auth.login.submit")}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            {t("auth.login.noAccount")}{" "}
            <Link to="/register" className="text-indigo-600 hover:underline font-medium">
              {t("auth.login.createOne")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
