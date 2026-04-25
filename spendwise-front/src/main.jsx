/**
 * @file Application entry point.
 *
 * Bootstraps the React app: imports the global CSS (Bootstrap and the
 * Tailwind-flavoured `index.css`), wraps the {@link App} component in
 * the {@link AuthProvider} so authentication state is available
 * everywhere, and mounts everything inside React's `StrictMode` for
 * extra runtime checks during development.
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'bootstrap/dist/css/bootstrap.min.css'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)
