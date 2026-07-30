import { eq } from 'drizzle-orm';
import { jobTable } from '@/server/db/schema';
import { auth } from '@/server/auth';

export async function GET(req: Request) {
  try {
    // 1. Require authentication
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Check if user is an employer
    if (session.user.role !== 'employer') {
      return Response.json({ error: 'Forbidden: Only employers can access this' }, { status: 403 });
    }

    const employerId = session.user.id;

    // 3. Fetch only jobs posted by this employer
    const jobs = await db
      .select()
      .from(jobTable)
      .where(eq(jobTable.postedByUserId, employerId));

    // 4. Return jobs with total count
    return Response.json({
      jobs,
      total: jobs.length,
      message: 'Successfully fetched employer jobs'
    });

  } catch (error) {
    console.error('Error fetching employer jobs:', error);
    return Response.json(
      { error: 'Failed to fetch jobs' },
      { status: 500 }
    );
  }
}
