import {
  useEmbeddedEthereumWallet,
  useLoginWithEmail,
  useLoginWithOAuth,
  usePrivy,
} from "@privy-io/expo";
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
import {
  DESIGN_MODE,
  HAS_PRIVY,
  PRIVY_APP_ID,
  PRIVY_CLIENT_ID,
  USE_DEMO_AUTH,
} from "../config/chain";
import { DESIGN_USER } from "../mock/api";

const STORAGE_KEY = "hunch.session.v1";

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
  /** Embedded Privy wallet (or demo address). */
  address: string | null;
  /** True when logged in via real Privy email OTP. */
  privy: boolean;
};

type AuthContextValue = {
  user: SessionUser | null;
  ready: boolean;
  /** True when Privy SDK is configured and demo auth is off. */
  privyMode: boolean;
  /** Missing Privy App ID / Client ID — show setup screen. */
  missingPrivyConfig: boolean;
  /** Send email OTP (Privy). */
  sendOtp: (email: string) => Promise<void>;
  /** Submit email OTP (Privy). */
  loginWithOtp: (code: string, email: string) => Promise<void>;
  /** Native Sign in with Apple (Privy OAuth). */
  loginWithApple: () => Promise<void>;
  otpStatus: string;
  /** Demo-only local login (feature flag). */
  loginWithEmail: (email: string) => Promise<void>;
  signupWithEmail: (email: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
  /** EIP-1193 provider factory for the embedded wallet. */
  getEthereumProvider: () => Promise<any>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function fakeAddressFromEmail(email: string) {
  let h = 0;
  for (let i = 0; i < email.length; i++) h = (h * 31 + email.charCodeAt(i)) >>> 0;
  return `0x${h.toString(16).padStart(8, "0")}${"a1b2c3d4e5f67890abcdef".slice(0, 32)}`;
}

function emailFromPrivyUser(user: any): string {
  const linked = user?.linkedAccounts;
  if (Array.isArray(linked)) {
    const emailAcct = linked.find(
      (a: any) => a?.type === "email" || a?.email,
    );
    if (emailAcct?.email) return emailAcct.email as string;
    if (emailAcct?.address && typeof emailAcct.address === "string" && emailAcct.address.includes("@")) {
      return emailAcct.address as string;
    }
  }
  return user?.email?.address || user?.email || "privy@user";
}

function displayNameFromEmail(email: string) {
  return email.split("@")[0] || "hunch";
}

function addressFromPrivyWallets(wallets: any[]): string | null {
  if (!wallets?.length) return null;
  const eth = wallets.find((w) => w?.address?.startsWith("0x")) ?? wallets[0];
  return eth?.address ?? null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  if (DESIGN_MODE || USE_DEMO_AUTH || !HAS_PRIVY) {
    return (
      <DemoAuthProvider missingConfig={!DESIGN_MODE && !HAS_PRIVY}>
        {children}
      </DemoAuthProvider>
    );
  }
  return <PrivyAuthProvider>{children}</PrivyAuthProvider>;
}

function PrivyAuthProvider({ children }: { children: React.ReactNode }) {
  const { user: privyUser, isReady: privyReady, logout: privyLogout } = usePrivy();
  const { wallets } = useEmbeddedEthereumWallet();
  const { sendCode, loginWithCode, state: otpState } = useLoginWithEmail();
  const { login: oauthLogin, state: oauthState } = useLoginWithOAuth();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);
  const [privyStuck, setPrivyStuck] = useState(false);

  // Safety: never leave the user on splash if Privy never reports isReady
  useEffect(() => {
    const t = setTimeout(() => {
      setPrivyStuck(true);
      setReady(true);
    }, 12_000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!privyReady) {
      if (privyStuck) setReady(true);
      return;
    }
    if (!privyUser) {
      setUser(null);
      setReady(true);
      return;
    }
    const email = emailFromPrivyUser(privyUser);
    const address = addressFromPrivyWallets(wallets);
    setUser({
      id: privyUser.id || `privy:${email}`,
      email,
      displayName: displayNameFromEmail(email),
      address,
      privy: true,
    });
    setReady(true);
  }, [privyReady, privyUser, wallets, privyStuck]);

  const sendOtp = useCallback(
    async (email: string) => {
      const cleaned = email.trim().toLowerCase();
      if (!cleaned.includes("@")) throw new Error("Enter a valid email");
      await sendCode({ email: cleaned });
    },
    [sendCode],
  );

  const loginWithOtp = useCallback(
    async (code: string, email: string) => {
      const cleaned = email.trim().toLowerCase();
      await loginWithCode({ code: code.trim(), email: cleaned });
    },
    [loginWithCode],
  );

  const loginWithApple = useCallback(async () => {
    await oauthLogin({ provider: "apple" });
  }, [oauthLogin]);

  const appleBusy = oauthState?.status === "loading";

  const logout = useCallback(async () => {
    try {
      await privyLogout();
    } finally {
      setUser(null);
    }
  }, [privyLogout]);

  const getEthereumProvider = useCallback(async () => {
    const w = wallets?.[0];
    if (!w) throw new Error("No embedded wallet yet — finish login first");
    return w.getProvider();
  }, [wallets]);

  const value = useMemo(
    () => ({
      user,
      ready,
      privyMode: true,
      missingPrivyConfig: false,
      sendOtp,
      loginWithOtp,
      loginWithApple,
      otpStatus:
        otpState?.status && otpState.status !== "initial"
          ? otpState.status
          : appleBusy
            ? "loading"
            : (otpState?.status ?? "initial"),
      loginWithEmail: async () => {
        throw new Error("Demo auth disabled — use Privy email OTP or Apple");
      },
      signupWithEmail: async () => {
        throw new Error("Demo auth disabled — use Privy email OTP or Apple");
      },
      logout,
      getEthereumProvider,
    }),
    [
      user,
      ready,
      sendOtp,
      loginWithOtp,
      loginWithApple,
      otpState?.status,
      appleBusy,
      logout,
      getEthereumProvider,
    ],
  );

  // Silence unused env (used for docs / debugging)
  void PRIVY_APP_ID;
  void PRIVY_CLIENT_ID;

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function DemoAuthProvider({
  children,
  missingConfig,
}: {
  children: React.ReactNode;
  missingConfig?: boolean;
}) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);

  const persist = useCallback(async (next: SessionUser | null) => {
    setUser(next);
    if (next) await storageSet(STORAGE_KEY, JSON.stringify(next));
    else await storageRemove(STORAGE_KEY);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        if (DESIGN_MODE) {
          // Auto-enter as designer — skip login friction for UI work
          await persist({
            id: DESIGN_USER.id,
            email: DESIGN_USER.email,
            displayName: DESIGN_USER.displayName,
            address: DESIGN_USER.address,
            privy: false,
          });
          return;
        }
        const raw = await storageGet(STORAGE_KEY);
        if (raw) setUser(JSON.parse(raw) as SessionUser);
      } catch {
        /* ignore */
      } finally {
        setReady(true);
      }
    })();
  }, [persist]);

  const loginWithEmail = useCallback(
    async (email: string) => {
      const cleaned = email.trim().toLowerCase();
      if (!cleaned.includes("@")) throw new Error("Enter a valid email");
      await persist({
        id: `local:${cleaned}`,
        email: cleaned,
        displayName: cleaned.split("@")[0]!,
        address: fakeAddressFromEmail(cleaned),
        privy: false,
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
        privy: false,
      });
    },
    [persist],
  );

  const logout = useCallback(async () => {
    if (DESIGN_MODE) {
      // Stay logged in for design — re-seed designer session
      await persist({
        id: DESIGN_USER.id,
        email: DESIGN_USER.email,
        displayName: DESIGN_USER.displayName,
        address: DESIGN_USER.address,
        privy: false,
      });
      return;
    }
    await persist(null);
  }, [persist]);

  const value = useMemo(
    () => ({
      user,
      ready,
      privyMode: false,
      missingPrivyConfig: Boolean(missingConfig),
      sendOtp: async () => {
        throw new Error("Privy not configured");
      },
      loginWithOtp: async () => {
        throw new Error("Privy not configured");
      },
      loginWithApple: async () => {
        throw new Error("Privy not configured");
      },
      otpStatus: "initial",
      loginWithEmail,
      signupWithEmail,
      logout,
      getEthereumProvider: async () => {
        throw new Error("No Privy wallet in demo mode");
      },
    }),
    [user, ready, missingConfig, loginWithEmail, signupWithEmail, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
