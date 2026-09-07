/**
 * GET /api/consultant/cv-bank
 * Lists the consultant's own talent pool entries.
 */
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { cvBankEntry } from '@/server/db/schema.js';
import { eq, desc } from 'drizzle-orm';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';

export default async function handler(req: Request, res: Response) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: toWebRequest(req).headers });
    const role = (session?.user as { role?: string } | null)?.role;
    if (!session) return res.status(401).json({ error: 'Unauthorized' });
    if (role !== 'consultant' && role !== 'admin') return res.status(403).json({ error: 'Consultant access required' });

    const rows = await db
      .select()
      .from(cvBankEntry)
      .where(eq(cvBankEntry.consultantUserId, session.user.id))
      .orderBy(desc(cvBankEntry.createdAt));

    res.json({ entries: rows });
  } catch (err) {
    console.error('[consultant.cv-bank.get] ERROR:', err);
    res.status(500).json({ error: 'Failed to fetch CV bank' });
  }
}
