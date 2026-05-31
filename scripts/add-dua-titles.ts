/**
 * One-shot: add `title_en` and `title_ur` to every dua in
 * assets/data/duas-core.json.
 *
 *     npx tsx scripts/add-dua-titles.ts
 *
 * Idempotent — re-running overwrites with the same titles, never duplicating
 * fields or touching arabic / english / urdu / transliteration / reference.
 *
 * Titles are grounded in each dua's existing english + reference + category.
 * Hisn al-Muslim conventions used where the dua is a recognized one (e.g.
 * "Sayyid al-Istighfar", "Dua of Yunus (AS)"). Urdu titles are drafts —
 * the owner will review every one.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

const DUA_PATH = path.resolve(__dirname, '..', 'assets', 'data', 'duas-core.json');

type Titles = { title_en: string; title_ur: string };

// Indexed by category id, then by 0-based position within that category's
// `duas` array. Count per category must match the JSON exactly.
const TITLES: Record<string, Titles[]> = {
  waking: [
    { title_en: 'Praise upon waking',                 title_ur: 'بیداری پر حمد' },
    { title_en: 'Tahlil and tasbih upon waking',      title_ur: 'بیداری پر تہلیل و تسبیح' },
    { title_en: 'Thanks for health and remembrance',  title_ur: 'صحت اور ذکر پر شکر' },
    { title_en: 'When standing for night prayer',     title_ur: 'تہجد کے لیے اٹھنے پر' },
    { title_en: 'Last verses of Surah Al-Imran',      title_ur: 'آلِ عمران کی آخری آیات' },
  ],
  morning: [
    { title_en: 'Morning declaration of sovereignty', title_ur: 'صبح کا اقرارِ بادشاہی' },
    { title_en: 'By Your leave we reach the morning', title_ur: 'تیری توفیق سے صبح کرنا' },
    { title_en: 'Sayyid al-Istighfar',                title_ur: 'سیّد الاستغفار' },
    { title_en: 'Ayat al-Kursi (morning)',            title_ur: 'آیت الکرسی برائے صبح' },
    { title_en: 'Subhan Allah wa bihamdihi (100x)',   title_ur: 'سبحان اللہ وبحمدہ (سو بار)' },
    { title_en: 'Tahlil 10 times in the morning',     title_ur: 'صبح دس بار تہلیل' },
  ],
  evening: [
    { title_en: 'Evening declaration of sovereignty', title_ur: 'شام کا اقرارِ بادشاہی' },
    { title_en: 'By Your leave we reach the evening', title_ur: 'تیری توفیق سے شام کرنا' },
    { title_en: 'Bearing witness in the evening',     title_ur: 'شام کو گواہی دینا' },
  ],
  sleep: [
    { title_en: 'In Your name I die and live',        title_ur: 'تیرے نام سے موت و حیات' },
    { title_en: 'Protection on the Day of Resurrection', title_ur: 'قیامت کے عذاب سے پناہ' },
    { title_en: 'When lying down to sleep',           title_ur: 'سونے کے لیے لیٹتے وقت' },
    { title_en: 'Entrusting oneself to Allah at sleep', title_ur: 'سوتے وقت اللہ کے سپرد ہونا' },
    { title_en: 'Glorifying Allah before sleep',      title_ur: 'سونے سے پہلے تسبیح' },
    { title_en: 'Refuge from anger and devils',       title_ur: 'غضب اور شیاطین سے پناہ' },
    { title_en: 'Ayat al-Kursi before sleep',         title_ur: 'سونے سے پہلے آیت الکرسی' },
    { title_en: 'Surah Al-Mulk before sleep',         title_ur: 'سونے سے پہلے سورۃ الملک' },
  ],
  prayer: [
    { title_en: 'Opening supplication of salah',      title_ur: 'نماز کی افتتاحی دعا' },
    { title_en: 'Between the two prostrations',       title_ur: 'دو سجدوں کے درمیان' },
    { title_en: 'In the final tashahhud',             title_ur: 'آخری تشہد میں' },
  ],
  eating: [
    { title_en: 'Before eating',                      title_ur: 'کھانے سے پہلے' },
    { title_en: 'If you forget Bismillah',            title_ur: 'بسم اللہ بھول جانے پر' },
    { title_en: 'After eating',                       title_ur: 'کھانے کے بعد' },
    { title_en: 'When drinking milk',                 title_ur: 'دودھ پیتے وقت' },
    { title_en: 'For the one who fed you',            title_ur: 'کھلانے والے کے لیے دعا' },
  ],
  travel: [
    { title_en: 'When setting out on a journey',      title_ur: 'سفر شروع کرتے وقت' },
    { title_en: 'Refuge from hardships of travel',    title_ur: 'مشکلاتِ سفر سے پناہ' },
    { title_en: 'Allah as companion in travel',       title_ur: 'سفر کا ساتھی اللہ' },
    { title_en: 'When entering a town',               title_ur: 'بستی میں داخل ہوتے وقت' },
  ],
  distress: [
    { title_en: 'The supplication of Yunus (AS)',     title_ur: 'دعائے یونس علیہ السلام' },
    { title_en: 'Hope in Allah’s mercy',         title_ur: 'اللہ کی رحمت کی امید' },
    { title_en: 'Tahlil at times of distress',        title_ur: 'تکلیف کے وقت تہلیل' },
    { title_en: 'Removing worry and sorrow',          title_ur: 'غم اور پریشانی دور کرنے کی دعا' },
    { title_en: 'Allah is sufficient for us',         title_ur: 'ہمیں اللہ کافی ہے' },
    { title_en: 'Calling on Al-Hayy Al-Qayyum',       title_ur: 'یا حی یا قیوم سے فریاد' },
    { title_en: 'Refuge from severe trials',          title_ur: 'سخت آزمائش سے پناہ' },
    { title_en: 'The supplication of Yusuf (AS)',     title_ur: 'دعائے یوسف علیہ السلام' },
    { title_en: 'Submission and reliance on Allah',   title_ur: 'اللہ پر سپردگی اور توکل' },
    { title_en: 'Refuge from cowardice and the grave', title_ur: 'بزدلی اور عذابِ قبر سے پناہ' },
  ],
  forgiveness: [
    { title_en: 'Istighfar (extended form)',          title_ur: 'استغفار کی طویل صورت' },
    { title_en: 'Istighfar of the Prophet ﷺ',    title_ur: 'نبی ﷺ کا استغفار' },
    { title_en: 'Sins small and great',               title_ur: 'چھوٹے بڑے گناہوں کی بخشش' },
    { title_en: 'The supplication of Adam (AS)',      title_ur: 'دعائے آدم علیہ السلام' },
    { title_en: 'Forgiveness and a righteous death',  title_ur: 'بخشش اور نیک خاتمہ' },
    { title_en: 'Mercy and forgiveness',              title_ur: 'رحمت اور بخشش کی دعا' },
    { title_en: 'Comprehensive plea for forgiveness', title_ur: 'گناہوں کی جامع بخشش' },
  ],
  mosque: [
    { title_en: 'Refuge from Shaitan at the mosque',  title_ur: 'مسجد میں شیطان سے پناہ' },
    { title_en: 'Upon entering the mosque',           title_ur: 'مسجد میں داخل ہوتے وقت' },
    { title_en: 'Upon leaving the mosque',            title_ur: 'مسجد سے نکلتے وقت' },
  ],
  protection: [
    { title_en: 'Morning and evening protection',     title_ur: 'صبح و شام کی حفاظت' },
    { title_en: 'Refuge from all created evil',       title_ur: 'ہر مخلوق کے شر سے پناہ' },
    { title_en: 'Protection for children',            title_ur: 'بچوں کی حفاظت کی دعا' },
    { title_en: 'Refuge from worry and grief',        title_ur: 'غم اور رنج سے پناہ' },
    { title_en: 'When leaving the home',              title_ur: 'گھر سے نکلتے وقت' },
    { title_en: 'When entering the home',             title_ur: 'گھر میں داخل ہوتے وقت' },
    { title_en: 'Refuge from straying and oppression', title_ur: 'گمراہی اور ظلم سے پناہ' },
    { title_en: 'Al-Mu’awwidhat (Surahs 112-114)', title_ur: 'معوذات (آخری تین سورتیں)' },
    { title_en: 'Refuge from evil of one’s own senses', title_ur: 'اپنے اعضاء کے شر سے پناہ' },
  ],
  dua_parents: [
    { title_en: 'For self, parents, and believers',   title_ur: 'اپنے، والدین اور مومنین کے لیے' },
    { title_en: 'Mercy upon parents',                 title_ur: 'والدین پر رحم' },
    { title_en: 'Dua of Ibad ar-Rahman',              title_ur: 'دعائے عباد الرحمٰن' },
  ],
  rain: [
    { title_en: 'When it rains',                      title_ur: 'بارش کے وقت' },
    { title_en: 'After the rain',                     title_ur: 'بارش کے بعد' },
    { title_en: 'During heavy rain',                  title_ur: 'شدید بارش کے وقت' },
  ],
  knowledge: [
    { title_en: 'Increase me in knowledge',           title_ur: 'علم میں اضافے کی دعا' },
    { title_en: 'Benefit, teach, and increase',       title_ur: 'علم کا نفع، تعلیم اور اضافہ' },
    { title_en: 'Beneficial knowledge and lawful rizq', title_ur: 'نافع علم اور پاک رزق' },
    { title_en: 'Remembrance, gratitude, and worship', title_ur: 'ذکر، شکر اور عبادت میں مدد' },
    { title_en: 'Refuge from useless knowledge',      title_ur: 'بے فائدہ علم سے پناہ' },
    { title_en: 'Understanding of the religion',      title_ur: 'دین کی سمجھ' },
    { title_en: 'The supplication of Musa (AS)',      title_ur: 'دعائے موسیٰ علیہ السلام' },
  ],
  sickness: [
    { title_en: 'Visiting the sick (7 times)',        title_ur: 'بیمار کی عیادت (سات بار)' },
    { title_en: 'For pain in the body',               title_ur: 'جسمانی تکلیف کے وقت' },
    { title_en: 'Removing affliction',                title_ur: 'تکلیف دور کرنے کی دعا' },
    { title_en: 'Comforting the sick',                title_ur: 'بیمار کو تسلی' },
    { title_en: 'The supplication of Ayyub (AS)',     title_ur: 'دعائے ایوب علیہ السلام' },
    { title_en: 'Refuge from severe diseases',        title_ur: 'سخت بیماریوں سے پناہ' },
    { title_en: 'Pardon and well-being',              title_ur: 'معافی اور عافیت' },
    { title_en: 'Well-being in body and senses',      title_ur: 'جسم اور حواس کی عافیت' },
  ],
  marriage: [
    { title_en: 'Congratulating the newlyweds',       title_ur: 'نکاح کی مبارکباد' },
    { title_en: 'Before intimacy',                    title_ur: 'ازدواجی تعلق سے پہلے' },
    { title_en: 'Upon marrying a spouse',             title_ur: 'بیوی سے نکاح کے بعد' },
    { title_en: 'The supplication of Zakariya (AS)',  title_ur: 'دعائے زکریا علیہ السلام' },
    { title_en: 'For a praying offspring',            title_ur: 'نمازی اولاد کی دعا' },
    { title_en: 'For a righteous child',              title_ur: 'نیک اولاد کی دعا' },
  ],
  rizq: [
    { title_en: 'Sufficiency through halal',          title_ur: 'حلال سے کفایت کی دعا' },
    { title_en: 'Musa’s (AS) supplication in poverty', title_ur: 'فقر کے وقت موسیٰ علیہ السلام کی دعا' },
    { title_en: 'Refuge from poverty and humiliation', title_ur: 'فقر اور ذلت سے پناہ' },
    { title_en: 'Gratitude for blessings',            title_ur: 'نعمتوں پر شکر' },
    { title_en: 'The dua of dominion',                title_ur: 'بادشاہی کی دعا' },
    { title_en: 'When entering the marketplace',      title_ur: 'بازار میں داخل ہوتے وقت' },
    { title_en: 'For relief from debt',               title_ur: 'قرض کی ادائیگی کی دعا' },
    { title_en: 'Asking Allah for His bounty',        title_ur: 'اللہ کے فضل کی طلب' },
  ],
  friday: [
    { title_en: 'Durood Ibrahim',                     title_ur: 'درودِ ابراہیمی' },
    { title_en: 'Brief salawat on the Prophet ﷺ', title_ur: 'مختصر درود شریف' },
    { title_en: 'The most comprehensive du’a',   title_ur: 'جامع ترین دعا' },
    { title_en: 'From Surah Al-Kahf',                 title_ur: 'سورۃ الکہف کی دعا' },
  ],
};

interface Dua {
  arabic: string;
  transliteration: string;
  english: string;
  reference: string;
  urdu: string;
  title_en?: string;
  title_ur?: string;
}
interface Category {
  id: string;
  title: string;
  icon: string;
  duas: Dua[];
}

function main() {
  const raw = fs.readFileSync(DUA_PATH, 'utf8');
  const data: Category[] = JSON.parse(raw);

  let total = 0;
  let touched = 0;
  for (const cat of data) {
    total += cat.duas.length;
    const titles = TITLES[cat.id];
    if (!titles) throw new Error(`No titles defined for category "${cat.id}"`);
    if (titles.length !== cat.duas.length) {
      throw new Error(
        `Category "${cat.id}" has ${cat.duas.length} duas but ${titles.length} titles defined.`,
      );
    }
    for (let i = 0; i < cat.duas.length; i++) {
      const t = titles[i];
      const dua = cat.duas[i];
      // Reorder keys so title_en + title_ur sit at the top of the object,
      // matching how the UI will read them.
      const next: Dua = {
        title_en: t.title_en,
        title_ur: t.title_ur,
        arabic: dua.arabic,
        transliteration: dua.transliteration,
        english: dua.english,
        reference: dua.reference,
        urdu: dua.urdu,
      };
      cat.duas[i] = next;
      touched++;
    }
  }

  if (total !== 102) {
    throw new Error(`Expected 102 duas total, got ${total}.`);
  }
  if (touched !== 102) {
    throw new Error(`Expected to touch 102, touched ${touched}.`);
  }

  // Preserve 2-space indentation matching the original file.
  fs.writeFileSync(DUA_PATH, JSON.stringify(data, null, 2) + '\n', 'utf8');

  console.log(`✓ Added title_en + title_ur to all ${touched} duas across ${data.length} categories.`);
  console.log(`  File: ${path.relative(process.cwd(), DUA_PATH)}`);
}

main();
