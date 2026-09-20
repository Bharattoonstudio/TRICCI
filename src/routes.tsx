import { RouteObject } from 'react-router-dom';
import { lazy } from 'react';
import ProdNotFoundPage from './pages/_404';
import { ProtectedRoute } from './lib/auth/auth-client';

const NotFoundPage = ProdNotFoundPage;

const MarketingHomePage = lazy(() => import('./pages/index'));
const CompanyPage = lazy(() => import('./pages/company'));
const ConsultantInfoPage = lazy(() => import('./pages/consultant'));
const CandidateInfoPage = lazy(() => import('./pages/candidate'));
const EmployerDashboard = lazy(() => import('./pages/employer/dashboard'));
const EmployerJobDetailPage = lazy(() => import('./pages/employer/jobs/[id]'));
const ConsultantDashboard = lazy(() => import('./pages/consultant/dashboard'));
const ConsultantJobDetailPage = lazy(() => import('./pages/consultant/jobs/[id]'));
const CandidateProfile = lazy(() => import('./pages/candidate/profile'));
const CandidateInterviews = lazy(() => import('./pages/candidate/interviews'));
const CandidateOffers = lazy(() => import('./pages/candidate/offers'));
const CandidateDocuments = lazy(() => import('./pages/candidate/documents'));
const BillingPage = lazy(() => import('./pages/billing/index'));
const AdminDashboard = lazy(() => import('./pages/admin/dashboard'));
const AdminQuickAccessPage = lazy(() => import('./pages/admin/quick-access'));
const AdminAuditLogPage = lazy(() => import('./pages/admin/audit-log'));
const AdminLoginPage = lazy(() => import('./pages/admin/login'));
const AdminSetupPage = lazy(() => import('./pages/admin/setup'));
const LoginFreshPage = lazy(() => import('./pages/auth/login-fresh'));
const SignupFreshPage = lazy(() => import('./pages/auth/signup-fresh'));
const ResetPasswordFreshPage = lazy(() => import('./pages/auth/reset-password-fresh'));
const JobsPage = lazy(() => import('./pages/jobs/index'));
const JobDetailPage = lazy(() => import('./pages/jobs/[id]'));
const AboutPage = lazy(() => import('./pages/about'));
const FounderPage = lazy(() => import('./pages/founder'));
const BlogPage = lazy(() => import('./pages/Blog'));
const BlogPostPage = lazy(() => import('./pages/BlogPostPage'));
const UnsubscribePage = lazy(() => import('./pages/unsubscribe'));
const RefreshPage = lazy(() => import('./pages/refresh/index'));
const FreeJobsPage = lazy(() => import('./pages/free-jobs'));
const TeamPage = lazy(() => import('./pages/employer/team'));
const AcceptInvitePage = lazy(() => import('./pages/accept-invite'));

export const routes: RouteObject[] = [
  // Marketing homepage
  { path: '/', element: <MarketingHomePage /> },

  // Public role info pages
  { path: '/company', element: <CompanyPage /> },
  { path: '/companies', element: <CompanyPage /> }, // Alias for plural form
  { path: '/consultant', element: <ConsultantInfoPage /> },
  { path: '/candidate', element: <CandidateInfoPage /> },

  // Auth routes (public) - Password-based
  { path: '/login', element: <LoginFreshPage /> },
  { path: '/signup', element: <SignupFreshPage /> },
  { path: '/auth/reset-password', element: <ResetPasswordFreshPage /> },

  // Protected: Job listings — all logged-in roles can browse
  {
    path: '/jobs',
    element: (
      <ProtectedRoute>
        <JobsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/jobs/:id',
    element: (
      <ProtectedRoute>
        <JobDetailPage />
      </ProtectedRoute>
    ),
  },

  // Public: About
  { path: '/about', element: <AboutPage /> },

  // Public: Founder message
  { path: '/founder', element: <FounderPage /> },

  // Public: Blog
  { path: '/blog', element: <BlogPage /> },
  { path: '/blog/:slug', element: <BlogPostPage /> },

  // Public: Unsubscribe (job alerts)
  { path: '/unsubscribe', element: <UnsubscribePage /> },

  // Public: Accept team invite (teammate isn't logged in yet)
  { path: '/accept-invite', element: <AcceptInvitePage /> },

  // Public: Let's Refresh — games page
  { path: '/refresh', element: <RefreshPage /> },

  // Protected: Employer
  {
    path: '/employer/dashboard',
    element: (
      <ProtectedRoute allowedRoles={['employer', 'admin']}>
        <EmployerDashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: '/employer/jobs/:id',
    element: (
      <ProtectedRoute allowedRoles={['employer', 'admin']}>
        <EmployerJobDetailPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/employer/team',
    element: (
      <ProtectedRoute allowedRoles={['employer', 'admin']}>
        <TeamPage />
      </ProtectedRoute>
    ),
  },

  // Protected: Consultant
  {
    path: '/consultant/dashboard',
    element: (
      <ProtectedRoute allowedRoles={['consultant', 'admin']}>
        <ConsultantDashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: '/consultant/jobs/:id',
    element: (
      <ProtectedRoute allowedRoles={['consultant', 'admin']}>
        <ConsultantJobDetailPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/consultant/team',
    element: (
      <ProtectedRoute allowedRoles={['consultant', 'admin']}>
        <TeamPage />
      </ProtectedRoute>
    ),
  },

  // Protected: Candidate
  {
    path: '/candidate/profile',
    element: (
      <ProtectedRoute allowedRoles={['candidate', 'admin']}>
        <CandidateProfile />
      </ProtectedRoute>
    ),
  },
  {
    path: '/candidate/interviews',
    element: (
      <ProtectedRoute allowedRoles={['candidate', 'admin']}>
        <CandidateInterviews />
      </ProtectedRoute>
    ),
  },
  {
    path: '/candidate/offers',
    element: (
      <ProtectedRoute allowedRoles={['candidate', 'admin']}>
        <CandidateOffers />
      </ProtectedRoute>
    ),
  },
  {
    path: '/candidate/documents',
    element: (
      <ProtectedRoute allowedRoles={['candidate', 'admin']}>
        <CandidateDocuments />
      </ProtectedRoute>
    ),
  },

  // Protected: Free Jobs aggregator — candidates only
  {
    path: '/free-jobs',
    element: (
      <ProtectedRoute allowedRoles={['candidate', 'admin']}>
        <FreeJobsPage />
      </ProtectedRoute>
    ),
  },

  // Protected: Billing (all authenticated users)
  {
    path: '/billing',
    element: (
      <ProtectedRoute>
        <BillingPage />
      </ProtectedRoute>
    ),
  },

  // Protected: Admin only
  {
    path: '/admin',
    element: (
      <ProtectedRoute allowedRoles={['admin']}>
        <AdminDashboard />
      </ProtectedRoute>
    ),
  },

  // Admin login & setup (public — no auth required)
  { path: '/admin/login', element: <AdminLoginPage /> },
  { path: '/admin/quick-access', element: <AdminQuickAccessPage /> },
  { path: '/admin/setup', element: <AdminSetupPage /> },
  { path: '/admin/audit-log', element: <AdminAuditLogPage /> },

  { path: '*', element: <NotFoundPage /> },
];

export type Path =
  | '/'
  | '/company'
  | '/companies'
  | '/consultant'
  | '/candidate'
  | '/login'
  | '/signup'
  | '/jobs'
  | '/about'
  | '/blog'
  | '/employer/dashboard'
  | '/employer/team'
  | '/consultant/dashboard'
  | '/consultant/team'
  | '/candidate/profile'
  | '/candidate/interviews'
  | '/candidate/offers'
  | '/candidate/documents'
  | '/billing'
  | '/admin'
  | '/admin/quick-access'
  | '/accept-invite';
export type Params = Record<string, string | undefined>;
