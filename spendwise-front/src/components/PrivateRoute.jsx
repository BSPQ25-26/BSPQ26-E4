/**
 * @file Authentication-aware route wrapper.
 *
 * Standalone version of the `PrivateRoute` guard that lives next to the
 * one declared inside `App.jsx`. It is exported as a reusable component
 * so any future page can be wrapped with it without duplicating the
 * loading / redirect logic.
 *
 * @module components/PrivateRoute
 */

import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * Render a private route. While the auth context is resolving the
 * session it displays a minimal centred "Loading…" placeholder.
 * Unauthenticated users are redirected to `/login` with `replace`, so
 * the protected URL does not stay in the browser history.
 *
 * @param {Object} props
 * @param {ReactNode} props.children - The element rendered when the user is authenticated.
 * @returns {JSX.Element}
 */
export default function PrivateRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-400 text-sm">Loading…</div>
      </div>
    )
  }

  return user ? children : <Navigate to="/login" replace />
}
