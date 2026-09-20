# Prayer notification audio

This directory holds the adhan clip played by prayer notifications scheduled
by `src/services/notificationsService.ts`. The Android notification channel is
registered with `sound: 'adhan.mp3'`, so the file name must stay `adhan.mp3`
(after replacing it, run `npx expo prebuild --clean` so the resource is copied
into `android/app/src/main/res/raw/`).

## adhan.mp3 — provenance and licence

| | |
|---|---|
| Source | Wikimedia Commons, **"Adhan.ogg"** — <https://commons.wikimedia.org/wiki/File:Adhan.ogg> ("Adhan announcement that prayer is about to start") |
| Author | Commons user **Aishatu98** ("Own work", recorded and uploaded 2026-07-15 via UploadWizard). Active Wikimedian (registered 2026-06-19; ~1,100 Commons edits and ~3,200 across projects at the time of writing), with a coherent body of Nigerian field recordings and street photography (market audio, an `Iqamah.ogg`, a second `Muslim calling to prayer.ogg`), no block, no copyright notices on the talk page. |
| Licence | **CC0 1.0 Universal (Public Domain Dedication)** — `{{self|cc-zero}}` on the file page; full text in `LICENSE-adhan-CC0-1.0.txt` (https://creativecommons.org/publicdomain/zero/1.0/) |
| Original file | Ogg Vorbis, 44.1 kHz mono, 42.1 s (eight phrases), 338,741 bytes, sha256 `faeb03e4338554fb8b54dba98ed4949648615b58e991bbd560a89f4837dde413` |
| What we ship | source **3.60 s → 27.60 s** (the first five phrases, cut inside the pause after phrase 5; the lead-in silence is dropped), 0.10 s fade-in, 0.7 s fade-out; loudness-normalised (EBU R128 `loudnorm`, two-pass, target −14 LUFS integrated / −1 dBTP ceiling; source −24.7 LUFS → result −14.4 LUFS, −1.3 dBTP); MP3 44.1 kHz **mono** 96 kbps CBR, **24.0 s**, 288,942 bytes, sha256 `4ce0fcf8d5297f3cd5cbf3007c5dd0aa1b4e6a530280b0afc306ae45a14701f6` |
| Tool | ffmpeg N-126655: `-af atrim=start=3.6:end=27.6,asetpts=PTS-STARTPTS,afade(in 0.10),afade(out 0.7 @23.3)` → WAV → `loudnorm` (2-pass, dynamic) → `libmp3lame -b:a 96k` |
| Character | A live adhan recorded close to the source (band-limited like a mosque PA / phone recording, noise floor ≈ 28 dB below the voice); plain, short phrases rather than a long melismatic style. |
| Recorded in repo | 2026-09-20 (batch 3). Replaced the previous clip, which was the first ~21 s of IslamCan.com "Azan 1" with no audio licence. |

CC0 requires no attribution; we credit the recordist in Settings → Sources &
Credits anyway (`src/constants/credits.ts`, entry `notificationAdhan`).

**Residual risk, for the record:** the dedication rests on the recordist's
own-work declaration on Commons (which is what CC0 field recordings on Commons
always rest on). The muezzin is not named; a live adhan is a religious call,
not a copyrighted composition, and the recording copyright is the recordist's.
The clip was selected from spectrograms and level analysis, not by ear —
**confirm on a device that the words are the adhan's opening** (see the
batch-3 QA list). A recording commissioned from a known reciter under a
written CC0/CC BY release would be cleaner still.

### Candidates rejected during the search (2026-09-20)

- **Commons "Beautiful adhan.ogg" (Adam-synagda, CC0, 2022)** — studio-quality
  and briefly used, then **withdrawn**: the Commons API shows the uploader was
  blocked indefinitely on 2022-11-27 ("Abusing multiple accounts") and 12 of the
  account's 18 uploads were deleted as copyright violations. The audio itself
  was never challenged, but an own-work declaration from that account is not
  a licence we can rely on.
- Every other Commons adhan is **CC BY-SA** (share-alike — not acceptable for
  an app bundle): Adhan wiki.oga, Azan.ogg, Islamic call to worship.oga,
  Maliki doctrine.oga, the Hassan II mosque .wav, the Aaqib Azeez .mp3.
- **Commons "Call to prayer by Sabah Fakhry.mp3"** is tagged public domain with
  the rationale "Adhan has been in effect since c. 622 A.D." — the words are
  ancient, the 1985 recording is not; source is a YouTube rip.
- **Freesound** CC0 results are mosque-loudspeaker field recordings with street
  noise or wind (Fes, Marrakesh, Cairo, Kuala Lumpur, Atlas), unusable as a
  notification; the one clean studio file (#639494) says "extracted from a
  YouTube video" — not the uploader's to dedicate.

## Why a short custom sound

Stock notification tones don't carry the meaning users expect at prayer time.
A ~24 s opening plays from local resources (offline, fired by the OS alarm
scheduler) and stays under the ~30 s ceiling Android/iOS apply to notification
sounds — do **not** bundle a full 3–4 minute adhan here.

## Replacing it again

1. Keep the file name `adhan.mp3`; keep it ≤ 25 s; 44.1 kHz; MP3.
2. Check the *uploader*, not just the licence template: Commons block log,
   deletion log for their other uploads, talk page.
3. Record the source URL, author, licence (CC0 / public domain / CC BY only —
   no SA/NC), hashes and the processing steps in this README, and put the
   licence text next to the file.
4. Update the `notificationAdhan` entry in `src/constants/credits.ts`.
5. `npx expo prebuild --clean` → rebuild → test on a physical device via
   Prayer Settings → Notifications → **Test notification** (Expo Go and web do
   not play custom notification sounds).

## Related

- Per-prayer adhan choice (different reciters per prayer) — Phase P.2c+
- User-chosen custom adhan — `app/custom-adhan.tsx`, streamed from
  IslamicFinder, separate from this bundled notification sound.
