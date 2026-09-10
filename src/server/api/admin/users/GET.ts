import { Request, Response } from 'express';
import { db } from '@/server/db/client';
import { user } from '@/server/db/schema';
import { eq, like, and, or } from 'drizzle-orm';

export default async function GET(req: Request, res: Response) {
  try {
    // Check admin authorization
    const adminId = req.user?.id;
    const adminUser = await db.query.user.findFirst({
      where: eq(user.id, adminId!),
    });

    if (adminUser?.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized: Admin access required' });
    }

    const {
      page = 1,
      limit = 50,
      search = '',
      role = 'all',
      status = 'all',
      sortBy = 'joinedDate',
      sortOrder = 'desc',
    } = req.query;

    const pageNum = parseInt(page as string) || 1;
    const limitNum = Math.min(parseInt(limit as string) || 50, 100);
    const offset = (pageNum - 1) * limitNum;

    // Build filters
    const filters: any[] = [];

    if (search) {
      filters.push(
        or(
          like(users.email, `%${search}%`),
          like(users.name, `%${search}%`)
        )
      );
    }

    if (role !== 'all') {
      filters.push(eq(user.role, role as any));
    }

    if (status !== 'all') {
      filters.push(eq(user.status, status as any));
    }

    // Fetch users with filters
    let query = db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        status: users.status,
        joinedDate: users.createdAt,
        lastLogin: users.lastLoginAt,
        activityScore: users.activityScore,
      })
      .from(user)
      .limit(limitNum)
      .offset(offset);

    if (filters.length > 0) {
      query = query.where(and(...filters));
    }

    // Add sorting
    const sortColumn = users[sortBy as keyof typeof users] || users.createdAt;
    query = query.orderBy(sortOrder === 'asc' ? sortColumn : sortColumn);

    const usersData = await query;

    // Get total count
    let countQuery = db.select({ count: 'count' }).from(user)
    if (filters.length > 0) {
      countQuery = countQuery.where(and(...filters));
    }
    const countResult = await countQuery;
    const total = countResult[0]?.count || 0;

    res.json({
      success: true,
      data: usersData,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
}
