import {
  mysqlTable,
  varchar,
  text,
  boolean,
  timestamp,
  int,
  float,
  json,
  index,
} from 'drizzle-orm/mysql-core';

// ── BetterAuth core tables ────────────────────────────────────────────────────

export const user = mysqlTable('user', {
  id: varchar('id', { length: 36 }).primaryKey(),
  name: text('name').notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
  // TRICCI role field — one of: employer | consultant | candidate | admin
  role: varchar('role', { length: 32 }).notNull().default('candidate'),
  // Prevent clients from writing isAdmin directly (enforced in auth.ts)
  isAdmin: boolean('is_admin').notNull().default(false),
});

export const session = mysqlTable('session', {
  id: varchar('id', { length: 36 }).primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: varchar('token', { length: 255 }).notNull().unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: varchar('user_id', { length: 36 })
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
});

export const account = mysqlTable('account', {
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
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
});

export const verification = mysqlTable('verification', {
  id: varchar('id', { length: 36 }).primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

// ── TRICCI profile extension ──────────────────────────────────────────────────

export const employerProfile = mysqlTable('employer_profile', {
  id: int('id').primaryKey().autoincrement(),
  userId: varchar('user_id', { length: 36 })
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: 'cascade' }),
  companyName: varchar('company_name', { length: 255 }),
  industry: varchar('industry', { length: 128 }),
  website: varchar('website', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow(),
});

export const consultantProfile = mysqlTable('consultant_profile', {
  id: int('id').primaryKey().autoincrement(),
  userId: varchar('user_id', { length: 36 })
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: 'cascade' }),
  specialisation: varchar('specialisation', { length: 255 }),
  yearsExperience: int('years_experience'),
  createdAt: timestamp('created_at').defaultNow(),
  // Agreement / KYC fields
  agencyName: varchar('agency_name', { length: 255 }),
  signatoryName: varchar('signatory_name', { length: 255 }),
  designation: varchar('designation', { length: 255 }),
  agreementSignedAt: timestamp('agreement_signed_at'),
  agreementIp: varchar('agreement_ip', { length: 64 }),
  agreementHash: varchar('agreement_hash', { length: 128 }),
  reminderSentAt: timestamp('reminder_sent_at'),
});

export const candidateProfile = mysqlTable('candidate_profile', {
  id: int('id').primaryKey().autoincrement(),
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
  currentCTC: int('current_ctc'),
  expectedCTC: int('expected_ctc'),
  noticePeriod: int('notice_period'),
  totalExperience: int('total_experience'), // years
  // Skills, experience, education stored as JSON arrays
  skills: json('skills').$type<string[]>(),
  experience: json('experience').$type<Array<{ id: number; title: string; company: string; duration: string; current: boolean }>>(),
  education: json('education').$type<Array<{ id: number; degree: string; institution: string; year: string }>>(),
  // CV
  cvUrl: varchar('cv_url', { length: 512 }),
  cvFileName: varchar('cv_file_name', { length: 255 }),
  cvUploadedAt: timestamp('cv_uploaded_at'),
  // Visibility
  visibility: varchar('visibility', { length: 16 }).notNull().default('consultants'),
  // Profile completeness (0-100)
  profileComplete: int('profile_complete').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

// ── OTP store for mobile 2FA ──────────────────────────────────────────────────
export const otpStore = mysqlTable('otp_store', {
  id: int('id').primaryKey().autoincrement(),
  identifier: varchar('identifier', { length: 255 }).notNull(), // phone or email
  otp: varchar('otp', { length: 8 }).notNull(),
  purpose: varchar('purpose', { length: 32 }).notNull().default('verify'), // 'verify' | '2fa'
  expiresAt: timestamp('expires_at').notNull(),
  verified: boolean('verified').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

// ── Job postings ──────────────────────────────────────────────────────────────

export const job = mysqlTable('job', {
  id: varchar('id', { length: 128 }).primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  company: varchar('company', { length: 255 }).notNull(),
  postedByUserId: varchar('posted_by_user_id', { length: 36 }).references(() => user.id, { onDelete: 'set null' }),
  department: varchar('department', { length: 128 }).notNull(),
  location: varchar('location', { length: 128 }).notNull(),
  locationType: varchar('location_type', { length: 16 }).notNull().default('onsite'),
  ctcMin: int('ctc_min').notNull(),
  ctcMax: int('ctc_max').notNull(),
  ctcLabel: varchar('ctc_label', { length: 64 }).notNull(),
  experience: varchar('experience', { length: 64 }).notNull(),
  experienceYears: int('experience_years').notNull().default(0),
  category: varchar('category', { length: 64 }).notNull(),
  skills: json('skills').notNull().$type<string[]>(),
  description: text('description').notNull(),
  responsibilities: json('responsibilities').notNull().$type<string[]>(),
  requirements: json('requirements').notNull().$type<string[]>(),
  postedDays: int('posted_days').notNull().default(0),
  status: varchar('status', { length: 16 }).notNull().default('active'),
  applicants: int('applicants').notNull().default(0),
  feePercent: float('fee_percent').notNull().default(8.5),
  interviewRounds: json('interview_rounds').$type<{ label: string; description: string }[]>(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

// ── Consultant submissions ────────────────────────────────────────────────────
// A consultant submits a candidate (by candidateUserId) for a job posting.

export const submission = mysqlTable('submission', {
  id: int('id').primaryKey().autoincrement(),
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
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

// ── Candidate direct applications ────────────────────────────────────────────
// A candidate self-applies to a job from the job detail page.
// Distinct from consultant submissions (submission table).

export const candidateApplication = mysqlTable('candidate_application', {
  id: int('id').primaryKey().autoincrement(),
  jobId: varchar('job_id', { length: 128 }).notNull().references(() => job.id, { onDelete: 'cascade' }),
  candidateUserId: varchar('candidate_user_id', { length: 36 }).notNull().references(() => user.id, { onDelete: 'cascade' }),
  // Status: applied | shortlisted | rejected | placed
  status: varchar('status', { length: 32 }).notNull().default('applied'),
  coverNote: text('cover_note'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
}, (t) => [index('idx_candidate_app_job').on(t.jobId), index('idx_candidate_app_user').on(t.candidateUserId)]);

// ── Platform commission configuration ────────────────────────────────────────
// Single-row config table (id = 1 always). Admin sets platformFeePct (what
// TRICCI keeps) and the consultant automatically gets the remainder.
// e.g. employer pays 8% → admin sets platformFeePct = 2 → consultant gets 6%.

export const commissionConfig = mysqlTable('commission_config', {
  id: int('id').primaryKey().autoincrement(),
  // Employer-facing: allowed fee range on job postings
  minFeePercent: float('min_fee_percent').notNull().default(5),
  maxFeePercent: float('max_fee_percent').notNull().default(15),
  // Default fee % charged to employer when posting a job
  defaultFeePercent: float('default_fee_percent').notNull().default(8),
  // Platform margin — what TRICCI retains from the employer fee
  platformFeePct: float('platform_fee_pct').notNull().default(2),
  // Consultant payout SLA (business days)
  payoutDays: int('payout_days').notNull().default(3),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

// ── Candidate assessments ─────────────────────────────────────────────────────
// Employer sends an assessment task to a candidate in the ATS pipeline.
// Linked to a submission (consultant-submitted candidate) or a candidateApplication.

export const assessment = mysqlTable('assessment', {
  id: int('id').primaryKey().autoincrement(),
  // Link to the submission this assessment belongs to
  submissionId: int('submission_id').references(() => submission.id, { onDelete: 'cascade' }),
  // Denormalised for quick display (avoids joins on every list fetch)
  candidateName: varchar('candidate_name', { length: 255 }).notNull(),
  candidateEmail: varchar('candidate_email', { length: 255 }).notNull(),
  jobTitle: varchar('job_title', { length: 255 }).notNull(),
  jobId: varchar('job_id', { length: 128 }).references(() => job.id, { onDelete: 'set null' }),
  // Who posted this job (used for employer-scoped queries)
  postedByUserId: varchar('posted_by_user_id', { length: 36 }).references(() => user.id, { onDelete: 'set null' }),
  // Assessment details
  type: varchar('type', { length: 128 }).notNull().default('Technical'),
  score: int('score').notNull().default(0),
  maxScore: int('max_score').notNull().default(100),
  status: varchar('status', { length: 16 }).notNull().default('pending'), // pending | completed | expired
  completedAt: timestamp('completed_at'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

// ── Interview scorecards ──────────────────────────────────────────────────────
// Panel scorecard submitted by an interviewer after an interview round.

export const scorecard = mysqlTable('scorecard', {
  id: int('id').primaryKey().autoincrement(),
  submissionId: int('submission_id').references(() => submission.id, { onDelete: 'cascade' }),
  candidateName: varchar('candidate_name', { length: 255 }).notNull(),
  candidateEmail: varchar('candidate_email', { length: 255 }).notNull(),
  jobTitle: varchar('job_title', { length: 255 }).notNull(),
  jobId: varchar('job_id', { length: 128 }).references(() => job.id, { onDelete: 'set null' }),
  postedByUserId: varchar('posted_by_user_id', { length: 36 }).references(() => user.id, { onDelete: 'set null' }),
  // Scores (0–100)
  technicalScore: int('technical_score').notNull().default(0),
  communicationScore: int('communication_score').notNull().default(0),
  cultureFitScore: int('culture_fit_score').notNull().default(0),
  leadershipScore: int('leadership_score').notNull().default(0),
  overallScore: int('overall_score').notNull().default(0),
  recommendation: varchar('recommendation', { length: 16 }).notNull().default('maybe'), // strong_yes | yes | maybe | no
  notes: text('notes'),
  submittedBy: varchar('submitted_by', { length: 255 }), // interviewer name
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

// ── Placements ────────────────────────────────────────────────────────────────
// Auto-created when a submission reaches `payment_done` status.
// Captures a point-in-time snapshot of the placement for reporting.

export const placement = mysqlTable('placement', {
  id: int('id').primaryKey().autoincrement(),
  // Source submission
  submissionId: int('submission_id').notNull().references(() => submission.id, { onDelete: 'cascade' }),
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
  ctcLpa: float('ctc_lpa'),           // candidate CTC in LPA
  feePercent: float('fee_percent'),   // % charged to employer
  feeAmountLpa: float('fee_amount_lpa'), // feePercent × ctcLpa
  // Payment status: pending | paid
  paymentStatus: varchar('payment_status', { length: 16 }).notNull().default('pending'),
  placedAt: timestamp('placed_at').notNull().defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
});

// ── Job alert subscriptions ───────────────────────────────────────────────────
// Stores candidate email alert preferences. Not tied to auth — anyone can
// subscribe with an email address. Candidates who are logged in can also
// manage subscriptions from their profile dashboard.

export const jobAlertSubscription = mysqlTable(
  'job_alert_subscription',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    // Subscriber email — the address that receives match digests
    email: varchar('email', { length: 255 }).notNull(),
    // Optional: link to a logged-in candidate's user record
    userId: varchar('user_id', { length: 36 }).references(() => user.id, { onDelete: 'set null' }),
    // Preference filters — null means "any"
    categories: json('categories').$type<string[]>(),   // e.g. ['technology','product']
    locations: json('locations').$type<string[]>(),     // e.g. ['Bengaluru','Mumbai']
    locationTypes: json('location_types').$type<string[]>(), // e.g. ['remote','hybrid']
    minCtc: int('min_ctc'),                             // minimum CTC in LPA
    minExperienceYears: int('min_experience_years'),
    // Unsubscribe token — random UUID used in one-click unsubscribe links
    unsubscribeToken: varchar('unsubscribe_token', { length: 64 }).notNull(),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
  },
  (t) => [index('idx_job_alert_email').on(t.email), index('idx_job_alert_token').on(t.unsubscribeToken)],
);
