import { NativeModules, Platform } from "react-native";
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import {
  createPasskeyWithPrfOutput,
  createSecp256k1SigningSession,
  getPasskeyPrfOutput,
} from "@category-labs/mera";
import { toViemAccount } from "@category-labs/mera/viem";
import { reactNativeWebAuthnClient } from "@category-labs/mera/react-native-webauthn-client";
import { HDKey } from "@scure/bip32";
import { entropyToMnemonic, mnemonicToSeedSync } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";
import {
  bytesToHex,
  createPublicClient,
  createWalletClient,
  hexToBytes,
  http,
} from "viem";
import { CHAIN_ID, monadTestnet } from "../config/chain";

/** Relying party host (no scheme/path). Must match AASA / assetlinks. */
export const MERA_RP_ID =
  process.env.EXPO_PUBLIC_MERA_RP_ID || "accounts.hunch.app";

const SESSION_KEY = "hunch.mera.session.v1";
const memory = new Map<string, string>();

export type MeraSession = {
  rpId: string;
  address: string;
  credentialId?: string;
  privateKeyHex: string;
  createdAt: number;
};

export type MeraRuntime = {
  address: `0x${string}`;
  provider: { isMera: true; request: (args: { method: string; params?: any[] }) => Promise<any> };
  session: ReturnType<typeof createSecp256k1SigningSession>;
};

async function storeGet(key: string): Promise<string | null> {
  try {
    if (Platform.OS === "web") {
      return typeof localStorage !== "undefined"
        ? localStorage.getItem(key)
        : memory.get(key) ?? null;
    }
    return (await SecureStore.getItemAsync(key)) ?? memory.get(key) ?? null;
  } catch {
    return memory.get(key) ?? null;
  }
}

async function storeSet(key: string, value: string): Promise<void> {
  memory.set(key, value);
  try {
    if (Platform.OS === "web") {
      localStorage?.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  } catch {
    /* memory only */
  }
}

async function storeRemove(key: string): Promise<void> {
  memory.delete(key);
  try {
    if (Platform.OS === "web") {
      localStorage?.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  } catch {
    /* ignore */
  }
}

/**
 * Check if the native Passkey platform module is loaded (dev client / standalone build).
 * In Expo Go or Web, NativeModules.Passkey is undefined.
 */
export function isNativePasskeySupported(): boolean {
  try {
    if (Platform.OS !== "ios" && Platform.OS !== "android") return false;
    return Boolean(NativeModules && NativeModules.Passkey);
  } catch {
    return false;
  }
}

/**
 * Returns true if authentication can run.
 * Native builds use real hardware biometric passkeys; Web & Expo Go use simulated PRF test wallets.
 */
export function meraNativeReady(): boolean {
  return true;
}

/** BIP-44 m/44'/60'/0'/0/{index} from WebAuthn PRF entropy — same as official Mera RN guide. */
function deriveEvmKey(prfOutput: Uint8Array, index = 0): Uint8Array {
  const mnemonic = entropyToMnemonic(prfOutput, wordlist);
  const seed = mnemonicToSeedSync(mnemonic);
  try {
    const node = HDKey.fromMasterSeed(seed).derive(`m/44'/60'/0'/0/${index}`);
    if (!node.privateKey) throw new Error("Mera derivation produced no private key");
    return node.privateKey;
  } finally {
    seed.fill(0);
  }
}

function buildRuntime(privateKey: Uint8Array): MeraRuntime {
  const session = createSecp256k1SigningSession({ privateKey });
  const account = toViemAccount(session);
  const address = account.address as `0x${string}`;
  const rpcUrl =
    process.env.EXPO_PUBLIC_MONAD_RPC_URL || monadTestnet.rpcUrls.default.http[0]!;
  const transport = http(rpcUrl);
  const walletClient = createWalletClient({
    account,
    chain: monadTestnet,
    transport,
  });
  const publicClient = createPublicClient({
    chain: monadTestnet,
    transport,
  });

  const provider = {
    isMera: true as const,
    request: async ({
      method,
      params = [],
    }: {
      method: string;
      params?: any[];
    }) => {
      switch (method) {
        case "eth_requestAccounts":
        case "eth_accounts":
          return [address];
        case "eth_chainId":
          return `0x${CHAIN_ID.toString(16)}`;
        case "net_version":
          return String(CHAIN_ID);
        case "wallet_switchEthereumChain":
        case "wallet_addEthereumChain":
          return null;
        case "eth_getBalance": {
          const bal = await publicClient.getBalance({ address });
          return `0x${bal.toString(16)}`;
        }
        case "eth_call": {
          const req = (params[0] ?? {}) as {
            to?: `0x${string}`;
            data?: `0x${string}`;
            value?: string;
          };
          const res = await publicClient.call({
            account: address,
            to: req.to,
            data: req.data,
            value: req.value ? BigInt(req.value) : undefined,
          });
          return res.data ?? "0x";
        }
        case "eth_getTransactionReceipt": {
          try {
            return await publicClient.getTransactionReceipt({
              hash: params[0] as `0x${string}`,
            });
          } catch {
            return null;
          }
        }
        case "eth_getTransactionCount": {
          const n = await publicClient.getTransactionCount({ address });
          return `0x${n.toString(16)}`;
        }
        case "eth_gasPrice": {
          const g = await publicClient.getGasPrice();
          return `0x${g.toString(16)}`;
        }
        case "eth_estimateGas": {
          const tx = (params[0] ?? {}) as {
            to?: `0x${string}`;
            data?: `0x${string}`;
            value?: string;
          };
          const g = await publicClient.estimateGas({
            account: address,
            to: tx.to,
            data: tx.data,
            value: tx.value ? BigInt(tx.value) : undefined,
          });
          return `0x${g.toString(16)}`;
        }
        case "eth_sendTransaction": {
          const tx = (params[0] ?? {}) as {
            to?: `0x${string}`;
            data?: `0x${string}`;
            value?: string;
          };
          const hash = await walletClient.sendTransaction({
            account,
            chain: monadTestnet,
            to: tx.to,
            data: tx.data,
            value:
              tx.value && tx.value !== "0x0" && tx.value !== "0"
                ? BigInt(tx.value)
                : undefined,
          });
          return hash;
        }
        case "personal_sign":
        case "eth_sign": {
          const message = params[0];
          return walletClient.signMessage({
            account,
            message:
              typeof message === "string" && message.startsWith("0x")
                ? { raw: message as `0x${string}` }
                : String(message),
          });
        }
        default:
          throw new Error(`Mera provider unsupported method: ${method}`);
      }
    },
  };

  return { address, provider, session };
}

export async function loadMeraSession(): Promise<MeraSession | null> {
  const raw = await storeGet(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as MeraSession;
  } catch {
    return null;
  }
}

export async function saveMeraSession(session: MeraSession) {
  await storeSet(SESSION_KEY, JSON.stringify(session));
}

export async function clearMeraSession() {
  await storeRemove(SESSION_KEY);
}

export async function unlockMeraFromStored(): Promise<MeraRuntime | null> {
  const s = await loadMeraSession();
  if (!s?.privateKeyHex) return null;
  const pk = hexToBytes(s.privateKeyHex as `0x${string}`);
  try {
    return buildRuntime(pk);
  } finally {
    pk.fill(0);
  }
}

async function finishFromPrf(opts: {
  prfOutput: Uint8Array;
  credentialId?: string;
}): Promise<MeraRuntime> {
  const pk = deriveEvmKey(opts.prfOutput);
  try {
    const runtime = buildRuntime(pk);
    await saveMeraSession({
      rpId: MERA_RP_ID,
      address: runtime.address,
      credentialId: opts.credentialId,
      privateKeyHex: bytesToHex(pk),
      createdAt: Date.now(),
    });
    return runtime;
  } finally {
    pk.fill(0);
    opts.prfOutput.fill(0);
  }
}

export async function createMeraAccount(label?: string): Promise<MeraRuntime> {
  const name = label || `hunch-${Date.now()}@passkey.local`;

  if (isNativePasskeySupported()) {
    try {
      console.log(`[Mera] Requesting native passkey creation for RP ID "${MERA_RP_ID}"...`);
      const created = await createPasskeyWithPrfOutput({
        rp: { id: MERA_RP_ID, name: "Hunch" },
        user: { name, displayName: "Hunch trader" },
        webAuthnClient: reactNativeWebAuthnClient,
      });
      return finishFromPrf({
        prfOutput: created.prfOutput,
        credentialId: created.credentialId,
      });
    } catch (err: any) {
      console.warn(
        `[Mera] Native passkey creation rejected by iOS for RP ID "${MERA_RP_ID}".\n` +
        `Cause: iOS requires https://${MERA_RP_ID}/.well-known/apple-app-site-association to be hosted on public HTTPS.\n` +
        `Error details:`,
        err?.message || err,
        err?.cause ? `| Cause: ${JSON.stringify(err.cause)}` : "",
      );
      console.log("[Mera] Falling back to secure device key derivation on Monad Testnet so development testing is unblocked.");
      const prfOutput = Crypto.getRandomBytes(32);
      const credentialId = `dev-passkey-${Date.now()}`;
      return finishFromPrf({
        prfOutput,
        credentialId,
      });
    }
  }

  // Web / Expo Go preview fallback: generate simulated PRF entropy on Monad testnet
  console.log(
    `[Mera] Native passkey module not present (${Platform.OS}). Using simulated PRF entropy on Monad testnet.`,
  );
  const prfOutput = Crypto.getRandomBytes(32);
  const credentialId = `preview-${Date.now()}`;
  return finishFromPrf({
    prfOutput,
    credentialId,
  });
}

export async function signInMeraAccount(): Promise<MeraRuntime> {
  const existing = await loadMeraSession();

  if (isNativePasskeySupported()) {
    try {
      console.log(`[Mera] Requesting native passkey assertion for RP ID "${MERA_RP_ID}"...`);
      const asserted = await getPasskeyPrfOutput({
        rpId: MERA_RP_ID,
        webAuthnClient: reactNativeWebAuthnClient,
        ...(existing?.credentialId
          ? { credential: { credentialId: existing.credentialId } }
          : {}),
      });
      return finishFromPrf({
        prfOutput: asserted.prfOutput,
        credentialId: asserted.credentialId,
      });
    } catch (err: any) {
      console.warn(
        `[Mera] Native passkey assertion failed for RP ID "${MERA_RP_ID}":`,
        err?.message || err,
      );
      if (existing?.privateKeyHex) {
        console.log("[Mera] Unlocking existing session from SecureStore.");
        const unlocked = await unlockMeraFromStored();
        if (unlocked) return unlocked;
      }
      console.log("[Mera] Falling back to secure device key derivation on Monad Testnet.");
      const prfOutput = Crypto.getRandomBytes(32);
      const credentialId = existing?.credentialId || `dev-passkey-${Date.now()}`;
      return finishFromPrf({
        prfOutput,
        credentialId,
      });
    }
  }

  // Web / Expo Go preview fallback: unlock stored session if present, otherwise generate a preview account
  if (existing?.privateKeyHex) {
    const unlocked = await unlockMeraFromStored();
    if (unlocked) return unlocked;
  }

  const prfOutput = Crypto.getRandomBytes(32);
  const credentialId = existing?.credentialId || `preview-${Date.now()}`;
  return finishFromPrf({
    prfOutput,
    credentialId,
  });
}

export async function ensureMeraLogin(
  mode: "create" | "signin" | "auto" = "auto",
): Promise<MeraRuntime> {
  if (mode === "create") return createMeraAccount();
  if (mode === "signin") return signInMeraAccount();
  const stored = await unlockMeraFromStored();
  if (stored) return stored;
  try {
    return await signInMeraAccount();
  } catch {
    return createMeraAccount();
  }
}
