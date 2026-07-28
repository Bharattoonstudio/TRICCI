import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, ChevronDown, LogOut, LayoutDashboard, User, Building2, Star, Shield, Zap } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useSession, signOut } from '@/lib/auth/auth-client';

const ROLE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; dashboard: string }> = {
  employer: { label: 'Employer', icon: Building2, color: '#E8470A', dashboard: '/employer/dashboard' },
  consultant: { label: 'Consultant', icon: Star, color: '#6B4FBB', dashboard: '/consultant/dashboard' },
  candidate: { label: 'Candidate', icon: User, color: '#E8470A', dashboard: '/candidate/profile' },
  admin: { label: 'Admin', icon: Shield, color: '#ef4444', dashboard: '/admin' },
};

function UserMenu() {
  const { user, isAuthenticated, isPending } = useSession();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const role = (user as { role?: string } | null)?.role ?? 'candidate';
  const config = ROLE_CONFIG[role] ?? ROLE_CONFIG.candidate;
  const RoleIcon = config.icon;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function handleLogout() {
    await signOut();
    navigate('/login', { replace: true });
  }

  if (isPending) return <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />;

  if (!isAuthenticated) {
    return (
      <div className="hidden md:flex items-center gap-3">
        <Link
          to="/login"
          className="text-sm font-semibold text-foreground border border-border px-5 py-2 rounded-lg hover:border-primary hover:text-primary transition-colors"
        >
          Login
        </Link>
        <Link
          to="/signup"
          className="text-sm font-bold bg-primary text-primary-foreground px-5 py-2 rounded-lg hover:opacity-90 transition-opacity"
        >
          Sign Up
        </Link>
      </div>
    );
  }

  return (
    <div className="relative hidden md:block" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-card border border-border hover:border-primary/40 transition-colors"
      >
        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: config.color + '20', border: `1.5px solid ${config.color}40` }}>
          <RoleIcon size={13} style={{ color: config.color }} />
        </div>
        <div className="text-left">
          <p className="text-xs font-bold text-foreground leading-none">{user?.name ?? 'User'}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5 capitalize">{config.label}</p>
        </div>
        <ChevronDown size={13} className={`text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-52 bg-card border border-border rounded-xl shadow-xl overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-sm font-bold text-foreground truncate">{user?.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
          <div className="p-1.5">
            <Link to={config.dashboard} onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-muted transition-colors">
              <LayoutDashboard size={14} className="text-muted-foreground" />
              My Dashboard
            </Link>
            <Link to="/billing" onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-muted transition-colors">
              <Star size={14} className="text-muted-foreground" />
              Billing & Plans
            </Link>
          </div>
          <div className="p-1.5 border-t border-border">
            <button onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-red-500 hover:bg-red-50 transition-colors">
              <LogOut size={14} />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isAuthenticated, user } = useSession();
  const navigate = useNavigate();
  const role = (user as { role?: string } | null)?.role ?? 'candidate';
  const config = ROLE_CONFIG[role] ?? ROLE_CONFIG.candidate;

  // "Home" for authenticated users goes to their dashboard, not the marketing homepage
  const homeHref = isAuthenticated ? (config.dashboard) : '/';
  const homeLabel = isAuthenticated ? 'Dashboard' : 'Home';

  type NavItem = { href: string; label: string; isRoute: boolean; hasDropdown: boolean; highlight?: boolean; authOnly?: boolean; guestOnly?: boolean; hideForRoles?: string[] };

  const navItems: NavItem[] = [
    // Dashboard / Home — always visible, destination changes by role
    { href: homeHref, label: homeLabel, isRoute: true, hasDropdown: false },
    // Marketing pages — guests only (hidden for ALL logged-in roles)
    { href: '/company', label: 'Companies', isRoute: true, hasDropdown: false, guestOnly: true },
    { href: '/consultant', label: 'Consultants', isRoute: true, hasDropdown: false, guestOnly: true },
    { href: '/candidate', label: 'Candidates', isRoute: true, hasDropdown: false, guestOnly: true },
    { href: '/about', label: 'About Us', isRoute: true, hasDropdown: false, guestOnly: true },
    // Jobs — visible to logged-in candidates and employers only (consultants use their dashboard)
    { href: '/jobs', label: 'Jobs', isRoute: true, hasDropdown: false, authOnly: true, hideForRoles: ['consultant'] },
    // Free Jobs aggregator — candidates only
    { href: '/free-jobs', label: '⚡ Free Jobs', isRoute: true, hasDropdown: false, authOnly: true, hideForRoles: ['employer', 'consultant', 'admin'], highlight: true },
    { href: '/blog', label: 'Resources', isRoute: true, hasDropdown: false },
    { href: '/refresh', label: "Let's Refresh 🎮", isRoute: true, hasDropdown: false, highlight: true },
  ];

  const visibleNavItems = navItems.filter(item => {
    if (item.guestOnly && isAuthenticated) return false;
    if (item.authOnly && !isAuthenticated) return false;
    if (item.hideForRoles && isAuthenticated && item.hideForRoles.includes(role)) return false;
    return true;
  });

  async function handleMobileLogout() {
    await signOut();
    navigate('/login', { replace: true });
    setIsMobileMenuOpen(false);
  }

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-border shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex h-[96px] items-center justify-between gap-6">

          {/* Logo */}
          <Link to={isAuthenticated ? config.dashboard : '/'} className="flex items-center shrink-0">
            <img
              src="/assets/tricci-logo.png"
              alt="TRICCI — We Make It Easy"
              className="h-16 w-auto object-contain self-center"
              fetchPriority="high"
            />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {visibleNavItems.map((item) => {
              const isFreeJobs = item.href === '/free-jobs';
              const base = "flex items-center gap-1 text-sm font-medium px-3 py-2 rounded-md transition-colors hover:text-primary";
              const cls = isFreeJobs
                ? "flex items-center gap-1.5 text-sm font-black px-4 py-2 rounded-lg transition-all hover:scale-105 active:scale-95"
                : item.highlight
                  ? base + " text-primary font-bold bg-primary/8 border border-primary/20 hover:bg-primary/15"
                  : base + " text-foreground/80";
              const style = isFreeJobs
                ? { background: 'linear-gradient(135deg, #E8470A, #6B4FBB)', color: '#fff', boxShadow: '0 0 16px rgba(232,71,10,0.3)' }
                : undefined;
              const content = (
                <>
                  {isFreeJobs && <Zap size={13} />}
                  {item.label}
                  {item.hasDropdown && <ChevronDown size={13} className="text-muted-foreground" />}
                </>
              );
              return item.isRoute ? (
                <Link key={item.href} to={item.href} className={cls} style={style}>
                  {content}
                </Link>
              ) : (
                <a key={item.href} href={item.href} className={cls} style={style}>
                  {content}
                </a>
              );
            })}
          </nav>

          {/* User Menu / CTA — desktop only */}
          <UserMenu />

          {/* Mobile: Login button + hamburger */}
          <div className="lg:hidden flex items-center gap-2">
            {!isAuthenticated && (
              <Link
                to="/login"
                className="text-xs font-bold px-3 py-1.5 rounded-lg border border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                Login
              </Link>
            )}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 hover:bg-muted rounded-md transition-colors text-foreground"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-border py-4 pb-6">
            <nav className="flex flex-col gap-1">
              {visibleNavItems.map((item) => {
                const isFreeJobs = item.href === '/free-jobs';
                return item.isRoute ? (
                  <Link key={item.href} to={item.href}
                    className={isFreeJobs
                      ? 'flex items-center justify-center gap-2 text-sm font-black py-3 px-4 rounded-xl text-white my-1'
                      : `text-sm font-medium py-3 px-2 rounded-md transition-colors ${item.highlight ? 'text-primary font-bold hover:bg-primary/10' : 'text-foreground/80 hover:text-primary hover:bg-muted'}`}
                    style={isFreeJobs ? { background: 'linear-gradient(135deg, #E8470A, #6B4FBB)', boxShadow: '0 0 16px rgba(232,71,10,0.25)' } : undefined}
                    onClick={() => setIsMobileMenuOpen(false)}>
                    {isFreeJobs && <Zap size={14} />}
                    {item.label}
                  </Link>
                ) : (
                  <a key={item.href} href={item.href}
                    className="text-sm font-medium text-foreground/80 hover:text-primary py-3 px-2 rounded-md hover:bg-muted transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}>
                    {item.label}
                  </a>
                );
              })}
              <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-border">
                {isAuthenticated ? (
                  <>
                    <Link to={config.dashboard} onClick={() => setIsMobileMenuOpen(false)}
                      className="text-sm font-medium text-center text-foreground py-2.5 border border-border rounded-lg hover:bg-muted transition-colors">
                      My Dashboard
                    </Link>
                    <button onClick={handleMobileLogout}
                      className="text-sm font-bold text-center text-red-500 py-2.5 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
                      Sign Out
                    </button>
                  </>
                ) : (
                  <>
                    <Link to="/login" onClick={() => setIsMobileMenuOpen(false)}
                      className="text-sm font-semibold text-center text-foreground py-2.5 border border-border rounded-lg hover:border-primary hover:text-primary transition-colors">
                      Login
                    </Link>
                    <Link to="/signup" onClick={() => setIsMobileMenuOpen(false)}
                      className="text-sm font-bold text-center bg-primary text-primary-foreground py-2.5 rounded-lg hover:opacity-90 transition-opacity">
                      Sign Up
                    </Link>
                  </>
                )}
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
