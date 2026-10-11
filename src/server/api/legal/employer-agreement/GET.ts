/**
 * GET /api/legal/employer-agreement
 * Public — serves the full Employer MSA text for display and download.
 */
import type { Request, Response } from 'express';
import { getEmployerAgreementText } from '@/server/legal/employerAgreementText.js';

export default async function handler(_req: Request, res: Response) {
  res.json({ text: getEmployerAgreementText(), title: 'TRICCI Employer Master Service Agreement' });
}
