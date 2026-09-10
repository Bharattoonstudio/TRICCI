/**
 * GET /api/employer/placements/:id/invoice
 * Generates a downloadable PDF invoice for a placement the employer has
 * paid — shows the total placement fee they paid to TRICCI (not the
 * consultant fee split, which is the consultant's own invoice — see
 * /api/consultant/placements/:id/invoice for that side).
 */
import type { Request, Response } from 'express';
import PDFDocument from 'pdfkit';
import { db } from '@/server/db/client.js';
import { placement, user } from '@/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';

const ORANGE = '#E8470A';
const DARK = '#1a1a1a';
const MUTED = '#666666';

export default async function handler(req: Request, res: Response) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: toWebRequest(req).headers });
    const role = (session?.user as { role?: string } | null)?.role;
    if (!session) return res.status(401).json({ error: 'Unauthorized' });
    if (role !== 'employer' && role !== 'admin') return res.status(403).json({ error: 'Employer access required' });

    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid placement ID' });

    const [row] = await db.select().from(placement).where(eq(placement.id, id)).limit(1);
    if (!row) return res.status(404).json({ error: 'Placement not found' });
    if (role === 'employer' && row.employerUserId !== session.user.id) {
      return res.status(403).json({ error: 'Not your placement' });
    }
    if (row.paymentStatus !== 'paid') {
      return res.status(400).json({ error: 'Invoice is only available once payment has been marked as paid' });
    }

    const [employer] = row.employerUserId
      ? await db.select({ name: user.name, email: user.email }).from(user).where(eq(user.id, row.employerUserId)).limit(1)
      : [];

    const invoiceNumber = `TRICCI-EMP-${String(row.id).padStart(6, '0')}`;
    const invoiceDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    const pdfBuffer: Buffer = await new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margins: { top: 50, bottom: 50, left: 56, right: 56 } });
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fillColor(ORANGE).fontSize(22).font('Helvetica-Bold').text('TRICCI');
      doc.fillColor(MUTED).fontSize(9).font('Helvetica').text('Recruitment Marketplace · www.tricci.in');
      doc.moveDown(1.2);

      doc.fillColor(DARK).fontSize(16).font('Helvetica-Bold').text('Placement Fee Invoice');
      doc.moveDown(0.3);
      doc.fillColor(MUTED).fontSize(10).font('Helvetica');
      doc.text(`Invoice Number: ${invoiceNumber}`);
      doc.text(`Invoice Date: ${invoiceDate}`);
      doc.moveDown(1);

      doc.fillColor(DARK).fontSize(11).font('Helvetica-Bold').text('Billed To');
      doc.fillColor(MUTED).fontSize(10).font('Helvetica');
      doc.text(employer?.name ?? row.companyName);
      doc.text(employer?.email ?? '');
      doc.moveDown(1);

      doc.fillColor(DARK).fontSize(11).font('Helvetica-Bold').text('Placement Details');
      doc.fillColor(MUTED).fontSize(10).font('Helvetica');
      doc.text(`Candidate: ${row.candidateName}`);
      doc.text(`Position: ${row.jobTitle}`);
      doc.text(`Company: ${row.companyName}`);
      doc.text(`Consultant: ${row.consultantName ?? 'Direct application'}`);
      doc.text(`Candidate CTC: ${row.ctcLpa != null ? `₹${row.ctcLpa}L` : '—'}`);
      doc.moveDown(1);

      doc.fillColor(DARK).fontSize(11).font('Helvetica-Bold').text('Amount');
      doc.moveDown(0.4);
      doc.fillColor(MUTED).fontSize(10).font('Helvetica').text('Placement Fee', 56, doc.y);
      doc.fillColor(DARK).fontSize(10).font('Helvetica-Bold').text(`${row.feePercent ?? '—'}% of CTC`, 350, doc.y - 12);
      doc.moveDown(2);

      doc.rect(56, doc.y, 483, 50).fillAndStroke('#f5f5f5', '#e0e0e0');
      doc.fillColor(DARK).fontSize(12).font('Helvetica-Bold').text('Total Amount Paid', 70, doc.y + 12);
      doc.fillColor(ORANGE).fontSize(16).font('Helvetica-Bold').text(`₹${row.feeAmountLpa?.toFixed(2) ?? '0.00'}L`, 380, doc.y - 16);

      doc.moveDown(4);
      doc.fillColor(MUTED).fontSize(8).font('Helvetica').text(
        'This invoice reflects a placement fee paid through the TRICCI platform. GST and other statutory taxes, where applicable, are as per your commercial agreement with TRICCI.',
        56, doc.y, { width: 483 }
      );

      doc.end();
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${invoiceNumber}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('[employer.placements.invoice] ERROR:', err);
    res.status(500).json({ error: 'Failed to generate invoice' });
  }
}
