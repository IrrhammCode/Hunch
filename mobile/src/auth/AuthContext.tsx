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
  createReviewerAccount,
  ensureMeraLogin,
  getLastSavedAccount,
  getSavedAccounts,
  isNativePasskeySupported,
  lockMeraSession,
  meraNativeReady,
  removeSavedAccount,
  signInSavedAccount,
  unlockMeraFromStored,
  type MeraRuntime,
  type SavedMeraAccount,
} from "./mera";

export type { SavedMeraAccount };

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
  /** Remembered account on this device (if any). */
  savedAccount: SavedMeraAccount | null;
  /** All accounts known on this device. */
  savedAccounts: SavedMeraAccount[];
  refreshSavedAccount: () => Promise<void>;
  forgetAccount: (address: string) => Promise<void>;
  signInWithSavedAccount: (address: string) => Promise<void>;
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
  /** Primary login — Mera passkey (Face ID / device unlock). Defaults to "signin". */
  loginWithMera: (mode?: "create" | "signin" | "auto") => Promise<void>;
  /** Alias for UI copy: “Continue with Face ID” — strictly unlocks / signs in. */
  loginWithFaceId: () => Promise<void>;
  /** Demo / Apple Reviewer Login — bypasses device biometrics for App Review. */
  loginAsReviewer: () => Promise<void>;
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
  const [savedAccount, setSavedAccount] = useState<SavedMeraAccount | null>(null);
  const [savedAccounts, setSavedAccounts] = useState<SavedMeraAccount[]>([]);

  const refreshSavedAccount = useCallback(async () => {
    try {
      const [last, all] = await Promise.all([
        getLastSavedAccount(),
        getSavedAccounts(),
      ]);
      setSavedAccount(last);
      setSavedAccounts(all);
    } catch {
      /* ignore */
    }
  }, []);

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
        await refreshSavedAccount();
        setReady(true);
      }
    })();
  }, [refreshSavedAccount]);

  const loginWithMera = useCallback(
    async (mode: "create" | "signin" | "auto" = "signin") => {
      const rt = await ensureMeraLogin(mode);
      setMeraRuntime(rt);
      setUser(meraUserFromRuntime(rt));
      await refreshSavedAccount();
      setReady(true);
    },
    [refreshSavedAccount],
  );

  const loginWithFaceId = useCallback(async () => {
    // Strictly sign in / unlock existing passkey. NEVER create a new account!
    await loginWithMera("signin");
  }, [loginWithMera]);

  const loginAsReviewer = useCallback(async () => {
    const rt = await createReviewerAccount();
    setMeraRuntime(rt);
    setUser(meraUserFromRuntime(rt));
    await refreshSavedAccount();
    setReady(true);
  }, [refreshSavedAccount]);

  const signInExplicitAccount = useCallback(
    async (address: string) => {
      const rt = await signInSavedAccount(address);
      setMeraRuntime(rt);
      setUser(meraUserFromRuntime(rt));
      await refreshSavedAccount();
      setReady(true);
    },
    [refreshSavedAccount],
  );

  const logout = useCallback(async () => {
    // Lock runtime session, but preserve remembered device account
    await lockMeraSession();
    setMeraRuntime(null);
    setUser(null);
    await refreshSavedAccount();
  }, [refreshSavedAccount]);

  const forgetAccount = useCallback(
    async (address: string) => {
      await removeSavedAccount(address);
      if (user?.address?.toLowerCase() === address.toLowerCase()) {
        setMeraRuntime(null);
        setUser(null);
      }
      await refreshSavedAccount();
    },
    [user, refreshSavedAccount],
  );

  const isNative = isNativePasskeySupported();

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      ready,
      savedAccount,
      savedAccounts,
      refreshSavedAccount,
      forgetAccount,
      signInWithSavedAccount: signInExplicitAccount,
      privyMode: false,
      meraAvailable: true,
      isNativePasskey: isNative,
      missingAuthConfig: false,
      authMethod: user?.mera ? "mera" : null,
      mockMode: false,
      loginWithMera,
      loginWithFaceId,
      loginAsReviewer,
      logout,
      getEthereumProvider: async () => {
        if (meraRuntime) return meraRuntime.provider;
        throw new Error("Sign in with passkey first");
      },
    }),
    [
      user,
      ready,
      savedAccount,
      savedAccounts,
      refreshSavedAccount,
      forgetAccount,
      signInExplicitAccount,
      loginWithMera,
      loginWithFaceId,
      loginAsReviewer,
      logout,
      meraRuntime,
      isNative,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
