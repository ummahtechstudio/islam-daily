// Madani 15-line Mushaf juz boundaries (page numbers where each juz starts).
// 30 entries: index i holds the start page of juz (i + 1).
const JUZ_START_PAGES = [
  1, 22, 42, 62, 82, 102, 121, 142, 162, 182,
  202, 222, 241, 262, 282, 302, 322, 342, 362, 382,
  402, 422, 442, 462, 482, 502, 522, 542, 562, 582,
];

export const TOTAL_PAGES = 604;

export function pageToJuz(page: number): number {
  for (let i = JUZ_START_PAGES.length - 1; i >= 0; i--) {
    if (page >= JUZ_START_PAGES[i]) return i + 1;
  }
  return 1;
}

export function juzStartPage(juz: number): number {
  const idx = Math.min(Math.max(juz, 1), JUZ_START_PAGES.length) - 1;
  return JUZ_START_PAGES[idx];
}
