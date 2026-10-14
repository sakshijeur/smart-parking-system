import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { api, setToken } from '../api';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);
const KEY = 'sp_token';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);

  // Restore the saved session when the app opens
  useEffect(() => {
    (async () => {
      try {
        const saved = await SecureStore.getItemAsync(KEY);
        if (saved) {
          setToken(saved);
          const { data } = await api.get('/auth/me');
          setUser(data.user);
        }
      } catch {
        setToken(null);
        await SecureStore.deleteItemAsync(KEY).catch(() => {});
      } finally {
        setBooting(false);
      }
    })();
  }, []);

  const startSession = async (data) => {
    setToken(data.token);
    await SecureStore.setItemAsync(KEY, data.token);
    setUser(data.user);
  };

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    await startSession(data);
  };

  const register = async (form) => {
    const { data } = await api.post('/auth/register', form);
    await startSession(data);
  };

  const logout = async () => {
    setToken(null);
    await SecureStore.deleteItemAsync(KEY).catch(() => {});
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, booting, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
