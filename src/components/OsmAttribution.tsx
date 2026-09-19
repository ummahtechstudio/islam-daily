import React from 'react';
import { Linking, StyleSheet, Text, TouchableOpacity } from 'react-native';

import { OSM_ATTRIBUTION, OSM_COPYRIGHT_URL } from '../constants/credits';
import { Colors } from '../constants/colors';

/**
 * Legally required attribution for OpenStreetMap-derived data (ODbL 1.0):
 * "© OpenStreetMap contributors", shown on every screen that displays OSM
 * data (Mosque Finder, Halal Finder), not only in the credits page.
 * The string is the legal notice itself — never translated.
 */
export function OsmAttribution({ theme }: { theme: typeof Colors.dark }) {
  return (
    <TouchableOpacity
      style={[styles.bar, { borderTopColor: theme.border, backgroundColor: theme.surface }]}
      onPress={() => Linking.openURL(OSM_COPYRIGHT_URL).catch(() => {})}
      activeOpacity={0.7}
      accessibilityRole="link"
      accessibilityLabel={OSM_ATTRIBUTION}
    >
      <Text style={[styles.text, { color: theme.textMuted }]}>{OSM_ATTRIBUTION}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  text: { fontSize: 11, textDecorationLine: 'underline' },
});
