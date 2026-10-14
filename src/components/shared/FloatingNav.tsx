/**
 * Floating Back and Home buttons, shown on every page.
 *
 * Back: goes to the previous page inside the app. If there is no earlier page
 *       (for example the page was opened from a link or a new tab), it goes to Home.
 * Home: for signed-in users, their dashboard (the same place login sends them).
 *       For visitors, the public home page.
 */
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Home } from 'lucide-react';
import { useSession } from '@/lib/auth/auth-client';

const DASHBOARD_BY_ROLE: Record<string, string> = {
  employer: '/employer/dashboard',
  consultant: '/consultant/dashboard',
  candidate: '/candidate/profile',
  admin: '/admin',
};

export default function FloatingNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isPending } = useSession();

  // Until the session loads, Home goes to the public home page.
  const role = (user as { role?: string } | null)?.role;
  const homePath = !isPending && role ? DASHBOARD_BY_ROLE[role] ?? '/' : '/';

  // react-router gives the first page of a visit the key "default"; any later page has a unique key.
  const hasPreviousPage = location.key !== 'default';

  const goBack = () => {
    if (hasPreviousPage) navigate(-1);
    else navigate(homePath);
  };

  const goHome = () => {
    if (location.pathname !== homePath) navigate(homePath);
  };

  const buttonClass =
    'flex items-center justify-center w-11 h-11 rounded-full bg-slate-800/90 text-white border border-slate-600 shadow-lg backdrop-blur hover:bg-slate-700 active:scale-95 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400';

  return (
    <div className="fixed bottom-6 left-4 z-40 flex flex-col gap-3">
      <button type="button" onClick={goBack} className={buttonClass} aria-label="Go back to previous page" title="Back">
        <ArrowLeft className="w-5 h-5" />
      </button>
      <button type="button" onClick={goHome} className={buttonClass} aria-label="Go to home or your dashboard" title="Home">
        <Home className="w-5 h-5" />
      </button>
    </div>
  );
}
