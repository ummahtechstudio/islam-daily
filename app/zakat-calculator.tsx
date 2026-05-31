import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { useTranslation } from 'react-i18next';

import { Colors, palette } from '../src/constants/colors';
import { useStore } from '../src/store';
import { trackScreen } from '../src/services/analytics';
import { prefs, PREFS_KEYS } from '../src/lib/storage';

// ─── Zakat constants ──────────────────────────────────────────────────────────
// These are the widely-accepted classical nisab thresholds and the standard
// 2.5% rate. They never change with prices or currency.
const GOLD_NISAB_GRAMS = 87.48; // = 7.5 tola
const SILVER_NISAB_GRAMS = 612.36; // = 52.5 tola
const TOLA_TO_GRAMS = 11.664;
const ZAKAT_RATE = 0.025;

// ─── Types ────────────────────────────────────────────────────────────────────

type WeightUnit = 'gram' | 'tola';
type NisabBasis = 'silver' | 'gold';

type ZakatSettings = {
  currency: string;
  unit: WeightUnit;
  goldPricePerUnit: string;
  silverPricePerUnit: string;
  nisabBasis: NisabBasis;
};

const DEFAULT_SETTINGS: ZakatSettings = {
  currency: '',
  unit: 'gram',
  goldPricePerUnit: '',
  silverPricePerUnit: '',
  // Silver nisab is lower → catches more payers → more support for the
  // poor; the common scholarly preference. User can switch to gold.
  nisabBasis: 'silver',
};

// Suggested currencies for the quick-pick chips. The user can also type any
// 3-letter code into the custom field — no currency is hardcoded into the
// calculation itself.
const SUGGESTED_CURRENCIES = ['PKR', 'INR', 'BDT', 'AED', 'SAR', 'USD', 'GBP', 'EUR'];

// ─── Input parsing helpers ────────────────────────────────────────────────────

// Treat empty / negative / NaN as 0. Never crash on bad input.
function toAmount(raw: string): number {
  const n = parseFloat(raw);
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

function formatMoney(n: number): string {
  if (!Number.isFinite(n)) return '0';
  return Math.round(n).toLocaleString();
}

// Convert a per-unit price into per-gram so all calculations share one basis.
function pricePerGram(pricePerUnit: number, unit: WeightUnit): number {
  if (unit === 'tola') return pricePerUnit / TOLA_TO_GRAMS;
  return pricePerUnit;
}

// ─── Persistence ──────────────────────────────────────────────────────────────

function loadSettings(): ZakatSettings {
  const stored = prefs.getJSON<Partial<ZakatSettings>>(PREFS_KEYS.ZAKAT_SETTINGS);
  if (!stored) return DEFAULT_SETTINGS;
  return {
    currency: typeof stored.currency === 'string' ? stored.currency : DEFAULT_SETTINGS.currency,
    unit: stored.unit === 'tola' ? 'tola' : 'gram',
    goldPricePerUnit:
      typeof stored.goldPricePerUnit === 'string' ? stored.goldPricePerUnit : '',
    silverPricePerUnit:
      typeof stored.silverPricePerUnit === 'string' ? stored.silverPricePerUnit : '',
    nisabBasis: stored.nisabBasis === 'gold' ? 'gold' : 'silver',
  };
}

function saveSettings(s: ZakatSettings) {
  prefs.setJSON(PREFS_KEYS.ZAKAT_SETTINGS, s);
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ZakatCalculatorScreen() {
  useEffect(() => { trackScreen('ZakatCalculator'); }, []);
  const { t } = useTranslation();

  const colorScheme = useColorScheme();
  const settings = useStore((s) => s.settings);
  const isDark =
    settings.colorScheme === 'dark' ||
    (settings.colorScheme === 'system' && colorScheme === 'dark');
  const theme = isDark ? Colors.dark : Colors.light;

  // ─── Persistent settings ────────────────────────────────────────────────────
  const [currency, setCurrency] = useState(DEFAULT_SETTINGS.currency);
  const [unit, setUnit] = useState<WeightUnit>(DEFAULT_SETTINGS.unit);
  const [goldPrice, setGoldPrice] = useState('');
  const [silverPrice, setSilverPrice] = useState('');
  const [nisabBasis, setNisabBasis] = useState<NisabBasis>(DEFAULT_SETTINGS.nisabBasis);

  // ─── Wealth inputs (not persisted — change every month/year) ───────────────
  const [cash, setCash] = useState('');
  const [goldWeight, setGoldWeight] = useState('');
  const [goldValue, setGoldValue] = useState('');
  const [silverWeight, setSilverWeight] = useState('');
  const [silverValue, setSilverValue] = useState('');
  const [businessAssets, setBusinessAssets] = useState('');
  const [receivables, setReceivables] = useState('');
  const [debts, setDebts] = useState('');

  const [calculated, setCalculated] = useState(false);

  // Hydrate persisted settings on mount.
  useEffect(() => {
    const stored = loadSettings();
    setCurrency(stored.currency);
    setUnit(stored.unit);
    setGoldPrice(stored.goldPricePerUnit);
    setSilverPrice(stored.silverPricePerUnit);
    setNisabBasis(stored.nisabBasis);
  }, []);

  // Persist settings whenever any of them change.
  useEffect(() => {
    saveSettings({
      currency,
      unit,
      goldPricePerUnit: goldPrice,
      silverPricePerUnit: silverPrice,
      nisabBasis,
    });
  }, [currency, unit, goldPrice, silverPrice, nisabBasis]);

  // ─── Derived values ─────────────────────────────────────────────────────────
  const calc = useMemo(() => {
    const goldPpu = toAmount(goldPrice);
    const silverPpu = toAmount(silverPrice);
    const goldPpg = pricePerGram(goldPpu, unit);
    const silverPpg = pricePerGram(silverPpu, unit);

    // Nisab values in the user's currency
    const goldNisabValue = GOLD_NISAB_GRAMS * goldPpg;
    const silverNisabValue = SILVER_NISAB_GRAMS * silverPpg;
    const nisabValue = nisabBasis === 'gold' ? goldNisabValue : silverNisabValue;

    // Gold owned: weight × price (both in the chosen unit, so the product is
    // already in the user's currency), plus any standalone value entered.
    const goldOwnedWeight = toAmount(goldWeight);
    const goldOwnedFromWeight = goldOwnedWeight * goldPpu;
    const goldOwnedFromValue = toAmount(goldValue);
    const goldTotal = goldOwnedFromWeight + goldOwnedFromValue;

    // Silver owned: same pattern.
    const silverOwnedWeight = toAmount(silverWeight);
    const silverOwnedFromWeight = silverOwnedWeight * silverPpu;
    const silverOwnedFromValue = toAmount(silverValue);
    const silverTotal = silverOwnedFromWeight + silverOwnedFromValue;

    const cashTotal = toAmount(cash);
    const businessTotal = toAmount(businessAssets);
    const receivablesTotal = toAmount(receivables);
    const debtsTotal = toAmount(debts);

    const grossAssets =
      cashTotal + goldTotal + silverTotal + businessTotal + receivablesTotal;
    const netWealth = Math.max(0, grossAssets - debtsTotal);
    const aboveNisab = nisabValue > 0 && netWealth >= nisabValue;
    const zakatDue = aboveNisab ? netWealth * ZAKAT_RATE : 0;

    return {
      goldPpg,
      silverPpg,
      goldNisabValue,
      silverNisabValue,
      nisabValue,
      cashTotal,
      goldTotal,
      silverTotal,
      businessTotal,
      receivablesTotal,
      debtsTotal,
      grossAssets,
      netWealth,
      aboveNisab,
      zakatDue,
    };
  }, [
    goldPrice, silverPrice, unit, nisabBasis,
    cash, goldWeight, goldValue, silverWeight, silverValue,
    businessAssets, receivables, debts,
  ]);

  const currencyLabel = currency.trim() || '—';
  const unitLabel = unit === 'tola' ? 'tola' : 'g';
  // The nisab summary only makes sense once the user has entered a price for
  // the chosen basis. Until then, the value reads as '—'.
  const nisabReady =
    nisabBasis === 'gold' ? toAmount(goldPrice) > 0 : toAmount(silverPrice) > 0;
  const canCalculate = currency.trim().length > 0 && nisabReady;

  const reset = useCallback(() => {
    // Reset wealth inputs and the result panel; keep the user's currency,
    // unit, prices, and nisab choice so they can recalculate next month
    // without re-entering everything.
    setCash('');
    setGoldWeight('');
    setGoldValue('');
    setSilverWeight('');
    setSilverValue('');
    setBusinessAssets('');
    setReceivables('');
    setDebts('');
    setCalculated(false);
  }, []);

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['bottom']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Banner ── */}
        <View style={[styles.banner, { backgroundColor: Colors.primary }]}>
          <Text style={styles.bannerTitle}>{t('zakat.banner.title')}</Text>
          <Text style={styles.bannerSub}>
            {t('zakat.banner.sub')}
          </Text>
        </View>

        {/* ── Currency ── */}
        <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>{t('zakat.sections.currency')}</Text>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.chipRow}>
            {SUGGESTED_CURRENCIES.map((c) => {
              const active = currency.toUpperCase() === c;
              return (
                <TouchableOpacity
                  key={c}
                  onPress={() => setCurrency(c)}
                  activeOpacity={0.75}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: active ? Colors.primary : theme.surface,
                      borderColor: active ? Colors.primary : theme.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: active ? '#fff' : theme.text },
                    ]}
                  >
                    {c}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={[styles.customCurrencyRow, { borderTopColor: theme.border }]}>
            <Text style={[styles.smallLabel, { color: theme.textMuted }]}>
              {t('zakat.currency.orEnterOwn')}
            </Text>
            <TextInput
              value={currency}
              onChangeText={(v) => setCurrency(v.toUpperCase().slice(0, 6))}
              style={[
                styles.smallInput,
                { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text },
              ]}
              placeholder={t('zakat.currency.placeholder')}
              placeholderTextColor={theme.textMuted}
              autoCapitalize="characters"
              autoCorrect={false}
            />
          </View>
        </View>

        {/* ── Weight Unit ── */}
        <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>{t('zakat.sections.weightUnit')}</Text>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.segmentRow}>
            {(['gram', 'tola'] as WeightUnit[]).map((u) => {
              const active = unit === u;
              return (
                <TouchableOpacity
                  key={u}
                  style={[
                    styles.segment,
                    {
                      backgroundColor: active ? Colors.primary : theme.surface,
                      borderColor: active ? Colors.primary : theme.border,
                    },
                  ]}
                  onPress={() => setUnit(u)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.segmentText, { color: active ? '#fff' : theme.text }]}>
                    {u === 'gram' ? t('zakat.weightUnit.gram') : t('zakat.weightUnit.tola')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={[styles.helperText, { color: theme.textMuted }]}>
            {t('zakat.weightUnit.helper')}
          </Text>
        </View>

        {/* ── Today's prices ── */}
        <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
          {t('zakat.sections.todayPrices', { unit: unitLabel })}
        </Text>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <PriceRow
            icon="🥇"
            label={t('zakat.prices.gold', { currency: currencyLabel, unit: unitLabel })}
            value={goldPrice}
            onChange={setGoldPrice}
            theme={theme}
          />
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <PriceRow
            icon="🥈"
            label={t('zakat.prices.silver', { currency: currencyLabel, unit: unitLabel })}
            value={silverPrice}
            onChange={setSilverPrice}
            theme={theme}
          />
        </View>

        {/* ── Nisab basis ── */}
        <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>{t('zakat.sections.nisabThreshold')}</Text>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.segmentRow}>
            {(['silver', 'gold'] as NisabBasis[]).map((b) => {
              const active = nisabBasis === b;
              return (
                <TouchableOpacity
                  key={b}
                  style={[
                    styles.segment,
                    {
                      backgroundColor: active ? Colors.primary : theme.surface,
                      borderColor: active ? Colors.primary : theme.border,
                    },
                  ]}
                  onPress={() => setNisabBasis(b)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.segmentText, { color: active ? '#fff' : theme.text }]}>
                    {b === 'silver' ? t('zakat.nisab.silver') : t('zakat.nisab.gold')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={[styles.helperText, { color: theme.textMuted }]}>
            {t('zakat.nisab.helper')}
          </Text>

          <View style={[styles.nisabSummary, { backgroundColor: palette.gold + '18', borderColor: palette.gold + '40' }]}>
            <Text style={[styles.nisabSummaryTitle, { color: theme.text }]}>
              {nisabBasis === 'silver' ? t('zakat.nisab.silverLabel') : t('zakat.nisab.goldLabel')}
            </Text>
            <Text style={[styles.nisabSummaryAmount, { color: theme.text }]}>
              {nisabReady
                ? `${currencyLabel} ${formatMoney(calc.nisabValue)}`
                : t('zakat.nisab.enterPricePrompt', { basis: nisabBasis })}
            </Text>
            <Text style={[styles.nisabSummarySub, { color: theme.textMuted }]}>
              {nisabBasis === 'silver'
                ? `${SILVER_NISAB_GRAMS} g (= ${(SILVER_NISAB_GRAMS / TOLA_TO_GRAMS).toFixed(1)} tola)`
                : `${GOLD_NISAB_GRAMS} g (= ${(GOLD_NISAB_GRAMS / TOLA_TO_GRAMS).toFixed(1)} tola)`}
            </Text>
          </View>
        </View>

        {/* ── Assets ── */}
        <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>{t('zakat.sections.yourWealth')}</Text>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <AssetRow
            icon="💵"
            color="#22C55E"
            label={t('zakat.assets.cash.label')}
            sub={t('zakat.assets.cash.sub', { currency: currencyLabel })}
            value={cash}
            onChange={setCash}
            theme={theme}
          />

          {/* Gold: weight + standalone value */}
          <DualAssetRow
            icon="🥇"
            color="#F59E0B"
            label={t('zakat.assets.gold.label')}
            weightLabel={t('zakat.assets.gold.weightLabel', { unit: unitLabel })}
            valueLabel={t('zakat.assets.gold.valueLabel', { currency: currencyLabel })}
            weight={goldWeight}
            value={goldValue}
            onWeightChange={setGoldWeight}
            onValueChange={setGoldValue}
            theme={theme}
          />

          {/* Silver: weight + standalone value */}
          <DualAssetRow
            icon="🥈"
            color="#9CA3AF"
            label={t('zakat.assets.silver.label')}
            weightLabel={t('zakat.assets.silver.weightLabel', { unit: unitLabel })}
            valueLabel={t('zakat.assets.silver.valueLabel', { currency: currencyLabel })}
            weight={silverWeight}
            value={silverValue}
            onWeightChange={setSilverWeight}
            onValueChange={setSilverValue}
            theme={theme}
          />

          <AssetRow
            icon="🏪"
            color="#3B82F6"
            label={t('zakat.assets.business.label')}
            sub={t('zakat.assets.business.sub', { currency: currencyLabel })}
            value={businessAssets}
            onChange={setBusinessAssets}
            theme={theme}
          />
          <AssetRow
            icon="🤝"
            color="#8B5CF6"
            label={t('zakat.assets.receivables.label')}
            sub={t('zakat.assets.receivables.sub', { currency: currencyLabel })}
            value={receivables}
            onChange={setReceivables}
            theme={theme}
            isLast
          />
        </View>

        {/* ── Debts ── */}
        <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>{t('zakat.sections.liabilities')}</Text>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <AssetRow
            icon="📉"
            color={Colors.warning}
            label={t('zakat.assets.debts.label')}
            sub={t('zakat.assets.debts.sub', { currency: currencyLabel })}
            value={debts}
            onChange={setDebts}
            theme={theme}
            isLast
          />
        </View>

        {/* ── Calculate ── */}
        <TouchableOpacity
          style={[
            styles.calcBtn,
            { backgroundColor: Colors.primary },
            !canCalculate && { opacity: 0.5 },
          ]}
          onPress={() => setCalculated(true)}
          disabled={!canCalculate}
          activeOpacity={0.85}
        >
          <Text style={styles.calcBtnText}>{t('zakat.calculate')}</Text>
        </TouchableOpacity>
        {!canCalculate && (
          <Text style={[styles.smallHint, { color: theme.textMuted }]}>
            {t('zakat.calculateHint', { basis: nisabBasis })}
          </Text>
        )}

        {/* ── Result ── */}
        {calculated && (
          <View
            style={[
              styles.resultCard,
              {
                backgroundColor: calc.aboveNisab ? Colors.primary + '15' : Colors.warning + '15',
                borderColor: calc.aboveNisab ? Colors.primary + '40' : Colors.warning + '40',
              },
            ]}
          >
            <Text style={[styles.resultLabel, { color: theme.textSecondary }]}>
              {t('zakat.result.nisabThresholdLabel', { basis: nisabBasis })}
            </Text>
            <Text style={[styles.resultLine, { color: theme.text }]}>
              {currencyLabel} {formatMoney(calc.nisabValue)}
            </Text>

            <View style={[styles.resultDivider, { backgroundColor: theme.border }]} />

            <Text style={[styles.resultLabel, { color: theme.textSecondary }]}>
              {t('zakat.result.netWealthLabel')}
            </Text>
            <Text style={[styles.resultAmount, { color: theme.text }]}>
              {currencyLabel} {formatMoney(calc.netWealth)}
            </Text>
            <Text style={[styles.resultBreakdown, { color: theme.textMuted }]}>
              {t('zakat.result.breakdown', {
                currency: currencyLabel,
                assets: formatMoney(calc.grossAssets),
                debts: formatMoney(calc.debtsTotal),
              })}
            </Text>

            <View style={[styles.resultDivider, { backgroundColor: theme.border }]} />

            {calc.aboveNisab ? (
              <>
                <Text style={[styles.resultStatus, { color: Colors.success }]}>
                  {t('zakat.result.aboveNisab')}
                </Text>
                <Text style={[styles.resultLabel, { color: Colors.primary, marginTop: 8 }]}>
                  {t('zakat.result.zakatDueLabel')}
                </Text>
                <Text style={[styles.zakatAmount, { color: Colors.primary }]}>
                  {currencyLabel} {formatMoney(calc.zakatDue)}
                </Text>
              </>
            ) : (
              <Text style={[styles.resultStatus, { color: Colors.warning }]}>
                {t('zakat.result.belowNisab')}
              </Text>
            )}

            <TouchableOpacity onPress={reset} style={styles.resetBtn}>
              <Text style={[styles.resetText, { color: theme.textSecondary }]}>
                {t('zakat.result.resetEntries')}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Disclaimer ── */}
        <Text style={[styles.disclaimer, { color: theme.textMuted }]}>
          {t('zakat.disclaimer')}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface PriceRowProps {
  icon: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  theme: typeof Colors.dark;
}

function PriceRow({ icon, label, value, onChange, theme }: PriceRowProps) {
  return (
    <View style={styles.priceRow}>
      <Text style={styles.priceIcon}>{icon}</Text>
      <Text style={[styles.priceLabel, { color: theme.text }]}>{label}</Text>
      <TextInput
        style={[
          styles.priceInput,
          { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text },
        ]}
        value={value}
        onChangeText={onChange}
        keyboardType="numeric"
        placeholder="0"
        placeholderTextColor={theme.textMuted}
      />
    </View>
  );
}

interface AssetRowProps {
  icon: string;
  color: string;
  label: string;
  sub: string;
  value: string;
  onChange: (v: string) => void;
  theme: typeof Colors.dark;
  isLast?: boolean;
}

function AssetRow({ icon, color, label, sub, value, onChange, theme, isLast }: AssetRowProps) {
  return (
    <View
      style={[
        styles.fieldRow,
        !isLast && { borderBottomColor: theme.border, borderBottomWidth: StyleSheet.hairlineWidth },
      ]}
    >
      <View style={[styles.fieldIcon, { backgroundColor: color + '20' }]}>
        <Text style={{ fontSize: 18 }}>{icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.fieldLabel, { color: theme.text }]}>{label}</Text>
        <Text style={[styles.fieldSub, { color: theme.textMuted }]}>{sub}</Text>
      </View>
      <TextInput
        style={[
          styles.input,
          { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text },
        ]}
        value={value}
        onChangeText={onChange}
        keyboardType="numeric"
        placeholder="0"
        placeholderTextColor={theme.textMuted}
      />
    </View>
  );
}

interface DualAssetRowProps {
  icon: string;
  color: string;
  label: string;
  weightLabel: string;
  valueLabel: string;
  weight: string;
  value: string;
  onWeightChange: (v: string) => void;
  onValueChange: (v: string) => void;
  theme: typeof Colors.dark;
}

function DualAssetRow({
  icon, color, label, weightLabel, valueLabel,
  weight, value, onWeightChange, onValueChange, theme,
}: DualAssetRowProps) {
  return (
    <View style={[styles.dualRow, { borderBottomColor: theme.border }]}>
      <View style={styles.dualHeader}>
        <View style={[styles.fieldIcon, { backgroundColor: color + '20' }]}>
          <Text style={{ fontSize: 18 }}>{icon}</Text>
        </View>
        <Text style={[styles.fieldLabel, { color: theme.text }]}>{label}</Text>
      </View>
      <View style={styles.dualInputs}>
        <View style={styles.dualInputCol}>
          <Text style={[styles.dualInputLabel, { color: theme.textMuted }]}>{weightLabel}</Text>
          <TextInput
            style={[
              styles.dualInput,
              { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text },
            ]}
            value={weight}
            onChangeText={onWeightChange}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={theme.textMuted}
          />
        </View>
        <View style={styles.dualInputCol}>
          <Text style={[styles.dualInputLabel, { color: theme.textMuted }]}>{valueLabel}</Text>
          <TextInput
            style={[
              styles.dualInput,
              { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text },
            ]}
            value={value}
            onChangeText={onValueChange}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={theme.textMuted}
          />
        </View>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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

  // Currency
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 12 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  chipText: { fontSize: 13, fontWeight: '700' },
  customCurrencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    gap: 12,
  },
  smallLabel: { flex: 1, fontSize: 13 },
  smallInput: {
    width: 110,
    borderRadius: 10,
    borderWidth: 1,
    padding: 8,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'right',
    letterSpacing: 0.5,
  },

  // Segment
  segmentRow: { flexDirection: 'row', gap: 8, padding: 12 },
  segment: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  segmentText: { fontSize: 13, fontWeight: '700' },
  helperText: {
    fontSize: 12,
    paddingHorizontal: 14,
    paddingBottom: 12,
    fontStyle: 'italic',
    lineHeight: 17,
  },

  // Price rows
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  priceIcon: { fontSize: 18 },
  priceLabel: { flex: 1, fontSize: 14, fontWeight: '600' },
  priceInput: {
    width: 120,
    borderRadius: 10,
    borderWidth: 1,
    padding: 8,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
  },
  divider: { height: StyleSheet.hairlineWidth },

  // Nisab summary
  nisabSummary: {
    margin: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 2,
  },
  nisabSummaryTitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  nisabSummaryAmount: { fontSize: 20, fontWeight: '800' },
  nisabSummarySub: { fontSize: 11 },

  // Asset rows
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
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
    width: 110,
    borderRadius: 10,
    borderWidth: 1,
    padding: 8,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
  },

  // Dual (weight + value) row
  dualRow: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  dualHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dualInputs: { flexDirection: 'row', gap: 10, paddingLeft: 52 },
  dualInputCol: { flex: 1, gap: 4 },
  dualInputLabel: { fontSize: 11, fontWeight: '600' },
  dualInput: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 8,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
  },

  // Calculate button + result
  calcBtn: {
    marginTop: 20,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  calcBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  smallHint: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
    fontStyle: 'italic',
  },

  resultCard: {
    marginTop: 20,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
    alignItems: 'center',
  },
  resultLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  resultLine: { fontSize: 16, fontWeight: '700' },
  resultAmount: { fontSize: 28, fontWeight: '800' },
  resultBreakdown: { fontSize: 12 },
  resultDivider: { width: '80%', height: 1, marginVertical: 10 },
  resultStatus: { fontSize: 14, fontWeight: '700', textAlign: 'center' },
  zakatAmount: { fontSize: 32, fontWeight: '900', marginTop: 4 },
  resetBtn: { marginTop: 12, padding: 8 },
  resetText: { fontSize: 13, fontWeight: '600' },

  disclaimer: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 18,
    paddingHorizontal: 8,
  },
});
