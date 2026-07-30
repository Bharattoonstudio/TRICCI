// ═══════════════════════════════════════════════════════════════════
// PART A — ADD THIS TO: src/server/db/schema.ts
// Paste at the END of the file (after jobAlertSubscription)
// ═══════════════════════════════════════════════════════════════════

// ── Organizations (Multi-User Accounts) ──────────────────────────────────────
// An "organization" is the team unit for an employer or consultant.
// The user who signs up first becomes the Owner and an org is auto-created.

export const organization = pgTable('organization', {
  id: varchar('id', { length: 36 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  // 'employer' | 'consultant' — must match owner's user.role
  type: varchar('type', { length: 32 }).notNull(),
  ownerId: varchar('owner_id', { length: 36 })
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().$onUpdate(() => new Date()),
});

export const organizationMember = pgTable('organization_member', {
  id: serial('id').primaryKey(),
  organizationId: varchar('organization_id', { length: 36 })
    .notNull()
    .references(() => organization.id, { onDelete: 'cascade' }),
  userId: varchar('user_id', { length: 36 })
    .references(() => user.id, { onDelete: 'cascade' }), // null until invite accepted
  email: varchar('email', { length: 255 }).notNull(), // invited email (works before signup)
  // 'owner' | 'recruiter' | 'viewer'
  role: varchar('role', { length: 32 }).notNull().default('recruiter'),
  // 'pending' | 'active' | 'removed'
  status: varchar('status', { length: 16 }).notNull().default('pending'),
  inviteToken: varchar('invite_token', { length: 64 }),
  invitedAt: timestamp('invited_at').notNull().defaultNow(),
  joinedAt: timestamp('joined_at'),
}, (table) => ({
  orgUserIdx: index('org_member_org_user_idx').on(table.organizationId, table.userId),
  emailIdx: index('org_member_email_idx').on(table.email),
}));

// ═══════════════════════════════════════════════════════════════════
// PART B — EDIT 3 EXISTING TABLES in the SAME schema.ts file
// (these are small one-line additions to tables that already exist —
//  do NOT create new tables for these, just add one field each)
// ═══════════════════════════════════════════════════════════════════

// 1. Find `export const employerProfile = pgTable(...)` and add this
//    line anywhere inside its column list (e.g. right after `website`):
//
//    organizationId: varchar('organization_id', { length: 36 }),

// 2. Find `export const consultantProfile = pgTable(...)` and add this
//    line anywhere inside its column list (e.g. right after `yearsExperience`):
//
//    organizationId: varchar('organization_id', { length: 36 }),

// 3. Find `export const job = pgTable(...)` and add this line anywhere
//    inside its column list (e.g. right after `postedByUserId`):
//
//    organizationId: varchar('organization_id', { length: 36 }),

// NOTE: These are declared as plain varchar (no .references()) here to
// avoid a circular reference issue (organization table is declared
// further down in the file, after these three tables). The actual
// foreign key constraint IS still created — it's added directly in the
// SQL migration (file #2) via ALTER TABLE ... REFERENCES. This is
// purely about TypeScript declaration order, not database integrity.
