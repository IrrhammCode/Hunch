import fs from "fs";
import path from "path";
import { ethers } from "ethers";

export interface DirectoryEntry {
  handle: string;
  name: string;
  address: string;
  verified: boolean;
  avatarColor: string;
  bio?: string;
  updatedAt?: number;
}

const DATA_DIR = path.resolve(__dirname, "../../data");
const DIRECTORY_FILE = path.join(DATA_DIR, "directory.json");

const SEED_DIRECTORY: DirectoryEntry[] = [
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

const AVATAR_PALETTE = [
  "#2EE59D",
  "#836EF9",
  "#D6FF3F",
  "#00E5FF",
  "#FFB020",
  "#FF5C5C",
  "#A78BFA",
  "#38BDF8",
];

function pickAvatarColor(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

function ensureDirectoryFile(): DirectoryEntry[] {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DIRECTORY_FILE)) {
    fs.writeFileSync(DIRECTORY_FILE, JSON.stringify(SEED_DIRECTORY, null, 2), "utf8");
    return [...SEED_DIRECTORY];
  }
  try {
    const raw = fs.readFileSync(DIRECTORY_FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch {
    /* fallback to rewrite */
  }
  fs.writeFileSync(DIRECTORY_FILE, JSON.stringify(SEED_DIRECTORY, null, 2), "utf8");
  return [...SEED_DIRECTORY];
}

export function getAllProfiles(query?: string): DirectoryEntry[] {
  const all = ensureDirectoryFile();
  if (!query) return all;

  const q = query.trim().toLowerCase();
  const strippedQ = q.startsWith("@") ? q.slice(1) : q;

  return all.filter((entry) => {
    const handleMatch = entry.handle.toLowerCase().includes(strippedQ);
    const nameMatch = entry.name.toLowerCase().includes(q);
    const addrMatch = entry.address.toLowerCase().includes(q);
    return handleMatch || nameMatch || addrMatch;
  });
}

export function resolveProfile(input: string): DirectoryEntry | null {
  const clean = input.trim().toLowerCase();
  if (!clean) return null;

  const all = ensureDirectoryFile();

  // 1. Direct handle match (@handle or handle)
  const normalizedHandle = clean.startsWith("@") ? clean : `@${clean}`;
  const foundHandle = all.find((e) => e.handle.toLowerCase() === normalizedHandle);
  if (foundHandle) return foundHandle;

  // 2. .mon domain match
  if (clean.endsWith(".mon") || clean.endsWith(".eth")) {
    const prefix = `@${clean.split(".")[0]}`;
    const foundDomain = all.find((e) => e.handle.toLowerCase() === prefix);
    if (foundDomain) return foundDomain;
  }

  // 3. EVM address match
  if (ethers.isAddress(clean)) {
    const foundAddr = all.find((e) => e.address.toLowerCase() === clean);
    if (foundAddr) return foundAddr;
  }

  return null;
}

export function registerProfile(payload: {
  handle: string;
  address: string;
  name?: string;
  bio?: string;
  avatarColor?: string;
}): { success: boolean; profile: DirectoryEntry; message?: string } {
  let { handle, address, name, bio, avatarColor } = payload;

  if (!ethers.isAddress(address)) {
    throw new Error("Invalid EVM address format");
  }

  const checksummedAddr = ethers.getAddress(address);
  let normalizedHandle = handle.trim().toLowerCase();
  if (!normalizedHandle.startsWith("@")) {
    normalizedHandle = `@${normalizedHandle}`;
  }

  // Validate handle format (3-24 alphanumeric and underscores)
  const handleRegex = /^@[a-z0-9_]{3,24}$/;
  if (!handleRegex.test(normalizedHandle)) {
    throw new Error(
      "Handle must be 3-24 characters containing only letters, numbers, and underscores (e.g. @trader_99)",
    );
  }

  const all = ensureDirectoryFile();

  // Check if handle is already taken by a different address
  const existingHandle = all.find((e) => e.handle.toLowerCase() === normalizedHandle);
  if (existingHandle && existingHandle.address.toLowerCase() !== checksummedAddr.toLowerCase()) {
    throw new Error(`Handle ${normalizedHandle} is already registered to another address`);
  }

  // Check if this address already has a registered entry
  const existingIndex = all.findIndex((e) => e.address.toLowerCase() === checksummedAddr.toLowerCase());

  const newEntry: DirectoryEntry = {
    handle: normalizedHandle,
    name: name?.trim() || normalizedHandle.slice(1),
    address: checksummedAddr,
    verified: existingHandle?.verified ?? false,
    avatarColor: avatarColor || existingHandle?.avatarColor || pickAvatarColor(normalizedHandle),
    bio: bio?.trim() || existingHandle?.bio || "Hunch Monad Trader",
    updatedAt: Date.now(),
  };

  if (existingIndex >= 0) {
    all[existingIndex] = newEntry;
  } else {
    all.push(newEntry);
  }

  fs.writeFileSync(DIRECTORY_FILE, JSON.stringify(all, null, 2), "utf8");

  return {
    success: true,
    profile: newEntry,
    message: existingIndex >= 0 ? "Profile updated" : "Handle registered successfully",
  };
}
