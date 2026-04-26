/**
 * Verifies all book PDF URLs in islamic-books.tsx and attempts to find
 * alternatives on archive.org for any that return 404.
 *
 * Run: npx tsx scripts/verify-book-links.ts
 */

interface BookCheck {
  title: string;
  author: string;
  url: string;
  status?: number;
  working: boolean;
  alternative?: string;
}

async function headRequest(url: string): Promise<number> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, { method: 'HEAD', signal: controller.signal });
    clearTimeout(timeout);
    return res.status;
  } catch {
    return 0;
  }
}

async function searchArchiveOrg(title: string): Promise<string | undefined> {
  const query = encodeURIComponent(title);
  const apiUrl = `https://archive.org/advancedsearch.php?q=${query}&fl[]=identifier,title&output=json&rows=5`;
  try {
    const res = await fetch(apiUrl);
    const json = await res.json() as { response?: { docs?: Array<{ identifier: string; title: string }> } };
    const docs = json?.response?.docs ?? [];
    if (docs.length === 0) return undefined;
    const id = docs[0].identifier;
    return `https://archive.org/download/${id}/${id}.pdf`;
  } catch {
    return undefined;
  }
}

// ─── Book list extracted from islamic-books.tsx ──────────────────────────────

const BOOKS: { title: string; author: string; url: string }[] = [
  { title: 'Riyad as-Salihin Arabic', author: 'Imam Nawawi', url: 'https://archive.org/download/riyad-as-saliheen-arabic/Riyad%20as-Saliheen%20Arabic.pdf' },
  { title: 'Bulugh al-Maram Arabic', author: 'Ibn Hajar al-Asqalani', url: 'https://archive.org/download/BulughAlMaramArabic/Bulugh%20Al-Maram%20Arabic.pdf' },
  { title: 'Al-Adab Al-Mufrad Arabic', author: 'Imam Bukhari', url: 'https://archive.org/download/AlAdabAlMufradArabic/Al-Adab%20Al-Mufrad%20Arabic.pdf' },
  { title: 'Kitab at-Tawhid Arabic', author: 'Ibn Abd al-Wahhab', url: 'https://archive.org/download/KitabAtTawheedArabic/Kitab%20At-Tawheed%20Arabic.pdf' },
  { title: 'Hisn Al-Muslim Arabic', author: 'Said al-Qahtani', url: 'https://archive.org/download/HisnAlMuslimArabic/Hisn%20Al-Muslim.pdf' },
  { title: 'Fazail-e-Amal Urdu', author: 'Maulana Zakariyya', url: 'https://archive.org/download/FazailEAmalUrdu/Fazail-e-Amal%20Urdu.pdf' },
  { title: 'Bahishti Zewar Urdu', author: 'Ashraf Ali Thanvi', url: 'https://archive.org/download/BahishtiZewarUrdu/Bahishti%20Zewar%20Urdu.pdf' },
  { title: 'Islami Zindagi Urdu', author: 'Mufti Taqi Usmani', url: 'https://archive.org/download/IslamiZindagiUrdu/Islami%20Zindagi.pdf' },
  { title: 'Seerat-un-Nabi Urdu', author: 'Shibli Nomani', url: 'https://archive.org/download/SeeratUnNabiUrdu/Seerat-un-Nabi.pdf' },
  { title: 'Noor-ul-Eman Urdu', author: 'Various', url: 'https://archive.org/download/NoorUlEmanUrdu/Noor-ul-Eman.pdf' },
  { title: 'The Sealed Nectar', author: 'Safiur Rahman Mubarakpuri', url: 'https://archive.org/download/TheSealedNectar/The%20Sealed%20Nectar.pdf' },
  { title: "Don't Be Sad", author: 'Dr. Aaidh al-Qarni', url: 'https://archive.org/download/DontBeSadDrAaidhAlQarni/Dont%20Be%20Sad.pdf' },
  { title: 'Fortress of the Muslim', author: 'Said Al-Qahtani', url: 'https://archive.org/download/FortressOfTheMuslim/Fortress-of-the-Muslim.pdf' },
  { title: 'Fundamentals of Tawheed', author: 'Dr. Bilal Philips', url: 'https://archive.org/download/FundamentalsOfTawheedBilalPhilips/Fundamentals%20of%20Tawheed.pdf' },
  { title: 'Stories of the Prophets', author: 'Ibn Kathir', url: 'https://archive.org/download/StoriesOfTheProphetsIbnKathir/Stories%20of%20the%20Prophets.pdf' },
  { title: 'Tafseer Ibn Kathir Urdu', author: 'Ibn Kathir', url: 'https://archive.org/download/TafseerIbnKaseerUrdu/TafseerIbnKaseerUrdu.pdf' },
  { title: 'Maarif-ul-Quran Urdu', author: 'Mufti Muhammad Shafi', url: 'https://archive.org/download/MaarifUlQuranUrdu/MaarifUlQuranUrdu.pdf' },
  { title: 'Sahih Bukhari Urdu', author: 'Imam Bukhari', url: 'https://archive.org/download/SahihBukhariUrdu/SahihBukhariUrdu.pdf' },
];

async function main() {
  console.log('🔍 Verifying Islamic book links...\n');

  const results: BookCheck[] = [];

  for (const book of BOOKS) {
    process.stdout.write(`Checking: ${book.title}... `);
    const status = await headRequest(book.url);
    const working = status >= 200 && status < 400;

    let alternative: string | undefined;
    if (!working) {
      process.stdout.write(`❌ (${status}) — searching archive.org... `);
      alternative = await searchArchiveOrg(book.title);
    }

    results.push({ ...book, status, working, alternative });
    console.log(working ? `✅ (${status})` : alternative ? `→ found: ${alternative}` : `⚠️  no alternative found`);
  }

  console.log('\n─────────────────────────────────────────────────');
  const working = results.filter((r) => r.working);
  const broken = results.filter((r) => !r.working);

  console.log(`\n✅ Working: ${working.length}/${results.length}`);
  if (broken.length > 0) {
    console.log(`❌ Broken: ${broken.length}`);
    broken.forEach((b) => {
      console.log(`  • ${b.title}`);
      if (b.alternative) console.log(`    → Alternative: ${b.alternative}`);
      else console.log(`    → Manual review needed`);
    });
  }

  console.log('\nDone.');
}

main().catch(console.error);
