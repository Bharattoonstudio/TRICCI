import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';

// Lazy load pages
const HomePage = lazy(() => import('./pages/index'));
const CompanyPage = lazy(() => import('./pages/company'));
const ConsultantPage = lazy(() => import('./pages/consultant'));
const CandidatePage = lazy(() => import('./pages/candidate'));
const AboutPage = lazy(() => import('./pages/about'));
const BlogPage = lazy(() => import('./pages/Blog'));
const BlogPostPage = lazy(() => import('./pages/BlogPostPage'));
const JobsPage = lazy(() => import('./pages/jobs'));
const FreeJobsPage = lazy(() => import('./pages/free-jobs'));

// Auth Routes
const SignupFresh = lazy(() => import('./pages/auth/signup-fresh'));
const LoginFresh = lazy(() => import('./pages/auth/login-fresh'));
const ResetPasswordFresh = lazy(() => import('./pages/auth/reset-password-fresh'));

// Employer Routes
const EmployerDashboard = lazy(() => import('./pages/employer/dashboard'));
const EmployerTeam = lazy(() => import('./pages/employer/team'));
const EmployerJobDetail = lazy(() => import('./pages/employer/jobs/[id]'));

// Consultant Routes
const ConsultantDashboard = lazy(() => import('./pages/consultant/dashboard'));
const ConsultantJobDetail = lazy(() => import('./pages/consultant/jobs/[id]'));

// Candidate Routes
const CandidateProfile = lazy(() => import('./pages/candidate/profile'));
const CandidateInterviews = lazy(() => import('./pages/candidate/interviews'));
const CandidateOffers = lazy(() => import('./pages/candidate/offers'));
const CandidateDocuments = lazy(() => import('./pages/candidate/documents'));

// Other Routes
const BillingPage = lazy(() => import('./pages/billing'));

function App() {
  return (
    <Router>
      <Suspense fallback={<div>Loading...</div>}>
        <Routes>
          {/* Home & Marketing Pages */}
          <Route path="/" element={<HomePage />} />
          <Route path="/company" element={<CompanyPage />} />
          <Route path="/consultant" element={<ConsultantPage />} />
          <Route path="/candidate" element={<CandidatePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/blog" element={<BlogPage />} />
          <Route path="/blog/:id" element={<BlogPostPage />} />
          
          {/* Jobs */}
          <Route path="/jobs" element={<JobsPage />} />
          <Route path="/jobs/:id" element={<JobsPage />} />
          <Route path="/free-jobs" element={<FreeJobsPage />} />

          {/* Authentication Routes */}
          <Route path="/signup" element={<SignupFresh />} />
          <Route path="/signup-fresh" element={<SignupFresh />} />
          <Route path="/login" element={<LoginFresh />} />
          <Route path="/reset-password" element={<ResetPasswordFresh />} />

          {/* Employer Routes */}
          <Route path="/employer/dashboard" element={<EmployerDashboard />} />
          <Route path="/employer/team" element={<EmployerTeam />} />
          <Route path="/employer/jobs/:id" element={<EmployerJobDetail />} />

          {/* Consultant Routes */}
          <Route path="/consultant/dashboard" element={<ConsultantDashboard />} />
          <Route path="/consultant/jobs/:id" element={<ConsultantJobDetail />} />

          {/* Candidate Routes */}
          <Route path="/candidate/profile" element={<CandidateProfile />} />
          <Route path="/candidate/interviews" element={<CandidateInterviews />} />
          <Route path="/candidate/offers" element={<CandidateOffers />} />
          <Route path="/candidate/documents" element={<CandidateDocuments />} />

          {/* Billing */}
          <Route path="/billing" element={<BillingPage />} />

          {/* Catch all - redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
