/**
 * @file Authentication context for the SpendWise frontend.
 *
 * Exposes the authenticated user, the bearer token and the login /
 * logout helpers to the rest of the React tree through a single
 * context. Persists the token in `localStorage` (key `sw_token`) so
 * the session survives a page reload, and rehydrates the user profile
 * on mount by calling the `/auth/me` endpoint.
 *
 * @module context/AuthContext
 */

import { createContext, useContext, useState, useEffect } from "react";
import { getMe, updateMe, logout as apiLogout } from "../services/authService";

/**
 * @typedef {Object} AuthUser
 * @property {string} id - Supabase user UUID.
 * @property {string} email - Email address used to sign in.
 * @property {string} [full_name] - Display name from the user profile.
 * @property {string} [currency] - Preferred currency code, e.g. `EUR`.
 * @property {number} [monthly_income] - Self-reported monthly income.
 */

/**
 * Callback that persists a freshly issued session into the auth context.
 *
 * @callback LoginHandler
 * @param {string} token - Bearer token returned by `/auth/login`.
 * @param {AuthUser} user - User payload to expose to the rest of the app.
 * @returns {void}
 */

/**
 * Callback that tears down the current session both server-side and locally.
 *
 * @callback LogoutHandler
 * @returns {Promise<void>}
 */

/**
 * @typedef {Object} AuthContextValue
 * @property {?AuthUser} user - Current user, or `null` if unauthenticated.
 * @property {?string} token - Current bearer token, or `null` if unauthenticated.
 * @property {boolean} loading - `true` while the session is being restored on mount.
 * @property {LoginHandler} login - Persist a new session and update the context.
 * @property {LogoutHandler} logout - Clear the session both server-side and locally.
 * @property {function(Object): Promise<void>} updateUser - Patch the user profile and refresh the context.
 */

/**
 * React context that carries the auth state. Components should not
 * consume it directly; use the {@link useAuth} hook instead so the
 * default `null` value cannot leak into consumers.
 */
const AuthContext = createContext(null);

/**
 * Provider that owns the authentication state. Mount it once near the
 * top of the React tree (in `main.jsx`); every descendant can then
 * read or update the session via {@link useAuth}.
 *
 * On mount, if a token was previously stored in `localStorage`, the
 * provider calls `getMe()` to repopulate the user profile. If the
 * token is rejected by the backend, the local copy is wiped so the
 * app falls back cleanly to the login flow.
 *
 * @param {Object} props
 * @param {ReactNode} props.children - Subtree wrapped by the provider.
 * @returns {JSX.Element}
 */
export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("sw_token"));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Re-fetch the profile every time the token changes (mount, login,
  // logout). Logout sets the token to null and clears the user inline.
  useEffect(() => {
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    getMe(token)
      .then(setUser)
      .catch(() => {
        // Stale or rejected token: drop the local copy so the next
        // render redirects the user to /login.
        localStorage.removeItem("sw_token");
        setToken(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, [token]);

  /**
   * Persist a freshly issued session.
   *
   * @param {string} tokenValue - Bearer token returned by `/auth/login`.
   * @param {AuthUser} userData - User payload to expose to the rest of the app.
   */
  function handleLogin(tokenValue, userData) {
    localStorage.setItem("sw_token", tokenValue);
    setToken(tokenValue);
    setUser(userData);
  }

  /**
   * Tear down the session both on the backend and locally. The remote
   * `logout` is best-effort; failures there should never prevent the
   * local cleanup, otherwise the UI would be stuck in a "logged in"
   * state with a token the server already considers invalid.
   *
   * @returns {Promise<void>}
   */
  /**
   * Patch the authenticated user's profile and merge the result into the
   * context so every consumer sees the update immediately.
   *
   * @param {Object} profileData - Partial profile payload (see {@link updateMe}).
   * @returns {Promise<void>}
   */
  async function handleUpdateUser(profileData) {
    const updated = await updateMe(token, profileData);
    setUser((prev) => ({ ...prev, ...updated }));
  }

  async function handleLogout() {
    if (token) {
      await apiLogout(token).catch(() => {});
    }
    localStorage.removeItem("sw_token");
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login: handleLogin, logout: handleLogout, updateUser: handleUpdateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to read and mutate the auth context from any component.
 *
 * @returns {AuthContextValue} The current auth context value.
 */
export function useAuth() {
  return useContext(AuthContext);
}
