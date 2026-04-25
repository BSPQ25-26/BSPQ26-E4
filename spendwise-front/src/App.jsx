/**
 * @file Top-level routing component.
 *
 * Declares every route in the SpendWise frontend and protects the
 * private ones with the `PrivateRoute` guard, while bouncing
 * already-authenticated users away from the public auth pages with the
 * `PublicRoute` guard.
 *
 * @module App
 */

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";

/**
 * Route guard that only renders its children when the user is
 * authenticated. While the auth context is still resolving the session
 * it shows a small placeholder; otherwise unauthenticated users are
 * redirected to `/login`.
 *
 * @param {Object} props
 * @param {ReactNode} props.children - Element rendered when the user is logged in.
 * @returns {JSX.Element}
 */
function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>;
  return user ? children : <Navigate to="/login" replace />;
}

/**
 * Route guard for pages that should only be visible when the user is
 * NOT authenticated (login, register). Already-logged-in users are
 * bounced to `/dashboard`.
 *
 * @param {Object} props
 * @param {ReactNode} props.children - Element rendered when the user is logged out.
 * @returns {JSX.Element}
 */
function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>;
  return user ? <Navigate to="/dashboard" replace /> : children;
}

/**
 * Application root. Sets up the React Router tree:
 *
 * | Path         | Access      | Element            |
 * |--------------|-------------|--------------------|
 * | `/`          | redirect    | -> `/login`        |
 * | `/login`     | public only | {@link LoginPage}    |
 * | `/register`  | public only | {@link RegisterPage} |
 * | `/dashboard` | private     | {@link DashboardPage}|
 *
 * The component is wrapped in {@link AuthProvider} again here (in
 * addition to the one in `main.jsx`) so the routing tree always has
 * access to the auth context even when `App` is rendered standalone in
 * tests.
 *
 * @returns {JSX.Element}
 */
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route
            path="/login"
            element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicRoute>
                <RegisterPage />
              </PublicRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <DashboardPage />
              </PrivateRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
