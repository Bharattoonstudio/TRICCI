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
const BillingPage = lazy(() => import('./pages/billing/index'));
const AdminDashboard = lazy(() => import('./pages/admin/dashboard'));
const AdminAuditLogPage = lazy(() => import('./pages/admin/audit-log'));
const AdminLoginPage = lazy(() => import('./pages/admin/login'));
const AdminSetupPage = lazy(() => import('./pages/admin/setup'));
const LoginPage = lazy(() => import('./pages/auth/login'));
const SignupPage = lazy(() => import('./pages/auth/signup'));
const VerifyEmailPage = lazy(() => import('./pages/auth/verify-email'));
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
  { path: '/consultant', element: <ConsultantInfoPage /> },
  { path: '/candidate', element: <CandidateInfoPage /> },

  // Auth routes (public)
  { path: '/login', element: <LoginPage /> },
  { path: '/signup', element: <SignupPage /> },
  { path: '/verify-email', element: <VerifyEmailPage /> },

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
  { path: '/admin/setup', element: <AdminSetupPage /> },
  { path: '/admin/audit-log', element: <AdminAuditLogPage /> },

  { path: '*', element: <NotFoundPage /> },
];

export type Path =
  | '/'
  | '/company'
  | '/consultant'
  | '/candidate'
  | '/login'
  | '/signup'
  | '/verify-email'
  | '/jobs'
  | '/about'
  | '/blog'
  | '/employer/dashboard'
  | '/employer/team'
  | '/consultant/dashboard'
  | '/consultant/team'
  | '/candidate/profile'
  | '/billing'
  | '/admin'
  | '/accept-invite';
export type Params = Record<string, string | undefined>;
