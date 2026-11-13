import React, { createContext, useContext, useState } from "react";
import api from "../api/axios";
import { isAdminRole } from "../utils/roles";

const AuthContext = createContext(null);

const deriveName = (email) => (email ? email.split("@")[0] : "");

const persistSession = (data, extra) => {
  localStorage.setItem("accessToken", data.accessToken);
  localStorage.setItem("refreshToken", data.refreshToken);
  localStorage.setItem("role", data.role);
  localStorage.setItem("authUser", JSON.stringify(extra));
};

const clearSession = () => {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("role");
  localStorage.removeItem("authUser");
};

export function AuthProvider({ children }) {
  // Rehydrate on load so a refresh doesn't drop the session.
  const [user, setUser] = useState(() => {
    const role = localStorage.getItem("role");
    const stored = localStorage.getItem("authUser");
    if (role && !isAdminRole(role) && stored) return JSON.parse(stored);
    return null;
  });

  const [admin, setAdmin] = useState(() => {
    const role = localStorage.getItem("role");
    const stored = localStorage.getItem("authUser");
    if (isAdminRole(role) && stored) return JSON.parse(stored);
    return null;
  });

  // ---- Customer flow: email + OTP ----
  const sendOtp = async (email) => {
    await api.post("/auth/email", { email });
  };

  const verifyOtp = async (email, otp) => {
    const { data } = await api.post("/auth/verify-otp", { email, otp });

    const account = { name: deriveName(email), email, notifications: [] };
    persistSession(data, account);

    // A normal customer login can still come back with an admin role_id —
    // route the session into admin state, not customer state, so
    // AdminLayout (and anything else reading `admin` from context) sees a
    // populated account instead of null.
    if (isAdminRole(data.role)) {
      setAdmin(account);
      setUser(null);
    } else {
      setUser(account);
      setAdmin(null);
    }

    return data;
  };

  // ---- Admin flow: email + password ----
  const adminLogin = async ({ email, password }) => {
    const { data } = await api.post("/auth/login", { email, password });

    const staff = { name: deriveName(email), email };
    persistSession(data, staff);
    setAdmin(staff);
    setUser(null);
    return data;
  };

  // ---- Shared logout (works for either session) ----
  const logout = async () => {
    const refreshToken = localStorage.getItem("refreshToken");
    try {
      if (refreshToken) await api.post("/auth/logout", { refreshToken });
    } finally {
      clearSession();
      setUser(null);
    }
  };

  const adminLogout = async () => {
    const refreshToken = localStorage.getItem("refreshToken");
    try {
      if (refreshToken) await api.post("/auth/logout", { refreshToken });
    } finally {
      clearSession();
      setAdmin(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        sendOtp,
        verifyOtp,
        logout,
        admin,
        adminLogin,
        adminLogout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
