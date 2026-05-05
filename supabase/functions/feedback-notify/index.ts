// Supabase Edge Function — forwards new feedback rows to ummahtech.studio@gmail.com via Resend.
//
// Setup (one-time):
//   1. Sign up at https://resend.com and create an API key.
//   2. Verify a sender address (e.g. notifications@<your-domain>) — until then,
//      Resend allows sending to/from your account email only.
//   3. Set secrets:
//        supabase secrets set RESEND_API_KEY=re_xxx
//        supabase secrets set RESEND_FROM=notifications@yourdomain.com
//        supabase secrets set FEEDBACK_TO=ummahtech.studio@gmail.com
//   4. Deploy: supabase functions deploy feedback-notify
//   5. In Supabase dashboard → Database → Webhooks, create a webhook:
//        Name: feedback-notify
//        Table: public.feedback, Events: INSERT
//        Type: Supabase Edge Function, function: feedback-notify

// deno-lint-ignore-file no-explicit-any
// @ts-ignore — Deno globals at runtime
declare const Deno: { env: { get: (k: string) => string | undefined }; serve: (h: any) => void };

const RESEND_API = 'https://api.resend.com/emails';

interface FeedbackRow {
  id?: number | string;
  rating?: number | null;
  category?: string | null;
  message?: string | null;
  name?: string | null;
  email?: string | null;
  app_version?: string | null;
  device_platform?: string | null;
  device_model?: string | null;
  screenshot_url?: string | null;
  user_id?: string | null;
  created_at?: string | null;
}

interface WebhookPayload {
  type: string;
  table: string;
  record: FeedbackRow;
  schema: string;
  old_record: FeedbackRow | null;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function shortUserId(id: string | null | undefined): string {
  if (!id) return '—';
  return id.slice(-6);
}

function renderHtml(r: FeedbackRow): string {
  const safe = (v: string | null | undefined) => (v ? escapeHtml(v) : '—');
  const screenshot = r.screenshot_url
    ? `<p><strong>Screenshot:</strong> <a href="${escapeHtml(r.screenshot_url)}">${escapeHtml(r.screenshot_url)}</a></p>`
    : '';
  return `
    <h2>New Islam Daily Feedback</h2>
    <p><strong>Category:</strong> ${safe(r.category)}</p>
    <p><strong>Rating:</strong> ${r.rating ?? '—'}</p>
    <p><strong>From:</strong> ${safe(r.name)} (${safe(r.email)})</p>
    <p><strong>Message:</strong></p>
    <blockquote style="border-left:3px solid #2A6F4F;padding-left:12px;color:#333;">${safe(r.message)}</blockquote>
    ${screenshot}
    <hr/>
    <p style="font-size:12px;color:#666;">
      App ${safe(r.app_version)} · ${safe(r.device_platform)} ${safe(r.device_model)}<br/>
      User: ${shortUserId(r.user_id)} · ${safe(r.created_at)}
    </p>`;
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const apiKey = Deno.env.get('RESEND_API_KEY');
  const from = Deno.env.get('RESEND_FROM') ?? 'onboarding@resend.dev';
  const to = Deno.env.get('FEEDBACK_TO') ?? 'ummahtech.studio@gmail.com';
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }

  let payload: WebhookPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  if (payload.type !== 'INSERT' || payload.table !== 'feedback') {
    return new Response(JSON.stringify({ skipped: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }

  const record = payload.record ?? {};
  const subject = `[Islam Daily] ${record.category ?? 'Feedback'} from ${record.name ?? 'Anonymous'}`;

  const res = await fetch(RESEND_API, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      reply_to: record.email ?? undefined,
      subject,
      html: renderHtml(record),
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    return new Response(JSON.stringify({ error: 'Resend failed', detail: text }), {
      status: 502,
      headers: { 'content-type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
});
