import { useState, useEffect, useCallback } from "react";
import {
  fetchPerplMarkets,
  fetchPerplAccount,
  placePerplOrder,
  closePerplPosition,
  reversePerplPosition,
  updatePerplPositionGuards,
  executeHedgeForHunch,
  PerplMarket,
  PerplPosition,
  PerplAccount,
} from "../api/client";

export function usePerplMarkets(pollIntervalMs = 5000) {
  const [markets, setMarkets] = useState<PerplMarket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetchPerplMarkets();
      setMarkets(res.markets);
      setError(null);
    } catch (e: any) {
      setError(e.message || "Failed to load Perpl markets");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, pollIntervalMs);
    return () => clearInterval(timer);
  }, [refresh, pollIntervalMs]);

  return { markets, loading, error, refresh };
}

export function usePerplAccount(address: string | null, pollIntervalMs = 5000) {
  const [account, setAccount] = useState<PerplAccount | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!address) return;
    try {
      setLoading(true);
      const acc = await fetchPerplAccount(address);
      setAccount(acc);
    } catch {
      // Keep previous account on transient error
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    refresh();
    if (!address) return;
    const timer = setInterval(refresh, pollIntervalMs);
    return () => clearInterval(timer);
  }, [refresh, address, pollIntervalMs]);

  return { account, loading, refresh };
}

export {
  placePerplOrder,
  closePerplPosition,
  reversePerplPosition,
  updatePerplPositionGuards,
  executeHedgeForHunch,
  PerplMarket,
  PerplPosition,
  PerplAccount,
};
