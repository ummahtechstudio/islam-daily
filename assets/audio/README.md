# Prayer notification audio

This directory holds the adhan clip played by prayer notifications scheduled
by `src/services/notificationsService.ts`. The Android notification channel is
registered with `sound: 'adhan.mp3'`, so the file name must stay `adhan.mp3`
(after replacing it, run `npx expo prebuild --clean` so the resource is copied
into `android/app/src/main/res/raw/`).

## adhan.mp3 — provenance and licence

| | |
|---|---|
| Source | Wikimedia Commons, **"Beautiful adhan.ogg"** — <https://commons.wikimedia.org/wiki/File:Beautiful_adhan.ogg> |
| Author | Commons user **Adam-synagda** ("Own work", recorded 2022-04-29, uploaded 2022-05-01) |
| Licence | **CC0 1.0 Universal (Public Domain Dedication)** — `{{self|Cc-zero}}` on the file page; full text in `LICENSE-adhan-CC0-1.0.txt` (https://creativecommons.org/publicdomain/zero/1.0/) |
| Original file | Ogg Vorbis, 44.1 kHz stereo, 154.0 s (full adhan, 13 phrases), 1,229,032 bytes, sha256 `35fe06b08fe80505c550c33fed8a783fa9901ddc81ac884958b4be048f5b2a79` |
| What we ship | the **opening takbir** (first phrase, "Allahu Akbar, Allahu Akbar"), source 0.75 s → 17.50 s, cut inside the natural 1.6 s pause before the second phrase; 0.12 s fade-in, 1.0 s fade-out; loudness-normalised (EBU R128 `loudnorm`, target −14 LUFS integrated / −1 dBTP ceiling; result −14.6 LUFS, −8.1 dBTP); MP3 44.1 kHz stereo 96 kbps CBR, **16.75 s**, 202,112 bytes, sha256 `e5ddbe06ff6793a13a7f3153f7b25679c4eba45c76fbbfe74e6939727b819bb3` |
| Tool | ffmpeg N-126655 (`-ss 0.75 -t 16.75 -af afade,afade,loudnorm(2-pass, linear) -codec:a libmp3lame -b:a 96k`) |
| Recorded in repo | 2026-09-20 (batch 3). Replaced the previous clip, which was the first ~21 s of IslamCan.com "Azan 1" with no audio licence. |

CC0 requires no attribution; we credit the author in Settings → Sources &
Credits anyway (`src/constants/credits.ts`, entry `notificationAdhan`).

Residual risk, for the record: the licence rests on the uploader's own-work
declaration on Commons (the file has been up since May 2022 with structured
data added by Commons bots and no deletion request). We could not identify the
muezzin independently. Candidates rejected during the search (2026-09-20):
every other Commons adhan is CC BY-SA (share-alike — not acceptable for an app
bundle); "Call to prayer by Sabah Fakhry.mp3" is tagged public domain with the
rationale "Adhan has been in effect since c. 622 A.D.", which does not cover a
1985 recording; Freesound's CC0 results are mosque-loudspeaker field recordings
(street noise, wind) or, for the one clean studio file (#639494), "extracted
from a YouTube video" — not the uploader's to dedicate.

## Why a short custom sound

Stock notification tones don't carry the meaning users expect at prayer time.
A ~17 s opening takbir plays from local resources (offline, fired by the OS
alarm scheduler) and stays under the ~30 s ceiling Android/iOS apply to
notification sounds — do **not** bundle a full 3–4 minute adhan here.

## Replacing it again

1. Keep the file name `adhan.mp3`; keep it ≤ 25 s; 44.1 kHz; MP3.
2. Record the source URL, author, licence (CC0 / public domain / CC BY only —
   no SA/NC), hashes and the processing steps in this README, and put the
   licence text next to the file.
3. Update the `notificationAdhan` entry in `src/constants/credits.ts`.
4. `npx expo prebuild --clean` → rebuild → test on a physical device via
   Prayer Settings → Notifications → **Test notification** (Expo Go and web do
   not play custom notification sounds).

## Related

- Per-prayer adhan choice (different reciters per prayer) — Phase P.2c+
- User-chosen custom adhan — `app/custom-adhan.tsx`, streamed from
  IslamicFinder, separate from this bundled notification sound.
