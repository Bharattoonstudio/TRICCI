// ─── Shared Types for Employer Dashboard ─────────────────────────────────────

export type JobStatus = 'active' | 'closed' | 'paused' | 'draft';
export type ApplicantStatus = 'new' | 'review' | 'shortlisted' | 'interview' | 'selected' | 'offered' | 'rejected';
export type OfferStatus = 'draft' | 'pending_approval' | 'approved' | 'sent' | 'accepted' | 'declined' | 'verification';
export type InterviewStatus = 'scheduled' | 'completed' | 'cancelled' | 'pending';

// Full ATS pipeline status — used for consultant submissions
// payment_processed + payment_done are only shown to employer & consultant (not candidate)
export type SubmissionStatus =
  | 'pending'
  | 'review'
  | 'shortlisted'
  | 'interview'
  | 'selected'
  | 'offered'
  | 'rejected'
  | 'payment_processed'
  | 'payment_done';

export interface SubmissionRecord {
  id: number;
  candidateName: string;
  candidateEmail: string;
  candidatePhone?: string | null;
  jobTitle: string;
  jobId: string;
  consultantName?: string;
  consultantEmail?: string;
  cvUrl?: string | null;
  status: SubmissionStatus;
  createdAt: string;
}

export interface DashboardJob {
  id: string | number;
  jobCode?: string;
  title: string;
  department: string;
  location: string;
  locationType?: string;
  ctc: string;
  ctcMin?: number;
  ctcMax?: number;
  fee: number;
  status: string;
  applicants: number;
  shortlisted: number;
  postedDays: number;
  consultants: number;
  description?: string;
  skills?: string[];
  interviewRounds?: { label: string; description: string }[];
  createdAt?: string;
}

export interface Candidate {
  id: number;
  name: string;
  role: string;
  exp: string;
  ctc: string;
  consultant: string;
  status: ApplicantStatus;
  score: number;
  jobTitle?: string;
  jobId?: string | number;
  email?: string;
  phone?: string;
  location?: string;
  appliedDate?: string;
  cvUrl?: string;
  interviewRound?: number;
  offerAmount?: string;
}

export interface InterviewSchedule {
  id: number;
  candidateId: number;
  candidateName: string;
  jobTitle: string;
  round: string;
  date: string;
  time: string;
  mode: 'video' | 'in-person' | 'phone';
  panelMembers: string[];
  status: InterviewStatus;
  feedback?: string;
  rating?: number;
}

export interface Assessment {
  id: number;
  candidateId: number;
  candidateName: string;
  jobTitle: string;
  type: string;
  score: number;
  maxScore: number;
  completedAt?: string;
  status: 'pending' | 'completed' | 'expired';
}

export interface Scorecard {
  candidateId: number;
  candidateName: string;
  jobTitle: string;
  technicalScore: number;
  communicationScore: number;
  cultureFitScore: number;
  leadershipScore: number;
  overallScore: number;
  recommendation: 'strong_yes' | 'yes' | 'maybe' | 'no';
  notes: string;
}

export interface Offer {
  id: number;
  candidateId: number;
  candidateName: string;
  jobTitle: string;
  jobCode?: string;
  ctcOffered: string;
  joiningDate: string;
  status: OfferStatus;
  createdAt: string;
  approvedBy?: string;
  verificationStatus?: 'pending' | 'verified' | 'failed';
}
