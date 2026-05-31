import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { getSurahMeta } from '../../constants/surahMeta';
import {
  MUSHAF_COLORS,
  MUSHAF_FONT_SIZE,
  MUSHAF_LINE_HEIGHT,
} from './mushafTokens';

export type MushafPageProps = {
  pageNumber: number;
  onAyahLongPress?: (surah: number, ayah: number) => void;
};

type MushafAyah = {
  surah: number;
  ayah: number;
  text_indopak: string;
};

const TOTAL_PAGES = 604;
const BISMILLAH_TEXT = 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ';

const pageCache = new Map<number, MushafAyah[]>();

const ARABIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

export function toArabicDigits(n: number): string {
  return String(n)
    .split('')
    .map((d) => ARABIC_DIGITS[parseInt(d, 10)] ?? d)
    .join('');
}

const JUZ_START_PAGES = [
  1, 22, 42, 62, 82, 102, 121, 142, 162, 182,
  202, 222, 241, 262, 282, 302, 322, 342, 362, 382,
  402, 422, 442, 462, 482, 502, 522, 542, 562, 582,
];

function getJuzFromPage(page: number): number {
  for (let i = JUZ_START_PAGES.length - 1; i >= 0; i--) {
    if (page >= JUZ_START_PAGES[i]) return i + 1;
  }
  return 1;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SurahHeader({ surahNumber }: { surahNumber: number }) {
  const { t } = useTranslation();
  const meta = getSurahMeta(surahNumber);
  if (!meta) return null;
  const place =
    meta.revelation_place === 'makkah'
      ? t('quran.mushaf.makkiyyah')
      : t('quran.mushaf.madaniyyah');
  return (
    <View style={surahHeaderStyles.wrap}>
      <View style={surahHeaderStyles.banner}>
        <Text style={surahHeaderStyles.cornerLeft}>✦</Text>
        <Text style={surahHeaderStyles.cornerRight}>✦</Text>
        <Text style={surahHeaderStyles.arabic}>
          سُورَةُ {meta.name_arabic}
        </Text>
        <Text style={surahHeaderStyles.meta}>
          {t('quran.mushaf.ayahsCount', { count: meta.ayah_count })} · {place}
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
    fontSize: 22,
    color: MUSHAF_COLORS.surahBannerText,
    textAlign: 'center',
  },
  meta: {
    color: MUSHAF_COLORS.surahBannerSubtle,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginTop: 2,
  },
});

function Bismillah() {
  return <Text style={bismillahStyles.text}>{BISMILLAH_TEXT}</Text>;
}

const bismillahStyles = StyleSheet.create({
  text: {
    fontFamily: 'IndoPakNastaleeq',
    fontSize: 22,
    textAlign: 'center',
    color: MUSHAF_COLORS.ink,
    marginVertical: 6,
    writingDirection: 'rtl',
  },
});

export function AyahNumberBadge({ n }: { n: number }) {
  return (
    <Text style={badgeStyles.badge}> {toArabicDigits(n)} </Text>
  );
}

const badgeStyles = StyleSheet.create({
  badge: {
    fontFamily: 'IndoPakNastaleeq',
    fontSize: 14,
    lineHeight: 20,
    color: MUSHAF_COLORS.ayahBadgeText,
    backgroundColor: MUSHAF_COLORS.ayahBadgeBg,
    borderWidth: 1,
    borderColor: MUSHAF_COLORS.borderInner,
    borderRadius: 14,
    overflow: 'hidden',
    textAlign: 'center',
  },
});

function PageFooter({
  pageNumber,
  juzNumber,
  surahName,
}: {
  pageNumber: number;
  juzNumber: number;
  surahName: string;
}) {
  const { t } = useTranslation();
  return (
    <View style={footerStyles.wrap}>
      <View style={footerStyles.divider} />
      <View style={footerStyles.row}>
        <Text style={footerStyles.side} numberOfLines={1}>
          {t('quran.mushaf.juz', { n: juzNumber })}
        </Text>
        <View style={footerStyles.pill}>
          <Text style={footerStyles.pillText}>
            {t('quran.mushaf.page', { n: pageNumber, total: TOTAL_PAGES })}
          </Text>
        </View>
        <Text
          style={[footerStyles.side, footerStyles.sideRight]}
          numberOfLines={1}
        >
          {surahName}
        </Text>
      </View>
    </View>
  );
}

const footerStyles = StyleSheet.create({
  wrap: {
    paddingTop: 6,
  },
  divider: {
    height: 1,
    backgroundColor: MUSHAF_COLORS.footerDivider,
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  side: {
    fontSize: 11,
    color: MUSHAF_COLORS.borderOuter,
    fontWeight: '600',
    flex: 1,
  },
  sideRight: {
    textAlign: 'right',
  },
  pill: {
    backgroundColor: MUSHAF_COLORS.borderOuter,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  pillText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
});

// ─── Main component ──────────────────────────────────────────────────────────

export default function MushafPage({
  pageNumber,
  onAyahLongPress,
}: MushafPageProps) {
  const { t } = useTranslation();
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
    <View style={styles.screen}>
      <View style={styles.outerBorder}>
        <View style={styles.innerBorder}>
          <View style={styles.content}>
            {loading ? (
              <PageStatus>
                <ActivityIndicator
                  size="large"
                  color={MUSHAF_COLORS.borderOuter}
                />
                <Text style={styles.statusText}>
                  {t('quran.mushaf.loadingPage', { n: pageNumber })}
                </Text>
              </PageStatus>
            ) : error ? (
              <PageStatus>
                <Text style={styles.statusText}>
                  {t('quran.mushaf.couldNotLoadPage', { n: pageNumber })}
                </Text>
                <Text style={styles.statusSub}>{error}</Text>
              </PageStatus>
            ) : ayahs.length === 0 ? (
              <PageStatus>
                <Text style={styles.statusText}>
                  {t('quran.mushaf.noAyahsOnPage', { n: pageNumber })}
                </Text>
              </PageStatus>
            ) : (
              <PageBody ayahs={ayahs} onAyahLongPress={onAyahLongPress} />
            )}
            <PageFooter
              pageNumber={pageNumber}
              juzNumber={getJuzFromPage(pageNumber)}
              surahName={
                ayahs.length > 0
                  ? getSurahMeta(ayahs[0].surah)?.name_english ?? ''
                  : ''
              }
            />
          </View>
        </View>
      </View>
    </View>
  );
}

function PageStatus({ children }: { children: React.ReactNode }) {
  return <View style={styles.statusWrap}>{children}</View>;
}

function PageBody({
  ayahs,
  onAyahLongPress,
}: {
  ayahs: MushafAyah[];
  onAyahLongPress?: (surah: number, ayah: number) => void;
}) {
  // Group ayahs by surah block in render order so we can insert
  // a SurahHeader + Bismillah ahead of each new surah within the page.
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
          return <SurahHeader key={block.key} surahNumber={block.surah} />;
        if (block.kind === 'bismillah') return <Bismillah key={block.key} />;
        return (
          <SurahAyahBlock
            key={block.key}
            ayahs={block.ayahs}
            onAyahLongPress={onAyahLongPress}
          />
        );
      })}
    </View>
  );
}

function SurahAyahBlock({
  ayahs,
  onAyahLongPress,
}: {
  ayahs: MushafAyah[];
  onAyahLongPress?: (surah: number, ayah: number) => void;
}) {
  return (
    <Text style={styles.ayahBlock} textBreakStrategy="simple">
      {ayahs.map((a, idx) => (
        <Text
          key={`${a.surah}-${a.ayah}`}
          onLongPress={
            onAyahLongPress ? () => onAyahLongPress(a.surah, a.ayah) : undefined
          }
        >
          {idx > 0 ? ' ' : ''}
          {a.text_indopak}
          {' '}
          <AyahNumberBadge n={a.ayah} />
        </Text>
      ))}
    </Text>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: MUSHAF_COLORS.parchment,
    padding: 12,
  },
  outerBorder: {
    flex: 1,
    borderWidth: 2,
    borderColor: MUSHAF_COLORS.borderOuter,
    borderRadius: 6,
    padding: 4,
    backgroundColor: MUSHAF_COLORS.parchment,
  },
  innerBorder: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: MUSHAF_COLORS.borderInner,
    borderRadius: 3,
  },
  content: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 18,
  },
  bodyWrap: {
    flex: 1,
  },
  ayahBlock: {
    fontFamily: 'IndoPakNastaleeq',
    fontSize: MUSHAF_FONT_SIZE,
    lineHeight: MUSHAF_LINE_HEIGHT,
    color: MUSHAF_COLORS.ink,
    textAlign: 'justify',
    writingDirection: 'rtl',
    marginTop: 4,
  },
  statusWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
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

