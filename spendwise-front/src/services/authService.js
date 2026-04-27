/**
 * @file Auth service: thin fetch wrappers over the SpendWise auth API.
 *
 * Every function targets the FastAPI backend at `API_BASE`, returns
 * the parsed JSON body on success and throws an `Error` carrying the
 * server-provided message (or a sensible fallback) on failure. Tokens
 * are passed in explicitly by the caller; this module is stateless.
 *
 * @module services/authService
 */

/**
 * Base URL of the backend API. Currently hard-coded to localhost since
 * the project ships without an environment config layer for the
 * frontend; revisit when deploying to a non-local environment.
 *
 * @type {string}
 */
const API_BASE = "http://localhost:8080/api/v1";

/**
 * @typedef {Object} RegisterResponse
 * @property {string} message - Confirmation message returned by the backend.
 * @property {string} user_id - Newly created user's UUID, serialised as string.
 */

/**
 * @typedef {Object} LoginResponse
 * @property {string} access_token - Bearer token used in `Authorization` headers.
 * @property {string} token_type - Always `"bearer"` in this project.
 * @property {string} user_id - Authenticated user's UUID.
 * @property {string} email - Authenticated user's email address.
 */

/**
 * Register a brand new user account.
 *
 * @param {string} email - Email address; validated server-side as a real address.
 * @param {string} password - Plain-text password; hashing happens in Supabase Auth.
 * @param {string} [fullName] - Optional display name stored on the user profile.
 * @returns {Promise<RegisterResponse>} Resolves with the confirmation payload.
 * @throws {Error} If the backend responds with a non-2xx status.
 */
export async function register(email, password, fullName) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, full_name: fullName }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Registration failed");
  return data;
}

/**
 * Authenticate an existing user and obtain a bearer token.
 *
 * @param {string} email - Registered email address.
 * @param {string} password - Plain-text password.
 * @returns {Promise<LoginResponse>} Resolves with the session payload.
 * @throws {Error} If the backend rejects the credentials.
 */
export async function login(email, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Login failed");
  return data;
}

/**
 * Fetch the profile of the currently authenticated user.
 *
 * The backend either returns the full row from `user_profiles` or, if
 * the row is missing, a minimal `{id, email}` stub. Callers should be
 * prepared for both shapes and treat optional fields as such.
 *
 * @param {string} token - Bearer token obtained from {@link login}.
 * @returns {Promise<Object>} Resolves with the profile object.
 * @throws {Error} If the token is invalid or the backend errors out.
 */
export async function getMe(token) {
  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to fetch profile");
  return data;
}

/**
 * Update the profile of the currently authenticated user.
 *
 * @param {string} token - Bearer token obtained from {@link login}.
 * @param {Object} profileData - Partial profile payload.
 * @param {string} [profileData.full_name] - Display name.
 * @param {string} [profileData.currency] - Preferred currency code (e.g. `"EUR"`).
 * @param {number} [profileData.monthly_income] - Self-reported monthly income.
 * @returns {Promise<Object>} Resolves with the updated profile row.
 * @throws {Error} If the backend rejects the payload.
 */
export async function updateMe(token, profileData) {
  const res = await fetch(`${API_BASE}/auth/me`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(profileData),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to update profile");
  return data;
}

/**
 * Invalidate the current Supabase session server-side. Failures are
 * swallowed by callers (see `AuthProvider`) so the UI can still tear
 * down the local session even when the network call fails.
 *
 * @param {string} token - Bearer token to invalidate.
 * @returns {Promise<void>}
 */
export async function logout(token) {
  await fetch(`${API_BASE}/auth/logout`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
}
