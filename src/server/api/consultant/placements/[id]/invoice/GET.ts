/**
 * GET /api/consultant/placements/:id/invoice
 * Generates a downloadable PDF invoice for a placement whose fee has been
 * paid — consultant details, employer, candidate, CTC, fee breakdown
 * (platform cut vs consultant share), and net amount. Only available once
 * paymentStatus is 'paid' — an invoice for money not yet received would
 * be misleading.
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
    if (role !== 'consultant' && role !== 'admin') return res.status(403).json({ error: 'Consultant access required' });

    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid placement ID' });

    const [row] = await db.select().from(placement).where(eq(placement.id, id)).limit(1);
    if (!row) return res.status(404).json({ error: 'Placement not found' });
    if (role === 'consultant' && row.consultantUserId !== session.user.id) {
      return res.status(403).json({ error: 'Not your placement' });
    }
    if (row.paymentStatus !== 'paid') {
      return res.status(400).json({ error: 'Invoice is only available once payment has been marked as paid' });
    }

    const [consultant] = await db.select({ name: user.name, email: user.email }).from(user).where(eq(user.id, row.consultantUserId!)).limit(1);

    const invoiceNumber = `TRICCI-INV-${String(row.id).padStart(6, '0')}`;
    const invoiceDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    const pdfBuffer: Buffer = await new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margins: { top: 50, bottom: 50, left: 56, right: 56 } });
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fillColor(ORANGE).fontSize(22).font('Helvetica-Bold').text('TRICCI', { continued: false });
      doc.fillColor(MUTED).fontSize(9).font('Helvetica').text('Recruitment Marketplace · www.tricci.in');
      doc.moveDown(1.2);

      doc.fillColor(DARK).fontSize(16).font('Helvetica-Bold').text('Placement Fee Invoice');
      doc.moveDown(0.3);
      doc.fillColor(MUTED).fontSize(10).font('Helvetica');
      doc.text(`Invoice Number: ${invoiceNumber}`);
      doc.text(`Invoice Date: ${invoiceDate}`);
      doc.moveDown(1);

      // Bill to / for
      doc.fillColor(DARK).fontSize(11).font('Helvetica-Bold').text('Paid To');
      doc.fillColor(MUTED).fontSize(10).font('Helvetica');
      doc.text(consultant?.name ?? row.consultantName ?? 'Consultant');
      doc.text(consultant?.email ?? '');
      doc.moveDown(1);

      doc.fillColor(DARK).fontSize(11).font('Helvetica-Bold').text('Placement Details');
      doc.fillColor(MUTED).fontSize(10).font('Helvetica');
      doc.text(`Candidate: ${row.candidateName}`);
      doc.text(`Position: ${row.jobTitle}`);
      doc.text(`Company: ${row.companyName}`);
      doc.text(`Candidate CTC: ${row.ctcLpa != null ? `₹${row.ctcLpa}L` : '—'}`);
      doc.moveDown(1);

      // Fee breakdown table
      doc.fillColor(DARK).fontSize(11).font('Helvetica-Bold').text('Fee Breakdown');
      doc.moveDown(0.4);
      const rows: [string, string][] = [
        ['Total Placement Fee', `${row.feePercent ?? '—'}% (₹${row.feeAmountLpa?.toFixed(2) ?? '—'}L)`],
        ['Platform Fee (TRICCI)', `${row.platformFeePercent ?? 2}%`],
        ['Your Commission', `${row.consultantFeePercent ?? '—'}% (₹${row.consultantFeeAmountLpa?.toFixed(2) ?? '—'}L)`],
      ];
      const startY = doc.y;
      let y = startY;
      for (const [label, value] of rows) {
        doc.fillColor(MUTED).fontSize(10).font('Helvetica').text(label, 56, y);
        doc.fillColor(DARK).fontSize(10).font('Helvetica-Bold').text(value, 350, y);
        y += 20;
      }
      doc.moveDown(2);

      // Net amount box
      doc.rect(56, doc.y, 483, 50).fillAndStroke('#f5f5f5', '#e0e0e0');
      doc.fillColor(DARK).fontSize(12).font('Helvetica-Bold').text('Net Amount Paid', 70, doc.y + 12);
      doc.fillColor(ORANGE).fontSize(16).font('Helvetica-Bold').text(`₹${row.consultantFeeAmountLpa?.toFixed(2) ?? '0.00'}L`, 380, doc.y - 16);

      doc.moveDown(4);
      doc.fillColor(MUTED).fontSize(8).font('Helvetica').text(
        'This invoice reflects a placement fee facilitated through the TRICCI platform. Please consult your own records for tax filing purposes.',
        56, doc.y, { width: 483 }
      );

      doc.end();
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${invoiceNumber}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('[consultant.placements.invoice] ERROR:', err);
    res.status(500).json({ error: 'Failed to generate invoice' });
  }
}
