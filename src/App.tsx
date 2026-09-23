import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';

// Lazy load pages
const SignupSecure = lazy(() => import('./pages/auth/signup-secure'));
const LoginFresh = lazy(() => import('./pages/auth/login-fresh'));
const ResetPasswordFresh = lazy(() => import('./pages/auth/reset-password-fresh'));
const Dashboard = lazy(() => import('./pages/dashboard'));
const Home = lazy(() => import('./pages/home'));

function App() {
  return (
    <Router>
      <Suspense fallback={<div>Loading...</div>}>
        <Routes>
          {/* Authentication Routes */}
          <Route path="/signup" element={<SignupSecure />} />
          <Route path="/login" element={<LoginFresh />} />
          <Route path="/reset-password" element={<ResetPasswordFresh />} />

          {/* Main Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />

          {/* Catch all - redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
