import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { getSurahMeta } from '../../constants/surahMeta';
import { pageToJuz, TOTAL_PAGES } from '../../utils/quranNav';
import {
  MUSHAF_COLORS,
  MUSHAF_FONT_SIZE,
  MUSHAF_LINE_HEIGHT,
} from './mushafTokens';

export type MushafPageItemProps = {
  pageNumber: number;
  fontScale?: number;
  onAyahLongPress?: (surah: number, ayah: number) => void;
};

type MushafAyah = {
  surah: number;
  ayah: number;
  text_indopak: string;
};

const BISMILLAH_TEXT = 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ';

const pageCache = new Map<number, MushafAyah[]>();

const ARABIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

export function toArabicDigits(n: number): string {
  return String(n)
    .split('')
    .map((d) => ARABIC_DIGITS[parseInt(d, 10)] ?? d)
    .join('');
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SurahHeader({
  surahNumber,
  scale,
}: {
  surahNumber: number;
  scale: number;
}) {
  const meta = getSurahMeta(surahNumber);
  if (!meta) return null;
  const place =
    meta.revelation_place === 'makkah' ? 'MAKKIYYAH' : 'MADANIYYAH';
  return (
    <View style={surahHeaderStyles.wrap}>
      <View style={surahHeaderStyles.banner}>
        <Text style={surahHeaderStyles.cornerLeft}>✦</Text>
        <Text style={surahHeaderStyles.cornerRight}>✦</Text>
        <Text style={[surahHeaderStyles.arabic, { fontSize: 22 * scale }]}>
          سُورَةُ {meta.name_arabic}
        </Text>
        <Text style={[surahHeaderStyles.meta, { fontSize: 10 * scale }]}>
          {meta.ayah_count} AYAHS · {place}
        </Text>
      </View>
    </View>
  );
}

const surahHeaderStyles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    marginVertical: 8,
  },
  banner: {
    backgroundColor: MUSHAF_COLORS.surahBannerBg,
    borderRadius: 8,
    paddingHorizontal: 28,
    paddingVertical: 10,
    alignItems: 'center',
    minWidth: '70%',
  },
  cornerLeft: {
    position: 'absolute',
    top: 4,
    left: 8,
    color: MUSHAF_COLORS.surahBannerSubtle,
    fontSize: 12,
  },
  cornerRight: {
    position: 'absolute',
    top: 4,
    right: 8,
    color: MUSHAF_COLORS.surahBannerSubtle,
    fontSize: 12,
  },
  arabic: {
    fontFamily: 'IndoPakNastaleeq',
    color: MUSHAF_COLORS.surahBannerText,
    textAlign: 'center',
  },
  meta: {
    color: MUSHAF_COLORS.surahBannerSubtle,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginTop: 2,
  },
});

function Bismillah({ scale }: { scale: number }) {
  return (
    <Text
      style={[
        bismillahStyles.text,
        { fontSize: 22 * scale, lineHeight: 44 * scale },
      ]}
    >
      {BISMILLAH_TEXT}
    </Text>
  );
}

const bismillahStyles = StyleSheet.create({
  text: {
    fontFamily: 'IndoPakNastaleeq',
    textAlign: 'center',
    color: MUSHAF_COLORS.ink,
    marginVertical: 6,
    writingDirection: 'rtl',
  },
});

function PageBreak({
  pageNumber,
  juzNumber,
  scale,
}: {
  pageNumber: number;
  juzNumber: number;
  scale: number;
}) {
  return (
    <View style={breakStyles.wrap}>
      <View style={breakStyles.dashedRow}>
        {Array.from({ length: 24 }).map((_, i) => (
          <View key={i} style={breakStyles.dash} />
        ))}
      </View>
      <View style={breakStyles.pillRow}>
        <View style={breakStyles.pill}>
          <Text style={[breakStyles.pillText, { fontSize: 11 * scale }]}>
            Page {pageNumber} / {TOTAL_PAGES} · Juz {juzNumber}
          </Text>
        </View>
      </View>
    </View>
  );
}

const breakStyles = StyleSheet.create({
  wrap: {
    paddingTop: 10,
    paddingBottom: 4,
    alignItems: 'center',
    gap: 6,
  },
  dashedRow: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  dash: {
    width: 6,
    height: 1,
    backgroundColor: MUSHAF_COLORS.borderInner,
  },
  pillRow: {
    flexDirection: 'row',
  },
  pill: {
    backgroundColor: MUSHAF_COLORS.surahBannerBg,
    borderColor: MUSHAF_COLORS.borderInner,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 12,
  },
  pillText: {
    color: MUSHAF_COLORS.surahBannerText,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

// ─── Main component ──────────────────────────────────────────────────────────

export default function MushafPageItem({
  pageNumber,
  fontScale = 1,
  onAyahLongPress,
}: MushafPageItemProps) {
  const [ayahs, setAyahs] = useState<MushafAyah[]>(
    () => pageCache.get(pageNumber) ?? [],
  );
  const [loading, setLoading] = useState(!pageCache.has(pageNumber));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const cached = pageCache.get(pageNumber);
    if (cached) {
      setAyahs(cached);
      setLoading(false);
      setError(null);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);
    supabase
      .from('quran_ayahs')
      .select('surah_number, ayah_number, text_indopak')
      .eq('page_indopak', pageNumber)
      .order('surah_number', { ascending: true })
      .order('ayah_number', { ascending: true })
      .then(({ data, error: fetchError }) => {
        if (!active) return;
        if (fetchError) {
          setError(fetchError.message);
          setLoading(false);
          return;
        }
        const rows: MushafAyah[] = (data ?? []).map((r: any) => ({
          surah: r.surah_number,
          ayah: r.ayah_number,
          text_indopak: r.text_indopak ?? '',
        }));
        pageCache.set(pageNumber, rows);
        setAyahs(rows);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [pageNumber]);

  return (
    <View style={styles.outer}>
      <View style={styles.outerBorder}>
        <View style={styles.innerBorder}>
          <View style={styles.content}>
            {loading ? (
              <View style={styles.statusWrap}>
                <ActivityIndicator
                  size="small"
                  color={MUSHAF_COLORS.borderOuter}
                />
                <Text style={styles.statusText}>
                  Loading page {pageNumber}…
                </Text>
              </View>
            ) : error ? (
              <View style={styles.statusWrap}>
                <Text style={styles.statusText}>
                  Could not load page {pageNumber}
                </Text>
                <Text style={styles.statusSub}>{error}</Text>
              </View>
            ) : ayahs.length === 0 ? (
              <View style={styles.statusWrap}>
                <Text style={styles.statusText}>
                  No ayahs on page {pageNumber}
                </Text>
              </View>
            ) : (
              <PageBody
                ayahs={ayahs}
                scale={fontScale}
                onAyahLongPress={onAyahLongPress}
              />
            )}
            <PageBreak
              pageNumber={pageNumber}
              juzNumber={pageToJuz(pageNumber)}
              scale={fontScale}
            />
          </View>
        </View>
      </View>
    </View>
  );
}

function PageBody({
  ayahs,
  scale,
  onAyahLongPress,
}: {
  ayahs: MushafAyah[];
  scale: number;
  onAyahLongPress?: (surah: number, ayah: number) => void;
}) {
  const blocks: Array<
    | { kind: 'header'; surah: number; key: string }
    | { kind: 'bismillah'; key: string }
    | { kind: 'body'; ayahs: MushafAyah[]; key: string }
  > = [];

  let i = 0;
  while (i < ayahs.length) {
    const ayah = ayahs[i];
    if (ayah.ayah === 1) {
      blocks.push({
        kind: 'header',
        surah: ayah.surah,
        key: `h-${ayah.surah}`,
      });
      // Surah 1 (Al-Faatiha): Bismillah IS ayah 1, already in the body text.
      // Surah 9 (At-Tawbah): no Bismillah at all.
      if (ayah.surah !== 1 && ayah.surah !== 9) {
        blocks.push({ kind: 'bismillah', key: `b-${ayah.surah}` });
      }
    }
    const start = i;
    const surahOfBlock = ayah.surah;
    while (i < ayahs.length && ayahs[i].surah === surahOfBlock) {
      i++;
    }
    blocks.push({
      kind: 'body',
      ayahs: ayahs.slice(start, i),
      key: `body-${surahOfBlock}-${start}`,
    });
  }

  return (
    <View style={styles.bodyWrap}>
      {blocks.map((block) => {
        if (block.kind === 'header')
          return (
            <SurahHeader
              key={block.key}
              surahNumber={block.surah}
              scale={scale}
            />
          );
        if (block.kind === 'bismillah')
          return <Bismillah key={block.key} scale={scale} />;
        return (
          <SurahAyahBlock
            key={block.key}
            ayahs={block.ayahs}
            scale={scale}
            onAyahLongPress={onAyahLongPress}
          />
        );
      })}
    </View>
  );
}

function AyahBadgeInline({ n, scale }: { n: number; scale: number }) {
  return (
    <Text
      style={[
        badgeStyles.badge,
        {
          fontSize: 14 * scale,
          lineHeight: 20 * scale,
        },
      ]}
    >
      {' '}
      {toArabicDigits(n)}{' '}
    </Text>
  );
}

const badgeStyles = StyleSheet.create({
  badge: {
    fontFamily: 'IndoPakNastaleeq',
    color: MUSHAF_COLORS.ayahBadgeText,
    backgroundColor: MUSHAF_COLORS.ayahBadgeBg,
    borderWidth: 1,
    borderColor: MUSHAF_COLORS.borderInner,
    borderRadius: 14,
    overflow: 'hidden',
    textAlign: 'center',
  },
});

function SurahAyahBlock({
  ayahs,
  scale,
  onAyahLongPress,
}: {
  ayahs: MushafAyah[];
  scale: number;
  onAyahLongPress?: (surah: number, ayah: number) => void;
}) {
  return (
    <Text
      style={[
        styles.ayahBlock,
        {
          fontSize: MUSHAF_FONT_SIZE * scale,
          lineHeight: MUSHAF_LINE_HEIGHT * scale,
        },
      ]}
      textBreakStrategy="simple"
    >
      {ayahs.map((a, idx) => (
        <Text
          key={`${a.surah}-${a.ayah}`}
          onLongPress={
            onAyahLongPress ? () => onAyahLongPress(a.surah, a.ayah) : undefined
          }
        >
          {idx > 0 ? ' ' : ''}
          {a.text_indopak}{' '}
          <AyahBadgeInline n={a.ayah} scale={scale} />
        </Text>
      ))}
    </Text>
  );
}

const styles = StyleSheet.create({
  outer: {
    backgroundColor: MUSHAF_COLORS.parchment,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  outerBorder: {
    borderWidth: 2,
    borderColor: MUSHAF_COLORS.borderOuter,
    borderRadius: 6,
    padding: 4,
    backgroundColor: MUSHAF_COLORS.parchment,
  },
  innerBorder: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: MUSHAF_COLORS.borderInner,
    borderRadius: 3,
  },
  content: {
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  bodyWrap: {},
  ayahBlock: {
    fontFamily: 'IndoPakNastaleeq',
    color: MUSHAF_COLORS.ink,
    textAlign: 'justify',
    writingDirection: 'rtl',
    marginTop: 4,
  },
  statusWrap: {
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  statusText: {
    color: MUSHAF_COLORS.ink,
    fontSize: 14,
    fontWeight: '600',
  },
  statusSub: {
    color: MUSHAF_COLORS.ink,
    opacity: 0.6,
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
});
