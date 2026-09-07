/**
 * POST /api/consultant/placements/:id/fee/respond
 * Points 50-51: consultant accepts or rejects the auto-calculated fee for
 * a placement. On accept, employer is notified the consultant agreed.
 * Body: { action: 'accept' | 'reject' }
 */
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { placement, user, notification } from '@/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';
import { sendEmail } from '@/server/email.js';

export default async function handler(req: Request, res: Response) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: toWebRequest(req).headers });
    const role = (session?.user as { role?: string } | null)?.role;
    if (!session) return res.status(401).json({ error: 'Unauthorized' });
    if (role !== 'consultant' && role !== 'admin') return res.status(403).json({ error: 'Consultant access required' });

    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid placement ID' });

    const { action } = req.body as { action?: 'accept' | 'reject' };
    if (action !== 'accept' && action !== 'reject') {
      return res.status(400).json({ error: 'action must be "accept" or "reject"' });
    }

    const [row] = await db.select().from(placement).where(eq(placement.id, id)).limit(1);
    if (!row) return res.status(404).json({ error: 'Placement not found' });
    if (role === 'consultant' && row.consultantUserId !== session.user.id) {
      return res.status(403).json({ error: 'Not your placement' });
    }
    if (row.feeAcceptanceStatus !== 'pending') {
      return res.status(400).json({ error: `Fee already ${row.feeAcceptanceStatus}` });
    }

    await db.update(placement).set({
      feeAcceptanceStatus: action === 'accept' ? 'accepted' : 'rejected',
      feeRespondedAt: new Date(),
    }).where(eq(placement.id, id));

    // Point 51: on accept, notify employer the consultant agreed
    if (action === 'accept' && row.employerUserId) {
      await db.insert(notification).values({
        userId: row.employerUserId,
        type: 'fee_accepted',
        message: `Consultant accepted the placement fee for ${row.candidateName} (${row.jobTitle})`,
        link: '/employer/dashboard',
      }).catch(() => {});

      const [employer] = await db.select({ name: user.name, email: user.email }).from(user).where(eq(user.id, row.employerUserId)).limit(1);
      if (employer?.email) {
        sendEmail({
          to: employer.email,
          subject: `Fee accepted — ${row.candidateName}`,
          html: `<p>Hi ${employer.name?.split(' ')[0] || ''},</p><p>The consultant has accepted the placement fee of <strong>${row.feePercent}%</strong> for <strong>${row.candidateName}</strong> (${row.jobTitle}). Payment is due within ${row.paymentTermDays} days of joining.</p>`,
        }).catch(e => console.error('fee.accept.email.error', e));
      }
    }

    res.json({ ok: true, feeAcceptanceStatus: action === 'accept' ? 'accepted' : 'rejected' });
  } catch (err) {
    console.error('[consultant.placements.fee.respond] ERROR:', err);
    res.status(500).json({ error: 'Failed to respond to fee' });
  }
}
