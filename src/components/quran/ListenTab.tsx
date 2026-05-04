import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';

const GOLD = '#EF9F27';

const RECITERS: Array<{ name: string; style: string }> = [
  { name: 'Mishary Rashid Alafasy', style: 'Murattal' },
  { name: 'Sheikh Abdul Basit Abdul Samad', style: 'Mujawwad' },
  { name: 'Saad Al-Ghamidi', style: 'Murattal' },
  { name: 'Saud Al-Shuraim', style: 'Murattal' },
  { name: 'Maher Al-Mueaqly', style: 'Murattal' },
];

export default function ListenTab({ isDark }: { isDark: boolean }) {
  const theme = isDark ? Colors.dark : Colors.light;

  const handleNotify = () => {
    Alert.alert(
      'Notification set',
      "Thanks! We'll notify you when audio recitation launches.",
    );
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={styles.container}
    >
      <View
        style={[
          styles.iconCircle,
          { backgroundColor: Colors.primary + '18' },
        ]}
      >
        <Ionicons name="headset" size={48} color={Colors.primary} />
      </View>

      <Text style={[styles.heading, { color: theme.text }]}>
        Audio Recitation
      </Text>
      <Text style={[styles.subheading, { color: theme.textSecondary }]}>
        Coming soon — listen to the Quran in beautiful recitations from
        world-renowned Qaris
      </Text>

      <View style={styles.recitersBlock}>
        <Text style={[styles.recitersLabel, { color: theme.textMuted }]}>
          PLANNED RECITERS
        </Text>

        <View style={[styles.recitersList, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {RECITERS.map((r, idx) => (
            <View
              key={r.name}
              style={[
                styles.reciterRow,
                idx < RECITERS.length - 1 && {
                  borderBottomWidth: 1,
                  borderBottomColor: theme.border,
                },
              ]}
            >
              <View
                style={[styles.avatar, { backgroundColor: Colors.primary }]}
              >
                <Text style={styles.avatarText}>{r.name.charAt(0)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.reciterName, { color: theme.text }]}>
                  {r.name}
                </Text>
                <Text style={[styles.reciterStyle, { color: GOLD }]}>
                  {r.style}
                </Text>
              </View>
              <Ionicons
                name="lock-closed"
                size={16}
                color={theme.textMuted}
              />
            </View>
          ))}
        </View>
      </View>

      <TouchableOpacity
        style={styles.notifyBtn}
        onPress={handleNotify}
        activeOpacity={0.85}
      >
        <Ionicons name="notifications-outline" size={18} color="#fff" />
        <Text style={styles.notifyBtnText}>Notify me when available</Text>
      </TouchableOpacity>

      <Text style={[styles.footnote, { color: theme.textMuted }]}>
        Audio downloads, multiple Qari styles, and ayah-by-ayah playback are
        on the way, in shaa Allah.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    alignItems: 'center',
    paddingBottom: 60,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    marginBottom: 20,
  },
  heading: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  subheading: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 28,
    paddingHorizontal: 8,
    lineHeight: 20,
  },
  recitersBlock: {
    width: '100%',
    marginBottom: 24,
  },
  recitersLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  recitersList: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  reciterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  reciterName: { fontSize: 14, fontWeight: '600' },
  reciterStyle: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  notifyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  notifyBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  footnote: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 20,
    paddingHorizontal: 16,
    fontStyle: 'italic',
  },
});
