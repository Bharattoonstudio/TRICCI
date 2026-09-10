import { Helmet } from '@dr.pogodin/react-helmet';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useSession } from '@/lib/auth/auth-client';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useSession();

  useEffect(() => {
    if (isAuthenticated && user) {
      const role = (user as { role?: string }).role;
      if (role === 'admin') {
        navigate('/admin', { replace: true });
      } else {
        navigate(`/${role}/dashboard`, { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate]);

  return (
    <>
      <Helmet>
        <title>Admin Login — TRICCI</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Redirecting...</h1>
          <p className="text-muted-foreground">
            Please use the regular login page at <a href="/login" className="text-primary underline">/login</a>
          </p>
          <p className="text-sm text-muted-foreground mt-4">
            Log in with your admin credentials. You'll be redirected to the admin dashboard.
          </p>
        </div>
      </div>
    </>
  );
}
