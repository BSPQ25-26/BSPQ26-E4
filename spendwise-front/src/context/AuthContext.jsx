import { createContext, useContext, useState, useEffect } from "react";
import { getMe, logout as apiLogout } from "../services/authService";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("sw_token"));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    getMe(token)
      .then(setUser)
      .catch(() => {
        localStorage.removeItem("sw_token");
        setToken(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, [token]);

  function handleLogin(tokenValue, userData) {
    localStorage.setItem("sw_token", tokenValue);
    setToken(tokenValue);
    setUser(userData);
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
    <AuthContext.Provider value={{ user, token, loading, login: handleLogin, logout: handleLogout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
