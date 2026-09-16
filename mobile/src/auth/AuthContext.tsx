import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const STORAGE_KEY = "hunch.session.v1";

/** In-memory fallback when SecureStore / native storage is unavailable (Expo Go quirks). */
const memory = new Map<string, string>();

async function storageGet(key: string): Promise<string | null> {
  try {
    if (Platform.OS === "web") {
      return typeof localStorage !== "undefined" ? localStorage.getItem(key) : memory.get(key) ?? null;
    }
    return (await SecureStore.getItemAsync(key)) ?? memory.get(key) ?? null;
  } catch {
    return memory.get(key) ?? null;
  }
}

async function storageSet(key: string, value: string): Promise<void> {
  memory.set(key, value);
  try {
    if (Platform.OS === "web") {
      localStorage?.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  } catch {
    /* keep memory */
  }
}

async function storageRemove(key: string): Promise<void> {
  memory.delete(key);
  try {
    if (Platform.OS === "web") {
      localStorage?.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  } catch {
    /* keep memory */
  }
}

export type SessionUser = {
  id: string;
  email: string;
  displayName: string;
  /** Demo wallet until Privy embedded wallet is wired */
  address: string;
};

type AuthContextValue = {
  user: SessionUser | null;
  ready: boolean;
  loginWithEmail: (email: string) => Promise<void>;
  signupWithEmail: (email: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function fakeAddressFromEmail(email: string) {
  let h = 0;
  for (let i = 0; i < email.length; i++) h = (h * 31 + email.charCodeAt(i)) >>> 0;
  return `0x${h.toString(16).padStart(8, "0")}${"a1b2c3d4e5f67890abcdef".slice(0, 32)}`;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await storageGet(STORAGE_KEY);
        if (raw) setUser(JSON.parse(raw) as SessionUser);
      } catch {
        /* ignore corrupt session */
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const persist = useCallback(async (next: SessionUser | null) => {
    setUser(next);
    if (next) await storageSet(STORAGE_KEY, JSON.stringify(next));
    else await storageRemove(STORAGE_KEY);
  }, []);

  const loginWithEmail = useCallback(
    async (email: string) => {
      const cleaned = email.trim().toLowerCase();
      if (!cleaned.includes("@")) throw new Error("Enter a valid email");
      await persist({
        id: `local:${cleaned}`,
        email: cleaned,
        displayName: cleaned.split("@")[0]!,
        address: fakeAddressFromEmail(cleaned),
      });
    },
    [persist],
  );

  const signupWithEmail = useCallback(
    async (email: string, displayName?: string) => {
      const cleaned = email.trim().toLowerCase();
      if (!cleaned.includes("@")) throw new Error("Enter a valid email");
      await persist({
        id: `local:${cleaned}`,
        email: cleaned,
        displayName: (displayName || cleaned.split("@")[0]!).trim(),
        address: fakeAddressFromEmail(cleaned),
      });
    },
    [persist],
  );

  const logout = useCallback(async () => {
    await persist(null);
  }, [persist]);

  const value = useMemo(
    () => ({ user, ready, loginWithEmail, signupWithEmail, logout }),
    [user, ready, loginWithEmail, signupWithEmail, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
