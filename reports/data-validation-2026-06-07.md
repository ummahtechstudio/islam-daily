# Islam Daily — Data Validation Report

**Generated:** 2026-06-07T19:01:31.976Z
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
| `assets/data/duas-core.json` | 102 | 108.6 KB |
| `assets/data/dhikr-core.json` | 40 | 34.8 KB |
| `assets/data/namaz-core.json` | 33 | 84.9 KB |
| `assets/data/names99.json` | 100 | 39.1 KB |
| `assets/daily_knowledge.json` | 52 | 83.1 KB |
| `assets/islamic_tips.json` | 30 | 7.0 KB |
| `assets/hadiths.json` | 30 | 22.6 KB |
| `hadith-build/combined/bukhari.json` | 7589 | 22228.4 KB |
| `hadith-build/combined/muslim.json` | 7564 | 18067.0 KB |
| `hadith-build/combined/tirmidhi.json` | 3998 | 12270.3 KB |
| `hadith-build/combined/abudawud.json` | 5274 | 12711.4 KB |
| `hadith-build/combined/ibnmajah.json` | 4343 | 9039.6 KB |
| `hadith-build/combined/nasai.json` | 5765 | 11287.5 KB |
| `hadith-build/combined/malik.json` | 1889 | 4266.6 KB |
| `hadith-build/combined/nawawi.json` | 42 | 77.6 KB |
| `hadith-build/combined/qudsi.json` | 40 | 88.6 KB |
| `hadith-build/combined/dehlawi.json` | 40 | 11.8 KB |

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
- **K** — Namaz Module Structure

## Issues

### `assets/data/dhikr-core.json`  (7 issues)

| Severity | Cat | Location | Message |
|----------|-----|----------|---------|
| ℹ️ INFO | C | `[1].items[3].arabic` | Duplicate Arabic dhikr (may be intentional cross-category) — first at [0].items[5] |
| ℹ️ INFO | C | `[2].items[4].arabic` | Duplicate Arabic dhikr (may be intentional cross-category) — first at [1].items[5] |
| ℹ️ INFO | C | `[2].items[5].arabic` | Duplicate Arabic dhikr (may be intentional cross-category) — first at [1].items[7] |
| ℹ️ INFO | C | `[3].items[4].arabic` | Duplicate Arabic dhikr (may be intentional cross-category) — first at [2].items[8] |
| ℹ️ INFO | C | `[3].items[5].arabic` | Duplicate Arabic dhikr (may be intentional cross-category) — first at [0].items[0] |
| ℹ️ INFO | C | `[3].items[9].arabic` | Duplicate Arabic dhikr (may be intentional cross-category) — first at [0].items[5] |
| ℹ️ INFO | C | `[3].items[10].arabic` | Duplicate Arabic dhikr (may be intentional cross-category) — first at [1].items[2] |

### `assets/data/names99.json`  (2 issues)

| Severity | Cat | Location | Message |
|----------|-----|----------|---------|
| ℹ️ INFO | F | `[84].arabic` | Name "مَالِكُ الْمُلْكِ" does not start with "ال" (Al-) — verify if multi-word construction (e.g. Malik al-Mulk) |
| ℹ️ INFO | F | `[85].arabic` | Name "ذُو الْجَلَالِ وَالْإِكْرَامِ" does not start with "ال" (Al-) — verify if multi-word construction (e.g. Malik al-Mulk) |
