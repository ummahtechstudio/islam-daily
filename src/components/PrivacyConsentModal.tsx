import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useStore } from '../store';
import { Colors } from '../constants/colors';

interface Props {
  onAccept: () => void;
  onDecline: () => void;
}

export function PrivacyConsentModal({ onAccept, onDecline }: Props) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const settingsScheme = useStore((s) => s.settings.colorScheme);
  const isDark =
    settingsScheme === 'dark' ||
    (settingsScheme === 'system' && colorScheme === 'dark');
  const theme = isDark ? Colors.dark : Colors.light;

  const [detail, setDetail] = useState(false);

  return (
    <Modal transparent animationType="fade" visible statusBarTranslucent>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {/* Header */}
          <View style={[styles.header, { backgroundColor: Colors.primary }]}>
            <Text style={{ fontSize: 28 }}>🌙</Text>
            <Text style={styles.headerTitle}>{t('privacy.header')}</Text>
          </View>

          <ScrollView
            contentContainerStyle={styles.body}
            showsVerticalScrollIndicator={false}
          >
            {!detail ? (
              <>
                <Text style={[styles.title, { color: theme.text }]}>
                  {t('privacy.consent.title')}
                </Text>
                <Text style={[styles.para, { color: theme.textSecondary }]}>
                  {t('privacy.consent.body1Before')}{' '}
                  <Text style={{ fontWeight: '700' }}>{t('privacy.consent.body1Highlight')}</Text>
                  {' '}{t('privacy.consent.body1After')}
                </Text>
                <Text style={[styles.para, { color: theme.textSecondary }]}>
                  {t('privacy.consent.body2')}
                </Text>

                <View style={[styles.bullets, { borderColor: theme.border }]}>
                  {([
                    { icon: 'location-outline',        bulletKey: 'location' },
                    { icon: 'shield-checkmark-outline', bulletKey: 'noShare' },
                    { icon: 'eye-off-outline',          bulletKey: 'noIdentity' },
                    { icon: 'settings-outline',         bulletKey: 'optOut' },
                  ] as const).map(({ icon, bulletKey }) => (
                    <View key={bulletKey} style={styles.bulletRow}>
                      <Ionicons name={icon as any} size={16} color={Colors.primary} />
                      <Text style={[styles.bulletText, { color: theme.textSecondary }]}>{t(`privacy.consent.bullets.${bulletKey}`)}</Text>
                    </View>
                  ))}
                </View>
              </>
            ) : (
              <>
                <TouchableOpacity onPress={() => setDetail(false)} style={styles.backRow}>
                  <Ionicons name="chevron-back" size={16} color={Colors.primary} />
                  <Text style={[styles.backText, { color: Colors.primary }]}>{t('common.back')}</Text>
                </TouchableOpacity>
                <Text style={[styles.title, { color: theme.text }]}>{t('privacy.detail.title')}</Text>
                {(['cityCountry', 'platformDevice', 'appVersion', 'sessionTimestamp'] as const).map((key) => (
                  <View key={key} style={styles.detailBlock}>
                    <Text style={[styles.detailHeading, { color: theme.text }]}>{t(`privacy.detail.items.${key}.heading`)}</Text>
                    <Text style={[styles.detailBody, { color: theme.textSecondary }]}>{t(`privacy.detail.items.${key}.desc`)}</Text>
                  </View>
                ))}
                <Text style={[styles.para, { color: theme.textSecondary, marginTop: 8 }]}>
                  {t('privacy.detail.footer')}
                </Text>
              </>
            )}
          </ScrollView>

          {/* Actions */}
          <View style={[styles.actions, { borderTopColor: theme.border }]}>
            {!detail && (
              <TouchableOpacity
                style={styles.learnMore}
                onPress={() => setDetail(true)}
              >
                <Text style={[styles.learnMoreText, { color: Colors.primary }]}>{t('privacy.consent.learnMore')}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.declineBtn, { borderColor: theme.border }]}
              onPress={onDecline}
            >
              <Text style={[styles.declineBtnText, { color: theme.textSecondary }]}>{t('privacy.consent.noThanks')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.acceptBtn, { backgroundColor: Colors.primary }]}
              onPress={onAccept}
            >
              <Text style={styles.acceptBtnText}>{t('privacy.consent.accept')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },

  body: { padding: 20, paddingBottom: 4 },
  title: { fontSize: 20, fontWeight: '800', marginBottom: 12 },
  para: { fontSize: 14, lineHeight: 21, marginBottom: 10 },

  bullets: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 10,
    marginTop: 4,
  },
  bulletRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bulletText: { fontSize: 13, flex: 1, lineHeight: 19 },

  backRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12 },
  backText: { fontSize: 14, fontWeight: '600' },
  detailBlock: { marginBottom: 14 },
  detailHeading: { fontSize: 14, fontWeight: '700', marginBottom: 3 },
  detailBody: { fontSize: 13, lineHeight: 20 },

  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  learnMore: { flex: 1, minWidth: 80 },
  learnMoreText: { fontSize: 14, fontWeight: '600' },
  declineBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  declineBtnText: { fontSize: 14, fontWeight: '600' },
  acceptBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 140,
  },
  acceptBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
