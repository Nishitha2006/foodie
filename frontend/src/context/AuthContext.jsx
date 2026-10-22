import { createContext, useContext, useEffect, useState } from 'react';
import { authApi, tokenStorage } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // While we check a saved token, protected pages wait instead of redirecting.
  const [loading, setLoading] = useState(() => Boolean(tokenStorage.get()));

  useEffect(() => {
    if (!tokenStorage.get()) return;
    authApi
      .me()
      .then(({ user }) => setUser(user))
      .catch((error) => {
        if (error.response?.status === 401) tokenStorage.clear(); // expired or invalid token
      })
      .finally(() => setLoading(false));
  }, []);

  const handleAuth = ({ token, user }) => {
    tokenStorage.set(token);
    setUser(user);
    return user;
  };

  const login = async (email, password) => handleAuth(await authApi.login({ email, password }));
  const register = async (name, email, password) => handleAuth(await authApi.register({ name, email, password }));
  const logout = () => {
    tokenStorage.clear();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
