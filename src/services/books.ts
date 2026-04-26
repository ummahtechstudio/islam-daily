import * as WebBrowser from 'expo-web-browser';

export const BOOKS_BASE_URL =
  'https://pub-3f76e9c4da264c6ba85283d8af8108a0.r2.dev/books';

export type BookLanguage = 'arabic' | 'urdu' | 'english';

export interface Book {
  title: string;
  titleAr?: string;
  author: string;
  category: string;
  language: BookLanguage;
  // R2 object key relative to bucket root, e.g. 'books/arabic/riyadh-saliheen.pdf'
  key: string;
  icon: string;
  color: string;
  sizeEst: string;
  // Once a PDF is uploaded to R2, flip this to true
  available?: boolean;
}

export function getBookUrl(book: Book): string {
  // book.key is already the full key from the bucket root (`books/...`),
  // and BOOKS_BASE_URL points at the bucket root, so strip the leading `books/`.
  const rel = book.key.replace(/^books\//, '');
  return `${BOOKS_BASE_URL}/${rel}`;
}

export async function openBook(book: Book): Promise<void> {
  if (!book.available) return;
  await WebBrowser.openBrowserAsync(getBookUrl(book));
}

const k = (lang: BookLanguage, slug: string) => `books/${lang}/${slug}.pdf`;

export const BOOKS: Book[] = [
  // ── Arabic ──────────────────────────────────────────────────────────────────
  { title: 'Riyad as-Salihin', titleAr: 'رياض الصالحين', author: 'Imam Nawawi', category: 'Hadith', language: 'arabic', key: k('arabic', 'riyadh-saliheen'), icon: '📗', color: '#22C55E', sizeEst: '~4 MB' },
  { title: 'Bulugh al-Maram', titleAr: 'بلوغ المرام', author: 'Ibn Hajar al-Asqalani', category: 'Fiqh', language: 'arabic', key: k('arabic', 'bulugh-al-maram'), icon: '📘', color: '#3B82F6', sizeEst: '~3 MB' },
  { title: 'Al-Adab Al-Mufrad', titleAr: 'الأدب المفرد', author: 'Imam Bukhari', category: 'Hadith', language: 'arabic', key: k('arabic', 'al-adab-al-mufrad'), icon: '📙', color: '#F59E0B', sizeEst: '~2 MB' },
  { title: 'Kitab at-Tawhid', titleAr: 'كتاب التوحيد', author: 'Ibn Abd al-Wahhab', category: 'Aqeedah', language: 'arabic', key: k('arabic', 'kitab-at-tawhid'), icon: '📒', color: '#8B5CF6', sizeEst: '~2 MB' },
  { title: 'Al-Aqeedah al-Wasitiyyah', titleAr: 'العقيدة الواسطية', author: 'Ibn Taymiyyah', category: 'Aqeedah', language: 'arabic', key: k('arabic', 'aqeedah-wasitiyyah'), icon: '📕', color: '#EF4444', sizeEst: '~1 MB' },

  // ── Urdu: General ──────────────────────────────────────────────────────────
  { title: 'Fazail-e-Amal', titleAr: 'فضائل اعمال', author: 'Maulana Zakariyya Kandhlawi', category: 'Tasawwuf', language: 'urdu', key: k('urdu', 'fazail-e-amal'), icon: '📗', color: '#0F6E56', sizeEst: '~8 MB' },
  { title: 'Bahishti Zewar', titleAr: 'بہشتی زیور', author: 'Maulana Ashraf Ali Thanvi', category: 'Fiqh', language: 'urdu', key: k('urdu', 'bahishti-zewar'), icon: '📘', color: '#3B82F6', sizeEst: '~6 MB' },
  { title: 'Islami Zindagi', titleAr: 'اسلامی زندگی', author: 'Mufti Taqi Usmani', category: 'Fiqh', language: 'urdu', key: k('urdu', 'islami-zindagi'), icon: '📙', color: '#F59E0B', sizeEst: '~3 MB' },
  { title: 'Muntakhab Ahadith', titleAr: 'منتخب احادیث', author: 'Maulana Yusuf Kandhlawi', category: 'Hadith', language: 'urdu', key: k('urdu', 'muntakhab-ahadith'), icon: '📒', color: '#8B5CF6', sizeEst: '~5 MB' },
  { title: 'Seerat Un Nabi', titleAr: 'سیرت النبی', author: 'Shibli Nomani', category: 'Seerah', language: 'urdu', key: k('urdu', 'seerat-un-nabi'), icon: '📕', color: '#EF4444', sizeEst: '~7 MB' },

  // ── Urdu: Tafseer ──────────────────────────────────────────────────────────
  { title: 'Tafseer Ibn Kathir', titleAr: 'تفسیر ابن کثیر', author: 'Ibn Kathir', category: 'Tafseer', language: 'urdu', key: k('urdu', 'tafseer-ibn-kathir'), icon: '📗', color: '#10B981', sizeEst: '~45 MB' },
  { title: 'Tafheem-ul-Quran', titleAr: 'تفہیم القرآن', author: 'Maulana Abul Ala Maududi', category: 'Tafseer', language: 'urdu', key: k('urdu', 'tafheem-ul-quran'), icon: '📘', color: '#10B981', sizeEst: '~90 MB' },
  { title: 'Maarif-ul-Quran', titleAr: 'معارف القرآن', author: 'Mufti Muhammad Shafi', category: 'Tafseer', language: 'urdu', key: k('urdu', 'maarif-ul-quran'), icon: '📙', color: '#10B981', sizeEst: '~50 MB' },
  { title: 'Bayan-ul-Quran', titleAr: 'بیان القرآن', author: 'Ashraf Ali Thanvi', category: 'Tafseer', language: 'urdu', key: k('urdu', 'bayan-ul-quran'), icon: '📒', color: '#10B981', sizeEst: '~60 MB' },
  { title: 'Tafseer-e-Mazhari', titleAr: 'تفسیر مظہری', author: 'Qadi Thanaullah Panipati', category: 'Tafseer', language: 'urdu', key: k('urdu', 'tafseer-e-mazhari'), icon: '📕', color: '#10B981', sizeEst: '~40 MB' },
  { title: 'Tafseer-e-Jalalain', titleAr: 'تفسیر جلالین', author: 'Imam Jalaluddin Suyuti', category: 'Tafseer', language: 'urdu', key: k('urdu', 'tafseer-e-jalalain'), icon: '📗', color: '#10B981', sizeEst: '~8 MB' },
  { title: 'Tadabbur-e-Quran', titleAr: 'تدبر قرآن', author: 'Amin Ahsan Islahi', category: 'Tafseer', language: 'urdu', key: k('urdu', 'tadabbur-e-quran'), icon: '📘', color: '#10B981', sizeEst: '~70 MB' },
  { title: 'Fi Zilal al-Quran', titleAr: 'فی ظلال القرآن', author: 'Syed Qutb', category: 'Tafseer', language: 'urdu', key: k('urdu', 'fi-zilal-al-quran'), icon: '📙', color: '#10B981', sizeEst: '~30 MB' },

  // ── Urdu: Hadith ───────────────────────────────────────────────────────────
  { title: 'Sahih Bukhari', titleAr: 'صحیح بخاری', author: 'Imam Bukhari', category: 'Hadith', language: 'urdu', key: k('urdu', 'sahih-bukhari'), icon: '📗', color: '#22C55E', sizeEst: '~25 MB' },
  { title: 'Sahih Muslim', titleAr: 'صحیح مسلم', author: 'Imam Muslim', category: 'Hadith', language: 'urdu', key: k('urdu', 'sahih-muslim'), icon: '📘', color: '#22C55E', sizeEst: '~20 MB' },
  { title: 'Sunan Abu Dawood', titleAr: 'سنن ابو داؤد', author: 'Imam Abu Dawood', category: 'Hadith', language: 'urdu', key: k('urdu', 'sunan-abu-dawood'), icon: '📙', color: '#22C55E', sizeEst: '~15 MB' },
  { title: 'Jami at-Tirmidhi', titleAr: 'جامع ترمذی', author: 'Imam Tirmidhi', category: 'Hadith', language: 'urdu', key: k('urdu', 'jami-at-tirmidhi'), icon: '📒', color: '#22C55E', sizeEst: '~15 MB' },
  { title: 'Sunan an-Nasai', titleAr: 'سنن نسائی', author: 'Imam Nasai', category: 'Hadith', language: 'urdu', key: k('urdu', 'sunan-an-nasai'), icon: '📕', color: '#22C55E', sizeEst: '~12 MB' },
  { title: 'Sunan Ibn Majah', titleAr: 'سنن ابن ماجہ', author: 'Imam Ibn Majah', category: 'Hadith', language: 'urdu', key: k('urdu', 'sunan-ibn-majah'), icon: '📗', color: '#22C55E', sizeEst: '~12 MB' },
  { title: 'Muwatta Imam Malik', titleAr: 'موطأ امام مالک', author: 'Imam Malik', category: 'Hadith', language: 'urdu', key: k('urdu', 'muwatta-imam-malik'), icon: '📘', color: '#22C55E', sizeEst: '~8 MB' },
  { title: 'Riyadh-us-Saliheen', titleAr: 'ریاض الصالحین', author: 'Imam Nawawi', category: 'Hadith', language: 'urdu', key: k('urdu', 'riyadh-us-saliheen'), icon: '📙', color: '#22C55E', sizeEst: '~6 MB' },
  { title: 'Mishkat-ul-Masabih', titleAr: 'مشکٰوۃ المصابیح', author: 'Al-Khatib al-Tabrizi', category: 'Hadith', language: 'urdu', key: k('urdu', 'mishkat-ul-masabih'), icon: '📒', color: '#22C55E', sizeEst: '~18 MB' },
  { title: 'Bulugh al-Maram', titleAr: 'بلوغ المرام', author: 'Ibn Hajar al-Asqalani', category: 'Hadith', language: 'urdu', key: k('urdu', 'bulugh-al-maram'), icon: '📕', color: '#22C55E', sizeEst: '~5 MB' },
  { title: '40 Hadith Nawawi', titleAr: 'اربعین نووی', author: 'Imam Nawawi', category: 'Hadith', language: 'urdu', key: k('urdu', '40-hadith-nawawi'), icon: '📗', color: '#22C55E', sizeEst: '~1 MB' },
  { title: "Shama'il Muhammadiyah", titleAr: 'شمائل محمدیہ', author: 'Imam Tirmidhi', category: 'Hadith', language: 'urdu', key: k('urdu', 'shamail-muhammadiyah'), icon: '📘', color: '#22C55E', sizeEst: '~4 MB' },

  // ── Urdu: Seerah ───────────────────────────────────────────────────────────
  { title: 'Ar-Raheeq Al-Makhtum', titleAr: 'الرحیق المختوم', author: 'Safiur Rahman Mubarakpuri', category: 'Seerah', language: 'urdu', key: k('urdu', 'ar-raheeq-al-makhtum'), icon: '📙', color: '#F59E0B', sizeEst: '~7 MB' },
  { title: 'Seerat-e-Mustafa', titleAr: 'سیرت مصطفیٰ', author: 'Idrees Kandhelvi', category: 'Seerah', language: 'urdu', key: k('urdu', 'seerat-e-mustafa'), icon: '📒', color: '#F59E0B', sizeEst: '~10 MB' },
  { title: 'Seerat Encyclopedia', titleAr: 'سیرت انسائیکلوپیڈیا', author: 'Various Scholars', category: 'Seerah', language: 'urdu', key: k('urdu', 'seerat-encyclopedia'), icon: '📕', color: '#F59E0B', sizeEst: '~30 MB' },

  // ── Urdu: Fiqh ─────────────────────────────────────────────────────────────
  { title: 'Fiqh-us-Sunnah', titleAr: 'فقہ السنہ', author: 'Sayyid Sabiq', category: 'Fiqh', language: 'urdu', key: k('urdu', 'fiqh-us-sunnah'), icon: '📗', color: '#3B82F6', sizeEst: '~15 MB' },
  { title: 'Minhaj-ul-Muslim', titleAr: 'منہاج المسلم', author: "Abu Bakr Jabir al-Jaza'iri", category: 'Fiqh', language: 'urdu', key: k('urdu', 'minhaj-ul-muslim'), icon: '📘', color: '#3B82F6', sizeEst: '~10 MB' },
  { title: 'Mukhtasar al-Quduri', titleAr: 'مختصر القدوری', author: 'Imam al-Quduri', category: 'Fiqh', language: 'urdu', key: k('urdu', 'mukhtasar-al-quduri'), icon: '📙', color: '#3B82F6', sizeEst: '~5 MB' },

  // ── Urdu: Dua ──────────────────────────────────────────────────────────────
  { title: 'Hisnul Muslim', titleAr: 'حصن المسلم', author: "Sa'id al-Qahtani", category: 'Dua', language: 'urdu', key: k('urdu', 'hisnul-muslim'), icon: '📗', color: '#EF4444', sizeEst: '~2 MB' },
  { title: 'Munajaat-e-Maqbool', titleAr: 'مناجاتِ مقبول', author: 'Ashraf Ali Thanvi', category: 'Dua', language: 'urdu', key: k('urdu', 'munajaat-e-maqbool'), icon: '📘', color: '#EF4444', sizeEst: '~3 MB' },
  { title: 'Al-Adhkar', titleAr: 'الاذکار', author: 'Imam Nawawi', category: 'Dua', language: 'urdu', key: k('urdu', 'al-adhkar'), icon: '📙', color: '#EF4444', sizeEst: '~5 MB' },
  { title: 'Duas from Quran and Sunnah', titleAr: 'قرآن و سنت کی دعائیں', author: 'Various', category: 'Dua', language: 'urdu', key: k('urdu', 'duas-quran-sunnah'), icon: '📒', color: '#EF4444', sizeEst: '~2 MB' },

  // ── Urdu: Tasawwuf ─────────────────────────────────────────────────────────
  { title: 'Fazail-e-Sadaqaat', titleAr: 'فضائل صدقات', author: 'Maulana Zakariyya Kandhlawi', category: 'Tasawwuf', language: 'urdu', key: k('urdu', 'fazail-e-sadaqaat'), icon: '📗', color: '#0F6E56', sizeEst: '~6 MB' },
  { title: 'Hayatus Sahabah', titleAr: 'حیاۃ الصحابہ', author: 'Maulana Yusuf Kandhlawi', category: 'Tasawwuf', language: 'urdu', key: k('urdu', 'hayatus-sahabah'), icon: '📘', color: '#0F6E56', sizeEst: '~20 MB' },
  { title: 'Ihya Ulum al-Din', titleAr: 'احیاء علوم الدین', author: 'Imam Ghazali', category: 'Tasawwuf', language: 'urdu', key: k('urdu', 'ihya-ulum-al-din'), icon: '📙', color: '#0F6E56', sizeEst: '~30 MB' },
  { title: 'Kimiya-e-Saadat', titleAr: 'کیمیائے سعادت', author: 'Imam Ghazali', category: 'Tasawwuf', language: 'urdu', key: k('urdu', 'kimiya-e-saadat'), icon: '📒', color: '#0F6E56', sizeEst: '~10 MB' },
  { title: 'Tarbiyat-ul-Aulad fil Islam', titleAr: 'تربیۃ الاولاد فی الاسلام', author: 'Abdullah Nasih Ulwan', category: 'Tasawwuf', language: 'urdu', key: k('urdu', 'tarbiyat-ul-aulad'), icon: '📕', color: '#0F6E56', sizeEst: '~8 MB' },
  { title: 'Minhaj-ul-Abidin', titleAr: 'منہاج العابدین', author: 'Imam Ghazali', category: 'Tasawwuf', language: 'urdu', key: k('urdu', 'minhaj-ul-abidin'), icon: '📗', color: '#0F6E56', sizeEst: '~4 MB' },

  // ── Urdu: Aqeedah ──────────────────────────────────────────────────────────
  { title: 'Kitab at-Tawheed', titleAr: 'کتاب التوحید', author: 'Muhammad ibn Abdul Wahhab', category: 'Aqeedah', language: 'urdu', key: k('urdu', 'kitab-at-tawheed'), icon: '📘', color: '#8B5CF6', sizeEst: '~3 MB' },
  { title: 'Aqeedah Wasitiyyah', titleAr: 'عقیدہ واسطیہ', author: 'Ibn Taymiyyah', category: 'Aqeedah', language: 'urdu', key: k('urdu', 'aqeedah-wasitiyyah'), icon: '📙', color: '#8B5CF6', sizeEst: '~2 MB' },
  { title: 'Sharh al-Aqeedah al-Tahawiyyah', titleAr: 'شرح عقیدہ طحاویہ', author: 'Ibn Abi al-Izz al-Hanafi', category: 'Aqeedah', language: 'urdu', key: k('urdu', 'sharh-aqeedah-tahawiyyah'), icon: '📒', color: '#8B5CF6', sizeEst: '~6 MB' },

  // ── Urdu: General ──────────────────────────────────────────────────────────
  { title: "La Tahzan / Don't Be Sad", titleAr: 'لا تحزن', author: 'Dr. Aaidh al-Qarni', category: 'General', language: 'urdu', key: k('urdu', 'la-tahzan'), icon: '📗', color: '#6366F1', sizeEst: '~6 MB' },
  { title: 'Ideal Muslimah', titleAr: 'مثالی مسلمان عورت', author: 'Muhammad Ali al-Hashimi', category: 'General', language: 'urdu', key: k('urdu', 'ideal-muslimah'), icon: '📘', color: '#EC4899', sizeEst: '~5 MB' },
  { title: 'Ideal Muslim', titleAr: 'مثالی مسلمان', author: 'Muhammad Ali al-Hashimi', category: 'General', language: 'urdu', key: k('urdu', 'ideal-muslim'), icon: '📙', color: '#6366F1', sizeEst: '~5 MB' },
  { title: 'Qasas-ul-Anbiya', titleAr: 'قصص الانبیاء', author: 'Ibn Kathir', category: 'General', language: 'urdu', key: k('urdu', 'qasas-ul-anbiya'), icon: '📒', color: '#6366F1', sizeEst: '~8 MB' },

  // ── Urdu: History ──────────────────────────────────────────────────────────
  { title: 'Al-Bidaya wan-Nihaya', titleAr: 'البدایہ والنہایہ', author: 'Ibn Kathir', category: 'History', language: 'urdu', key: k('urdu', 'al-bidaya-wan-nihaya'), icon: '📗', color: '#78716C', sizeEst: '~50 MB' },
  { title: 'Tareekh-e-Islam', titleAr: 'تاریخ اسلام', author: 'Shah Moinuddin Nadvi', category: 'History', language: 'urdu', key: k('urdu', 'tareekh-e-islam'), icon: '📘', color: '#78716C', sizeEst: '~15 MB' },

  // ── Urdu: Women & Kids ─────────────────────────────────────────────────────
  { title: 'Great Women of Islam', titleAr: 'عظیم مسلم خواتین', author: 'Mahmood Ahmad Ghadanfar', category: 'Women', language: 'urdu', key: k('urdu', 'great-women-of-islam'), icon: '📗', color: '#EC4899', sizeEst: '~5 MB' },
  { title: 'Stories of the Prophets for Kids', titleAr: 'بچوں کے لیے قصص الانبیاء', author: 'Various', category: 'Kids', language: 'urdu', key: k('urdu', 'stories-of-prophets-kids'), icon: '📘', color: '#F97316', sizeEst: '~4 MB' },
  { title: 'Islamic Studies for Kids', titleAr: 'اسلامی تعلیم', author: 'Farhat Hashmi', category: 'Kids', language: 'urdu', key: k('urdu', 'islamic-studies-kids'), icon: '📙', color: '#F97316', sizeEst: '~5 MB' },

  // ── English: Seerah ────────────────────────────────────────────────────────
  { title: 'The Sealed Nectar', titleAr: 'الرحيق المختوم', author: 'Safiur Rahman Mubarakpuri', category: 'Seerah', language: 'english', key: k('english', 'the-sealed-nectar'), icon: '📗', color: '#22C55E', sizeEst: '~5 MB' },
  { title: 'Muhammad: His Life Based on the Earliest Sources', author: 'Martin Lings', category: 'Seerah', language: 'english', key: k('english', 'muhammad-life-earliest-sources'), icon: '📘', color: '#F59E0B', sizeEst: '~8 MB' },
  { title: 'When the Moon Split', author: 'Safiur Rahman Mubarakpuri', category: 'Seerah', language: 'english', key: k('english', 'when-the-moon-split'), icon: '📙', color: '#F59E0B', sizeEst: '~4 MB' },

  // ── English: Tasawwuf / General ────────────────────────────────────────────
  { title: "Don't Be Sad", author: 'Dr. Aaidh al-Qarni', category: 'Tasawwuf', language: 'english', key: k('english', 'dont-be-sad'), icon: '📘', color: '#3B82F6', sizeEst: '~4 MB' },
  { title: 'Purification of the Heart', author: 'Hamza Yusuf', category: 'Tasawwuf', language: 'english', key: k('english', 'purification-of-the-heart'), icon: '📗', color: '#0F6E56', sizeEst: '~3 MB' },

  // ── English: Dua ───────────────────────────────────────────────────────────
  { title: 'Fortress of the Muslim', titleAr: 'حصن المسلم', author: 'Said Al-Qahtani', category: 'Dua', language: 'english', key: k('english', 'fortress-of-the-muslim'), icon: '📙', color: '#F59E0B', sizeEst: '~1 MB' },
  { title: 'Accepted Whispers', author: 'Khurram Murad', category: 'Dua', language: 'english', key: k('english', 'accepted-whispers'), icon: '📗', color: '#EF4444', sizeEst: '~2 MB' },
  { title: 'Duas from Quran and Sunnah', author: 'Various', category: 'Dua', language: 'english', key: k('english', 'duas-quran-sunnah'), icon: '📘', color: '#EF4444', sizeEst: '~2 MB' },

  // ── English: Aqeedah ───────────────────────────────────────────────────────
  { title: 'The Fundamentals of Tawheed', author: 'Dr. Bilal Philips', category: 'Aqeedah', language: 'english', key: k('english', 'fundamentals-of-tawheed'), icon: '📒', color: '#8B5CF6', sizeEst: '~3 MB' },

  // ── English: Hadith ────────────────────────────────────────────────────────
  { title: '40 Hadith Nawawi', titleAr: 'الأربعون النووية', author: 'Imam Nawawi', category: 'Hadith', language: 'english', key: k('english', '40-hadith-nawawi'), icon: '📗', color: '#22C55E', sizeEst: '~1 MB' },

  // ── English: Fiqh ──────────────────────────────────────────────────────────
  { title: 'Heavenly Ornaments', author: 'Ashraf Ali Thanvi', category: 'Fiqh', language: 'english', key: k('english', 'heavenly-ornaments'), icon: '📗', color: '#3B82F6', sizeEst: '~4 MB' },
  { title: 'Fiqh-us-Sunnah', author: 'Sayyid Sabiq', category: 'Fiqh', language: 'english', key: k('english', 'fiqh-us-sunnah'), icon: '📘', color: '#3B82F6', sizeEst: '~10 MB' },
  { title: 'Taleemul Haq', author: 'Mufti Afzal Hoosein Elias', category: 'Fiqh', language: 'english', key: k('english', 'taleemul-haq'), icon: '📙', color: '#3B82F6', sizeEst: '~3 MB' },

  // ── English: General ───────────────────────────────────────────────────────
  { title: 'Ideal Muslimah', author: 'Muhammad Ali al-Hashimi', category: 'General', language: 'english', key: k('english', 'ideal-muslimah'), icon: '📘', color: '#EC4899', sizeEst: '~5 MB' },
  { title: 'Ideal Muslim', author: 'Muhammad Ali al-Hashimi', category: 'General', language: 'english', key: k('english', 'ideal-muslim'), icon: '📙', color: '#6366F1', sizeEst: '~5 MB' },
  { title: 'Reclaim Your Heart', author: 'Yasmin Mogahed', category: 'General', language: 'english', key: k('english', 'reclaim-your-heart'), icon: '📒', color: '#6366F1', sizeEst: '~2 MB' },
  { title: 'Welcome to Islam', author: 'Mustafa Umar', category: 'General', language: 'english', key: k('english', 'welcome-to-islam'), icon: '📕', color: '#6366F1', sizeEst: '~2 MB' },
  { title: 'Islam Between East and West', author: 'Alija Izetbegovic', category: 'General', language: 'english', key: k('english', 'islam-between-east-west'), icon: '📗', color: '#6366F1', sizeEst: '~3 MB' },

  // ── English: History ───────────────────────────────────────────────────────
  { title: 'Lost Islamic History', author: 'Firas Alkhateeb', category: 'History', language: 'english', key: k('english', 'lost-islamic-history'), icon: '📘', color: '#78716C', sizeEst: '~2 MB' },
  { title: 'Destiny Disrupted', author: 'Tamim Ansary', category: 'History', language: 'english', key: k('english', 'destiny-disrupted'), icon: '📙', color: '#78716C', sizeEst: '~3 MB' },
  { title: 'The Crusades Through Arab Eyes', author: 'Amin Maalouf', category: 'History', language: 'english', key: k('english', 'crusades-through-arab-eyes'), icon: '📒', color: '#78716C', sizeEst: '~2 MB' },

  // ── English: Women ─────────────────────────────────────────────────────────
  { title: 'Great Women of Islam', author: 'Mahmood Ahmad Ghadanfar', category: 'Women', language: 'english', key: k('english', 'great-women-of-islam'), icon: '📗', color: '#EC4899', sizeEst: '~3 MB' },
  { title: 'Women Around the Messenger', author: 'Muhammad Ali Qutb', category: 'Women', language: 'english', key: k('english', 'women-around-the-messenger'), icon: '📘', color: '#EC4899', sizeEst: '~3 MB' },

  // ── English: Kids ──────────────────────────────────────────────────────────
  { title: 'My First Quran Storybook', author: 'Saniyasnain Khan', category: 'Kids', language: 'english', key: k('english', 'my-first-quran-storybook'), icon: '📗', color: '#F97316', sizeEst: '~5 MB' },
  { title: 'Tell Me About the Prophet Muhammad', author: 'Saniyasnain Khan', category: 'Kids', language: 'english', key: k('english', 'tell-me-about-prophet'), icon: '📘', color: '#F97316', sizeEst: '~3 MB' },
  { title: 'Stories of the Prophets for Kids', author: 'Various', category: 'Kids', language: 'english', key: k('english', 'stories-of-prophets-kids'), icon: '📙', color: '#F97316', sizeEst: '~4 MB' },
  { title: '365 Days with the Sahabah', author: 'Various', category: 'Kids', language: 'english', key: k('english', '365-days-with-sahabah'), icon: '📒', color: '#F97316', sizeEst: '~3 MB' },
];

export function booksByLanguage(language: BookLanguage): Book[] {
  return BOOKS.filter((b) => b.language === language);
}
