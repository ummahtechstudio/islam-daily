import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  useColorScheme,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '../src/constants/colors';
import { useStore } from '../src/store';
import { trackScreen } from '../src/services/analytics';

type Tab = 'browse' | 'ask';

const FATWA_TOPICS = [
  { id: 'prayer', label: 'Prayer', icon: '🕌' },
  { id: 'fasting', label: 'Fasting', icon: '🌙' },
  { id: 'zakat', label: 'Zakat', icon: '💰' },
  { id: 'halal', label: 'Halal/Haram', icon: '✅' },
  { id: 'marriage', label: 'Marriage', icon: '💍' },
  { id: 'finance', label: 'Finance', icon: '🏦' },
  { id: 'worship', label: 'Worship', icon: '🤲' },
  { id: 'ethics', label: 'Ethics', icon: '⚖️' },
];

const SAMPLE_FATWAS = [
  {
    id: 1,
    topic: 'prayer',
    question: 'Can I combine Dhuhr and Asr prayers when travelling?',
    answer:
      'Yes. The traveller is permitted to combine Dhuhr with Asr, and Maghrib with Isha, due to the hardship of travel. This is established from the Sunnah of the Prophet (ﷺ) who combined prayers during journeys. The majority of scholars agree that the distance for travel that permits combining is approximately 80 km.',
    scholar: 'Based on consensus of four major madhabs',
    category: 'Prayer',
  },
  {
    id: 2,
    topic: 'fasting',
    question: 'Is it permissible to use an inhaler while fasting?',
    answer:
      "Using an inhaler during Ramadan: The majority opinion is that it breaks the fast because of the possibility of vapour reaching the throat. However, in cases of necessity (dharura), a person may use it and make up the fast later. Ibn Baz and Ibn Uthaymeen held it is permissible to use it without making up the fast, as the substance doesn't nourish the body.",
    scholar: 'Based on opinions of Ibn Baz and Ibn Uthaymeen (RA)',
    category: 'Fasting',
  },
  {
    id: 3,
    topic: 'finance',
    question: 'Is it permissible to have a mortgage to buy a house?',
    answer:
      "Conventional interest-based mortgages (Riba) are prohibited in Islam. However, Islamic financial institutions offer Sharia-compliant home financing through structures like Murabaha (cost-plus financing), Ijara (leasing), and Diminishing Musharaka (declining partnership). These are permissible alternatives. If no halal option is available and one has a genuine need for housing, some scholars permit it under necessity, but one should seek a Sharia-compliant option first.",
    scholar: 'Contemporary Islamic Finance Scholars',
    category: 'Finance',
  },
  {
    id: 4,
    topic: 'halal',
    question: 'Can Muslims eat food with small amounts of alcohol used in cooking?',
    answer:
      "If alcohol is used as an ingredient in cooking and remains present in the final product, it remains impermissible (haram) according to the majority opinion. The principle is that what intoxicates in large quantities is forbidden in small quantities as well. However, if the alcohol fully evaporates during cooking and none remains, some contemporary scholars allow it. The safest position is to avoid such foods.",
    scholar: 'Islamic Fiqh Academy',
    category: 'Halal/Haram',
  },
];

export default function FatwaScreen() {
  useEffect(() => { trackScreen('Fatwa'); }, []);
  const colorScheme = useColorScheme();
  const settings = useStore((s) => s.settings);
  const isDark =
    settings.colorScheme === 'dark' ||
    (settings.colorScheme === 'system' && colorScheme === 'dark');
  const theme = isDark ? Colors.dark : Colors.light;

  const [tab, setTab] = useState<Tab>('browse');
  const [selectedTopic, setSelectedTopic] = useState('all');
  const [expanded, setExpanded] = useState<number | null>(null);
  const [question, setQuestion] = useState('');
  const [name, setName] = useState('');

  const filtered =
    selectedTopic === 'all'
      ? SAMPLE_FATWAS
      : SAMPLE_FATWAS.filter((f) => f.topic === selectedTopic);

  const handleSubmit = () => {
    if (!question.trim()) {
      Alert.alert('Please enter your question');
      return;
    }
    Alert.alert(
      'Question Submitted',
      'Your question has been submitted. Scholars will review and respond in due time. JazakAllahu Khairan.',
      [{ text: 'OK', onPress: () => { setQuestion(''); setName(''); } }]
    );
  };

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]}>
      {/* Header + tabs */}
      <View style={[styles.header, { backgroundColor: Colors.primary }]}>
        <Text style={styles.headerTitle}>Fatwa Q&A</Text>
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'browse' && styles.tabActive]}
            onPress={() => setTab('browse')}
          >
            <Text style={[styles.tabText, tab === 'browse' && styles.tabTextActive]}>Browse</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'ask' && styles.tabActive]}
            onPress={() => setTab('ask')}
          >
            <Text style={[styles.tabText, tab === 'ask' && styles.tabTextActive]}>Ask</Text>
          </TouchableOpacity>
        </View>
      </View>

      {tab === 'browse' ? (
        <View style={{ flex: 1 }}>
          {/* Topics */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.topics}
          >
            <TouchableOpacity
              style={[
                styles.topicChip,
                { borderColor: theme.border, backgroundColor: theme.card },
                selectedTopic === 'all' && { backgroundColor: Colors.primary, borderColor: Colors.primary },
              ]}
              onPress={() => setSelectedTopic('all')}
            >
              <Text style={[styles.topicText, { color: selectedTopic === 'all' ? '#fff' : theme.text }]}>
                All
              </Text>
            </TouchableOpacity>
            {FATWA_TOPICS.map((t) => (
              <TouchableOpacity
                key={t.id}
                style={[
                  styles.topicChip,
                  { borderColor: theme.border, backgroundColor: theme.card },
                  selectedTopic === t.id && { backgroundColor: Colors.primary, borderColor: Colors.primary },
                ]}
                onPress={() => setSelectedTopic(t.id)}
              >
                <Text style={styles.topicIcon}>{t.icon}</Text>
                <Text
                  style={[
                    styles.topicText,
                    { color: selectedTopic === t.id ? '#fff' : theme.text },
                  ]}
                >
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <FlatList
            data={filtered}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.fatwaCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                onPress={() => setExpanded(expanded === item.id ? null : item.id)}
                activeOpacity={0.8}
              >
                <View style={styles.fatwaHeader}>
                  <View style={[styles.catBadge, { backgroundColor: Colors.primary + '18' }]}>
                    <Text style={[styles.catText, { color: Colors.primary }]}>{item.category}</Text>
                  </View>
                  <Ionicons
                    name={expanded === item.id ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={theme.textMuted}
                  />
                </View>
                <Text style={[styles.question, { color: theme.text }]}>{item.question}</Text>
                {expanded === item.id && (
                  <>
                    <View style={styles.divider} />
                    <Text style={[styles.answer, { color: theme.textSecondary }]}>{item.answer}</Text>
                    <Text style={[styles.scholar, { color: Colors.primary }]}>— {item.scholar}</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
            showsVerticalScrollIndicator={false}
          />
        </View>
      ) : (
        /* ── Ask a Question ── */
        <ScrollView contentContainerStyle={styles.askContainer} keyboardShouldPersistTaps="handled">
          <View style={[styles.noticeCard, { backgroundColor: Colors.primary + '12', borderColor: Colors.primary + '40' }]}>
            <Ionicons name="information-circle" size={20} color={Colors.primary} />
            <Text style={[styles.noticeText, { color: theme.text }]}>
              Questions are reviewed by qualified Islamic scholars. Responses may take several days.
            </Text>
          </View>

          <Text style={[styles.fieldLabel, { color: theme.text }]}>Your Name (Optional)</Text>
          <TextInput
            style={[styles.textField, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
            placeholder="Enter your name..."
            placeholderTextColor={theme.textMuted}
            value={name}
            onChangeText={setName}
          />

          <Text style={[styles.fieldLabel, { color: theme.text }]}>Your Question *</Text>
          <TextInput
            style={[
              styles.textField,
              styles.textArea,
              { backgroundColor: theme.card, borderColor: theme.border, color: theme.text },
            ]}
            placeholder="Enter your Islamic question in detail..."
            placeholderTextColor={theme.textMuted}
            value={question}
            onChangeText={setQuestion}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />

          <Text style={[styles.fieldLabel, { color: theme.text }]}>Category</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.topics}
          >
            {FATWA_TOPICS.map((t) => (
              <TouchableOpacity
                key={t.id}
                style={[
                  styles.topicChip,
                  { borderColor: theme.border, backgroundColor: theme.card },
                  selectedTopic === t.id && { backgroundColor: Colors.primary, borderColor: Colors.primary },
                ]}
                onPress={() => setSelectedTopic(t.id)}
              >
                <Text style={styles.topicIcon}>{t.icon}</Text>
                <Text style={[styles.topicText, { color: selectedTopic === t.id ? '#fff' : theme.text }]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} activeOpacity={0.8}>
            <Ionicons name="send" size={18} color="#fff" />
            <Text style={styles.submitBtnText}>Submit Question</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { padding: 16, paddingTop: 14, alignItems: 'center', gap: 12 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },
  tabs: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, padding: 3 },
  tabBtn: { paddingHorizontal: 28, paddingVertical: 7, borderRadius: 18 },
  tabActive: { backgroundColor: '#fff' },
  tabText: { color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  tabTextActive: { color: Colors.primary },

  topics: { paddingHorizontal: 12, gap: 8, paddingVertical: 10 },
  topicChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  topicIcon: { fontSize: 14 },
  topicText: { fontSize: 13, fontWeight: '600' },

  list: { padding: 12, gap: 10 },
  fatwaCard: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
  },
  fatwaHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  catBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  catText: { fontSize: 12, fontWeight: '700' },
  question: { fontSize: 15, fontWeight: '600', lineHeight: 22 },
  divider: { height: 1, backgroundColor: Colors.light.border, marginVertical: 10 },
  answer: { fontSize: 14, lineHeight: 22, marginBottom: 8 },
  scholar: { fontSize: 13, fontWeight: '600' },

  // Ask form
  askContainer: { padding: 16, gap: 12 },
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  noticeText: { flex: 1, fontSize: 13, lineHeight: 20 },
  fieldLabel: { fontSize: 15, fontWeight: '600', marginTop: 4 },
  textField: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    fontSize: 15,
  },
  textArea: { minHeight: 120 },
  submitBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    padding: 16,
    borderRadius: 14,
    marginTop: 8,
  },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
