import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';

// Lazy load authentication pages
const SignupSecure = lazy(() => import('./pages/auth/signup-secure'));
const LoginFresh = lazy(() => import('./pages/auth/login-fresh'));
const ResetPasswordFresh = lazy(() => import('./pages/auth/reset-password-fresh'));

function App() {
  return (
    <Router>
      <Suspense fallback={<div>Loading...</div>}>
        <Routes>
          {/* Authentication Routes - using new secure password-based auth */}
          <Route path="/signup" element={<SignupSecure />} />
          <Route path="/login" element={<LoginFresh />} />
          <Route path="/reset-password" element={<ResetPasswordFresh />} />

          {/* Default redirect to signup */}
          <Route path="/" element={<Navigate to="/signup" replace />} />

          {/* Catch all - redirect to signup */}
          <Route path="*" element={<Navigate to="/signup" replace />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
