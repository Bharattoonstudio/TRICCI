/**
 * DELETE /api/consultant/cv-bank/:id
 * Removes a candidate from the consultant's talent pool.
 */
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { cvBankEntry } from '@/server/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';

export default async function handler(req: Request, res: Response) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: toWebRequest(req).headers });
    const role = (session?.user as { role?: string } | null)?.role;
    if (!session) return res.status(401).json({ error: 'Unauthorized' });
    if (role !== 'consultant' && role !== 'admin') return res.status(403).json({ error: 'Consultant access required' });

    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid entry ID' });

    const [existing] = await db.select({ id: cvBankEntry.id }).from(cvBankEntry)
      .where(and(eq(cvBankEntry.id, id), eq(cvBankEntry.consultantUserId, session.user.id))).limit(1);
    if (!existing) return res.status(404).json({ error: 'Entry not found' });

    await db.delete(cvBankEntry).where(eq(cvBankEntry.id, id));
    res.json({ ok: true });
  } catch (err) {
    console.error('[consultant.cv-bank.delete] ERROR:', err);
    res.status(500).json({ error: 'Failed to delete entry' });
  }
}
