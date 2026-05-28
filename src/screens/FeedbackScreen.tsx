import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  useColorScheme,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useRouter } from 'expo-router';

import { Colors } from '../constants/colors';
import { useStore } from '../store';
import { trackScreen } from '../services/analytics';
import { supabase } from '../lib/supabase';
import { useIsOnline } from '../hooks/useIsOnline';

const SCREENSHOT_BUCKET = 'feedback-screenshots';
const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024;
const MAX_SCREENSHOT_WIDTH = 1920;

interface PickedScreenshot {
  uri: string;
  width: number;
  height: number;
}

async function compressForUpload(asset: PickedScreenshot): Promise<{ uri: string; mime: string }> {
  const needsResize = asset.width > MAX_SCREENSHOT_WIDTH;
  const result = await ImageManipulator.manipulateAsync(
    asset.uri,
    needsResize ? [{ resize: { width: MAX_SCREENSHOT_WIDTH } }] : [],
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
  );
  return { uri: result.uri, mime: 'image/jpeg' };
}

type FeedbackCategory = 'Bug' | 'Suggestion' | 'Content Issue' | 'Other';
const CATEGORIES: FeedbackCategory[] = ['Bug', 'Suggestion', 'Content Issue', 'Other'];

const CATEGORY_ICONS: Record<FeedbackCategory, string> = {
  'Bug': 'bug',
  'Suggestion': 'bulb',
  'Content Issue': 'document-text',
  'Other': 'chatbubble',
};

const CATEGORY_COLORS: Record<FeedbackCategory, string> = {
  'Bug': '#EF4444',
  'Suggestion': '#8B5CF6',
  'Content Issue': '#F59E0B',
  'Other': '#22C55E',
};

type SubmitState = 'idle' | 'loading' | 'success' | 'error';

export default function FeedbackScreen() {
  useEffect(() => { trackScreen('Feedback'); }, []);

  const router = useRouter();
  const colorScheme = useColorScheme();
  const settings = useStore((s) => s.settings);
  const isDark = settings.colorScheme === 'dark' || (settings.colorScheme === 'system' && colorScheme === 'dark');
  const theme = isDark ? Colors.dark : Colors.light;
  const isOnline = useIsOnline();

  const [category, setCategory] = useState<FeedbackCategory>('Other');
  const [message, setMessage] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [rating, setRating] = useState(0);
  const [screenshot, setScreenshot] = useState<PickedScreenshot | null>(null);

  const pickScreenshot = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission needed', 'Please allow photo library access to attach a screenshot.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 1,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const a = result.assets[0];
      setScreenshot({ uri: a.uri, width: a.width ?? 0, height: a.height ?? 0 });
    } catch (err: any) {
      console.error('[Feedback] image pick failed', err);
      Alert.alert('Could not open picker', err?.message ?? 'Try again.');
    }
  };

  const uploadScreenshot = async (): Promise<string | null> => {
    if (!screenshot) return null;
    const { uri, mime } = await compressForUpload(screenshot);
    const res = await fetch(uri);
    const blob = await res.blob();
    if (blob.size > MAX_SCREENSHOT_BYTES) {
      throw new Error('Screenshot is too large (limit 5 MB after compression).');
    }
    const filename = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;
    const { error } = await supabase.storage
      .from(SCREENSHOT_BUCKET)
      .upload(filename, blob, { contentType: mime, upsert: false });
    if (error) throw error;
    const { data } = supabase.storage.from(SCREENSHOT_BUCKET).getPublicUrl(filename);
    return data.publicUrl ?? null;
  };

  const insertFeedbackRow = async (
    finalCategory: FeedbackCategory,
    trimmedMessage: string,
    appVersion: string,
    deviceModel: string,
    screenshotUrl: string | null,
  ) => {
    const { error } = await supabase.from('feedback').insert({
      rating: rating || null,
      category: finalCategory,
      message: trimmedMessage,
      name: name.trim() || 'Anonymous',
      email: email.trim() || null,
      app_version: appVersion,
      device_platform: Platform.OS,
      device_model: deviceModel,
      screenshot_url: screenshotUrl,
    });
    if (error) throw error;
    setSubmitState('success');
    setCategory('Other');
    setMessage('');
    setName('');
    setEmail('');
    setRating(0);
    setScreenshot(null);
    Alert.alert('JazakAllah Khair!', 'Your feedback has been received.', [
      { text: 'OK', onPress: () => router.back() },
    ]);
  };

  const handleSend = async () => {
    const finalCategory: FeedbackCategory = category || 'Other';
    const trimmedMessage = message.trim();

    if (trimmedMessage.length < 10) {
      Alert.alert('Message Too Short', 'Please write at least 10 characters.');
      return;
    }

    if (!isOnline) {
      Alert.alert(
        'You appear to be offline',
        "Submitting feedback needs an internet connection. Connect and try again.",
      );
      return;
    }

    setSubmitState('loading');
    const appVersion = Constants.expoConfig?.version ?? '1.0.0';
    const deviceModel = Device.modelName ?? 'Unknown';

    let screenshotUrl: string | null = null;
    if (screenshot) {
      try {
        screenshotUrl = await uploadScreenshot();
      } catch (uploadErr: any) {
        console.warn('[Feedback] screenshot upload failed', uploadErr);
        Alert.alert(
          'Screenshot upload failed',
          'Submit feedback without the screenshot?',
          [
            { text: 'Cancel', style: 'cancel', onPress: () => setSubmitState('idle') },
            {
              text: 'Submit anyway',
              onPress: () => {
                void (async () => {
                  try {
                    await insertFeedbackRow(finalCategory, trimmedMessage, appVersion, deviceModel, null);
                  } catch (err: any) {
                    console.error('[Feedback] Submit failed:', JSON.stringify(err));
                    setSubmitState('error');
                    Alert.alert('Submit Failed', err?.message ?? 'Please check your connection and try again.');
                  }
                })();
              },
            },
          ],
        );
        return;
      }
    }

    try {
      await insertFeedbackRow(finalCategory, trimmedMessage, appVersion, deviceModel, screenshotUrl);
    } catch (err: any) {
      console.error('[Feedback] Submit failed:', JSON.stringify(err));
      setSubmitState('error');
      Alert.alert('Submit Failed', err?.message ?? 'Please check your connection and try again.');
    }
  };

  if (submitState === 'success') {
    return (
      <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { backgroundColor: Colors.primary }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn} hitSlop={8}>
            <Ionicons name="close" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Share Feedback</Text>
        </View>
        <View style={styles.successContainer}>
          <View style={[styles.successIcon, { backgroundColor: Colors.success + '20' }]}>
            <Ionicons name="checkmark-circle" size={64} color={Colors.success} />
          </View>
          <Text style={[styles.successTitle, { color: theme.text }]}>JazakAllah Khair!</Text>
          <Text style={[styles.successText, { color: theme.textSecondary }]}>
            Your feedback has been submitted. We read every message.
          </Text>
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: Colors.primary }]}
            onPress={() => { setSubmitState('idle'); router.back(); }}
          >
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: Colors.primary }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn} hitSlop={8}>
            <Ionicons name="close" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Share Feedback</Text>
            <Text style={styles.headerSub}>Help us improve Islam Daily</Text>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        >
          {/* Rating */}
          <Text style={[styles.label, { color: theme.textSecondary }]}>RATING (OPTIONAL)</Text>
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setRating(star)} hitSlop={8}>
                  <Ionicons
                    name={star <= rating ? 'star' : 'star-outline'}
                    size={32}
                    color={star <= rating ? '#EF9F27' : theme.border}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Category */}
          <Text style={[styles.label, { color: theme.textSecondary }]}>CATEGORY</Text>
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.categoryGrid}>
              {CATEGORIES.map((cat) => {
                const active = category === cat;
                const color = CATEGORY_COLORS[cat];
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryChip,
                      { backgroundColor: active ? color + '20' : theme.background, borderColor: active ? color : theme.border },
                    ]}
                    onPress={() => setCategory(cat)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name={CATEGORY_ICONS[cat] as any} size={14} color={active ? color : theme.textMuted} />
                    <Text style={[styles.categoryLabel, { color: active ? color : theme.textSecondary }]}>{cat}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Message */}
          <Text style={[styles.label, { color: theme.textSecondary }]}>MESSAGE *</Text>
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <TextInput
              style={[styles.textArea, { color: theme.text }]}
              placeholder="Share your thoughts, suggestions, or issues... (min 10 characters)"
              placeholderTextColor={theme.textMuted}
              multiline
              maxLength={1000}
              value={message}
              onChangeText={setMessage}
              textAlignVertical="top"
            />
            <Text style={[styles.charCount, { color: message.length >= 10 ? Colors.success : theme.textMuted }]}>
              {message.length}/1000{message.length > 0 && message.length < 10 ? ` (${10 - message.length} more needed)` : ''}
            </Text>
          </View>

          {/* Screenshot (optional) */}
          <Text style={[styles.label, { color: theme.textSecondary }]}>SCREENSHOT (OPTIONAL)</Text>
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            {screenshot ? (
              <View style={styles.screenshotPreviewRow}>
                <Image source={{ uri: screenshot.uri }} style={styles.screenshotThumb} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.screenshotMeta, { color: theme.text }]} numberOfLines={1}>
                    Image attached
                  </Text>
                  <Text style={[styles.screenshotMetaSub, { color: theme.textMuted }]} numberOfLines={1}>
                    {screenshot.width}×{screenshot.height}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setScreenshot(null)} hitSlop={8} style={styles.screenshotRemove}>
                  <Ionicons name="close-circle" size={24} color={theme.textMuted} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={pickScreenshot}
                activeOpacity={0.7}
                style={[styles.screenshotPicker, { borderColor: theme.border }]}
              >
                <Ionicons name="image-outline" size={20} color={Colors.primary} />
                <Text style={[styles.screenshotPickerText, { color: Colors.primary }]}>
                  Attach screenshot
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Optional: Name & Email */}
          <Text style={[styles.label, { color: theme.textSecondary }]}>YOUR NAME (OPTIONAL)</Text>
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border, padding: 0 }]}>
            <TextInput
              style={[styles.inlineInput, { color: theme.text, borderBottomColor: theme.border }]}
              placeholder="Anonymous"
              placeholderTextColor={theme.textMuted}
              value={name}
              onChangeText={setName}
            />
          </View>

          <Text style={[styles.label, { color: theme.textSecondary }]}>EMAIL (OPTIONAL)</Text>
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border, padding: 0 }]}>
            <TextInput
              style={[styles.inlineInput, { color: theme.text }]}
              placeholder="So we can follow up"
              placeholderTextColor={theme.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {/* Device info note */}
          <View style={[styles.infoBox, { backgroundColor: Colors.primary + '12', borderColor: Colors.primary + '30' }]}>
            <Ionicons name="information-circle-outline" size={15} color={Colors.primary} />
            <Text style={[styles.infoText, { color: Colors.primary }]}>
              Your app version, OS, and device model will be included automatically.
            </Text>
          </View>

          {/* Error message */}
          {submitState === 'error' && (
            <View style={[styles.errorBox, { backgroundColor: Colors.error + '12', borderColor: Colors.error + '30' }]}>
              <Ionicons name="alert-circle-outline" size={15} color={Colors.error} />
              <Text style={[styles.infoText, { color: Colors.error }]}>
                Submission failed. Please check your connection and try again.
              </Text>
            </View>
          )}

          {/* Submit */}
          <TouchableOpacity
            style={[
              styles.submitBtn,
              {
                backgroundColor: Colors.primary,
                opacity: submitState === 'loading' || message.trim().length < 10 ? 0.5 : 1,
              },
            ]}
            onPress={handleSend}
            activeOpacity={0.8}
            disabled={submitState === 'loading' || message.trim().length < 10}
          >
            {submitState === 'loading' ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="send" size={18} color="#fff" />
                <Text style={styles.submitText}>Submit Feedback</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  closeBtn: { padding: 2 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  headerSub: { color: 'rgba(255,255,255,0.75)', fontSize: 12 },

  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    paddingHorizontal: 4,
    paddingTop: 20,
    paddingBottom: 8,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 16,
  },

  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },

  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  categoryLabel: { fontSize: 13, fontWeight: '600' },

  textArea: { fontSize: 15, minHeight: 120, lineHeight: 22 },
  charCount: { fontSize: 12, textAlign: 'right', marginTop: 8, fontWeight: '500' },

  inlineInput: { fontSize: 15, paddingHorizontal: 16, paddingVertical: 14 },

  screenshotPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  screenshotPickerText: { fontSize: 14, fontWeight: '600' },
  screenshotPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  screenshotThumb: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#0001',
  },
  screenshotMeta: { fontSize: 14, fontWeight: '600' },
  screenshotMetaSub: { fontSize: 12, marginTop: 2 },
  screenshotRemove: { padding: 4 },

  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  infoText: { flex: 1, fontSize: 12, lineHeight: 18 },

  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
    paddingVertical: 16,
    borderRadius: 14,
  },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  successContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 16 },
  successIcon: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center' },
  successTitle: { fontSize: 28, fontWeight: '800' },
  successText: { fontSize: 16, textAlign: 'center', lineHeight: 24 },
  backBtn: { marginTop: 16, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 14 },
  backBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
