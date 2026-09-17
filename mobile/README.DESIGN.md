# Hunch — README untuk Design (teman)

Halo! Ini mode **design-only**: data palsu (mock), **tidak perlu** backend / Privy / crypto wallet.

Kamu bisa buka di **browser** (paling gampang) atau Android.

Repo: https://github.com/IrrhammCode/Hunch  
Detail teknis tambahan: [DESIGN.md](./DESIGN.md)

---

## Apa yang kamu dapat

Setelah jalan, langsung masuk app (auto-login):

| Tab | Isi mock |
|---|---|
| **HUNCH** | Kartu swipe UP/DOWN, countdown 60 detik, harga, quote |
| **BOOK** | Posisi OPEN, WON (bisa Claim), LOST |
| **YOU** | Profil designer, saldo AUSD/MON, tombol faucet |

Ada badge kecil **DESIGN · MOCK DATA** di atas layar.

Swipe / Claim / Faucet **boleh dicoba** — datanya di memori (reset kalau refresh).

---

## Install sekali

1. Install **Node.js 20+** → https://nodejs.org  
2. Install **Git** (kalau belum)  
3. Clone repo:

```powershell
git clone https://github.com/IrrhammCode/Hunch.git
cd Hunch\mobile
npm install
```

---

## Jalanin di browser (disarankan)

Di folder `mobile`:

```powershell
copy .env.design .env
npm run design
```

Tunggu Metro selesai, lalu:

- tekan **`w`** di terminal, **atau**
- buka link yang muncul (biasanya `http://localhost:8081`)

Supaya keliatan seperti HP di Chrome:

1. Tekan **F12**
2. Klik icon HP (device toolbar)
3. Pilih iPhone / Pixel

**Selesai.** Tidak perlu jalankan API / keeper.

---

## Jalanin di Android (opsional)

```powershell
copy .env.design .env
npm run design:android
```

- Emulator: tekan **`a`**
- HP fisik: buka **Expo Go** → scan QR (satu Wi‑Fi dengan PC)

Kalau Expo Go error aneh → pakai **browser** saja. Mode design memang dibuat untuk browser.

---

## File yang biasanya diubah (UI)

```
mobile/app/(app)/index.tsx       → layar HUNCH (swipe)
mobile/app/(app)/positions.tsx   → BOOK
mobile/app/(app)/profile.tsx     → YOU
mobile/src/theme.ts              → warna / spacing
mobile/src/components/ui.tsx     → button, chip, dll
mobile/src/components/BrandMark.tsx
mobile/src/components/Screen.tsx
```

Mau ubah isi mock (saldo, list posisi)? Edit:

```
mobile/src/mock/api.ts
```

---

## Warna brand (jangan diganti sembarangan)

| Nama | Hex |
|---|---|
| Background | `#0A0B0D` |
| Card | `#12141A` |
| Teks | `#F2F1EC` |
| Brand lime | `#D6FF3F` |
| UP | `#2EE59D` |
| DOWN | `#FF4D6A` |

Font: **Bebas Neue** (judul) · **DM Sans** (isi)

Jangan:
- ungu / purple gradient
- bola-bola / orb dekorasi
- bikin HUNCH jadi dashboard penuh kartu

---

## Copy produk (buat teks di UI)

> Swipe UP or DOWN. 60-second markets on Monad.

---

## Troubleshooting

| Masalah | Solusi |
|---|---|
| Minta Privy / API offline | Pastikan `.env` dari `.env.design` (ada `EXPO_PUBLIC_DESIGN_MODE=1`), lalu restart: `Ctrl+C` → `npm run design` |
| Halaman web kosong | Hard refresh, atau `npx expo start --web -c` |
| Masih di login | Design mode belum aktif — `copy .env.design .env` lagi |
| Port kepakai | `npx expo start --web --port 8082` |

---

## Git (kalau push perubahan design)

```powershell
# jangan commit file .env (rahasia / lokal)
git checkout -b design/ui-pass
git add app src
git commit -m "UI: improve HUNCH / BOOK / YOU"
git push -u origin design/ui-pass
```

Lalu kasih tau Irham buat review / merge.

---

## Ringkas 4 baris

```powershell
cd Hunch\mobile
npm install
copy .env.design .env
npm run design
```

Buka browser → tekan `w` → design.
