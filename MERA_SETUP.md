# Mera passkey setup (Agora $10k path)

Mobile auth for the **Agora** bounty is **Mera passkey** → EOA on Monad testnet → **AUSD** balance → **Perpl** trade.

Official RN guide: https://docs.monad.xyz/guides/mera/react-native.md  
Package: `@category-labs/mera@0.2.0` + `react-native-passkey@3.6.1` (already in `mobile/package.json`).

## App identity

| Field | Value |
|---|---|
| Bundle / package | `com.hunch123.app` |
| Default rpId | `accounts.hunch.app` |
| Override | `EXPO_PUBLIC_MERA_RP_ID` in `mobile/.env` |
| iOS associated domain | `webcredentials:accounts.hunch.app` (`mobile/app.json`) |

Web and mobile **must share the same rpId** if you reuse a web-created passkey.

## Host association files (manual)

Serve **HTTPS**, **no redirect**, JSON content-type:

### iOS — `https://accounts.hunch.app/.well-known/apple-app-site-association`

```json
{
  "webcredentials": {
    "apps": ["TEAMID.com.hunch123.app"]
  }
}
```

Replace `TEAMID` with your Apple Developer Team ID (10 chars).

### Android — `https://accounts.hunch.app/.well-known/assetlinks.json`

```json
[
  {
    "relation": ["delegate_permission/common.get_login_creds"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.hunch123.app",
      "sha256_cert_fingerprints": ["SHA256_FINGERPRINT"]
    }
  }
]
```

Debug keystore fingerprint:

```bash
keytool -list -v -keystore android/app/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

Templates live in `site/.well-known/` for GitHub Pages / static hosting.

## Build

Passkeys are **native**. Expo Go will not work.

```bash
cd mobile
# after app.json associatedDomains + npm packages
npx expo prebuild
npm run eas:dev          # iOS development client
# or
npm run eas:dev:android
```

Restart Metro after `.env` changes (`scripts\win-npm.cmd run start:dev` from `mobile/`).

## In-app flow

1. Login → **Continue with Passkey (Mera)** (create / use existing / auto)
2. Face ID / device PIN → derived EOA `0x…`
3. YOU tab → **Claim AUSD faucet** (server calls Agora `requestFunds` + MON gas)
4. MARKETS / EXCHANGE → swipe or buy UP/DOWN (Hunch path) **or** TRADE → Perpl order
5. Perpl needs **≥100 AUSD** testnet collateral + on-chain `createAccount` (see `AGORA_BOUNTY.md`)

## Security note (demo vs production)

Hunch stores the derived key in **Expo SecureStore** after the first successful passkey ceremony so trades do not re-prompt every order. Production should re-run PRF / keep sessions short-lived and biometric-gated (see Mera mobile demo `storage.ts`).

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| `PRF_UNAVAILABLE` | Authenticator/OS without WebAuthn PRF |
| `PASSKEY_OPERATION_FAILED` first try | AASA/assetlinks not public, wrong Team ID, or redirect |
| Address differs web vs mobile | Different rpId, passkey, or BIP-44 index |
| Passkey button disabled | Expo Go / non-native build |
| Login works, trade fails | API down, faucet empty, or provider method unsupported |

## Agora eligibility checklist

- [ ] Mera passkey login on video
- [ ] AUSD balance shown (Agora testnet `0xa901…22dC`, not MockAUSD)
- [ ] At least one **Perpl** trade (exchange `0x1964…80cc`)
- [ ] Honest copy: **Monad testnet 10143**
