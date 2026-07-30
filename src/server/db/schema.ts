import {
  pgTable,
  varchar,
  text,
  boolean,
  timestamp,
  integer,
  serial,
  doublePrecision,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';

// ── BetterAuth core tables ────────────────────────────────────────────────────

export const user = pgTable('user', {
  id: varchar('id', { length: 36 }).primaryKey(),
  name: text('name').notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().$onUpdate(() => new Date()),
  // TRICCI role field — one of: employer | consultant | candidate | admin
  role: varchar('role', { length: 32 }).notNull().default('candidate'),
  // Prevent clients from writing isAdmin directly (enforced in auth.ts)
  isAdmin: boolean('is_admin').notNull().default(false),
});

export const session = pgTable('session', {
  id: varchar('id', { length: 36 }).primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: varchar('token', { length: 255 }).notNull().unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().$onUpdate(() => new Date()),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: varchar('user_id', { length: 36 })
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
});

export const account = pgTable('account', {
  id: varchar('id', { length: 36 }).primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: varchar('user_id', { length: 36 })
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().$onUpdate(() => new Date()),
});

export const verification = pgTable('verification', {
  id: varchar('id', { length: 36 }).primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()),
});

// ── TRICCI profile extension ──────────────────────────────────────────────────

export const employerProfile = pgTable('employer_profile', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 36 })
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: 'cascade' }),
  companyName: varchar('company_name', { length: 255 }),
  industry: varchar('industry', { length: 128 }),
  website: varchar('website', { length: 255 }),
  organizationId: varchar('organization_id', { length: 36 }),
  createdAt: timestamp('created_at').defaultNow(),
});

export const consultantProfile = pgTable('consultant_profile', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 36 })
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: 'cascade' }),
  specialisation: varchar('specialisation', { length: 255 }),
  yearsExperience: integer('years_experience'),
  createdAt: timestamp('created_at').defaultNow(),
  // Agreement / KYC fields
  agencyName: varchar('agency_name', { length: 255 }),
  signatoryName: varchar('signatory_name', { length: 255 }),
  designation: varchar('designation', { length: 255 }),
  agreementSignedAt: timestamp('agreement_signed_at'),
  agreementIp: varchar('agreement_ip', { length: 64 }),
  agreementHash: varchar('agreement_hash', { length: 128 }),
  reminderSentAt: timestamp('reminder_sent_at'),
  organizationId: varchar('organization_id', { length: 36 }),
});

export const candidateProfile = pgTable('candidate_profile', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 36 })
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: 'cascade' }),
  // Basic info
  currentTitle: varchar('current_title', { length: 255 }),
  location: varchar('location', { length: 255 }),
  phone: varchar('phone', { length: 20 }),
  mobileVerified: boolean('mobile_verified').notNull().default(false),
  summary: text('summary'),
  // CTC (stored as LPA × 100000 integer, e.g. 12 LPA = 1200000)
  currentCTC: integer('current_ctc'),
  expectedCTC: integer('expected_ctc'),
  noticePeriod: integer('notice_period'),
  totalExperience: integer('total_experience'), // years
  // Skills, experience, education stored as JSON arrays
  skills: jsonb('skills').$type<string[]>(),
  experience: jsonb('experience').$type<Array<{ id: number; title: string; company: string; duration: string; current: boolean }>>(),
  education: jsonb('education').$type<Array<{ id: number; degree: string; institution: string; year: string }>>(),
  // CV
  cvUrl: varchar('cv_url', { length: 512 }),
  cvFileName: varchar('cv_file_name', { length: 255 }),
  cvUploadedAt: timestamp('cv_uploaded_at'),
  // Visibility
  visibility: varchar('visibility', { length: 16 }).notNull().default('consultants'),
  // Profile completeness (0-100)
  profileComplete: integer('profile_complete').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()),
});

// ── OTP store for mobile 2FA ──────────────────────────────────────────────────
export const otpStore = pgTable('otp_store', {
  id: serial('id').primaryKey(),
  identifier: varchar('identifier', { length: 255 }).notNull(), // phone or email
  otp: varchar('otp', { length: 8 }).notNull(),
  purpose: varchar('purpose', { length: 32 }).notNull().default('verify'), // 'verify' | '2fa'
  expiresAt: timestamp('expires_at').notNull(),
  verified: boolean('verified').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

// ── Job postings ──────────────────────────────────────────────────────────────

export const job = pgTable('job', {
  id: varchar('id', { length: 128 }).primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  company: varchar('company', { length: 255 }).notNull(),
  postedByUserId: varchar('posted_by_user_id', { length: 36 }).references(() => user.id, { onDelete: 'set null' }),
  department: varchar('department', { length: 128 }).notNull(),
  location: varchar('location', { length: 128 }).notNull(),
  locationType: varchar('location_type', { length: 16 }).notNull().default('onsite'),
  ctcMin: integer('ctc_min').notNull(),
  ctcMax: integer('ctc_max').notNull(),
  ctcLabel: varchar('ctc_label', { length: 64 }).notNull(),
  experience: varchar('experience', { length: 64 }).notNull(),
  experienceYears: integer('experience_years').notNull().default(0),
  category: varchar('category', { length: 64 }).notNull(),
  skills: jsonb('skills').notNull().$type<string[]>(),
  description: text('description').notNull(),
  responsibilities: jsonb('responsibilities').notNull().$type<string[]>(),
  requirements: jsonb('requirements').notNull().$type<string[]>(),
  postedDays: integer('posted_days').notNull().default(0),
  status: varchar('status', { length: 16 }).notNull().default('active'),
  // Priority / urgency: 1 = Normal, 2 = Urgent, 3 = Very Urgent (burning)
  priority: integer('priority').notNull().default(1),
  applicants: integer('applicants').notNull().default(0),
  feePercent: doublePrecision('fee_percent').notNull().default(8.5),
  interviewRounds: jsonb('interview_rounds').$type<{ label: string; description: string }[]>(),
  // Job visibility: 'public' (default, shown to everyone) | 'consultant_only'
  // (hidden from the public candidate job board, visible to consultants/admin)
  // | 'confidential' (same as consultant_only, PLUS company name is masked
  // even for consultants unless they are the job owner or an admin).
  visibility: varchar('visibility', { length: 24 }).notNull().default('public'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()),
});

// ── Consultant submissions ────────────────────────────────────────────────────
// A consultant submits a candidate (by candidateUserId) for a job posting.

export const submission = pgTable('submission', {
  id: serial('id').primaryKey(),
  jobId: varchar('job_id', { length: 128 }).notNull().references(() => job.id, { onDelete: 'cascade' }),
  consultantUserId: varchar('consultant_user_id', { length: 36 }).notNull().references(() => user.id, { onDelete: 'cascade' }),
  candidateUserId: varchar('candidate_user_id', { length: 36 }).references(() => user.id, { onDelete: 'set null' }),
  // Candidate details at time of submission (in case no registered account)
  candidateName: varchar('candidate_name', { length: 255 }).notNull(),
  candidateEmail: varchar('candidate_email', { length: 255 }).notNull(),
  candidatePhone: varchar('candidate_phone', { length: 32 }),
  cvUrl: varchar('cv_url', { length: 512 }),
  coverNote: text('cover_note'),
  // Status: pending | shortlisted | rejected | placed
  status: varchar('status', { length: 32 }).notNull().default('pending'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()),
});

// ── Candidate direct applications ────────────────────────────────────────────
// A candidate self-applies to a job from the job detail page.
// Distinct from consultant submissions (submission table).

export const candidateApplication = pgTable('candidate_application', {
  id: serial('id').primaryKey(),
  jobId: varchar('job_id', { length: 128 }).notNull().references(() => job.id, { onDelete: 'cascade' }),
  candidateUserId: varchar('candidate_user_id', { length: 36 }).notNull().references(() => user.id, { onDelete: 'cascade' }),
  // Status: applied | shortlisted | rejected | placed
  status: varchar('status', { length: 32 }).notNull().default('applied'),
  coverNote: text('cover_note'),
  // Optional per-application CV: set when the candidate approves an
  // AI-enhanced, JD-tailored CV for this specific job. When null, the
  // employer/consultant views fall back to the candidate's profile CV.
  cvUrl: varchar('cv_url', { length: 512 }),
  cvFileName: varchar('cv_file_name', { length: 255 }),
  cvMatchScore: integer('cv_match_score'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()),
}, (t) => [index('idx_candidate_app_job').on(t.jobId), index('idx_candidate_app_user').on(t.candidateUserId)]);

// ── Communication log ──────────────────────────────────────────────────────
// A shared timeline of notes/calls/WhatsApp/email/meeting entries attached
// to a job, a consultant submission, or a candidate application — so every
// interaction lives with the record instead of scattered across inboxes.
export const communicationLog = pgTable('communication_log', {
  id: serial('id').primaryKey(),
  // 'job' | 'submission' | 'application'
  entityType: varchar('entity_type', { length: 24 }).notNull(),
  // job.id (varchar) OR submission/candidateApplication numeric id, stored as text
  entityId: varchar('entity_id', { length: 64 }).notNull(),
  // 'whatsapp' | 'email' | 'call' | 'meeting' | 'note'
  type: varchar('type', { length: 16 }).notNull().default('note'),
  message: text('message').notNull(),
  createdByUserId: varchar('created_by_user_id', { length: 36 }).references(() => user.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => [index('idx_comm_log_entity').on(t.entityType, t.entityId)]);

// ── Audit trail ─────────────────────────────────────────────────────────────
// Append-only log of important mutations (job created, visibility changed,
// application/submission status changed, etc.) for dispute resolution and
// enterprise compliance needs.
export const auditLog = pgTable('audit_log', {
  id: serial('id').primaryKey(),
  entityType: varchar('entity_type', { length: 32 }).notNull(),
  entityId: varchar('entity_id', { length: 64 }).notNull(),
  action: varchar('action', { length: 64 }).notNull(),
  actorUserId: varchar('actor_user_id', { length: 36 }).references(() => user.id, { onDelete: 'set null' }),
  actorRole: varchar('actor_role', { length: 16 }),
  // Free-form JSON details: { from, to, note, ... } depending on the action
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => [index('idx_audit_log_entity').on(t.entityType, t.entityId), index('idx_audit_log_created').on(t.createdAt)]);

// ── Platform commission configuration ────────────────────────────────────────
// Single-row config table (id = 1 always). Admin sets platformFeePct (what
// TRICCI keeps) and the consultant automatically gets the remainder.
// e.g. employer pays 8% → admin sets platformFeePct = 2 → consultant gets 6%.

export const commissionConfig = pgTable('commission_config', {
  id: serial('id').primaryKey(),
  // Employer-facing: allowed fee range on job postings
  minFeePercent: doublePrecision('min_fee_percent').notNull().default(5),
  maxFeePercent: doublePrecision('max_fee_percent').notNull().default(15),
  // Default fee % charged to employer when posting a job
  defaultFeePercent: doublePrecision('default_fee_percent').notNull().default(8),
  // Platform margin — what TRICCI retains from the employer fee
  platformFeePct: doublePrecision('platform_fee_pct').notNull().default(2),
  // Consultant payout SLA (business days)
  payoutDays: integer('payout_days').notNull().default(3),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()),
});

// ── Candidate assessments ─────────────────────────────────────────────────────
// Employer sends an assessment task to a candidate in the ATS pipeline.
// Linked to a submission (consultant-submitted candidate) or a candidateApplication.

export const assessment = pgTable('assessment', {
  id: serial('id').primaryKey(),
  // Link to the submission this assessment belongs to
  submissionId: integer('submission_id').references(() => submission.id, { onDelete: 'cascade' }),
  // Denormalised for quick display (avoids joins on every list fetch)
  candidateName: varchar('candidate_name', { length: 255 }).notNull(),
  candidateEmail: varchar('candidate_email', { length: 255 }).notNull(),
  jobTitle: varchar('job_title', { length: 255 }).notNull(),
  jobId: varchar('job_id', { length: 128 }).references(() => job.id, { onDelete: 'set null' }),
  // Who posted this job (used for employer-scoped queries)
  postedByUserId: varchar('posted_by_user_id', { length: 36 }).references(() => user.id, { onDelete: 'set null' }),
  // Assessment details
  type: varchar('type', { length: 128 }).notNull().default('Technical'),
  score: integer('score').notNull().default(0),
  maxScore: integer('max_score').notNull().default(100),
  status: varchar('status', { length: 16 }).notNull().default('pending'), // pending | completed | expired
  completedAt: timestamp('completed_at'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()),
});

// ── Interview scorecards ──────────────────────────────────────────────────────
// Panel scorecard submitted by an interviewer after an interview round.

export const scorecard = pgTable('scorecard', {
  id: serial('id').primaryKey(),
  submissionId: integer('submission_id').references(() => submission.id, { onDelete: 'cascade' }),
  candidateName: varchar('candidate_name', { length: 255 }).notNull(),
  candidateEmail: varchar('candidate_email', { length: 255 }).notNull(),
  jobTitle: varchar('job_title', { length: 255 }).notNull(),
  jobId: varchar('job_id', { length: 128 }).references(() => job.id, { onDelete: 'set null' }),
  postedByUserId: varchar('posted_by_user_id', { length: 36 }).references(() => user.id, { onDelete: 'set null' }),
  // Scores (0–100)
  technicalScore: integer('technical_score').notNull().default(0),
  communicationScore: integer('communication_score').notNull().default(0),
  cultureFitScore: integer('culture_fit_score').notNull().default(0),
  leadershipScore: integer('leadership_score').notNull().default(0),
  overallScore: integer('overall_score').notNull().default(0),
  recommendation: varchar('recommendation', { length: 16 }).notNull().default('maybe'), // strong_yes | yes | maybe | no
  notes: text('notes'),
  submittedBy: varchar('submitted_by', { length: 255 }), // interviewer name
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()),
});

// ── Placements ────────────────────────────────────────────────────────────────
// Auto-created when a submission reaches `payment_done` status.
// Captures a point-in-time snapshot of the placement for reporting.

export const placement = pgTable('placement', {
  id: serial('id').primaryKey(),
  // Source submission
  submissionId: integer('submission_id').notNull().references(() => submission.id, { onDelete: 'cascade' }),
  // Denormalised for fast reporting (no joins needed for the admin table)
  jobId: varchar('job_id', { length: 128 }).references(() => job.id, { onDelete: 'set null' }),
  jobTitle: varchar('job_title', { length: 255 }).notNull(),
  companyName: varchar('company_name', { length: 255 }).notNull(),
  candidateName: varchar('candidate_name', { length: 255 }).notNull(),
  candidateEmail: varchar('candidate_email', { length: 255 }).notNull(),
  consultantUserId: varchar('consultant_user_id', { length: 36 }).references(() => user.id, { onDelete: 'set null' }),
  consultantName: varchar('consultant_name', { length: 255 }),
  employerUserId: varchar('employer_user_id', { length: 36 }).references(() => user.id, { onDelete: 'set null' }),
  // Fee details (snapshot at time of placement)
  ctcLpa: doublePrecision('ctc_lpa'),           // candidate CTC in LPA
  feePercent: doublePrecision('fee_percent'),   // % charged to employer
  feeAmountLpa: doublePrecision('fee_amount_lpa'), // feePercent × ctcLpa
  // Payment status: pending | paid
  paymentStatus: varchar('payment_status', { length: 16 }).notNull().default('pending'),
  placedAt: timestamp('placed_at').notNull().defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
});

// ── Employer wallet (Razorpay credit top-ups) ─────────────────────────────────

export const walletTransaction = pgTable('wallet_transaction', {
  id: serial('id').primaryKey(),
  employerUserId: varchar('employer_user_id', { length: 36 }).notNull(),
  razorpayOrderId: varchar('razorpay_order_id', { length: 128 }).notNull().unique(),
  razorpayPaymentId: varchar('razorpay_payment_id', { length: 128 }),
  amountPaise: integer('amount_paise').notNull(),
  currency: varchar('currency', { length: 8 }).notNull().default('INR'),
  status: varchar('status', { length: 32 }).notNull().default('created'),
  receipt: varchar('receipt', { length: 128 }),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()),
}, (t) => [index('idx_wallet_employer').on(t.employerUserId), index('idx_wallet_order').on(t.razorpayOrderId)]);

// ── Job alert subscriptions ───────────────────────────────────────────────────
// Stores candidate email alert preferences. Not tied to auth — anyone can
// subscribe with an email address. Candidates who are logged in can also
// manage subscriptions from their profile dashboard.

export const jobAlertSubscription = pgTable(
  'job_alert_subscription',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    // Subscriber email — the address that receives match digests
    email: varchar('email', { length: 255 }).notNull(),
    // Optional: link to a logged-in candidate's user record
    userId: varchar('user_id', { length: 36 }).references(() => user.id, { onDelete: 'set null' }),
    // Preference filters — null means "any"
    categories: jsonb('categories').$type<string[]>(),   // e.g. ['technology','product']
    locations: jsonb('locations').$type<string[]>(),     // e.g. ['Bengaluru','Mumbai']
    locationTypes: jsonb('location_types').$type<string[]>(), // e.g. ['remote','hybrid']
    minCtc: integer('min_ctc'),                             // minimum CTC in LPA
    minExperienceYears: integer('min_experience_years'),
    // Unsubscribe token — random UUID used in one-click unsubscribe links
    unsubscribeToken: varchar('unsubscribe_token', { length: 64 }).notNull(),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()),
  },
  (t) => [index('idx_job_alert_email').on(t.email), index('idx_job_alert_token').on(t.unsubscribeToken)],
);

// ── Organizations (Multi-User Accounts) ──────────────────────────────────────

export const organization = pgTable('organization', {
  id: varchar('id', { length: 36 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
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
    .references(() => user.id, { onDelete: 'cascade' }),
  email: varchar('email', { length: 255 }).notNull(),
  role: varchar('role', { length: 32 }).notNull().default('recruiter'),
  status: varchar('status', { length: 16 }).notNull().default('pending'),
  inviteToken: varchar('invite_token', { length: 64 }),
  invitedAt: timestamp('invited_at').notNull().defaultNow(),
  joinedAt: timestamp('joined_at'),
}, (table) => ({
  orgUserIdx: index('org_member_org_user_idx').on(table.organizationId, table.userId),
  emailIdx: index('org_member_email_idx').on(table.email),
}));

// ── Notifications (in-app bell) ───────────────────────────────────────────────

export const notification = pgTable('notification', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 36 })
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 32 }).notNull(),
  message: text('message').notNull(),
  link: varchar('link', { length: 255 }),
  read: boolean('read').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  userReadIdx: index('notification_user_read_idx').on(table.userId, table.read),
}));
