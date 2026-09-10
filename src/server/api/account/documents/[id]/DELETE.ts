/**
 * DELETE /api/account/documents/:id
 * Removes a document from the current user's account.
 */
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { accountDocument } from '@/server/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';

export default async function handler(req: Request, res: Response) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: toWebRequest(req).headers });
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid document ID' });

    const [existing] = await db.select({ id: accountDocument.id }).from(accountDocument)
      .where(and(eq(accountDocument.id, id), eq(accountDocument.userId, session.user.id))).limit(1);
    if (!existing) return res.status(404).json({ error: 'Document not found' });

    await db.delete(accountDocument).where(eq(accountDocument.id, id));
    res.json({ ok: true });
  } catch (err) {
    console.error('[account.documents.delete] ERROR:', err);
    res.status(500).json({ error: 'Failed to delete document' });
  }
}
