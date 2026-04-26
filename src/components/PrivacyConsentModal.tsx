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
import { useStore } from '../store';
import { Colors } from '../constants/colors';

interface Props {
  onAccept: () => void;
  onDecline: () => void;
}

export function PrivacyConsentModal({ onAccept, onDecline }: Props) {
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
            <Text style={styles.headerTitle}>Islam Daily</Text>
          </View>

          <ScrollView
            contentContainerStyle={styles.body}
            showsVerticalScrollIndicator={false}
          >
            {!detail ? (
              <>
                <Text style={[styles.title, { color: theme.text }]}>
                  A quick note on privacy
                </Text>
                <Text style={[styles.para, { color: theme.textSecondary }]}>
                  Islam Daily collects <Text style={{ fontWeight: '700' }}>anonymous location data</Text> to
                  understand where our users are and improve the app experience for Muslims worldwide.
                </Text>
                <Text style={[styles.para, { color: theme.textSecondary }]}>
                  No personal information — no name, email, or device ID — is ever stored or shared.
                </Text>

                <View style={[styles.bullets, { borderColor: theme.border }]}>
                  {[
                    { icon: 'location-outline',  text: 'Approximate city & country only' },
                    { icon: 'shield-checkmark-outline', text: 'Never sold or shared with third parties' },
                    { icon: 'eye-off-outline',   text: 'Not linked to your identity' },
                    { icon: 'settings-outline',  text: 'Can be disabled any time in Settings' },
                  ].map(({ icon, text }) => (
                    <View key={text} style={styles.bulletRow}>
                      <Ionicons name={icon as any} size={16} color={Colors.primary} />
                      <Text style={[styles.bulletText, { color: theme.textSecondary }]}>{text}</Text>
                    </View>
                  ))}
                </View>
              </>
            ) : (
              <>
                <TouchableOpacity onPress={() => setDetail(false)} style={styles.backRow}>
                  <Ionicons name="chevron-back" size={16} color={Colors.primary} />
                  <Text style={[styles.backText, { color: Colors.primary }]}>Back</Text>
                </TouchableOpacity>
                <Text style={[styles.title, { color: theme.text }]}>What we collect</Text>
                {[
                  ['City & country', 'Derived from GPS coordinates via on-device reverse geocoding. Only the text (e.g. "London, GB") is stored — raw coordinates are stored rounded to 4 decimal places (~11 m precision).'],
                  ['Platform & device', 'Android or iOS, OS version, and device model (e.g. "Pixel 7"). No device ID or advertising ID.'],
                  ['App version', 'So we know which build a session came from.'],
                  ['Session timestamp', 'The UTC time the app was opened.'],
                ].map(([heading, desc]) => (
                  <View key={heading} style={styles.detailBlock}>
                    <Text style={[styles.detailHeading, { color: theme.text }]}>{heading}</Text>
                    <Text style={[styles.detailBody, { color: theme.textSecondary }]}>{desc}</Text>
                  </View>
                ))}
                <Text style={[styles.para, { color: theme.textSecondary, marginTop: 8 }]}>
                  Data is stored in Supabase (EU region) and is only accessible to the Islam Daily development team.
                  You can opt out at any time from Settings → Privacy.
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
                <Text style={[styles.learnMoreText, { color: Colors.primary }]}>Learn More</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.declineBtn, { borderColor: theme.border }]}
              onPress={onDecline}
            >
              <Text style={[styles.declineBtnText, { color: theme.textSecondary }]}>No thanks</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.acceptBtn, { backgroundColor: Colors.primary }]}
              onPress={onAccept}
            >
              <Text style={styles.acceptBtnText}>OK, I understand</Text>
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
