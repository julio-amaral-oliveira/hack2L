import { put, list } from '@vercel/blob';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!EMAIL_RE.test(email) || email.length > 254) {
      return res.status(400).json({ ok: false, error: 'invalid_email' });
    }
    // filename = base64url(email): dedupe natural (1 arquivo por email)
    const id = Buffer.from(email).toString('base64url');
    await put(`waitlist/${id}.json`, JSON.stringify({ email, at: new Date().toISOString() }), {
      access: 'private',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'application/json',
    });
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'GET') {
    if (!process.env.WAITLIST_KEY || req.query.key !== process.env.WAITLIST_KEY) {
      return res.status(401).json({ ok: false, error: 'unauthorized' });
    }
    const emails = [];
    let cursor;
    do {
      const page = await list({ prefix: 'waitlist/', cursor, limit: 1000 });
      for (const b of page.blobs) {
        const id = b.pathname.replace(/^waitlist\//, '').replace(/\.json$/, '');
        emails.push({ email: Buffer.from(id, 'base64url').toString(), at: b.uploadedAt });
      }
      cursor = page.cursor;
    } while (cursor);
    emails.sort((a, b) => new Date(a.at) - new Date(b.at));

    if (req.query.format === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      return res.status(200).send('email,inscrito_em\n' + emails.map((e) => `${e.email},${e.at}`).join('\n'));
    }
    return res.status(200).json({ ok: true, total: emails.length, emails });
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ ok: false, error: 'method_not_allowed' });
}
