export interface TranslationOption {
  edition: string;
  name: string;        // English display name
  nativeName: string;  // Name in the target script
  translator: string;
  rtl: boolean;        // Text direction of the translation
  isUrdu: boolean;     // True only for Urdu editions — drives Nastaliq font selection
  translationLabel: string; // Label shown above the translation in the reader
}

export const TRANSLATIONS: TranslationOption[] = [
  {
    edition: 'ur.jalandhry',
    name: 'Urdu — Jalandhri',
    nativeName: 'اردو — جالندھری',
    translator: 'Fateh Muhammad Jalandhri',
    rtl: true,
    isUrdu: true,
    translationLabel: 'ترجمہ',
  },
  {
    edition: 'ur.maududi',
    name: 'Urdu — Maududi',
    nativeName: 'اردو — مودودی',
    translator: 'Sayyid Abul Ala Maududi',
    rtl: true,
    isUrdu: true,
    translationLabel: 'ترجمہ',
  },
  {
    edition: 'en.sahih',
    name: 'English — Saheeh Int.',
    nativeName: 'English',
    translator: 'Saheeh International',
    rtl: false,
    isUrdu: false,
    translationLabel: 'Translation',
  },
  {
    edition: 'en.yusufali',
    name: 'English — Yusuf Ali',
    nativeName: 'English',
    translator: 'Abdullah Yusuf Ali',
    rtl: false,
    isUrdu: false,
    translationLabel: 'Translation',
  },
  {
    edition: 'en.pickthall',
    name: 'English — Pickthall',
    nativeName: 'English',
    translator: 'Marmaduke Pickthall',
    rtl: false,
    isUrdu: false,
    translationLabel: 'Translation',
  },
  {
    edition: 'hi.hindi',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    translator: 'Suhel Farooq Khan',
    rtl: false,
    isUrdu: false,
    translationLabel: 'अनुवाद',
  },
  {
    edition: 'bn.bengali',
    name: 'Bengali',
    nativeName: 'বাংলা',
    translator: 'Muhiuddin Khan',
    rtl: false,
    isUrdu: false,
    translationLabel: 'অনুবাদ',
  },
  {
    edition: 'tr.diyanet',
    name: 'Turkish',
    nativeName: 'Türkçe',
    translator: 'Diyanet İşleri Başkanlığı',
    rtl: false,
    isUrdu: false,
    translationLabel: 'Meal',
  },
  {
    edition: 'id.indonesian',
    name: 'Indonesian',
    nativeName: 'Bahasa Indonesia',
    translator: 'Kementerian Agama RI',
    rtl: false,
    isUrdu: false,
    translationLabel: 'Terjemahan',
  },
  {
    edition: 'fr.hamidullah',
    name: 'French',
    nativeName: 'Français',
    translator: 'Muhammad Hamidullah',
    rtl: false,
    isUrdu: false,
    translationLabel: 'Traduction',
  },
  {
    edition: 'de.bubenheim',
    name: 'German',
    nativeName: 'Deutsch',
    translator: 'Bubenheim & Elyas',
    rtl: false,
    isUrdu: false,
    translationLabel: 'Übersetzung',
  },
  {
    edition: 'ar.muyassar',
    name: 'Arabic Tafsir',
    nativeName: 'التفسير الميسر',
    translator: 'King Fahd Quran Complex',
    rtl: true,
    isUrdu: false,
    translationLabel: 'تفسير',
  },
];

export function findTranslation(edition: string): TranslationOption {
  return (
    TRANSLATIONS.find((t) => t.edition === edition) ?? TRANSLATIONS[0]
  );
}
