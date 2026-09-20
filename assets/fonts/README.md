# Bundled fonts

## IndoPakNastaleeq.ttf — "AlQuran IndoPak by QuranWBW"

| | |
|---|---|
| File | `IndoPakNastaleeq.ttf` — 310,912 bytes, sha256 `a6463e24e36651404e9eff52dae26e18e9ef0718eb620636a66a20026a75c563` |
| Font | AlQuran IndoPak by QuranWBW, version 2.100 (26 November 2022), by Ayman Siddiqui; based on Al Qalam Quran Majeed (Abdul Majeed Khan) with ayah-number glyphs from KFGQPC's Nastaleeq font. Vendor id `QWBW`. |
| Used for | The Mushaf view (`src/components/quran/MushafPageItem.tsx`), the Listen tab, and the IndoPak typography tokens. The bundled Mushaf text (`assets/data/quran.json`, field `ti`, QUL "Quran Script: IndoPak Nastaleeq") is QuranWBW's IndoPak script and is encoded for this font — the two ship as a matched pair. |
| Embedded licence text | "NOT FOR SALE, NOT FOR MODIFICATION, NOT FOR DISTRIBUTION OR NOT FOR DEVELOPMENT WITHOUT WRITTEN NOTICE BY QURANWBW.COM … Made only for Sadaqa-e-Jaria purposes." |
| **Permission** | **QuranWBW.com granted written permission on 2026-09-20 for Islam Daily to bundle the font and the IndoPak script text in the app** (requested from ummahtech.studio@gmail.com to quranwbw@gmail.com). The font is used unmodified, never sold or redistributed on its own, and QuranWBW is credited in Settings → Sources & Credits. Keep a copy of the permission e-mail with the project records (e.g. export it next to this file as `PERMISSION-QuranWBW-2026-09-20.eml`/`.pdf`). |
| Credits entry | `src/constants/credits.ts` → `indopakFont` (Mushaf section), i18n `credits.entries.indopakFont`. |

If the font or the Mushaf text is ever replaced, both must change together — see `docs/session-report-3.md` §1/§1b for why (the text carries font-specific private-use glyphs).
