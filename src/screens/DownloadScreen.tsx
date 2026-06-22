import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Animated,
  useColorScheme,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { Colors } from '../constants/colors';
import { useStore } from '../store';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { trackScreen } from '../services/analytics';
import {
  PackId,
  PackStatus,
  DownloadStatus,
  getDownloadStatus,
  getStorageUsed,
  clearPack,
  downloadQuran,
  downloadQuranAudio,
  downloadHadiths,
  downloadNames,
  downloadDuas,
  downloadCalendar,
  downloadPrayerTimes,
  downloadAll,
} from '../services/downloadService';

// ─── Pack configuration ───────────────────────────────────────────────────────

interface PackConfig {
  id: PackId;
  icon: string;
  sizeMB: number;
  accentColor: string;
  unavailable?: string;
  download: (cb: (p: number) => void) => Promise<void>;
}

const PACKS: PackConfig[] = [
  {
    id: 'quranText',
    icon: '📖',
    sizeMB: 8,
    accentColor: '#0F6E56',
    download: downloadQuran,
  },
  {
    id: 'quranAudioAlafasy',
    icon: '🔊',
    sizeMB: 480,
    accentColor: '#8B5CF6',
    unavailable: 'Audio downloads require expo-file-system',
    download: downloadQuranAudio,
  },
  {
    id: 'quranAudioAbdulBasit',
    icon: '🎙️',
    sizeMB: 380,
    accentColor: '#7C3AED',
    unavailable: 'Audio downloads require expo-file-system',
    download: downloadQuranAudio,
  },
  {
    id: 'hadiths',
    icon: '📚',
    sizeMB: 22,
    accentColor: '#3B82F6',
    download: downloadHadiths,
  },
  {
    id: 'duas',
    icon: '🤲',
    sizeMB: 2,
    accentColor: '#F59E0B',
    download: downloadDuas,
  },
  {
    id: 'names99',
    icon: '☪️',
    sizeMB: 1,
    accentColor: '#C9A84C',
    download: downloadNames,
  },
  {
    id: 'islamicBooks',
    icon: '📕',
    sizeMB: 45,
    accentColor: '#EF4444',
    unavailable: 'Islamic Books pack coming soon',
    download: async () => { throw new Error('COMING_SOON'); },
  },
  {
    id: 'adhanSounds',
    icon: '🕌',
    sizeMB: 12,
    accentColor: '#22C55E',
    unavailable: 'Adhan sounds require expo-file-system',
    download: downloadQuranAudio,
  },
  {
    id: 'calendar',
    icon: '📅',
    sizeMB: 1,
    accentColor: '#EC4899',
    download: downloadCalendar,
  },
  {
    id: 'prayerTimes',
    icon: '🕐',
    sizeMB: 0.05,
    accentColor: '#14B8A6',
    download: downloadPrayerTimes,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}

function formatMB(mb: number): string {
  if (mb < 1) return `${Math.round(mb * 1024)} KB`;
  if (mb >= 1000) return `${(mb / 1024).toFixed(1)} GB`;
  return `${mb} MB`;
}

type PackState = 'idle' | 'downloading' | 'downloaded' | 'paused';

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ pct, color }: { pct: number; color: string }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: pct / 100,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [pct]);

  return (
    <View style={pb.track}>
      <Animated.View
        style={[
          pb.fill,
          {
            backgroundColor: color,
            width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
          },
        ]}
      />
    </View>
  );
}

const pb = StyleSheet.create({
  track: { height: 5, borderRadius: 3, backgroundColor: 'rgba(0,0,0,0.08)', overflow: 'hidden', marginTop: 8 },
  fill: { height: 5, borderRadius: 3 },
});

// ─── Main component ───────────────────────────────────────────────────────────

export default function DownloadScreen() {
  useEffect(() => { trackScreen('Downloads'); }, []);
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const settings = useStore((s) => s.settings);
  const isOnline = useNetworkStatus();
  const isDark =
    settings.colorScheme === 'dark' ||
    (settings.colorScheme === 'system' && colorScheme === 'dark');
  const theme = isDark ? Colors.dark : Colors.light;

  const [dlStatus, setDlStatus] = useState<DownloadStatus | null>(null);
  const [storageMB, setStorageMB] = useState(0);
  const [progress, setProgress] = useState<Partial<Record<PackId, number>>>({});
  const [active, setActive] = useState<Set<PackId>>(new Set());
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [wifiOnly, setWifiOnly] = useState(false);

  const refresh = useCallback(async () => {
    const [status, mb] = await Promise.all([getDownloadStatus(), getStorageUsed()]);
    setDlStatus(status);
    setStorageMB(mb);
  }, []);

  useEffect(() => { refresh(); }, []);

  const availablePacks = PACKS.filter((p) => !p.unavailable);
  const downloadedCount = dlStatus
    ? availablePacks.filter((p) => dlStatus[p.id]?.downloaded).length
    : 0;

  // ─── WiFi check ─────────────────────────────────────────────────────────
  //
  // Async because the wifi-only confirmation must actually wait for the
  // user's tap before allowing the download to proceed. Previously this
  // function returned `true` synchronously the moment the Alert was queued,
  // so "Wi-Fi Only" was effectively a no-op gate.
  const checkWifiWarning = (): Promise<boolean> => {
    if (!isOnline) {
      Alert.alert(t('downloads.alerts.noConnection.title'), t('downloads.alerts.noConnection.message'));
      return Promise.resolve(false);
    }
    if (!wifiOnly) return Promise.resolve(true);

    // Can't detect network type without expo-network — show a confirmation
    // dialog and resolve based on the user's choice.
    return new Promise<boolean>((resolve) => {
      Alert.alert(
        t('downloads.alerts.mobileData.title'),
        t('downloads.alerts.mobileData.message'),
        [
          { text: t('common.cancel'), style: 'cancel', onPress: () => resolve(false) },
          { text: t('downloads.alerts.mobileData.continue'), style: 'default', onPress: () => resolve(true) },
        ],
        { onDismiss: () => resolve(false) },
      );
    });
  };

  // ─── Single pack download ─────────────────────────────────────────────────

  const startDownload = useCallback(
    async (pack: PackConfig) => {
      if (pack.unavailable) {
        Alert.alert(
          t('downloads.alerts.notAvailable.title'),
          pack.unavailable === 'COMING_SOON' ? t('downloads.alerts.notAvailable.comingSoon') : pack.unavailable
        );
        return;
      }
      // Don't run an individual pack download concurrently with Download-All —
      // they'd write the same keys and double-count sizes.
      if (active.has(pack.id) || downloadingAll) return;
      if (!(await checkWifiWarning())) return;

      setActive((prev) => new Set(prev).add(pack.id));
      setProgress((prev) => ({ ...prev, [pack.id]: 0 }));

      try {
        await pack.download((pct) =>
          setProgress((prev) => ({ ...prev, [pack.id]: pct }))
        );
        await refresh();
      } catch (e: any) {
        const msg = e?.message?.startsWith('NEEDS_FILE_SYSTEM')
          ? t('downloads.alerts.downloadError.needsFileSystem')
          : e?.message?.startsWith('COMING_SOON')
          ? t('downloads.alerts.downloadError.comingSoon')
          : t('downloads.alerts.downloadError.generic');
        Alert.alert(t('downloads.alerts.downloadError.title'), msg);
      }

      setActive((prev) => {
        const next = new Set(prev);
        next.delete(pack.id);
        return next;
      });
      setProgress((prev) => {
        const next = { ...prev };
        delete next[pack.id];
        return next;
      });
    },
    [active, refresh, wifiOnly, isOnline, downloadingAll]
  );

  // ─── Download all ─────────────────────────────────────────────────────────

  const startDownloadAll = useCallback(async () => {
    // Mutual exclusion with individual pack downloads: bail if Download-All is
    // already running OR any single pack is mid-download (they'd write the same
    // keys and double-count sizes). startDownload guards the inverse direction.
    if (downloadingAll || active.size > 0) return;
    if (!(await checkWifiWarning())) return;
    setDownloadingAll(true);

    try {
      await downloadAll((packId, pct) => {
        setActive((prev) => new Set(prev).add(packId));
        setProgress((prev) => ({ ...prev, [packId]: pct }));
        if (pct >= 100) {
          setActive((prev) => {
            const next = new Set(prev);
            next.delete(packId);
            return next;
          });
        }
      });
      await refresh();
    } catch {
      Alert.alert(t('downloads.alerts.downloadError.title'), t('downloads.alerts.downloadError.oneOrMore'));
    }

    setDownloadingAll(false);
    setProgress({});
    setActive(new Set());
  }, [downloadingAll, active, refresh, wifiOnly, isOnline]);

  // ─── Delete pack ──────────────────────────────────────────────────────────

  const deletePack = useCallback(
    (pack: PackConfig) => {
      const packTitle = t(`downloads.packs.${pack.id}.title`);
      Alert.alert(
        t('downloads.alerts.removePack.title', { title: packTitle }),
        t('downloads.alerts.removePack.message'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('downloads.alerts.removePack.confirm'),
            style: 'destructive',
            onPress: async () => {
              await clearPack(pack.id);
              await refresh();
            },
          },
        ]
      );
    },
    [refresh, t]
  );

  // ─── Pack card ────────────────────────────────────────────────────────────

  const renderPack = (pack: PackConfig) => {
    const packStatus: PackStatus | undefined = dlStatus?.[pack.id];
    const isDownloaded = packStatus?.downloaded ?? false;
    const isActive = active.has(pack.id);
    const pct = progress[pack.id] ?? 0;
    const isUnavailable = !!pack.unavailable;
    const lastUpdated = packStatus?.downloadedAt
      ? new Date(packStatus.downloadedAt).toLocaleDateString()
      : null;

    let statusLabel = t('downloads.status.notDownloaded');
    let statusColor = theme.textMuted;
    if (isActive) { statusLabel = t('downloads.status.downloading', { pct }); statusColor = pack.accentColor; }
    else if (isDownloaded) { statusLabel = t('downloads.status.downloaded'); statusColor = Colors.success; }
    else if (isUnavailable) { statusLabel = t('downloads.status.unavailable'); statusColor = theme.textMuted; }

    return (
      <View
        key={pack.id}
        style={[
          styles.card,
          { backgroundColor: theme.card, borderColor: theme.border },
          isUnavailable && { opacity: 0.5 },
        ]}
      >
        <View style={[styles.iconWrap, { backgroundColor: pack.accentColor + '20' }]}>
          <Text style={styles.packIcon}>{pack.icon}</Text>
        </View>

        <View style={styles.packInfo}>
          <View style={styles.packTitleRow}>
            <Text style={[styles.packTitle, { color: theme.text }]} numberOfLines={1}>
              {t(`downloads.packs.${pack.id}.title`)}
            </Text>
            <Text style={[styles.packSize, { color: theme.textMuted }]}>
              {formatMB(pack.sizeMB)}
            </Text>
          </View>

          <Text style={[styles.packSub, { color: theme.textSecondary }]} numberOfLines={2}>
            {t(`downloads.packs.${pack.id}.subtitle`)}
          </Text>

          {/* Status row */}
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusLabel, { color: statusColor }]}>{statusLabel}</Text>
            {isDownloaded && lastUpdated && (
              <Text style={[styles.lastUpdated, { color: theme.textMuted }]}>
                · {lastUpdated}
              </Text>
            )}
            {isDownloaded && packStatus && packStatus.sizeBytes > 0 && (
              <Text style={[styles.lastUpdated, { color: theme.textMuted }]}>
                {' '}({formatBytes(packStatus.sizeBytes)})
              </Text>
            )}
          </View>

          {/* Progress bar */}
          {isActive && <ProgressBar pct={pct} color={pack.accentColor} />}
        </View>

        {/* Action buttons */}
        <View style={styles.actionCol}>
          {isUnavailable ? (
            <View style={[styles.iconBtn, { backgroundColor: theme.border }]}>
              <Ionicons name="lock-closed" size={13} color={theme.textMuted} />
            </View>
          ) : isActive ? (
            <View style={[styles.iconBtn, { backgroundColor: pack.accentColor + '20' }]}>
              <Ionicons name="sync" size={15} color={pack.accentColor} />
            </View>
          ) : isDownloaded ? (
            <>
              <TouchableOpacity
                style={[styles.iconBtn, { backgroundColor: Colors.success + '18', opacity: downloadingAll ? 0.4 : 1 }]}
                onPress={() => startDownload(pack)}
                disabled={downloadingAll}
                hitSlop={6}
              >
                <Ionicons name="refresh" size={15} color={Colors.success} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.iconBtn, { backgroundColor: Colors.error + '18', marginTop: 6 }]}
                onPress={() => deletePack(pack)}
                hitSlop={6}
              >
                <Ionicons name="trash-outline" size={15} color={Colors.error} />
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={[styles.dlBtn, { backgroundColor: pack.accentColor, opacity: downloadingAll ? 0.4 : 1 }]}
              onPress={() => startDownload(pack)}
              disabled={downloadingAll}
            >
              <Ionicons name="cloud-download-outline" size={15} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  const allAvailableDownloaded =
    dlStatus !== null && availablePacks.every((p) => dlStatus[p.id]?.downloaded);

  const totalSizeMB = PACKS.filter((p) => !p.unavailable)
    .reduce((sum, p) => sum + p.sizeMB, 0);

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── Storage header ── */}
        <View style={[styles.storageCard, { backgroundColor: Colors.primary }]}>
          <View style={styles.storageRow}>
            <View>
              <Text style={styles.storageLabel}>{t('downloads.storage.label')}</Text>
              <Text style={styles.storageValue}>{storageMB.toFixed(1)} MB</Text>
              <Text style={styles.storageTotal}>{t('downloads.storage.total', { total: totalSizeMB })}</Text>
            </View>
            <View style={styles.storageStats}>
              <Text style={styles.storageCountNum}>{downloadedCount}</Text>
              <Text style={styles.storageCountLabel}>
                {t('downloads.storage.packsCount', { total: availablePacks.length })}
              </Text>
            </View>
          </View>
          <View style={styles.storageBarBg}>
            <View
              style={[
                styles.storageBarFill,
                { width: `${Math.min(100, (storageMB / totalSizeMB) * 100)}%` },
              ]}
            />
          </View>
        </View>

        {/* ── Offline / WiFi notice ── */}
        {!isOnline && (
          <View style={[styles.banner, { backgroundColor: Colors.error + '18', borderColor: Colors.error + '40' }]}>
            <Ionicons name="cloud-offline-outline" size={16} color={Colors.error} />
            <Text style={[styles.bannerText, { color: Colors.error }]}>
              {t('downloads.offline.banner')}
            </Text>
          </View>
        )}

        {/* ── WiFi Only toggle ── */}
        <View style={[styles.wifiRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.wifiLeft}>
            <Ionicons name="wifi" size={18} color={wifiOnly ? Colors.primary : theme.textMuted} />
            <View>
              <Text style={[styles.wifiTitle, { color: theme.text }]}>{t('downloads.wifi.title')}</Text>
              <Text style={[styles.wifiSub, { color: theme.textMuted }]}>
                {wifiOnly
                  ? t('downloads.wifi.subOn')
                  : t('downloads.wifi.subOff')}
              </Text>
            </View>
          </View>
          <Switch
            value={wifiOnly}
            onValueChange={setWifiOnly}
            trackColor={{ false: theme.border, true: Colors.primary + '80' }}
            thumbColor={wifiOnly ? Colors.primary : theme.textMuted}
          />
        </View>

        {/* ── Download All ── */}
        {!allAvailableDownloaded ? (
          <TouchableOpacity
            style={[
              styles.downloadAllBtn,
              { borderColor: Colors.primary },
              (downloadingAll || !isOnline || active.size > 0) && { opacity: 0.5 },
            ]}
            onPress={startDownloadAll}
            disabled={downloadingAll || !isOnline || active.size > 0}
            activeOpacity={0.75}
          >
            <Ionicons
              name={downloadingAll ? 'sync' : 'cloud-download-outline'}
              size={18}
              color={Colors.primary}
            />
            <Text style={[styles.downloadAllText, { color: Colors.primary }]}>
              {downloadingAll ? t('downloads.downloading') : t('downloads.downloadAll')}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={[styles.allDoneCard, { backgroundColor: Colors.success + '18', borderColor: Colors.success + '40' }]}>
            <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
            <Text style={[styles.allDoneText, { color: Colors.success }]}>
              {t('downloads.allDone')}
            </Text>
          </View>
        )}

        {/* ── Supabase note ── */}
        <View style={[styles.infoBanner, { backgroundColor: Colors.info + '12', borderColor: Colors.info + '30' }]}>
          <Ionicons name="server-outline" size={14} color={Colors.info} />
          <Text style={[styles.infoText, { color: Colors.info }]}>
            {t('downloads.supabaseNote')}
          </Text>
        </View>

        {/* ── Pack list ── */}
        <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>{t('downloads.sectionLabel')}</Text>
        <View style={[styles.packList, { borderColor: theme.border }]}>
          {PACKS.map((pack, idx) => (
            <View key={pack.id}>
              {renderPack(pack)}
              {idx < PACKS.length - 1 && (
                <View style={[styles.separator, { backgroundColor: theme.border }]} />
              )}
            </View>
          ))}
        </View>

        <Text style={[styles.footer, { color: theme.textMuted }]}>
          {t('downloads.footer')}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: 16, gap: 12 },

  storageCard: { borderRadius: 16, padding: 18, gap: 10 },
  storageRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  storageLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 },
  storageValue: { color: '#fff', fontSize: 26, fontWeight: '800', marginTop: 2 },
  storageTotal: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 1 },
  storageStats: { alignItems: 'flex-end' },
  storageCountNum: { color: '#fff', fontSize: 32, fontWeight: '800' },
  storageCountLabel: { color: 'rgba(255,255,255,0.65)', fontSize: 12 },
  storageBarBg: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.2)', overflow: 'hidden' },
  storageBarFill: { height: 6, borderRadius: 3, backgroundColor: '#fff' },

  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },
  bannerText: { fontSize: 13, fontWeight: '600', flex: 1 },

  wifiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  wifiLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  wifiTitle: { fontSize: 14, fontWeight: '700' },
  wifiSub: { fontSize: 11, marginTop: 1 },

  downloadAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 14,
  },
  downloadAllText: { fontSize: 15, fontWeight: '700' },

  allDoneCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  allDoneText: { fontSize: 14, fontWeight: '600', flex: 1 },

  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },
  infoText: { fontSize: 12, lineHeight: 18, flex: 1 },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 4,
  },

  packList: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  separator: { height: StyleSheet.hairlineWidth },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  packIcon: { fontSize: 20 },
  packInfo: { flex: 1, minWidth: 0 },
  packTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  packTitle: { fontSize: 14, fontWeight: '700', flex: 1 },
  packSize: { fontSize: 11, fontWeight: '600', flexShrink: 0 },
  packSub: { fontSize: 11, marginTop: 2, lineHeight: 16 },

  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusLabel: { fontSize: 11, fontWeight: '700' },
  lastUpdated: { fontSize: 10 },

  actionCol: { flexShrink: 0, alignItems: 'center' },
  dlBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },

  footer: {
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 8,
  },
});
