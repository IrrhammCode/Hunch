import { getRandomValues } from "expo-crypto";

/** Hermes lacks WebCrypto.getRandomValues — Mera/viem need it. */
if (typeof globalThis.crypto?.getRandomValues !== "function") {
  Object.defineProperty(globalThis, "crypto", {
    configurable: true,
    value: { ...globalThis.crypto, getRandomValues },
  });
}
