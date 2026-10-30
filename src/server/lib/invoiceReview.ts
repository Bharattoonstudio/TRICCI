/** Shared helpers for admin review actions on a consultant invoice. */
import { db } from '../db/client.js';
import { consultantInvoice, placement, notification, user } from '../db/schema.js';
import { eq } from 'drizzle-orm';

export async function loadInvoiceWithPlacement(placementId: number) {
  const [invoice] = await db.select().from(consultantInvoice).where(eq(consultantInvoice.placementId, placementId)).limit(1);
  const [plc] = await db.select().from(placement).where(eq(placement.id, placementId)).limit(1);
  return { invoice: invoice ?? null, placement: plc ?? null };
}

export async function notifyUser(userId: string | null | undefined, type: string, message: string, link: string) {
  if (!userId) return;
  await db.insert(notification).values({ userId, type, message, link }).catch(err =>
    console.error('[invoice.notify] failed:', err),
  );
}

/** Tell every admin about an invoice event. Best-effort. */
export async function notifyAdmins(type: string, message: string, link: string) {
  const admins = await db.select({ id: user.id }).from(user).where(eq(user.role, 'admin'));
  await Promise.allSettled(admins.map(a => notifyUser(a.id, type, message, link)));
}
