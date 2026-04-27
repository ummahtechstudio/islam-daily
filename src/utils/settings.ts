import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = 'settings_';

export const getSetting = async <T>(key: string, defaultValue: T): Promise<T> => {
  try {
    const value = await AsyncStorage.getItem(`${PREFIX}${key}`);
    if (value === null) return defaultValue;
    return JSON.parse(value) as T;
  } catch {
    return defaultValue;
  }
};

export const setSetting = async <T>(key: string, value: T): Promise<void> => {
  try {
    await AsyncStorage.setItem(`${PREFIX}${key}`, JSON.stringify(value));
  } catch (e) {
    console.error('Failed to save setting:', key, e);
  }
};

export const resetAllSettings = async (): Promise<void> => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const settingsKeys = keys.filter((k) => k.startsWith(PREFIX));
    if (settingsKeys.length > 0) {
      await AsyncStorage.multiRemove(settingsKeys);
    }
  } catch (e) {
    console.error('Failed to reset settings:', e);
  }
};
