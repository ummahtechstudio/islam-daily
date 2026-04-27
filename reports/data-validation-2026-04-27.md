# Islam Daily — Data Validation Report

**Generated:** 2026-04-27T11:45:01.206Z
**Scanner version:** 1.0

## Summary

| Severity | Count |
|----------|-------|
| ❌ Errors  | 5 |
| ⚠️ Warnings | 0 |
| ℹ️ Info     | 9 |

**Result:** ❌ FAIL

## Files Inspected

| File | Entries | Size |
|------|--------:|-----:|
| `assets/hisnul_muslim.json` | 102 | 63.9 KB |
| `assets/dhikr.json` | 40 | 25.3 KB |
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

### `assets/hisnul_muslim.json`  (1 issue)

| Severity | Cat | Location | Message |
|----------|-----|----------|---------|
| ❌ ERR | D | `[7].duas[8].reference` | Hadith reference out of range: "Sahih Bukhari 7383" exceeds max 7277 <br/><sub>↳ Sahih Bukhari 7383, Sahih Muslim 2717</sub> |

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

### `assets/hadiths/tirmidhi.json`  (1 issue)

| Severity | Cat | Location | Message |
|----------|-----|----------|---------|
| ❌ ERR | D | `<entries>` | 97 hadith number(s) exceed Jami at-Tirmidhi max 3956 |

### `assets/hadiths/abudawud.json`  (1 issue)

| Severity | Cat | Location | Message |
|----------|-----|----------|---------|
| ❌ ERR | D | `<entries>` | 2 hadith number(s) exceed Sunan Abu Dawud max 5274 |

### `assets/hadiths/ibnmajah.json`  (1 issue)

| Severity | Cat | Location | Message |
|----------|-----|----------|---------|
| ❌ ERR | D | `<entries>` | 4 hadith number(s) exceed Sunan Ibn Majah max 4341 |

### `assets/hadiths/nasai.json`  (1 issue)

| Severity | Cat | Location | Message |
|----------|-----|----------|---------|
| ❌ ERR | D | `<entries>` | 1 hadith number(s) exceed Sunan an-Nasa'i max 5767 |
