import { Share } from 'react-native';

export type ShareableContent = {
  arabic: string;
  translation: string;
  reference: string;
  type?: 'hadith' | 'dua' | 'dhikr' | 'ayah' | 'quran';
};

export const shareContent = async (content: ShareableContent): Promise<void> => {
  const typeLabel = content.type
    ? content.type.charAt(0).toUpperCase() + content.type.slice(1)
    : '';

  const message = [
    content.arabic ? content.arabic : '',
    '',
    content.translation,
    '',
    `📖 ${content.reference}`,
    '',
    typeLabel ? `Shared from Islam Daily — ${typeLabel}` : 'Shared from Islam Daily',
    '— Get the app: https://play.google.com/store/apps/details?id=com.luqman.islamdaily',
  ]
    .join('\n')
    .trim();

  try {
    await Share.share({
      message,
      title: typeLabel || 'Islam Daily',
    });
  } catch (e) {
    console.error('Share failed:', e);
  }
};
