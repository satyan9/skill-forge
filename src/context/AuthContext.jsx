import { createContext, useContext, useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://skill-forge-backend-8si8.onrender.com/api' : 'http://localhost:5000/api');

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('sf_token') || sessionStorage.getItem('sf_token'));
  const [loading, setLoading] = useState(true);

  // Verify token on mount
  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setUser(data.user);
        } else {
          logout();
        }
      })
      .catch(() => logout())
      .finally(() => setLoading(false));
  }, []);

  function login(newToken, newUser, rememberMe = true) {
    if (rememberMe) {
      localStorage.setItem('sf_token', newToken);
      localStorage.setItem('sf_user', JSON.stringify(newUser));
    } else {
      sessionStorage.setItem('sf_token', newToken);
      sessionStorage.setItem('sf_user', JSON.stringify(newUser));
    }
    setToken(newToken);
    setUser(newUser);
  }

  function logout() {
    localStorage.removeItem('sf_token');
    localStorage.removeItem('sf_user');
    sessionStorage.removeItem('sf_token');
    sessionStorage.removeItem('sf_user');
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export { API_BASE };
