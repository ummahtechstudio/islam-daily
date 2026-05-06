# Prayer notification audio

This directory contains adhan audio used by prayer notifications scheduled by
`src/services/notificationsService.ts`.

## Required files

- **adhan.mp3** — 10–15 seconds, just the opening "Allahu Akbar Allahu Akbar"
  portion. Industry-standard short adhan clip (matches Islam 360, Muslim Pro,
  Athan Pro). Android/iOS notification audio is capped near 30 s, so a short
  clip is required — do **not** drop the full 3–4 minute adhan here.

## Current status

**Placeholder only.** The notification scheduling pipeline (settings UI,
permission flow, 7-day scheduler, plugin wiring) is fully in place. The audio
file itself has not been added yet — until it is, notifications scheduled with
the "Adhan" sound choice will fall back to the device's default notification
tone on Android, and to the default sound on iOS.

## Adding the real adhan file

1. Source a 10–15 second adhan opening clip. CC0/royalty-free options:
   - <https://pixabay.com/sound-effects/search/azan/>
   - <https://freesound.org/search/?q=azan&f=license%3A%22Creative+Commons+0%22>
2. Trim to ~12 seconds — keep just "Allahu Akbar Allahu Akbar, Allahu Akbar
   Allahu Akbar". Export as MP3 (44.1 kHz, mono is fine).
3. Save as `assets/audio/adhan.mp3` in this directory (replace any existing
   placeholder file).
4. The `expo-notifications` plugin in `app.json` already lists this path under
   `sounds`, so prebuild will pick it up.
5. Run `npx expo prebuild --clean` to regenerate native projects with the new
   sound resource bundled.
6. Rebuild the dev/preview client:
   `eas build --platform android --profile preview`
7. Install on a real device and trigger the in-app **Test notification**
   button from Prayer Settings → Notifications. Notifications must be tested
   on a physical device — Expo Go and web preview do not support scheduled
   notifications with custom sounds.

## Why a custom sound at all?

Stock notification tones don't carry the religious significance users expect
at prayer time. Bundling a short adhan clip means the device plays it from
local resources (no network, works offline, fires reliably from the OS-level
alarm scheduler).

## Future work

- Per-prayer adhan choice (different reciters per prayer) — Phase P.2c+
- User-uploaded custom adhan — already partially wired via `app/custom-adhan.tsx`,
  separate from the notification system in this directory.
