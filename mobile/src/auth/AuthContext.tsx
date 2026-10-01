import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  clearMeraSession,
  ensureMeraLogin,
  isNativePasskeySupported,
  meraNativeReady,
  unlockMeraFromStored,
  type MeraRuntime,
} from "./mera";

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
  /** True when passkey stack is available to use. */
  meraAvailable: boolean;
  /** True when native hardware passkey/Face ID is present. */
  isNativePasskey: boolean;
  /** Setup hint when passkeys cannot run. */
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
  return <MeraOnlyAuthProvider>{children}</MeraOnlyAuthProvider>;
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

  const isNative = isNativePasskeySupported();

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      ready,
      privyMode: false,
      meraAvailable: true,
      isNativePasskey: isNative,
      missingAuthConfig: false,
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
    [user, ready, loginWithMera, logout, meraRuntime, isNative],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
