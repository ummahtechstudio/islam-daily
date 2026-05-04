import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://vchfykblowmrcvyaljxn.supabase.co';
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_KEY ??
  'sb_publishable_B9WZesatOJ4wZc1ex3Gscg_2_CtEr1C';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  // 1. Count rows with text_indopak populated
  const { count: textCount, error: e1 } = await supabase
    .from('quran_ayahs')
    .select('*', { count: 'exact', head: true })
    .not('text_indopak', 'is', null);
  if (e1) throw e1;
  console.log(`Rows with text_indopak NOT NULL: ${textCount}`);

  // 2. Count rows with page_indopak populated
  const { count: pageCount, error: e2 } = await supabase
    .from('quran_ayahs')
    .select('*', { count: 'exact', head: true })
    .not('page_indopak', 'is', null);
  if (e2) throw e2;
  console.log(`Rows with page_indopak NOT NULL: ${pageCount}`);

  // 3. Total rows in quran_ayahs
  const { count: totalCount, error: e3 } = await supabase
    .from('quran_ayahs')
    .select('*', { count: 'exact', head: true });
  if (e3) throw e3;
  console.log(`Total rows in quran_ayahs: ${totalCount}`);

  // 4. Page 1 — should contain Al-Fatiha ayah 1 (Bismillah)
  const { data: page1, error: e4 } = await supabase
    .from('quran_ayahs')
    .select('surah_number, ayah_number, text_indopak, page_indopak')
    .eq('page_indopak', 1)
    .order('surah_number')
    .order('ayah_number');
  if (e4) throw e4;
  console.log(`\nAyahs on page 1 (${page1?.length ?? 0}):`);
  for (const row of page1 ?? []) {
    console.log(
      `  ${row.surah_number}:${row.ayah_number}  "${row.text_indopak}"`,
    );
  }

  // 5. Distinct page count — paginate to bypass Supabase's 1000-row default
  const distinct = new Set<number>();
  const PAGE_SIZE = 1000;
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('quran_ayahs')
      .select('page_indopak')
      .not('page_indopak', 'is', null)
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const r of data) distinct.add(r.page_indopak as number);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  console.log(`\nDistinct page_indopak values: ${distinct.size}`);
  const sorted = [...distinct].sort((a, b) => a - b);
  console.log(`Min page: ${sorted[0]}, Max page: ${sorted[sorted.length - 1]}`);

  // 6. Spot-check Surah 2 Ayah 255 (Ayatul Kursi) text
  const { data: kursi, error: e6 } = await supabase
    .from('quran_ayahs')
    .select('surah_number, ayah_number, text_indopak, page_indopak')
    .eq('surah_number', 2)
    .eq('ayah_number', 255)
    .single();
  if (e6) throw e6;
  console.log(
    `\nAyatul Kursi (2:255) page_indopak=${kursi?.page_indopak}`,
  );
  console.log(`  text snippet: "${kursi?.text_indopak?.slice(0, 60)}..."`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
