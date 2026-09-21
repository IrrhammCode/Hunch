import {
  useEmbeddedEthereumWallet,
  useLoginWithEmail,
  useLoginWithOAuth,
  usePrivy,
} from "@privy-io/expo";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  HAS_PRIVY,
  PRIVY_APP_ID,
  PRIVY_CLIENT_ID,
  USE_MOCK,
} from "../config/chain";
import {
  clearMeraSession,
  ensureMeraLogin,
  loadMeraSession,
  meraNativeReady,
  unlockMeraFromStored,
  type MeraRuntime,
} from "./mera";
import { createMockProvider } from "../mock/provider";
import { MOCK_ADDRESS_CHECKSUM } from "../mock/fixtures";

export type SessionUser = {
  id: string;
  email: string;
  displayName: string;
  /** Embedded Privy wallet or Mera passkey EOA. */
  address: string | null;
  /** True when logged in via real Privy email OTP / OAuth. */
  privy: boolean;
  /** True when logged in via Mera passkey. */
  mera?: boolean;
};

export type AuthMethod = "privy" | "mera" | "mock" | null;

type AuthContextValue = {
  user: SessionUser | null;
  ready: boolean;
  /** Real Privy when configured; false in mock design mode. */
  privyMode: boolean;
  /** Missing auth config — show setup screen. */
  missingPrivyConfig: boolean;
  /** Native passkey module available (iOS/Android dev client). */
  meraAvailable: boolean;
  authMethod: AuthMethod;
  /** Full mock design mode (EXPO_PUBLIC_USE_MOCK=1). */
  mockMode: boolean;
  /** Send email OTP (Privy). */
  sendOtp: (email: string) => Promise<void>;
  /** Submit email OTP (Privy). */
  loginWithOtp: (code: string, email: string) => Promise<void>;
  /** Native Sign in with Apple (Privy OAuth). */
  loginWithApple: () => Promise<void>;
  /** Mera passkey — Agora bounty path. */
  loginWithMera: (mode?: "create" | "signin" | "auto") => Promise<void>;
  otpStatus: string;
  /** Removed — throws. Use Mera or Privy. */
  loginWithEmail: (email: string) => Promise<void>;
  signupWithEmail: (email: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
  /** EIP-1193 provider factory for Privy or Mera wallet. */
  getEthereumProvider: () => Promise<any>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function emailFromPrivyUser(user: any): string {
  const linked = user?.linkedAccounts;
  if (Array.isArray(linked)) {
    const emailAcct = linked.find((a: any) => a?.type === "email" || a?.email);
    if (emailAcct?.email) return emailAcct.email as string;
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

function meraUserFromRuntime(runtime: MeraRuntime): SessionUser {
  return {
    id: `mera:${runtime.address.toLowerCase()}`,
    email: "passkey@hunch.app",
    displayName: "Passkey",
    address: runtime.address,
    privy: false,
    mera: true,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  if (USE_MOCK) {
    return <MockAuthProvider>{children}</MockAuthProvider>;
  }
  if (!HAS_PRIVY) {
    return <MeraOnlyAuthProvider missingConfig={!meraNativeReady()}>{children}</MeraOnlyAuthProvider>;
  }
  return <PrivyAuthProvider>{children}</PrivyAuthProvider>;
}

/** FULL MOCK — design/demo until Tenderly + live stack. */
function MockAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>({
    id: "mock:hunch",
    email: "design@hunch.mock",
    displayName: "Design Trader",
    address: MOCK_ADDRESS_CHECKSUM,
    privy: false,
    mera: false,
  });
  const [ready] = useState(true);
  const provider = useMemo(() => createMockProvider(), []);

  const value = useMemo(
    () => ({
      user,
      ready,
      privyMode: false,
      missingPrivyConfig: false,
      meraAvailable: false,
      authMethod: "mock" as AuthMethod,
      mockMode: true,
      sendOtp: async () => {
        /* mock */
      },
      loginWithOtp: async () => {
        setUser({
          id: "mock:hunch",
          email: "design@hunch.mock",
          displayName: "Design Trader",
          address: MOCK_ADDRESS_CHECKSUM,
          privy: false,
        });
      },
      loginWithApple: async () => {
        setUser({
          id: "mock:hunch",
          email: "design@hunch.mock",
          displayName: "Design Trader",
          address: MOCK_ADDRESS_CHECKSUM,
          privy: false,
        });
      },
      loginWithMera: async () => {
        setUser({
          id: "mock:mera",
          email: "passkey@hunch.mock",
          displayName: "Design Passkey",
          address: MOCK_ADDRESS_CHECKSUM,
          privy: false,
          mera: true,
        });
      },
      otpStatus: "initial",
      loginWithEmail: async () => {
        setUser({
          id: "mock:email",
          email: "design@hunch.mock",
          displayName: "Design Trader",
          address: MOCK_ADDRESS_CHECKSUM,
          privy: false,
        });
      },
      signupWithEmail: async () => {
        setUser({
          id: "mock:email",
          email: "design@hunch.mock",
          displayName: "Design Trader",
          address: MOCK_ADDRESS_CHECKSUM,
          privy: false,
        });
      },
      logout: async () => {
        setUser(null);
      },
      getEthereumProvider: async () => provider,
    }),
    [user, ready, provider],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function PrivyAuthProvider({ children }: { children: React.ReactNode }) {
  const { user: privyUser, isReady: privyReady, logout: privyLogout } = usePrivy();
  const { wallets } = useEmbeddedEthereumWallet();
  const { sendCode, loginWithCode, state: otpState } = useLoginWithEmail();
  const { login: oauthLogin, state: oauthState } = useLoginWithOAuth();
  const [privyDerived, setPrivyDerived] = useState<SessionUser | null>(null);
  const [meraUser, setMeraUser] = useState<SessionUser | null>(null);
  const [meraRuntime, setMeraRuntime] = useState<MeraRuntime | null>(null);
  const [ready, setReady] = useState(false);
  const [privyStuck, setPrivyStuck] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setPrivyStuck(true);
      setReady(true);
    }, 12_000);
    return () => clearTimeout(t);
  }, []);

  // Restore device-local Mera session (Agora passkey path)
  useEffect(() => {
    (async () => {
      try {
        const stored = await loadMeraSession();
        if (stored?.address) {
          const rt = await unlockMeraFromStored();
          if (rt) {
            setMeraRuntime(rt);
            setMeraUser(meraUserFromRuntime(rt));
          }
        }
      } catch {
        /* ignore */
      }
    })();
  }, []);

  useEffect(() => {
    if (!privyReady) {
      if (privyStuck) setReady(true);
      return;
    }
    if (meraUser) {
      setReady(true);
      return;
    }
    if (!privyUser) {
      setPrivyDerived(null);
      setReady(true);
      return;
    }
    const email = emailFromPrivyUser(privyUser);
    const address = addressFromPrivyWallets(wallets);
    setPrivyDerived({
      id: privyUser.id || `privy:${email}`,
      email,
      displayName: displayNameFromEmail(email),
      address,
      privy: true,
    });
    setReady(true);
  }, [privyReady, privyUser, wallets, privyStuck, meraUser]);

  const user = meraUser ?? privyDerived;
  const authMethod: AuthMethod = meraUser ? "mera" : privyDerived ? "privy" : null;

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
      setMeraUser(null);
      setMeraRuntime(null);
    },
    [loginWithCode],
  );

  const loginWithApple = useCallback(async () => {
    await oauthLogin({ provider: "apple" });
    setMeraUser(null);
    setMeraRuntime(null);
  }, [oauthLogin]);

  const loginWithMera = useCallback(
    async (mode: "create" | "signin" | "auto" = "auto") => {
      const rt = await ensureMeraLogin(mode);
      setMeraRuntime(rt);
      setMeraUser(meraUserFromRuntime(rt));
      setReady(true);
    },
    [],
  );

  const appleBusy = oauthState?.status === "loading";

  const logout = useCallback(async () => {
    try {
      await clearMeraSession();
      setMeraUser(null);
      setMeraRuntime(null);
      await privyLogout();
    } finally {
      setPrivyDerived(null);
    }
  }, [privyLogout]);

  const getEthereumProvider = useCallback(async () => {
    if (meraRuntime) return meraRuntime.provider;
    const w = wallets?.[0];
    if (!w) {
      throw new Error("No wallet — finish Mera passkey or Privy login first");
    }
    return w.getProvider();
  }, [meraRuntime, wallets]);

  const value = useMemo(
    () => ({
      user,
      ready,
      privyMode: true,
      missingPrivyConfig: false,
      meraAvailable: meraNativeReady(),
      authMethod,
      mockMode: false,
      sendOtp,
      loginWithOtp,
      loginWithApple,
      loginWithMera,
      otpStatus:
        otpState?.status && otpState.status !== "initial"
          ? otpState.status
          : appleBusy
            ? "loading"
            : (otpState?.status ?? "initial"),
      loginWithEmail: async () => {
        throw new Error("Demo auth disabled — use Mera passkey or Privy");
      },
      signupWithEmail: async () => {
        throw new Error("Demo auth disabled — use Mera passkey or Privy");
      },
      logout,
      getEthereumProvider,
    }),
    [
      user,
      ready,
      authMethod,
      sendOtp,
      loginWithOtp,
      loginWithApple,
      loginWithMera,
      otpState?.status,
      appleBusy,
      logout,
      getEthereumProvider,
    ],
  );

  void PRIVY_APP_ID;
  void PRIVY_CLIENT_ID;

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function MeraOnlyAuthProvider({
  children,
  missingConfig,
}: {
  children: React.ReactNode;
  missingConfig?: boolean;
}) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);
  const [meraRuntime, setMeraRuntime] = useState<MeraRuntime | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const rt = await unlockMeraFromStored();
        if (rt) {
          setMeraRuntime(rt);
          setUser(meraUserFromRuntime(rt));
        }
      } catch {
        /* ignore */
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const loginWithMera = useCallback(
    async (mode: "create" | "signin" | "auto" = "auto") => {
      const rt = await ensureMeraLogin(mode);
      setMeraRuntime(rt);
      setUser(meraUserFromRuntime(rt));
      setReady(true);
    },
    [],
  );

  const logout = useCallback(async () => {
    await clearMeraSession();
    setMeraRuntime(null);
    setUser(null);
  }, []);

  const authMethod: AuthMethod = user?.mera ? "mera" : null;

  const value = useMemo(
    () => ({
      user,
      ready,
      privyMode: false,
      missingPrivyConfig: Boolean(missingConfig),
      meraAvailable: meraNativeReady(),
      authMethod,
      mockMode: false,
      sendOtp: async () => {
        throw new Error("Privy not configured — use Mera passkey");
      },
      loginWithOtp: async () => {
        throw new Error("Privy not configured — use Mera passkey");
      },
      loginWithApple: async () => {
        throw new Error("Privy not configured — use Mera passkey");
      },
      loginWithMera,
      otpStatus: "initial",
      loginWithEmail: async () => {
        throw new Error("Demo auth removed — use Mera passkey or Privy");
      },
      signupWithEmail: async () => {
        throw new Error("Demo auth removed — use Mera passkey or Privy");
      },
      logout,
      getEthereumProvider: async () => {
        if (meraRuntime) return meraRuntime.provider;
        throw new Error("No wallet — sign in with Mera passkey first");
      },
    }),
    [user, ready, missingConfig, authMethod, loginWithMera, logout, meraRuntime],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
