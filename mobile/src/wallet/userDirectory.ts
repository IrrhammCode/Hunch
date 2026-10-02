const memStore = new Map<string, string>();

const safeStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      const mod = require("@react-native-async-storage/async-storage");
      const storage = mod?.default || mod;
      if (storage?.getItem) return await storage.getItem(key);
    } catch {
      /* fall through to memory fallback */
    }
    return memStore.get(key) ?? null;
  },
  setItem: async (key: string, val: string): Promise<void> => {
    try {
      const mod = require("@react-native-async-storage/async-storage");
      const storage = mod?.default || mod;
      if (storage?.setItem) {
        await storage.setItem(key, val);
        return;
      }
    } catch {
      /* fall through to memory fallback */
    }
    memStore.set(key, val);
  },
};

export interface ContactProfile {
  handle: string;
  name: string;
  address: string;
  verified: boolean;
  avatarColor: string;
  bio?: string;
}

/**
 * Canonical verified Monad Testnet directory for Hunch.
 * Allows traders to send AUSD and MON by username (@handle) instead of 42-char hex strings.
 */
export const VERIFIED_DIRECTORY: ContactProfile[] = [
  {
    handle: "@alice",
    name: "Alice L.",
    address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    verified: true,
    avatarColor: "#2EE59D",
    bio: "Hunch Alpha Trader · Monad Testnet",
  },
  {
    handle: "@bob",
    name: "Bob Trader",
    address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    verified: true,
    avatarColor: "#836EF9",
    bio: "Liquidity Provider & Perpl Arbitrageur",
  },
  {
    handle: "@monad_whale",
    name: "Monad Whale",
    address: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
    verified: true,
    avatarColor: "#D6FF3F",
    bio: "Ecosystem Liquidity & Faucet Patron",
  },
  {
    handle: "@keone",
    name: "Keone Hon",
    address: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
    verified: true,
    avatarColor: "#836EF9",
    bio: "Monad Core Contributor",
  },
  {
    handle: "@satoshi",
    name: "Satoshi M.",
    address: "0x9965507D1a55bcC2695C58ba16FB37d819B0A4df",
    verified: true,
    avatarColor: "#FFB020",
    bio: "Early Hunch Adopter",
  },
  {
    handle: "@hunch_bot",
    name: "Hunch Settlement Bot",
    address: "0x976EA74026E72CD555567505e6b14847190C6873",
    verified: true,
    avatarColor: "#00E5FF",
    bio: "Automated Round Keeper & Payout Dispatcher",
  },
];

import {
  fetchDirectory,
  registerDirectoryProfile,
  resolveRemoteDirectoryProfile,
} from "../api/client";

const DYNAMIC_DIRECTORY_STORAGE_KEY = "hunch_dynamic_directory_v1";

// In-memory cache starting with canonical directory
let dynamicDirectoryCache: ContactProfile[] = [...VERIFIED_DIRECTORY];

/**
 * Sync directory with remote API server.
 */
export async function syncDirectory(query?: string): Promise<ContactProfile[]> {
  try {
    const remote = await fetchDirectory(query);
    if (remote && remote.length > 0) {
      const mergedMap = new Map<string, ContactProfile>();
      for (const d of VERIFIED_DIRECTORY) mergedMap.set(d.address.toLowerCase(), d);
      for (const r of remote) mergedMap.set(r.address.toLowerCase(), r);
      dynamicDirectoryCache = Array.from(mergedMap.values());
      await safeStorage.setItem(
        DYNAMIC_DIRECTORY_STORAGE_KEY,
        JSON.stringify(dynamicDirectoryCache),
      );
    }
    return dynamicDirectoryCache;
  } catch {
    // If offline or network fails, try local storage
    try {
      const raw = await safeStorage.getItem(DYNAMIC_DIRECTORY_STORAGE_KEY);
      if (raw) {
        const stored = JSON.parse(raw);
        if (Array.isArray(stored) && stored.length > 0) {
          dynamicDirectoryCache = stored;
        }
      }
    } catch {
      /* ignore */
    }
    return dynamicDirectoryCache;
  }
}

/**
 * Register a user's handle globally.
 */
export async function registerUserHandle(payload: {
  handle: string;
  address: string;
  name?: string;
  bio?: string;
  avatarColor?: string;
}): Promise<ContactProfile> {
  const res = await registerDirectoryProfile(payload);
  if (!res.success || !res.profile) {
    throw new Error(res.message || "Failed to register handle");
  }

  // Update in-memory cache
  const idx = dynamicDirectoryCache.findIndex(
    (c) => c.address.toLowerCase() === res.profile.address.toLowerCase(),
  );
  if (idx >= 0) {
    dynamicDirectoryCache[idx] = res.profile;
  } else {
    dynamicDirectoryCache.push(res.profile);
  }
  await safeStorage.setItem(
    DYNAMIC_DIRECTORY_STORAGE_KEY,
    JSON.stringify(dynamicDirectoryCache),
  );
  return res.profile;
}

const RECENT_RECIPIENTS_STORAGE_KEY = "hunch_recent_recipients_v1";

export interface ParsedPaymentQr {
  address: string;
  handle?: string;
  amount?: string;
  token?: "AUSD" | "MON";
}

/**
 * Resolve any input: @handle, handle.mon, or raw 0x address.
 */
export function resolveUserInput(input: string): {
  address: string;
  profile: ContactProfile | null;
  isValid: boolean;
} {
  const clean = input.trim();
  if (!clean) {
    return { address: "", profile: null, isValid: false };
  }

  const dir = dynamicDirectoryCache.length > 0 ? dynamicDirectoryCache : VERIFIED_DIRECTORY;

  // 1. Direct handle match (@handle or handle)
  const normalizedHandle = clean.startsWith("@") ? clean.toLowerCase() : `@${clean.toLowerCase()}`;
  const foundByHandle = dir.find(
    (c) => c.handle.toLowerCase() === normalizedHandle,
  );
  if (foundByHandle) {
    return {
      address: foundByHandle.address,
      profile: foundByHandle,
      isValid: true,
    };
  }

  // 2. .mon or .eth name match
  if (clean.includes(".")) {
    const prefix = clean.split(".")[0].toLowerCase();
    const foundByDomain = dir.find(
      (c) => c.handle.toLowerCase() === `@${prefix}`,
    );
    if (foundByDomain) {
      return {
        address: foundByDomain.address,
        profile: foundByDomain,
        isValid: true,
      };
    }
  }

  // 3. Raw 0x EVM address
  const isEvm = /^0x[a-fA-F0-9]{40}$/.test(clean);
  if (isEvm) {
    const knownProfile = dir.find(
      (c) => c.address.toLowerCase() === clean.toLowerCase(),
    );
    return {
      address: clean,
      profile: knownProfile || null,
      isValid: true,
    };
  }

  return { address: clean, profile: null, isValid: false };
}

/**
 * Async resolver with remote fallback if handle isn't cached locally.
 */
export async function resolveUserInputAsync(input: string): Promise<{
  address: string;
  profile: ContactProfile | null;
  isValid: boolean;
}> {
  const local = resolveUserInput(input);
  if (local.isValid && (local.profile || /^0x[a-fA-F0-9]{40}$/.test(local.address))) {
    return local;
  }

  // Try remote resolve
  try {
    const remote = await resolveRemoteDirectoryProfile(input);
    if (remote) {
      // Cache it
      const idx = dynamicDirectoryCache.findIndex(
        (c) => c.address.toLowerCase() === remote.address.toLowerCase(),
      );
      if (idx >= 0) dynamicDirectoryCache[idx] = remote;
      else dynamicDirectoryCache.push(remote);

      return {
        address: remote.address,
        profile: remote,
        isValid: true,
      };
    }
  } catch {
    /* ignore */
  }

  return local;
}

/**
 * Parse any QR payload into structured payment details:
 * - hunch:pay?address=0x...&amount=50&token=AUSD&handle=@alice
 * - ethereum:0x...?amount=50&token=AUSD
 * - JSON string: {"address":"0x...","amount":"25","token":"AUSD"}
 * - Raw 0x address or @handle
 */
export function parseQrPayload(raw: string): ParsedPaymentQr | null {
  const clean = raw.trim();
  if (!clean) return null;

  // 1. JSON payload
  if (clean.startsWith("{") && clean.endsWith("}")) {
    try {
      const data = JSON.parse(clean);
      if (data.address && /^0x[a-fA-F0-9]{40}$/.test(data.address)) {
        return {
          address: data.address,
          handle: data.handle,
          amount: data.amount ? String(data.amount) : undefined,
          token: data.token === "MON" ? "MON" : "AUSD",
        };
      }
    } catch {
      /* fall through */
    }
  }

  // 2. Hunch Pay URI or Ethereum URI
  if (clean.startsWith("hunch:pay?") || clean.startsWith("ethereum:")) {
    try {
      let addr = "";
      let qs = "";

      if (clean.startsWith("hunch:pay?")) {
        qs = clean.slice("hunch:pay?".length);
      } else {
        const withoutPrefix = clean.slice("ethereum:".length);
        const qIdx = withoutPrefix.indexOf("?");
        if (qIdx !== -1) {
          addr = withoutPrefix.slice(0, qIdx);
          qs = withoutPrefix.slice(qIdx + 1);
        } else {
          addr = withoutPrefix;
        }
      }

      const params = new URLSearchParams(qs);
      const address = params.get("address") || addr;
      const handle = params.get("handle") || undefined;
      const amount = params.get("amount") || undefined;
      const rawToken = params.get("token")?.toUpperCase();
      const token: "AUSD" | "MON" = rawToken === "MON" ? "MON" : "AUSD";

      if (address && /^0x[a-fA-F0-9]{40}$/.test(address)) {
        return { address, handle, amount, token };
      }
    } catch {
      /* fall through */
    }
  }

  // 3. User handle e.g. @alice
  if (clean.startsWith("@")) {
    const resolved = resolveUserInput(clean);
    if (resolved.isValid) {
      return {
        address: resolved.address,
        handle: resolved.profile?.handle || clean,
      };
    }
  }

  // 4. Raw 0x EVM address
  if (/^0x[a-fA-F0-9]{40}$/.test(clean)) {
    const resolved = resolveUserInput(clean);
    return {
      address: clean,
      handle: resolved.profile?.handle,
    };
  }

  return null;
}

/**
 * Generate standard payment QR string:
 * e.g. hunch:pay?address=0x...&amount=50&token=AUSD&handle=@alice
 */
export function generatePaymentUri(params: {
  address: string;
  amount?: string;
  token?: "AUSD" | "MON";
  handle?: string;
}): string {
  const parts: string[] = [`address=${params.address}`];
  if (params.amount && parseFloat(params.amount) > 0) {
    parts.push(`amount=${encodeURIComponent(params.amount.trim())}`);
  }
  if (params.token) {
    parts.push(`token=${params.token}`);
  }
  if (params.handle) {
    parts.push(`handle=${encodeURIComponent(params.handle)}`);
  }
  return `hunch:pay?${parts.join("&")}`;
}

/**
 * Save recently sent recipient to local cache for quick re-use.
 */
export async function saveRecentRecipient(contact: {
  address: string;
  handle?: string;
}): Promise<void> {
  try {
    const raw = await safeStorage.getItem(RECENT_RECIPIENTS_STORAGE_KEY);
    const existing: Array<{ address: string; handle?: string }> = raw ? JSON.parse(raw) : [];
    const filtered = existing.filter(
      (c) => c.address.toLowerCase() !== contact.address.toLowerCase(),
    );
    const updated = [contact, ...filtered].slice(0, 10);
    await safeStorage.setItem(RECENT_RECIPIENTS_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    /* ignore storage errors */
  }
}

/**
 * Get recent recipients combined with verified directory.
 */
export async function getRecentRecipients(): Promise<ContactProfile[]> {
  try {
    const raw = await safeStorage.getItem(RECENT_RECIPIENTS_STORAGE_KEY);
    const recents: Array<{ address: string; handle?: string }> = raw ? JSON.parse(raw) : [];

    const result: ContactProfile[] = [];
    const seen = new Set<string>();

    const pool = dynamicDirectoryCache.length > 0 ? dynamicDirectoryCache : VERIFIED_DIRECTORY;

    for (const r of recents) {
      if (seen.has(r.address.toLowerCase())) continue;
      seen.add(r.address.toLowerCase());
      const known = pool.find(
        (c) => c.address.toLowerCase() === r.address.toLowerCase(),
      );
      if (known) {
        result.push(known);
      } else {
        result.push({
          handle: r.handle || `@user_${r.address.slice(2, 6)}`,
          name: r.handle || `Trader ${r.address.slice(0, 6)}`,
          address: r.address,
          verified: false,
          avatarColor: "#8B8E97",
        });
      }
    }

    // Append standard directory
    for (const d of pool) {
      if (!seen.has(d.address.toLowerCase())) {
        seen.add(d.address.toLowerCase());
        result.push(d);
      }
    }

    return result.slice(0, 8);
  } catch {
    return (dynamicDirectoryCache.length > 0 ? dynamicDirectoryCache : VERIFIED_DIRECTORY).slice(0, 6);
  }
}
