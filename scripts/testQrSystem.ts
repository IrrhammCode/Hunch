import {
  resolveUserInput,
  parseQrPayload,
  generatePaymentUri,
  VERIFIED_DIRECTORY,
} from "../mobile/src/wallet/userDirectory";

async function main() {
  console.log("=== Testing QR & Username System ===");

  // 1. Test resolving handle @alice
  const aliceRes = resolveUserInput("@alice");
  if (!aliceRes.isValid || aliceRes.address !== VERIFIED_DIRECTORY[0].address) {
    throw new Error(`Failed to resolve @alice: ${JSON.stringify(aliceRes)}`);
  }
  console.log("✅ [PASS] Resolved @alice ->", aliceRes.address, `(${aliceRes.profile?.name})`);

  // 2. Test resolving case-insensitive handle
  const bobRes = resolveUserInput("@BOB");
  if (!bobRes.isValid || bobRes.address !== VERIFIED_DIRECTORY[1].address) {
    throw new Error(`Failed to resolve @BOB: ${JSON.stringify(bobRes)}`);
  }
  console.log("✅ [PASS] Resolved @BOB ->", bobRes.address);

  // 3. Test resolving domain name alice.mon
  const monRes = resolveUserInput("alice.mon");
  if (!monRes.isValid || monRes.address !== VERIFIED_DIRECTORY[0].address) {
    throw new Error(`Failed to resolve alice.mon: ${JSON.stringify(monRes)}`);
  }
  console.log("✅ [PASS] Resolved alice.mon ->", monRes.address);

  // 4. Test resolving raw 0x EVM address
  const rawAddr = "0x90F79bf6EB2c4f870365E785982E1f101E93b906";
  const rawRes = resolveUserInput(rawAddr);
  if (!rawRes.isValid || rawRes.profile?.handle !== "@monad_whale") {
    throw new Error(`Failed to resolve raw address to profile: ${JSON.stringify(rawRes)}`);
  }
  console.log("✅ [PASS] Resolved raw 0x address ->", rawRes.profile?.handle);

  // 5. Test Payment URI generation and parsing
  const uri = generatePaymentUri({
    address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    amount: "50",
    token: "AUSD",
    handle: "@alice",
  });
  console.log("✅ [PASS] Generated Payment URI ->", uri);

  const parsed = parseQrPayload(uri);
  if (
    !parsed ||
    parsed.address.toLowerCase() !== "0x70997970C51812dc3A010C7d01b50e0d17dc79C8".toLowerCase() ||
    parsed.amount !== "50" ||
    parsed.token !== "AUSD" ||
    parsed.handle !== "@alice"
  ) {
    throw new Error(`Failed to parse payment URI: ${JSON.stringify(parsed)}`);
  }
  console.log("✅ [PASS] Parsed QR Payload ->", parsed);

  // 6. Test JSON QR Payload parsing
  const jsonPayload = JSON.stringify({
    address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    amount: "100",
    token: "AUSD",
    handle: "@bob",
  });
  const parsedJson = parseQrPayload(jsonPayload);
  if (!parsedJson || parsedJson.amount !== "100" || parsedJson.handle !== "@bob") {
    throw new Error(`Failed to parse JSON QR: ${JSON.stringify(parsedJson)}`);
  }
  console.log("✅ [PASS] Parsed JSON QR ->", parsedJson);

  // 7. Test Raw Address QR Payload
  const rawQr = parseQrPayload("0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65");
  if (!rawQr || rawQr.handle !== "@keone") {
    throw new Error(`Failed to parse raw address QR: ${JSON.stringify(rawQr)}`);
  }
  console.log("✅ [PASS] Parsed Raw Address QR with Handle ->", rawQr);

  console.log("\n🎉 ALL 7/7 QR & USERNAME SYSTEM CHECKS PASSED!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
