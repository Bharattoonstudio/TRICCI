/**
 * GET /api/legal/consultant-agreement
 * Public — serves the full Consultant MSA text for display and download.
 */
import type { Request, Response } from 'express';
import { CONSULTANT_AGREEMENT_TEXT } from '@/server/legal/consultantAgreementText.js';

export default async function handler(_req: Request, res: Response) {
  res.json({ text: CONSULTANT_AGREEMENT_TEXT, title: 'TRICCI Consultant Master Service Agreement' });
}
