import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../src/constants/colors';
import { useStore } from '../src/store';
import { trackScreen } from '../src/services/analytics';

// Nisab is 87.48g of gold (7.5 tola) or 612.36g of silver (52.5 tola)
// Using approximate gold price of ~$60/gram USD (conservative, user can adjust)
const GOLD_NISAB_GRAMS = 87.48;
const SILVER_NISAB_GRAMS = 612.36;
const GOLD_PRICE_PER_GRAM_PKR = 18500; // approximate PKR
const SILVER_PRICE_PER_GRAM_PKR = 225;  // approximate PKR
const ZAKAT_RATE = 0.025; // 2.5%

interface FieldProps {
  label: string;
  sub: string;
  value: string;
  onChange: (v: string) => void;
  icon: string;
  color: string;
  theme: any;
}

function InputField({ label, sub, value, onChange, icon, color, theme }: FieldProps) {
  return (
    <View style={[styles.fieldRow, { borderBottomColor: theme.border }]}>
      <View style={[styles.fieldIcon, { backgroundColor: color + '20' }]}>
        <Text style={{ fontSize: 18 }}>{icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.fieldLabel, { color: theme.text }]}>{label}</Text>
        <Text style={[styles.fieldSub, { color: theme.textMuted }]}>{sub}</Text>
      </View>
      <TextInput
        style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
        value={value}
        onChangeText={onChange}
        keyboardType="numeric"
        placeholder="0"
        placeholderTextColor={theme.textMuted}
      />
    </View>
  );
}

export default function ZakatCalculatorScreen() {
  useEffect(() => { trackScreen('ZakatCalculator'); }, []);
  const colorScheme = useColorScheme();
  const settings = useStore((s) => s.settings);
  const isDark =
    settings.colorScheme === 'dark' ||
    (settings.colorScheme === 'system' && colorScheme === 'dark');
  const theme = isDark ? Colors.dark : Colors.light;

  const [goldGrams, setGoldGrams] = useState('');
  const [silverGrams, setSilverGrams] = useState('');
  const [cash, setCash] = useState('');
  const [business, setBusiness] = useState('');
  const [livestock, setLivestock] = useState('');
  const [goldPrice, setGoldPrice] = useState(String(GOLD_PRICE_PER_GRAM_PKR));
  const [silverPrice, setSilverPrice] = useState(String(SILVER_PRICE_PER_GRAM_PKR));
  const [calculated, setCalculated] = useState(false);

  const gp = parseFloat(goldPrice) || GOLD_PRICE_PER_GRAM_PKR;
  const sp = parseFloat(silverPrice) || SILVER_PRICE_PER_GRAM_PKR;

  const goldValue = (parseFloat(goldGrams) || 0) * gp;
  const silverValue = (parseFloat(silverGrams) || 0) * sp;
  const cashValue = parseFloat(cash) || 0;
  const businessValue = parseFloat(business) || 0;
  const livestockValue = parseFloat(livestock) || 0;

  const totalWealth = goldValue + silverValue + cashValue + businessValue + livestockValue;
  const goldNisabValue = GOLD_NISAB_GRAMS * gp;
  const silverNisabValue = SILVER_NISAB_GRAMS * sp;
  const nisabValue = Math.min(goldNisabValue, silverNisabValue); // use lower (more inclusive)
  const aboveNisab = totalWealth >= nisabValue;
  const zakatDue = aboveNisab ? totalWealth * ZAKAT_RATE : 0;

  const reset = () => {
    setGoldGrams(''); setSilverGrams(''); setCash('');
    setBusiness(''); setLivestock(''); setCalculated(false);
  };

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>

        {/* Header banner */}
        <View style={[styles.banner, { backgroundColor: Colors.primary }]}>
          <Text style={styles.bannerTitle}>Zakat Calculator</Text>
          <Text style={styles.bannerSub}>2.5% on wealth above Nisab held for one lunar year</Text>
        </View>

        {/* Gold Price settings */}
        <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Current Prices (per gram)</Text>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={[styles.priceRow, { borderBottomWidth: 1, borderBottomColor: theme.border }]}>
            <Text style={[styles.priceLabel, { color: theme.text }]}>🥇 Gold (PKR/g)</Text>
            <TextInput
              style={[styles.priceInput, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
              value={goldPrice}
              onChangeText={setGoldPrice}
              keyboardType="numeric"
              placeholder={String(GOLD_PRICE_PER_GRAM_PKR)}
              placeholderTextColor={theme.textMuted}
            />
          </View>
          <View style={styles.priceRow}>
            <Text style={[styles.priceLabel, { color: theme.text }]}>🥈 Silver (PKR/g)</Text>
            <TextInput
              style={[styles.priceInput, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
              value={silverPrice}
              onChangeText={setSilverPrice}
              keyboardType="numeric"
              placeholder={String(SILVER_PRICE_PER_GRAM_PKR)}
              placeholderTextColor={theme.textMuted}
            />
          </View>
        </View>

        {/* Nisab info */}
        <View style={[styles.nisabInfo, { backgroundColor: Colors.accent + '18', borderColor: Colors.accent + '40' }]}>
          <Text style={[styles.nisabText, { color: theme.text }]}>
            📏 Nisab: {GOLD_NISAB_GRAMS}g gold (≈ PKR {Math.round(goldNisabValue).toLocaleString()}) or {SILVER_NISAB_GRAMS}g silver
          </Text>
          <Text style={[styles.nisabSub, { color: theme.textSecondary }]}>
            Using lower silver nisab: PKR {Math.round(silverNisabValue).toLocaleString()}
          </Text>
        </View>

        {/* Asset inputs */}
        <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Your Assets</Text>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <InputField label="Gold" sub="Enter weight in grams" value={goldGrams} onChange={setGoldGrams} icon="🥇" color="#F59E0B" theme={theme} />
          <InputField label="Silver" sub="Enter weight in grams" value={silverGrams} onChange={setSilverGrams} icon="🥈" color="#9CA3AF" theme={theme} />
          <InputField label="Cash & Bank Savings" sub="Total liquid assets (PKR)" value={cash} onChange={setCash} icon="💵" color="#22C55E" theme={theme} />
          <InputField label="Business Goods" sub="Inventory & trade assets (PKR)" value={business} onChange={setBusiness} icon="🏪" color="#3B82F6" theme={theme} />
          <InputField label="Livestock & Produce" sub="Market value in PKR" value={livestock} onChange={setLivestock} icon="🐄" color="#F97316" theme={theme} />
        </View>

        {/* Calculate Button */}
        <TouchableOpacity
          style={[styles.calcBtn, { backgroundColor: Colors.primary }]}
          onPress={() => setCalculated(true)}
        >
          <Text style={styles.calcBtnText}>Calculate Zakat</Text>
        </TouchableOpacity>

        {/* Result */}
        {calculated && (
          <View style={[styles.resultCard, {
            backgroundColor: aboveNisab ? Colors.primary + '15' : Colors.warning + '15',
            borderColor: aboveNisab ? Colors.primary + '40' : Colors.warning + '40',
          }]}>
            <Text style={[styles.resultTitle, { color: theme.text }]}>Total Zakatable Wealth</Text>
            <Text style={[styles.resultAmount, { color: theme.text }]}>
              PKR {Math.round(totalWealth).toLocaleString()}
            </Text>

            <View style={[styles.resultDivider, { backgroundColor: theme.border }]} />

            {aboveNisab ? (
              <>
                <Text style={[styles.resultStatus, { color: Colors.success }]}>
                  ✓ Above Nisab — Zakat is obligatory
                </Text>
                <Text style={[styles.resultZakat, { color: Colors.primary }]}>
                  Zakat Due (2.5%):
                </Text>
                <Text style={[styles.zakatAmount, { color: Colors.primary }]}>
                  PKR {Math.round(zakatDue).toLocaleString()}
                </Text>
              </>
            ) : (
              <Text style={[styles.resultStatus, { color: Colors.warning }]}>
                ℹ Below Nisab — Zakat not obligatory this year
              </Text>
            )}

            <TouchableOpacity onPress={reset} style={styles.resetBtn}>
              <Text style={[styles.resetText, { color: theme.textSecondary }]}>Reset Calculator</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={[styles.disclaimer, { color: theme.textMuted }]}>
          Note: This is an estimate only. Gold/silver prices are approximate — please verify with current market rates. Consult a scholar for precise rulings.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  banner: {
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  bannerTitle: { color: '#fff', fontSize: 20, fontWeight: '800' },
  bannerSub: { color: 'rgba(255,255,255,0.75)', fontSize: 13, textAlign: 'center' },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingTop: 20,
    paddingBottom: 8,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  priceLabel: { flex: 1, fontSize: 15, fontWeight: '600' },
  priceInput: {
    width: 110,
    borderRadius: 10,
    borderWidth: 1,
    padding: 8,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
  },
  nisabInfo: {
    marginTop: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  nisabText: { fontSize: 13, fontWeight: '600' },
  nisabSub: { fontSize: 12 },

  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
    borderBottomWidth: 1,
  },
  fieldIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fieldLabel: { fontSize: 14, fontWeight: '600' },
  fieldSub: { fontSize: 11, marginTop: 1 },
  input: {
    width: 100,
    borderRadius: 10,
    borderWidth: 1,
    padding: 8,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
  },

  calcBtn: {
    marginTop: 20,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  calcBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  resultCard: {
    marginTop: 20,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
    alignItems: 'center',
  },
  resultTitle: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  resultAmount: { fontSize: 28, fontWeight: '800' },
  resultDivider: { width: '80%', height: 1, marginVertical: 4 },
  resultStatus: { fontSize: 14, fontWeight: '600', textAlign: 'center' },
  resultZakat: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase' },
  zakatAmount: { fontSize: 32, fontWeight: '900' },
  resetBtn: { marginTop: 8, padding: 8 },
  resetText: { fontSize: 13, fontWeight: '600' },

  disclaimer: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 18,
    paddingHorizontal: 8,
  },
});
