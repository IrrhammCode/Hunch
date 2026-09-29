import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { USE_MOCK } from "../config/chain";
import {
  clearMeraSession,
  ensureMeraLogin,
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
  /** Mera passkey EOA or mock wallet. */
  address: string | null;
  mera: boolean;
};

export type AuthMethod = "mera" | "mock" | null;

type AuthContextValue = {
  user: SessionUser | null;
  ready: boolean;
  /** Always false — Privy removed. Kept for call-site compatibility. */
  privyMode: boolean;
  /** True when native passkey stack is available (dev client / TestFlight). */
  meraAvailable: boolean;
  /** Setup hint when passkeys cannot run (Expo Go / web). */
  missingAuthConfig: boolean;
  authMethod: AuthMethod;
  mockMode: boolean;
  /** Primary login — Mera passkey (Face ID / device unlock). */
  loginWithMera: (mode?: "create" | "signin" | "auto") => Promise<void>;
  /** Alias for UI copy: “Continue with Face ID”. */
  loginWithFaceId: () => Promise<void>;
  logout: () => Promise<void>;
  getEthereumProvider: () => Promise<any>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function meraUserFromRuntime(runtime: MeraRuntime): SessionUser {
  return {
    id: `mera:${runtime.address.toLowerCase()}`,
    email: "passkey@hunch.app",
    displayName: "Passkey Trader",
    address: runtime.address,
    mera: true,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  if (USE_MOCK) return <MockAuthProvider>{children}</MockAuthProvider>;
  return <MeraOnlyAuthProvider>{children}</MeraOnlyAuthProvider>;
}

function MockAuthProvider({ children }: { children: React.ReactNode }) {
  const [user] = useState<SessionUser | null>({
    id: "mock:hunch",
    email: "design@hunch.mock",
    displayName: "Design Trader",
    address: MOCK_ADDRESS_CHECKSUM,
    mera: true,
  });
  const provider = useMemo(() => createMockProvider(), []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      ready: true,
      privyMode: false,
      meraAvailable: false,
      missingAuthConfig: false,
      authMethod: "mock",
      mockMode: true,
      loginWithMera: async () => {},
      loginWithFaceId: async () => {},
      logout: async () => {},
      getEthereumProvider: async () => provider,
    }),
    [user, provider],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function MeraOnlyAuthProvider({ children }: { children: React.ReactNode }) {
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

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      ready,
      privyMode: false,
      meraAvailable: meraNativeReady(),
      missingAuthConfig: !meraNativeReady(),
      authMethod: user?.mera ? "mera" : null,
      mockMode: false,
      loginWithMera,
      loginWithFaceId: () => loginWithMera("auto"),
      logout,
      getEthereumProvider: async () => {
        if (meraRuntime) return meraRuntime.provider;
        throw new Error("Sign in with passkey first");
      },
    }),
    [user, ready, loginWithMera, logout, meraRuntime],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
