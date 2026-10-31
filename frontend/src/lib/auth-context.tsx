"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { api } from "./api-client";

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: "ADMIN" | "STAFF" | "CUSTOMER";
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, role?: string) => Promise<void>;
  logout: () => void;
  quickSwitch: (role: "ADMIN" | "STAFF" | "CUSTOMER") => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  logout: () => {},
  quickSwitch: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const initAuth = async () => {
    try {
      const storedUser = localStorage.getItem("sms_user");
      const token = api.getToken();
      if (storedUser && token) {
        setUser(JSON.parse(storedUser));
      } else {
        // Default login as Admin for quick access
        await quickSwitch("ADMIN");
      }
    } catch (err) {
      console.error("Auth init error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initAuth();
  }, []);

  const login = async (email: string) => {
    setLoading(true);
    try {
      const data = await api.post<{ accessToken: string; user: User }>("/auth/login", {
        email,
        password: "Brightloop!2026",
      });
      api.setToken(data.accessToken);
      setUser(data.user);
      localStorage.setItem("sms_user", JSON.stringify(data.user));
    } finally {
      setLoading(false);
    }
  };

  const quickSwitch = async (role: "ADMIN" | "STAFF" | "CUSTOMER") => {
    const email =
      role === "ADMIN"
        ? "admin@brightloop.demo"
        : role === "STAFF"
        ? "staff@brightloop.demo"
        : "customer@brightloop.demo";
    await login(email);
  };

  const logout = () => {
    api.setToken(null);
    setUser(null);
    localStorage.removeItem("sms_user");
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, quickSwitch }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

