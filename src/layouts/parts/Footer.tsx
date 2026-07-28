import { Link } from 'react-router-dom';

export function WhatsAppFloat() {
  const phone = '919023023455';
  const message = encodeURIComponent("Hi! I'd like to connect with the TRICCI founder.");
  return (
    <a
      href={`https://wa.me/${phone}?text=${message}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 rounded-full shadow-xl transition-transform hover:scale-110 active:scale-95"
      style={{ background: '#25D366' }}>
      {/* WhatsApp SVG icon */}
      <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 3C9.373 3 4 8.373 4 15c0 2.385.668 4.61 1.832 6.5L4 29l7.75-1.813A11.94 11.94 0 0 0 16 28c6.627 0 12-5.373 12-12S22.627 3 16 3z" fill="#fff"/>
        <path d="M16 5.5c-5.238 0-9.5 4.262-9.5 9.5 0 2.09.676 4.02 1.82 5.59l-.82 3.91 4.02-.84A9.46 9.46 0 0 0 16 24.5c5.238 0 9.5-4.262 9.5-9.5S21.238 5.5 16 5.5zm4.77 13.02c-.2.56-1.17 1.07-1.62 1.13-.42.06-.95.08-1.53-.1-.35-.11-.8-.26-1.37-.51-2.41-1.04-3.98-3.47-4.1-3.63-.12-.16-.97-1.29-.97-2.46 0-1.17.61-1.74.83-1.98.22-.24.48-.3.64-.3l.46.01c.15.01.35-.06.54.41.2.49.69 1.68.75 1.8.06.12.1.27.02.43-.08.16-.12.26-.24.4-.12.14-.25.31-.36.42-.12.12-.24.25-.1.49.14.24.62.99 1.33 1.6.91.8 1.68 1.05 1.92 1.17.24.12.38.1.52-.06.14-.16.6-.7.76-.94.16-.24.32-.2.54-.12.22.08 1.4.66 1.64.78.24.12.4.18.46.28.06.1.06.58-.14 1.14z" fill="#25D366"/>
      </svg>
      {/* Pulse ring */}
      <span className="absolute inset-0 rounded-full animate-ping opacity-30" style={{ background: '#25D366' }} />
    </a>
  );
}

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-card border-t border-border">
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-10">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="mb-4">
              <img
                src="/assets/tricci-logo.png"
                alt="TRICCI — We Make It Easy"
                className="h-14 w-auto object-contain"
                loading="lazy"
              />
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-xs">
              <span className="font-semibold text-foreground">Talent Recruitment Intelligent Company Consultant Integration.</span> India's smartest AI-powered recruitment aggregator connecting employers, consultants, and candidates.
            </p>
            <div className="flex gap-3 mt-6">
              <a href="https://www.linkedin.com/company/tricci" target="_blank" rel="noopener noreferrer" aria-label="TRICCI on LinkedIn" className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-muted transition-colors">
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
              </a>
              <a href="https://x.com/tricci_in" target="_blank" rel="noopener noreferrer" aria-label="TRICCI on X (Twitter)" className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-muted transition-colors">
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.713 5.858 5.45-5.858zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </a>
            </div>
          </div>

          {/* For Employers */}
          <div>
            <h4 className="text-sm font-bold text-foreground mb-4 uppercase tracking-wider">For Employers</h4>
            <ul className="space-y-3">
              <li><Link to="/signup" className="text-sm text-muted-foreground hover:text-primary transition-colors">Post a Job</Link></li>
              <li><Link to="/company" className="text-sm text-muted-foreground hover:text-primary transition-colors">How It Works</Link></li>
              <li><Link to="/billing" className="text-sm text-muted-foreground hover:text-primary transition-colors">Pricing &amp; Fees</Link></li>
              <li><Link to="/about" className="text-sm text-muted-foreground hover:text-primary transition-colors">Success Stories</Link></li>
              <li><Link to="/company" className="text-sm text-muted-foreground hover:text-primary transition-colors">Employer FAQ</Link></li>
            </ul>
          </div>

          {/* For Consultants */}
          <div>
            <h4 className="text-sm font-bold text-foreground mb-4 uppercase tracking-wider">For Consultants</h4>
            <ul className="space-y-3">
              <li><Link to="/jobs" className="text-sm text-muted-foreground hover:text-primary transition-colors">Browse Jobs</Link></li>
              <li><Link to="/consultant" className="text-sm text-muted-foreground hover:text-primary transition-colors">Earn Fees</Link></li>
              <li><Link to="/consultant" className="text-sm text-muted-foreground hover:text-primary transition-colors">Submit Candidates</Link></li>
              <li><Link to="/consultant/dashboard" className="text-sm text-muted-foreground hover:text-primary transition-colors">Consultant Dashboard</Link></li>
              <li><Link to="/consultant" className="text-sm text-muted-foreground hover:text-primary transition-colors">Consultant FAQ</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-sm font-bold text-foreground mb-4 uppercase tracking-wider">Company</h4>
            <ul className="space-y-3">
              <li><Link to="/about" className="text-sm text-muted-foreground hover:text-primary transition-colors">About TRICCI</Link></li>
              <li><Link to="/about" className="text-sm text-muted-foreground hover:text-primary transition-colors">Careers</Link></li>
              <li><Link to="/about" className="text-sm text-muted-foreground hover:text-primary transition-colors">Privacy Policy</Link></li>
              <li><Link to="/about" className="text-sm text-muted-foreground hover:text-primary transition-colors">Terms of Service</Link></li>
              <li>
                <a href="mailto:Connect@Tricci.in"
                  className="text-sm font-bold hover:underline transition-colors"
                  style={{ color: '#E8470A' }}>
                  Connect@Tricci.in
                </a>
              </li>
              <li>
                <Link to="/refresh" className="text-sm font-semibold text-primary hover:underline flex items-center gap-1.5">
                  🎮 Let&rsquo;s Refresh
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © {currentYear} TRICCI. All rights reserved. Made with ❤️ for India's recruitment ecosystem.
          </p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Trusted by</span>
            <span className="text-xs font-bold text-primary">10,000+ professionals</span>
            <span className="text-xs text-muted-foreground">across India</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
