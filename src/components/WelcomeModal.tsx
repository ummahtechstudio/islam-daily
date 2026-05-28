import React, { useEffect, useState, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  BackHandler,
  Platform,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';

const STORAGE_KEY = '@islam_daily:welcome_shown_v1';

const PRIMARY = '#0F6E56';
const GOLD = '#EF9F27';
const BACKGROUND = '#FFFDF7';
const BODY_TEXT = '#2D2D2D';
const NASTALIQ_FONT = 'NotoNastaliqUrdu_400Regular';

type Lang = 'ur' | 'en';

const URDU_CONTENT = {
  greeting: 'السلام علیکم ورحمۃ اللہ',
  body1:
    'یہ ایپ امتِ مسلمہ کے لیے اس نیت سے بنائی گئی ہے کہ ہم سب دین کو بہتر سمجھ سکیں اور ایک اچھے مسلمان بننے کی کوشش کریں۔',
  body2:
    'چونکہ یہ ایک انسانی کاوش ہے، ممکن ہے کہیں کوئی کمی یا غلطی رہ گئی ہو۔ اگر آپ کو ایسی کوئی بات نظر آئے یا کوئی تجویز ہو، تو براہِ کرم اسکرین شاٹ لے کر ہمیں بھیج دیں — ان شاء اللہ ہم جلد ہی اسے درست کر دیں گے۔',
  closing: 'آپ کی دعاؤں کا طلبگار،\nجزاک اللہ خیراً',
  button: 'سمجھ گیا',
};

const ENGLISH_CONTENT = {
  greeting: 'Assalamu alaikum wa rahmatullah',
  body1:
    "This app has been built with the sincere intention of serving the Muslim Ummah — to help us understand our deen better and strive to become better Muslims, in sha Allah.",
  body2:
    "As this is a human effort, there may be mistakes or shortcomings we haven't noticed. If you come across any error or have a suggestion, please take a screenshot and send it to us — we will address it as soon as we can.",
  closing: 'JazakAllah khair for your duas and support.',
  button: 'Got it',
};

function detectLanguage(): Lang {
  try {
    const locales = Localization.getLocales();
    const first = locales && locales[0];
    const region = first?.regionCode?.toUpperCase() ?? '';
    const language = first?.languageCode?.toLowerCase() ?? '';
    if (region === 'PK' || language === 'ur') return 'ur';
    return 'en';
  } catch {
    return 'en';
  }
}

export function WelcomeModal() {
  const [visible, setVisible] = useState(false);
  const [lang, setLang] = useState<Lang>('en');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const shown = await AsyncStorage.getItem(STORAGE_KEY);
        if (cancelled) return;
        if (!shown) {
          setLang(detectLanguage());
          setVisible(true);
        }
      } catch {
        // Silent — if AsyncStorage fails, skip the welcome to avoid blocking the app.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const dismiss = useCallback(async () => {
    setVisible(false);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // Silent — modal already closed for this session.
    }
  }, []);

  useEffect(() => {
    if (!visible || Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      dismiss();
      return true;
    });
    return () => sub.remove();
  }, [visible, dismiss]);

  if (!visible) return null;

  const content = lang === 'ur' ? URDU_CONTENT : ENGLISH_CONTENT;
  const isUrdu = lang === 'ur';

  return (
    <Modal
      transparent
      animationType="fade"
      visible
      statusBarTranslucent
      onRequestClose={dismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.accentBar} />

          <ScrollView
            contentContainerStyle={styles.body}
            showsVerticalScrollIndicator={false}
          >
            {isUrdu ? (
              <Text style={[styles.urduGreeting]}>{content.greeting}</Text>
            ) : (
              <Text style={styles.enGreeting}>{content.greeting}</Text>
            )}

            <View style={styles.divider} />

            {isUrdu ? (
              <>
                <Text style={styles.urduBody}>{content.body1}</Text>
                <Text style={[styles.urduBody, styles.bodySpacing]}>
                  {content.body2}
                </Text>
                <Text style={[styles.urduClosing, styles.closingSpacing]}>
                  {content.closing}
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.enBody}>{content.body1}</Text>
                <Text style={[styles.enBody, styles.bodySpacing]}>
                  {content.body2}
                </Text>
                <Text style={[styles.enClosing, styles.closingSpacing]}>
                  {content.closing}
                </Text>
              </>
            )}
          </ScrollView>

          <TouchableOpacity
            style={styles.button}
            onPress={dismiss}
            activeOpacity={0.85}
          >
            <Text style={isUrdu ? styles.urduButtonText : styles.enButtonText}>
              {content.button}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: BACKGROUND,
    borderRadius: 20,
    width: '100%',
    maxWidth: 420,
    maxHeight: SCREEN_HEIGHT * 0.85,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  accentBar: {
    height: 6,
    backgroundColor: PRIMARY,
    width: '100%',
  },
  body: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
  },
  divider: {
    height: 1,
    backgroundColor: GOLD,
    opacity: 0.4,
    marginVertical: 16,
  },
  bodySpacing: {
    marginTop: 14,
  },
  closingSpacing: {
    marginTop: 20,
  },

  // English styles
  enGreeting: {
    fontSize: 20,
    fontWeight: '600',
    color: PRIMARY,
    textAlign: 'center',
  },
  enBody: {
    fontSize: 15,
    lineHeight: 24,
    color: BODY_TEXT,
    textAlign: 'left',
  },
  enClosing: {
    fontSize: 15,
    lineHeight: 24,
    color: PRIMARY,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  enButtonText: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Urdu styles
  urduGreeting: {
    fontFamily: NASTALIQ_FONT,
    fontSize: 22,
    lineHeight: 44,
    color: PRIMARY,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  urduBody: {
    fontFamily: NASTALIQ_FONT,
    fontSize: 18,
    lineHeight: 38,
    color: BODY_TEXT,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  urduClosing: {
    fontFamily: NASTALIQ_FONT,
    fontSize: 18,
    lineHeight: 38,
    color: PRIMARY,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  urduButtonText: {
    fontFamily: NASTALIQ_FONT,
    color: '#FFFFFF',
    fontSize: 19,
    lineHeight: 32,
    textAlign: 'center',
    writingDirection: 'rtl',
  },

  button: {
    backgroundColor: PRIMARY,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
