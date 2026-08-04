/**
 * POST /api/consultant/cv-bank/bulk
 * Bulk-adds multiple candidates to the consultant's CV Bank in one
 * request — the CSV itself is parsed client-side (no new npm dependency
 * needed for a simple structured format); this endpoint just validates
 * and batch-inserts the resulting array.
 * Body: { entries: Array<{ name, email, phone?, currentRole?, currentCTC?,
 *          expectedCTC?, experience?, location?, skills?: string[] }> }
 */
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { cvBankEntry } from '@/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';

interface BulkRow {
  name?: string; email?: string; phone?: string; currentRole?: string;
  currentCTC?: string; expectedCTC?: string; experience?: string;
  location?: string; skills?: string[];
}

export default async function handler(req: Request, res: Response) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: toWebRequest(req).headers });
    const role = (session?.user as { role?: string } | null)?.role;
    if (!session) return res.status(401).json({ error: 'Unauthorized' });
    if (role !== 'consultant' && role !== 'admin') return res.status(403).json({ error: 'Consultant access required' });

    const { entries } = req.body as { entries?: BulkRow[] };
    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ error: 'No entries provided' });
    }
    if (entries.length > 500) {
      return res.status(400).json({ error: 'Maximum 500 candidates per bulk upload' });
    }

    // Skip rows missing required fields, and de-dupe against existing
    // entries for this consultant by email.
    const existingEmails = new Set(
      (await db.select({ email: cvBankEntry.email }).from(cvBankEntry).where(eq(cvBankEntry.consultantUserId, session.user.id)))
        .map(r => r.email.toLowerCase())
    );

    const seenInBatch = new Set<string>();
    const toInsert: (typeof cvBankEntry.$inferInsert)[] = [];
    let skippedInvalid = 0;
    let skippedDuplicate = 0;

    for (const row of entries) {
      const name = row.name?.trim();
      const email = row.email?.trim().toLowerCase();
      if (!name || !email) { skippedInvalid++; continue; }
      if (existingEmails.has(email) || seenInBatch.has(email)) { skippedDuplicate++; continue; }
      seenInBatch.add(email);
      toInsert.push({
        consultantUserId: session.user.id,
        name,
        email,
        phone: row.phone?.trim() || null,
        currentRole: row.currentRole?.trim() || null,
        currentCTC: row.currentCTC?.trim() || null,
        expectedCTC: row.expectedCTC?.trim() || null,
        experience: row.experience?.trim() || null,
        location: row.location?.trim() || null,
        skills: row.skills ?? [],
      });
    }

    if (toInsert.length > 0) {
      await db.insert(cvBankEntry).values(toInsert);
    }

    res.json({ ok: true, added: toInsert.length, skippedInvalid, skippedDuplicate });
  } catch (err) {
    console.error('[consultant.cv-bank.bulk] ERROR:', err);
    res.status(500).json({ error: 'Failed to bulk upload candidates' });
  }
}
