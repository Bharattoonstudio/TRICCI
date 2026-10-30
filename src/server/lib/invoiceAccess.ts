/**
 * Who may see and act on a consultant invoice thread.
 * Admin: any invoice. Consultant: their own placement. Employer: their own placement.
 */
import { db } from '../db/client.js';
import { placement } from '../db/schema.js';
import { eq } from 'drizzle-orm';

export type ViewerRole = 'admin' | 'consultant' | 'employer';

export async function resolveInvoiceViewer(userId: string, sessionRole: string | undefined, placementId: number): Promise<ViewerRole | null> {
  if (sessionRole === 'admin') return 'admin';
  const [plc] = await db.select({ employerUserId: placement.employerUserId, consultantUserId: placement.consultantUserId })
    .from(placement).where(eq(placement.id, placementId)).limit(1);
  if (!plc) return null;
  if (sessionRole === 'employer' && plc.employerUserId === userId) return 'employer';
  if (sessionRole === 'consultant' && plc.consultantUserId === userId) return 'consultant';
  return null;
}
