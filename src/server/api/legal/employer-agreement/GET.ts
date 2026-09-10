/**
 * GET /api/legal/employer-agreement
 * Public — serves the full Employer MSA text for display and download.
 */
import type { Request, Response } from 'express';
import { EMPLOYER_AGREEMENT_TEXT } from '@/server/legal/employerAgreementText.js';

export default async function handler(_req: Request, res: Response) {
  res.json({ text: EMPLOYER_AGREEMENT_TEXT, title: 'TRICCI Employer Master Service Agreement' });
}
