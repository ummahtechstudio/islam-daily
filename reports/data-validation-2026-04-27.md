# Islam Daily — Data Validation Report

**Generated:** 2026-04-27T20:34:21.689Z
**Scanner version:** 1.0

## Summary

| Severity | Count |
|----------|-------|
| ❌ Errors  | 0 |
| ⚠️ Warnings | 0 |
| ℹ️ Info     | 9 |

**Result:** ✅ PASS

## Files Inspected

| File | Entries | Size |
|------|--------:|-----:|
| `assets/hisnul_muslim.json` | 102 | 72.0 KB |
| `assets/dhikr.json` | 40 | 26.6 KB |
| `assets/names_of_allah.json` | 100 | 43.6 KB |
| `assets/daily_knowledge.json` | 52 | 76.0 KB |
| `assets/islamic_tips.json` | 30 | 5.4 KB |
| `assets/hadiths.json` | 30 | 22.6 KB |
| `assets/hadiths/bukhari.json` | 7277 | 12451.9 KB |
| `assets/hadiths/muslim.json` | 7459 | 11185.5 KB |
| `assets/hadiths/tirmidhi.json` | 4053 | 7478.5 KB |
| `assets/hadiths/abudawud.json` | 5276 | 7692.1 KB |
| `assets/hadiths/ibnmajah.json` | 4345 | 5589.5 KB |
| `assets/hadiths/nasai.json` | 5768 | 7701.9 KB |

## Validation Categories

- **A** — JSON Structural
- **B** — Arabic Text
- **C** — Duplicate Detection
- **D** — Hadith Reference
- **E** — Quran Reference
- **F** — 99 Names
- **G** — Dua Structure
- **H** — Dhikr Structure
- **I** — Encoding Sanity
- **J** — Cross-File Consistency

## Issues

### `assets/dhikr.json`  (7 issues)

| Severity | Cat | Location | Message |
|----------|-----|----------|---------|
| ℹ️ INFO | C | `[1].items[3].arabic` | Duplicate Arabic dhikr (may be intentional cross-category) — first at [0].items[5] |
| ℹ️ INFO | C | `[2].items[4].arabic` | Duplicate Arabic dhikr (may be intentional cross-category) — first at [1].items[5] |
| ℹ️ INFO | C | `[2].items[5].arabic` | Duplicate Arabic dhikr (may be intentional cross-category) — first at [1].items[7] |
| ℹ️ INFO | C | `[3].items[4].arabic` | Duplicate Arabic dhikr (may be intentional cross-category) — first at [2].items[8] |
| ℹ️ INFO | C | `[3].items[5].arabic` | Duplicate Arabic dhikr (may be intentional cross-category) — first at [0].items[0] |
| ℹ️ INFO | C | `[3].items[9].arabic` | Duplicate Arabic dhikr (may be intentional cross-category) — first at [0].items[5] |
| ℹ️ INFO | C | `[3].items[10].arabic` | Duplicate Arabic dhikr (may be intentional cross-category) — first at [1].items[2] |

### `assets/names_of_allah.json`  (2 issues)

| Severity | Cat | Location | Message |
|----------|-----|----------|---------|
| ℹ️ INFO | F | `[84].arabic` | Name "مَالِكُ الْمُلْكِ" does not start with "ال" (Al-) — verify if multi-word construction (e.g. Malik al-Mulk) |
| ℹ️ INFO | F | `[85].arabic` | Name "ذُو الْجَلَالِ وَالْإِكْرَامِ" does not start with "ال" (Al-) — verify if multi-word construction (e.g. Malik al-Mulk) |
