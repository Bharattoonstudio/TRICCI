/**
 * Authorization Middleware
 * 
 * P0 #5: Implements resource-level access control to prevent IDOR attacks
 * 
 * Usage:
 * app.put('/api/submissions/:id', 
 *   authorizeResource('submission', 'owner'),
 *   handler
 * )
 */

import type { Request, Response, NextFunction } from 'express';
import { db } from '@/server/db/client.js';
import { submission, placement, job, cvBankEntry, user } from '@/server/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';

type ResourceType = 'submission' | 'placement' | 'job' | 'cv-bank-entry';
type AccessLevel = 'owner' | 'viewer' | 'editor';

/**
 * Middleware factory: checks if current user owns/can access the resource
 * 
 * @param resourceType - Type of resource (submission, placement, job, cv-bank-entry)
 * @param requiredAccess - Level of access (owner, viewer, editor)
 */
export function authorizeResource(resourceType: ResourceType, requiredAccess: AccessLevel = 'owner') {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const auth = getAuth();
      const session = await auth.api.getSession({ headers: toWebRequest(req).headers });

      if (!session) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const userId = session.user.id;
      const isAdmin = (session.user as { isAdmin?: boolean } | null)?.isAdmin ?? false;
      const userRole = (session.user as { role?: string } | null)?.role;

      // Admins bypass all checks
      if (isAdmin) {
        return next();
      }

      const resourceId = req.params.id;

      // ── Submission Authorization ──
      if (resourceType === 'submission') {
        const [sub] = await db
          .select({
            id: submission.id,
            jobId: submission.jobId,
            consultantUserId: submission.consultantUserId,
            candidateUserId: submission.candidateUserId,
          })
          .from(submission)
          .where(eq(submission.id, Number(resourceId)))
          .limit(1);

        if (!sub) {
          return res.status(404).json({ error: 'Submission not found' });
        }

        // Fetch job to get employer
        const [jobRow] = await db
          .select({ postedByUserId: job.postedByUserId })
          .from(job)
          .where(eq(job.id, sub.jobId))
          .limit(1);

        // Access checks
        const isEmployer = jobRow?.postedByUserId === userId;
        const isConsultant = sub.consultantUserId === userId;
        const isCandidate = sub.candidateUserId === userId;

        if (!isEmployer && !isConsultant && !isCandidate) {
          return res.status(403).json({
            error: 'Forbidden',
            message: 'You do not have access to this submission',
          });
        }

        // Store in request for endpoint to use
        (req as any).resource = { ...sub, jobRow };
        return next();
      }

      // ── Placement Authorization ──
      if (resourceType === 'placement') {
        const [plc] = await db
          .select({
            id: placement.id,
            consultantUserId: placement.consultantUserId,
            employerUserId: placement.employerUserId,
          })
          .from(placement)
          .where(eq(placement.id, Number(resourceId)))
          .limit(1);

        if (!plc) {
          return res.status(404).json({ error: 'Placement not found' });
        }

        // Access checks
        const isEmployer = plc.employerUserId === userId;
        const isConsultant = plc.consultantUserId === userId;

        if (!isEmployer && !isConsultant) {
          return res.status(403).json({
            error: 'Forbidden',
            message: 'You do not have access to this placement',
          });
        }

        (req as any).resource = plc;
        return next();
      }

      // ── Job Authorization ──
      if (resourceType === 'job') {
        const [jobRow] = await db
          .select({
            id: job.id,
            postedByUserId: job.postedByUserId,
          })
          .from(job)
          .where(eq(job.id, resourceId))
          .limit(1);

        if (!jobRow) {
          return res.status(404).json({ error: 'Job not found' });
        }

        // Only employer who posted can edit
        if (jobRow.postedByUserId !== userId) {
          return res.status(403).json({
            error: 'Forbidden',
            message: 'Only the job poster can edit this job',
          });
        }

        (req as any).resource = jobRow;
        return next();
      }

      // ── CV Bank Entry Authorization ──
      if (resourceType === 'cv-bank-entry') {
        const [entry] = await db
          .select({
            id: cvBankEntry.id,
            consultantUserId: cvBankEntry.consultantUserId,
          })
          .from(cvBankEntry)
          .where(eq(cvBankEntry.id, Number(resourceId)))
          .limit(1);

        if (!entry) {
          return res.status(404).json({ error: 'CV entry not found' });
        }

        // Only owner can manage
        if (entry.consultantUserId !== userId) {
          return res.status(403).json({
            error: 'Forbidden',
            message: 'You can only manage your own CV bank entries',
          });
        }

        (req as any).resource = entry;
        return next();
      }

      return res.status(400).json({ error: 'Invalid resource type' });
    } catch (err) {
      console.error('[authorize] ERROR:', err);
      res.status(500).json({ error: 'Authorization check failed' });
    }
  };
}

/**
 * Middleware: Require admin role
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const isAdmin = (req.session?.user as { isAdmin?: boolean } | null)?.isAdmin ?? false;

  if (!isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  next();
}

/**
 * Middleware: Require specific role
 */
export function requireRole(role: 'employer' | 'consultant' | 'candidate' | 'admin') {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = (req.session?.user as { role?: string } | null)?.role;

    if (userRole !== role) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `This action requires ${role} role`,
      });
    }

    next();
  };
}
