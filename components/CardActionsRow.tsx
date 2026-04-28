import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, ToastAndroid, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import {
  Bookmark,
  isBookmarked as checkBookmarked,
  toggleBookmark,
} from '../src/utils/bookmarks';
import { ShareableContent, shareContent } from '../src/utils/share';

const GOLD = '#EF9F27';
const MUTED = '#9CA3AF';

type Props = {
  bookmark: Omit<Bookmark, 'savedAt'>;
  shareable: ShareableContent;
  iconColor?: string;
};

const showToast = (message: string) => {
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.SHORT);
  }
};

export default function CardActionsRow({ bookmark, shareable, iconColor }: Props) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let mounted = true;
    checkBookmarked(bookmark.type, bookmark.id)
      .then((b) => {
        if (mounted) setSaved(b);
      })
      .catch((err) => console.warn('[CardActionsRow] checkBookmarked failed', err));
    return () => {
      mounted = false;
    };
  }, [bookmark.type, bookmark.id]);

  const onToggleBookmark = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const nowSaved = await toggleBookmark(bookmark);
    setSaved(nowSaved);
    showToast(nowSaved ? 'Saved to bookmarks' : 'Removed from bookmarks');
  };

  const onShare = async () => {
    Haptics.selectionAsync().catch(() => {});
    await shareContent(shareable);
  };

  const baseColor = iconColor ?? MUTED;

  return (
    <View style={styles.row}>
      <TouchableOpacity onPress={onToggleBookmark} hitSlop={10} style={styles.iconBtn}>
        <Ionicons
          name={saved ? 'bookmark' : 'bookmark-outline'}
          size={20}
          color={saved ? GOLD : baseColor}
        />
      </TouchableOpacity>
      <TouchableOpacity onPress={onShare} hitSlop={10} style={styles.iconBtn}>
        <Ionicons name="share-social-outline" size={20} color={baseColor} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 16,
    marginTop: 10,
  },
  iconBtn: {
    padding: 2,
  },
});
