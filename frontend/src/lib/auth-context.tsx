"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { Role } from "@sms/shared";
import { api, setAccessToken } from "./api-client";
import { useRouter, usePathname } from "next/navigation";

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  customerId?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const refreshSession = useCallback(async (): Promise<boolean> => {
    try {
      const res = await api.post<{ accessToken: string; user: AuthUser }>("/auth/refresh");
      if (res.success && res.data) {
        setAccessToken(res.data.accessToken);
        setUser(res.data.user);
        return true;
      }
      return false;
    } catch {
      setUser(null);
      setAccessToken(null);
      return false;
    }
  }, []);

  useEffect(() => {
    // Initial session bootstrap
    refreshSession().finally(() => {
      setLoading(false);
    });
  }, [refreshSession]);

  const login = async (email: string, password: string) => {
    const res = await api.post<{ accessToken: string; user: AuthUser }>("/auth/login", {
      email,
      password,
    });

    if (res.success && res.data) {
      setAccessToken(res.data.accessToken);
      setUser(res.data.user);

      if (res.data.user.role === Role.ADMIN) {
        router.push("/admin/dashboard");
      } else if (res.data.user.role === Role.STAFF) {
        router.push("/staff/customers");
      } else {
        router.push("/portal");
      }
    }
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      setUser(null);
      setAccessToken(null);
      router.push("/login");
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
