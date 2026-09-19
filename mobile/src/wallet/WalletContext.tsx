import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { fetchWallet, type WalletSnapshot } from "../api/client";
import { useAuth } from "../auth/AuthContext";

type WalletContextValue = {
  me: WalletSnapshot | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const { user, ready, privyMode } = useAuth();
  const [me, setMe] = useState<WalletSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const address = user?.address ?? null;

  const refresh = useCallback(async () => {
    try {
      setError(null);
      if (address) {
        setMe(await fetchWallet(address));
      } else {
        setMe(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "wallet fetch failed");
    } finally {
      setLoading(false);
    }
  }, [address, privyMode]);

  useEffect(() => {
    if (!ready) return;
    refresh();
    const id = setInterval(refresh, 12000);
    return () => clearInterval(id);
  }, [ready, refresh]);

  const value = useMemo(
    () => ({ me, loading, error, refresh }),
    [me, loading, error, refresh],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet within WalletProvider");
  return ctx;
}
