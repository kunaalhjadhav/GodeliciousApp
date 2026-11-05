import { Linking } from "react-native";
import React, { createContext, useContext, useEffect, useState } from "react";
import { api, setToken, clearToken, getToken } from "../api/client";
import { registerForPush } from "../push";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const data = await api.me();
        setUser(data.user);
      } catch {
        await clearToken();
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Once signed in, register this phone for push notifications (no-op until
  // Firebase is set up in the Android project - see PUSH_SETUP.md).
  useEffect(() => {
    if (user) registerForPush(api.registerDevice);
  }, [user]);

  async function login(email, password) {
    const data = await api.login(email, password);
    await setToken(data.token);
    setUser(data.user);
  }

  async function register(name, email, password, phone) {
    const data = await api.register(name, email, password, phone);
    await setToken(data.token);
    setUser(data.user);
  }

  async function loginWithOtp(phone, code, name) {
    const data = await api.verifyOtp(phone, code, name);
    await setToken(data.token);
    setUser(data.user);
  }

  // Sign in with a code delivered on WhatsApp (same account as the SMS sign in)
  async function loginWithWhatsApp(phone, code, name) {
    const data = await api.waVerify(phone, code, name);
    await setToken(data.token);
    setUser(data.user);
  }

  // Sign in with Google or Apple: opens the Godelicious sign-in page in the phone's browser,
  // then waits for the result to come back through the server.
  async function loginWithSocial(provider) {
    const bytes = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16));
    const sid = bytes.join("");
    await Linking.openURL(`https://godelicious.in/login/app?sid=${sid}${provider ? `&p=${provider}` : ""}`);
    for (let i = 0; i < 100; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      try {
        const d = await api.firebaseHandoffGet(sid);
        if (d.ready) {
          await setToken(d.token);
          setUser(d.user);
          return true;
        }
      } catch (_) {}
    }
    throw new Error("Sign-in timed out. Please try again.");
  }

  async function logout() {
    await clearToken();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, loginWithOtp, loginWithWhatsApp, loginWithSocial, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
