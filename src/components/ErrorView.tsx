import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '../constants/colors';

interface Props {
  message: string;
  onRetry?: () => void;
  dark?: boolean;
}

export function ErrorView({ message, onRetry, dark }: Props) {
  const { t } = useTranslation();
  const theme = dark ? Colors.dark : Colors.light;
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>⚠️</Text>
      <Text style={[styles.message, { color: theme.text }]}>{message}</Text>
      {onRetry && (
        <TouchableOpacity style={styles.btn} onPress={onRetry} activeOpacity={0.8}>
          <Text style={styles.btnText}>{t('common.tryAgain')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    padding: 24,
  },
  icon: { fontSize: 40 },
  message: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  btn: {
    marginTop: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
  },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});
