import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';

// Lazy load pages
const HomePage = lazy(() => import('./pages/index'));
const SignupFresh = lazy(() => import('./pages/auth/signup-fresh'));
const LoginFresh = lazy(() => import('./pages/auth/login-fresh'));
const ResetPasswordFresh = lazy(() => import('./pages/auth/reset-password-fresh'));

function App() {
  return (
    <Router>
      <Suspense fallback={<div>Loading...</div>}>
        <Routes>
          {/* Home page - marketing landing page */}
          <Route path="/" element={<HomePage />} />

          {/* Authentication Routes - using new secure password-based auth */}
          <Route path="/signup" element={<SignupFresh />} />
          <Route path="/login" element={<LoginFresh />} />
          <Route path="/reset-password" element={<ResetPasswordFresh />} />

          {/* Catch all - redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
