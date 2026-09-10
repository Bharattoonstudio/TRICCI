/**
 * POST /api/consultant/cv-bank
 * Adds a candidate to the consultant's personal talent pool.
 */
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { cvBankEntry } from '@/server/db/schema.js';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';

export default async function handler(req: Request, res: Response) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: toWebRequest(req).headers });
    const role = (session?.user as { role?: string } | null)?.role;
    if (!session) return res.status(401).json({ error: 'Unauthorized' });
    if (role !== 'consultant' && role !== 'admin') return res.status(403).json({ error: 'Consultant access required' });

    const { name, email, phone, currentRole, currentCTC, expectedCTC, experience, location, skills, notes } = req.body as {
      name?: string; email?: string; phone?: string; currentRole?: string; currentCTC?: string;
      expectedCTC?: string; experience?: string; location?: string; skills?: string[]; notes?: string;
    };

    if (!name?.trim() || !email?.trim()) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    const [entry] = await db.insert(cvBankEntry).values({
      consultantUserId: session.user.id,
      name: name.trim(),
      email: email.trim(),
      phone: phone?.trim() || null,
      currentRole: currentRole?.trim() || null,
      currentCTC: currentCTC?.trim() || null,
      expectedCTC: expectedCTC?.trim() || null,
      experience: experience?.trim() || null,
      location: location?.trim() || null,
      skills: skills ?? [],
      notes: notes?.trim() || null,
    }).returning();

    res.status(201).json({ ok: true, entry });
  } catch (err) {
    console.error('[consultant.cv-bank.post] ERROR:', err);
    res.status(500).json({ error: 'Failed to add candidate' });
  }
}
