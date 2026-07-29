/**
 * Renders a structured CV (name/contact/summary/skills/experience/education)
 * into a clean, single-column PDF using pdfkit (pure JS, no native deps —
 * safe on Railway). Used by the AI CV-enhancement "approve & download" flow.
 */
import PDFDocument from 'pdfkit';

export interface EnhancedCvContent {
  name: string;
  email?: string;
  phone?: string;
  location?: string;
  currentTitle?: string;
  summary: string;
  skills: string[];
  experience?: Array<{ title: string; company: string; duration: string; bullets: string[] }>;
  education?: Array<{ degree: string; institution: string; year: string }>;
}

const ORANGE = '#E8470A';
const DARK = '#1a1a1a';
const MUTED = '#555555';

export function renderCvPdf(content: EnhancedCvContent): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margins: { top: 50, bottom: 50, left: 56, right: 56 } });
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fillColor(DARK).fontSize(22).font('Helvetica-Bold').text(content.name || 'Candidate', { continued: false });
      if (content.currentTitle) {
        doc.moveDown(0.2);
        doc.fillColor(ORANGE).fontSize(12).font('Helvetica-Bold').text(content.currentTitle);
      }
      const contactLine = [content.email, content.phone, content.location].filter(Boolean).join('  ·  ');
      if (contactLine) {
        doc.moveDown(0.3);
        doc.fillColor(MUTED).fontSize(9.5).font('Helvetica').text(contactLine);
      }

      doc.moveDown(0.8);
      doc.strokeColor('#dddddd').lineWidth(1).moveTo(56, doc.y).lineTo(539, doc.y).stroke();
      doc.moveDown(0.8);

      // Summary
      if (content.summary) {
        sectionHeader(doc, 'Professional Summary');
        doc.fillColor(DARK).fontSize(10).font('Helvetica').text(content.summary, { align: 'left', lineGap: 2 });
        doc.moveDown(0.9);
      }

      // Skills
      if (content.skills?.length) {
        sectionHeader(doc, 'Key Skills');
        doc.fillColor(DARK).fontSize(10).font('Helvetica').text(content.skills.join('   •   '), { lineGap: 2 });
        doc.moveDown(0.9);
      }

      // Experience
      if (content.experience?.length) {
        sectionHeader(doc, 'Experience');
        for (const exp of content.experience) {
          doc.fillColor(DARK).fontSize(10.5).font('Helvetica-Bold')
            .text(`${exp.title}${exp.company ? ' — ' + exp.company : ''}`, { continued: false });
          if (exp.duration) {
            doc.fillColor(MUTED).fontSize(9).font('Helvetica-Oblique').text(exp.duration);
          }
          doc.moveDown(0.15);
          for (const bullet of exp.bullets ?? []) {
            doc.fillColor(DARK).fontSize(9.5).font('Helvetica')
              .text(`•  ${bullet}`, { indent: 10, lineGap: 1.5 });
          }
          doc.moveDown(0.6);
        }
      }

      // Education
      if (content.education?.length) {
        sectionHeader(doc, 'Education');
        for (const edu of content.education) {
          doc.fillColor(DARK).fontSize(10).font('Helvetica-Bold')
            .text(`${edu.degree}${edu.institution ? ' — ' + edu.institution : ''}`);
          if (edu.year) doc.fillColor(MUTED).fontSize(9).font('Helvetica').text(edu.year);
          doc.moveDown(0.4);
        }
      }

      doc.moveDown(1);
      doc.fillColor('#aaaaaa').fontSize(7.5).font('Helvetica')
        .text('CV tailored with TRICCI AI CV Enhancer — reviewed and approved by the candidate.', { align: 'center' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

function sectionHeader(doc: PDFKit.PDFDocument, title: string) {
  doc.fillColor(ORANGE).fontSize(11).font('Helvetica-Bold').text(title.toUpperCase(), { characterSpacing: 0.5 });
  doc.moveDown(0.25);
}
