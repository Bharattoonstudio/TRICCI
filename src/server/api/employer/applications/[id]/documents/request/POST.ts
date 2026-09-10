/**
 * POST /api/employer/applications/:id/documents/request
 * Employer asks for documents (PAN, payslips, relieving letter, etc.)
 * once a direct candidate is shortlisted/selected. There's no consultant
 * on a direct application, so the candidate is emailed and notified directly.
 */
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { documentRequest, notification } from '@/server/db/schema.js';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';
import { sendEmail } from '@/server/email.js';
import { resolveDocEntity } from '@/server/lib/documentEntity.js';

export default async function handler(req: Request, res: Response) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: toWebRequest(req).headers });
    if (!session) return res.status(401).json({ error: 'Unauthorized' });
    const role = (session?.user as { role?: string } | null)?.role;
    if (role !== 'employer' && role !== 'admin') return res.status(403).json({ error: 'Employer access required' });

    const { documentLabels, message } = req.body as { documentLabels?: string[]; message?: string };
    if (!Array.isArray(documentLabels) || documentLabels.length === 0 || documentLabels.some(l => !l?.trim())) {
      return res.status(400).json({ error: 'At least one document label is required' });
    }

    const entity = await resolveDocEntity('application', String(req.params.id));
    if (!entity) return res.status(404).json({ error: 'Application not found' });
    if (role === 'employer' && entity.postedByUserId !== session.user.id) {
      return res.status(403).json({ error: 'Not your job posting' });
    }

    const [request] = await db.insert(documentRequest).values({
      entityType: 'application',
      entityId: String(entity.id),
      requestedByUserId: session.user.id,
      documentLabels,
      message: message?.trim() || null,
      status: 'pending',
    }).returning();

    if (entity.candidateUserId) {
      await db.insert(notification).values({
        userId: entity.candidateUserId,
        type: 'document_request',
        message: `${entity.companyName || 'The employer'} requested documents: ${documentLabels.join(', ')}`,
        link: `/candidate/documents`,
      }).catch(() => {});
    }

    await sendEmail({
      to: entity.candidateEmail,
      subject: `Documents Required — ${entity.jobTitle}`,
      html: `
        <p>Hi <strong>${entity.candidateName}</strong>,</p>
        <p>${entity.companyName} has requested the following documents for your <strong>${entity.jobTitle}</strong> application:</p>
        <ul>${documentLabels.map(l => `<li>${l}</li>`).join('')}</ul>
        ${message ? `<p><strong>Note:</strong> ${message}</p>` : ''}
        <p>Please upload these at your earliest convenience via your candidate portal.</p>
        <p>Best regards,<br/>${entity.companyName} Team</p>
      `,
      senderName: entity.companyName || undefined,
    }).catch(e => console.error('[applications.documents.request.email.error]', e));

    res.status(201).json({ ok: true, request });
  } catch (err) {
    console.error('[employer.applications.documents.request] ERROR:', err);
    res.status(500).json({ error: 'Failed to create document request' });
  }
}
