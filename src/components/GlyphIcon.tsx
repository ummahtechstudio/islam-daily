/**
 * Line-icon replacement for the emoji the app's data and older screens used
 * (📿 🕌 🌙 📖 …). The owner's rule: no emoji anywhere in the app. Data files
 * still carry an emoji in their `icon` field; every screen renders it through
 * this component, which maps it to a thin single-colour icon (Islamic glyphs
 * for mosque / Kaaba / prayer beads, Ionicons outlines for the rest). Unknown
 * or missing values fall back to a small neutral ornament — never the emoji.
 */
import React from 'react';
import { Ionicons } from '@expo/vector-icons';

import { KaabaIcon, MinaretIcon, PrayerBeadsIcon } from './icons';

type IonName = keyof typeof Ionicons.glyphMap;
type Spec = IonName | 'minaret' | 'kaaba' | 'beads';

const MAP: Record<string, Spec> = {
  '🕌': 'minaret', '🕍': 'minaret', '🕋': 'kaaba', '📿': 'beads',
  '🤲': 'hand-left-outline', '🙏': 'hand-left-outline',
  '🧭': 'compass-outline', '🔖': 'bookmark-outline', '📌': 'pin-outline',
  '📚': 'library-outline', '📖': 'book-outline', '📜': 'document-text-outline',
  '📗': 'book-outline', '📘': 'book-outline', '📙': 'book-outline', '📒': 'book-outline',
  '📓': 'book-outline', '📕': 'book-outline', '📔': 'book-outline',
  '☪': 'moon-outline', '🌙': 'moon-outline', '🌃': 'moon-outline', '🌇': 'partly-sunny-outline',
  '🌅': 'sunny-outline', '🌄': 'sunny-outline', '☀': 'sunny-outline', '🔆': 'sunny-outline',
  '🌤': 'partly-sunny-outline', '⭐': 'star-outline', '🌟': 'star-outline', '💫': 'star-outline',
  '🌠': 'star-outline', '✨': 'star-outline', '🎊': 'star-outline', '🎉': 'star-outline',
  '⛰': 'triangle-outline',
  '🎧': 'headset-outline', '🎙': 'mic-outline', '🎵': 'musical-notes-outline', '🎓': 'school-outline',
  '💰': 'wallet-outline', '💵': 'cash-outline', '🏪': 'storefront-outline', '📉': 'trending-down-outline',
  '🤝': 'people-outline', '🫂': 'people-outline', '👨‍👩‍👧': 'people-outline', '👨‍👩‍👦': 'people-outline',
  '📅': 'calendar-outline', '⏰': 'alarm-outline',
  '🥩': 'restaurant-outline', '🥙': 'restaurant-outline', '🍽': 'restaurant-outline',
  '🌐': 'globe-outline', '🌍': 'earth-outline', '🔔': 'notifications-outline',
  '⬇': 'download-outline', '⚙': 'settings-outline', '💬': 'chatbubble-outline',
  '💧': 'water-outline', '🌊': 'water-outline', '🌧': 'rainy-outline',
  '🌸': 'leaf-outline', '🌺': 'leaf-outline', '🌻': 'leaf-outline', '🌿': 'leaf-outline',
  '🌱': 'leaf-outline', '🌳': 'leaf-outline', '🌾': 'leaf-outline', '🕊': 'leaf-outline',
  '🤍': 'heart-outline', '❤': 'heart-outline', '💝': 'heart-outline',
  '😊': 'happy-outline', '😌': 'happy-outline', '😤': 'alert-circle-outline', '🤐': 'volume-mute-outline',
  '💤': 'bed-outline', '🏃': 'walk-outline', '🎁': 'gift-outline', '💪': 'barbell-outline',
  '🔒': 'lock-closed-outline', '🏡': 'home-outline', '💡': 'bulb-outline',
  '✈': 'airplane-outline', '🛡': 'shield-outline', '🤒': 'medkit-outline', '🏥': 'medkit-outline',
  '💍': 'diamond-outline', '⚖': 'scale-outline', '🧹': 'brush-outline', '🔥': 'flame-outline',
  '🥇': 'ellipse', '🥈': 'ellipse-outline', '📍': 'location-outline', '🔍': 'search-outline',
  '📡': 'cloud-offline-outline', '⚠': 'warning-outline',
};

/** Strip variation selectors so '☀️' and '☀' resolve to the same entry. */
function normalise(glyph: string): string {
  return glyph.replace(/️/g, '').trim();
}

export function glyphSpec(glyph?: string | null): Spec {
  if (!glyph) return 'ellipse-outline';
  const g = normalise(glyph);
  return MAP[g] ?? MAP[glyph] ?? 'ellipse-outline';
}

export function GlyphIcon({
  glyph,
  size = 22,
  color,
}: {
  glyph?: string | null;
  size?: number;
  color: string;
}) {
  const spec = glyphSpec(glyph);
  if (spec === 'minaret') return <MinaretIcon size={size} color={color} strokeWidth={1.6} />;
  if (spec === 'kaaba') return <KaabaIcon size={size} color={color} />;
  if (spec === 'beads') return <PrayerBeadsIcon size={size} color={color} />;
  return <Ionicons name={spec} size={size} color={color} />;
}
