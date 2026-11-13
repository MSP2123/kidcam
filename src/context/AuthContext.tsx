import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, getToken, setToken } from "../api";
import type { UserProfile } from "../types";

interface AuthContextValue {
  profile: UserProfile | null;
  loading: boolean;
  signUp: (username: string, pin: string) => Promise<void>;
  logIn: (username: string, pin: string) => Promise<void>;
  logOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    api
      .me()
      .then(({ user }) => setProfile({ uid: user.id, username: user.username }))
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);

  async function signUp(username: string, pin: string) {
    const { token, user } = await api.signup(username, pin);
    setToken(token);
    setProfile({ uid: user.id, username: user.username });
  }

  async function logIn(username: string, pin: string) {
    const { token, user } = await api.login(username, pin);
    setToken(token);
    setProfile({ uid: user.id, username: user.username });
  }

  function logOut() {
    setToken(null);
    setProfile(null);
  }

  return (
    <AuthContext.Provider value={{ profile, loading, signUp, logIn, logOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
