/**
 * GET /api/account/documents
 * Lists the current user's uploaded account documents (employer or
 * consultant — role-agnostic, scoped to the logged-in user).
 */
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { accountDocument } from '@/server/db/schema.js';
import { eq, desc } from 'drizzle-orm';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';

export default async function handler(req: Request, res: Response) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: toWebRequest(req).headers });
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    const rows = await db
      .select()
      .from(accountDocument)
      .where(eq(accountDocument.userId, session.user.id))
      .orderBy(desc(accountDocument.uploadedAt));

    res.json({ documents: rows });
  } catch (err) {
    console.error('[account.documents.get] ERROR:', err);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
}
