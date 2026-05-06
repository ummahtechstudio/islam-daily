# Known npm advisories — accepted risk for v1.0

Last reviewed: 2026-05-06

The following npm audit advisories are present in this project and have
been assessed as acceptable risk for v1.0 release:

## postcss XSS via unescaped </style> (moderate, GHSA-qx2v-qp2m-jg93)
- Source: transitive dependency through @expo/metro-config
- Used at: build time only (Metro bundler)
- Runtime exposure: NONE. The shipped APK does not process untrusted CSS.
- Cannot fix safely: npm audit fix --force would downgrade Expo SDK 54
  to SDK 49, breaking the entire application.
- Resolution path: Wait for Expo to update internal postcss dependency.

## xmldom XML injection (high, GHSA-f6ww-3ggp-fr8h, GHSA-x6wf-f3px-wcqx,
##                       GHSA-j759-j44w-7fr8)
- Source: transitive dependency through build toolchain
- Used at: build time only
- Runtime exposure: NONE. The application processes JSON only
  (Quran, Hadith) and does not parse untrusted XML at runtime.
- Cannot fix safely: requires breaking-change upgrade of parent package.
- Resolution path: Will resolve when parent toolchain updates.

## Re-review schedule

These advisories will be re-evaluated:
- Before each major release
- If any advisory severity changes to critical
- If a non-breaking fix becomes available
