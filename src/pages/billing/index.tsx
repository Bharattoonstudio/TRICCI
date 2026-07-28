import { Helmet } from '@dr.pogodin/react-helmet';
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useSession } from '@/lib/auth/auth-client';
import {
  IndianRupee, CheckCircle, Zap, Shield,
  TrendingUp, ArrowUpRight, Clock, FileText,
  ChevronRight, Star, Lock, Wallet, Building2,
  CreditCard, RefreshCw, AlertCircle, X, Eye
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────
type PlanId = 'starter' | 'growth' | 'enterprise';
type UserType = 'employer' | 'consultant';

// ─── Mock Data ───────────────────────────────────────────────────────────────
const EMPLOYER_PLANS = [
  {
    id: 'starter' as PlanId,
    name: 'Starter',
    price: 0,
    billing: 'Free forever',
    description: 'Post jobs and receive candidate submissions from consultants.',
    features: [
      'Up to 2 active job postings',
      'Unlimited consultant submissions',
      'Basic applicant tracking',
      'Standard fee split (8–10% of CTC)',
      'Email support',
    ],
    limitations: ['No priority listing', 'No analytics dashboard', 'No dedicated account manager'],
    cta: 'Get Started Free',
    highlight: false,
    badge: null,
  },
  {
    id: 'growth' as PlanId,
    name: 'Growth',
    price: 4999,
    billing: '₹4,999 / month',
    description: 'Scale your hiring with priority listings and advanced analytics.',
    features: [
      'Up to 10 active job postings',
      'Priority listing in consultant feeds',
      'Advanced applicant tracking & scoring',
      'Reduced platform fee (2% vs 3.125%)',
      'Analytics dashboard',
      'Dedicated account manager',
      'Custom fee negotiation',
    ],
    limitations: [],
    cta: 'Start Growth Plan',
    highlight: true,
    badge: 'Most Popular',
  },
  {
    id: 'enterprise' as PlanId,
    name: 'Enterprise',
    price: null,
    billing: 'Custom pricing',
    description: 'For large teams with high-volume hiring needs and custom requirements.',
    features: [
      'Unlimited active job postings',
      'Dedicated consultant network',
      'White-glove onboarding',
      'Custom fee structures',
      'API access & ATS integration',
      'SLA-backed support',
      'Quarterly business reviews',
    ],
    limitations: [],
    cta: 'Contact Sales',
    highlight: false,
    badge: null,
  },
];

const CONSULTANT_PLANS = [
  {
    id: 'starter' as PlanId,
    name: 'Free',
    price: 0,
    billing: 'Free forever',
    description: 'Access all open mandates and submit candidates at no cost.',
    features: [
      'Access to all open mandates',
      'Unlimited candidate submissions',
      'Standard payout: 68.75% of fee',
      'Basic profile listing',
      'Community support',
    ],
    limitations: ['No priority placement in employer search', 'Standard payout processing (7 days)'],
    cta: 'Join Free',
    highlight: false,
    badge: null,
  },
  {
    id: 'growth' as PlanId,
    name: 'Pro',
    price: 1999,
    billing: '₹1,999 / month',
    description: 'Get priority placement, faster payouts, and exclusive high-value mandates.',
    features: [
      'Priority placement in employer search',
      'Access to exclusive high-CTC mandates',
      'Enhanced payout: 71% of fee',
      'Fast payout processing (3 days)',
      'Verified Pro badge on profile',
      'Advanced analytics on submissions',
      'Priority support',
    ],
    limitations: [],
    cta: 'Go Pro',
    highlight: true,
    badge: 'Best Value',
  },
  {
    id: 'enterprise' as PlanId,
    name: 'Agency',
    price: null,
    billing: 'Custom pricing',
    description: 'For recruitment agencies managing multiple consultants on TRICCI.',
    features: [
      'Multi-seat team management',
      'Agency-level payout: 73% of fee',
      'Dedicated mandate pipeline',
      'White-label candidate portal',
      'API access',
      'Dedicated account manager',
    ],
    limitations: [],
    cta: 'Contact Sales',
    highlight: false,
    badge: null,
  },
];

const TRANSACTIONS = [
  { id: 'TXN-2026-0041', date: '9 Jun 2026', description: 'Placement fee — Head of Growth Marketing @ BrandForce', type: 'credit', amount: 224000, status: 'settled' },
  { id: 'TXN-2026-0038', date: '14 Apr 2026', description: 'Placement fee — Senior Frontend Engineer @ TechStack Co.', type: 'credit', amount: 82500, status: 'settled' },
  { id: 'TXN-2026-0031', date: '1 Mar 2026', description: 'Pro subscription — March 2026', type: 'debit', amount: 1999, status: 'paid' },
  { id: 'TXN-2026-0022', date: '1 Feb 2026', description: 'Pro subscription — February 2026', type: 'debit', amount: 1999, status: 'paid' },
];

// ─── Sub-components ──────────────────────────────────────────────────────────
function FeeCalculator() {
  const [ctc, setCtc] = useState(30);
  const [feePercent, setFeePercent] = useState(8);

  const totalFee = (ctc * 100000 * feePercent) / 100;
  const consultantShare = totalFee * 0.6875;
  const tricciShare = totalFee * 0.3125;

  const fmt = (n: number) =>
    n >= 100000 ? `₹${(n / 100000).toFixed(2)}L` : `₹${n.toLocaleString('en-IN')}`;

  return (
    <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
      <div>
        <h3 className="font-black text-foreground mb-1" style={{ fontFamily: 'var(--font-heading)' }}>Fee Split Calculator</h3>
        <p className="text-sm text-muted-foreground">See exactly how fees are distributed on any placement.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <label className="text-sm font-semibold text-foreground mb-2 block">
            Candidate CTC: <span className="text-primary">₹{ctc} LPA</span>
          </label>
          <input type="range" min={10} max={100} step={1} value={ctc}
            onChange={e => setCtc(Number(e.target.value))}
            className="w-full accent-primary" />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>₹10 LPA</span><span>₹100 LPA</span>
          </div>
        </div>
        <div>
          <label className="text-sm font-semibold text-foreground mb-2 block">
            Placement Fee: <span className="text-primary">{feePercent}% of CTC</span>
          </label>
          <input type="range" min={5} max={15} step={0.5} value={feePercent}
            onChange={e => setFeePercent(Number(e.target.value))}
            className="w-full accent-primary" />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>5%</span><span>15%</span>
          </div>
        </div>
      </div>

      {/* Result Bar */}
      <div>
        <div className="flex h-8 rounded-xl overflow-hidden mb-3">
          <motion.div
            className="h-full bg-secondary flex items-center justify-center"
            animate={{ width: '68.75%' }}
            transition={{ duration: 0.4 }}
          >
            <span className="text-xs font-black text-background px-2 truncate">Consultant 68.75%</span>
          </motion.div>
          <motion.div
            className="h-full bg-primary flex items-center justify-center"
            animate={{ width: '31.25%' }}
            transition={{ duration: 0.4 }}
          >
            <span className="text-xs font-black text-primary-foreground px-2 truncate">TRICCI 31.25%</span>
          </motion.div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-muted/40 border border-border rounded-xl p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Total Fee</p>
            <p className="text-xl font-black text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>{fmt(totalFee)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Employer pays</p>
          </div>
          <div className="bg-secondary/10 border border-secondary/20 rounded-xl p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Consultant Earns</p>
            <p className="text-xl font-black text-secondary" style={{ fontFamily: 'var(--font-heading)' }}>{fmt(consultantShare)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">68.75% of fee</p>
          </div>
          <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">TRICCI Retains</p>
            <p className="text-xl font-black text-primary" style={{ fontFamily: 'var(--font-heading)' }}>{fmt(tricciShare)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">31.25% of fee</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlanCard({
  plan,
  userType,
  currentPlan,
  onSelect,
}: {
  plan: typeof EMPLOYER_PLANS[0];
  userType: UserType;
  currentPlan: PlanId;
  onSelect: (id: PlanId) => void;
}) {
  const isActive = currentPlan === plan.id;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative bg-card border rounded-2xl p-6 flex flex-col transition-all duration-200 ${
        plan.highlight
          ? 'border-primary shadow-lg shadow-primary/10'
          : isActive
          ? 'border-green-500/40'
          : 'border-border hover:border-border/80'
      }`}
    >
      {plan.badge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-primary text-primary-foreground text-xs font-black px-3 py-1 rounded-full">
            {plan.badge}
          </span>
        </div>
      )}
      {isActive && (
        <div className="absolute -top-3 right-4">
          <span className="bg-green-500 text-white text-xs font-black px-3 py-1 rounded-full flex items-center gap-1">
            <CheckCircle size={10} /> Current Plan
          </span>
        </div>
      )}

      <div className="mb-4">
        <h3 className="text-lg font-black text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>{plan.name}</h3>
        <div className="mt-2 mb-1">
          {plan.price === null ? (
            <span className="text-2xl font-black text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>Custom</span>
          ) : plan.price === 0 ? (
            <span className="text-2xl font-black text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>Free</span>
          ) : (
            <span className="text-2xl font-black text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
              ₹{plan.price.toLocaleString('en-IN')}
              <span className="text-sm font-normal text-muted-foreground"> /mo</span>
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{plan.description}</p>
      </div>

      <div className="flex-1 space-y-2 mb-6">
        {plan.features.map(f => (
          <div key={f} className="flex items-start gap-2">
            <CheckCircle size={13} className="text-green-400 shrink-0 mt-0.5" />
            <span className="text-xs text-foreground">{f}</span>
          </div>
        ))}
        {plan.limitations.map(l => (
          <div key={l} className="flex items-start gap-2">
            <X size={13} className="text-muted-foreground shrink-0 mt-0.5" />
            <span className="text-xs text-muted-foreground">{l}</span>
          </div>
        ))}
      </div>

      <button
        onClick={() => onSelect(plan.id)}
        disabled={isActive}
        className={`w-full py-3 rounded-xl text-sm font-bold transition-all ${
          isActive
            ? 'bg-green-500/15 text-green-400 border border-green-500/30 cursor-default'
            : plan.highlight
            ? 'bg-primary text-primary-foreground hover:opacity-90'
            : 'bg-muted text-foreground border border-border hover:border-primary/40 hover:bg-primary/5'
        }`}
      >
        {isActive ? 'Active Plan' : plan.cta}
      </button>
    </motion.div>
  );
}

// ─── Upgrade Modal ────────────────────────────────────────────────────────────
function UpgradeModal({ plan, onClose }: { plan: typeof EMPLOYER_PLANS[0]; onClose: () => void }) {
  const [step, setStep] = useState<'confirm' | 'payment' | 'success'>('confirm');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: 0.25 }}
        className="relative bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
      >
        {step === 'success' ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={28} className="text-green-400" />
            </div>
            <h2 className="text-xl font-black text-foreground mb-2" style={{ fontFamily: 'var(--font-heading)' }}>You're on {plan.name}!</h2>
            <p className="text-sm text-muted-foreground mb-6">Your plan has been upgraded. All features are now active.</p>
            <button onClick={onClose} className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity">
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div>
                <h2 className="text-xl font-black text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
                  {step === 'confirm' ? `Upgrade to ${plan.name}` : 'Payment Details'}
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">{plan.billing}</p>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground">
                <X size={16} />
              </button>
            </div>

            {step === 'confirm' && (
              <div className="p-6 space-y-4">
                <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-2">
                  {plan.features.slice(0, 4).map(f => (
                    <div key={f} className="flex items-center gap-2">
                      <CheckCircle size={13} className="text-green-400 shrink-0" />
                      <span className="text-xs text-foreground">{f}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-start gap-2 p-3 rounded-xl bg-secondary/10 border border-secondary/20">
                  <AlertCircle size={14} className="text-secondary shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">You can cancel anytime. No lock-in period.</p>
                </div>
                <button onClick={() => setStep('payment')}
                  className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity">
                  Continue to Payment
                </button>
              </div>
            )}

            {step === 'payment' && (
              <div className="p-6 space-y-4">
                <div>
                  <label className="text-sm font-semibold text-foreground mb-1.5 block">Card Number</label>
                  <div className="relative">
                    <input placeholder="4242 4242 4242 4242"
                      className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors pr-10" />
                    <CreditCard size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-foreground mb-1.5 block">Expiry</label>
                    <input placeholder="MM / YY"
                      className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors" />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-foreground mb-1.5 block">CVV</label>
                    <input placeholder="•••" type="password"
                      className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors" />
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Lock size={11} /> Secured by 256-bit SSL encryption
                </div>
                <button onClick={() => setStep('success')}
                  className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                  <Lock size={14} /> Pay ₹{plan.price?.toLocaleString('en-IN')} / month
                </button>
              </div>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
type TabId = 'plans' | 'fee-split' | 'transactions' | 'payouts';

export default function BillingPage() {
  const { user } = useSession();
  const sessionRole = (user as { role?: string } | null)?.role;

  // Derive the user type from session role; fall back to 'employer' for unauthenticated/unknown
  const lockedUserType: UserType = useMemo(() => {
    if (sessionRole === 'consultant') return 'consultant';
    return 'employer'; // employer, candidate, admin, or unauthenticated all see employer view
  }, [sessionRole]);

  const [activeTab, setActiveTab] = useState<TabId>('plans');
  // userType is now locked to the session role — no manual toggle
  const userType = lockedUserType;
  const [currentPlan, setCurrentPlan] = useState<PlanId>('starter');
  const [selectedPlan, setSelectedPlan] = useState<typeof EMPLOYER_PLANS[0] | null>(null);

  const plans = userType === 'employer' ? EMPLOYER_PLANS : CONSULTANT_PLANS;

  const handleSelectPlan = (id: PlanId) => {
    const plan = plans.find(p => p.id === id);
    if (!plan || id === currentPlan) return;
    if (plan.price === null) return; // contact sales
    if (plan.price === 0) { setCurrentPlan(id); return; }
    setSelectedPlan(plan);
  };

  const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: 'plans', label: 'Plans', icon: Zap },
    { id: 'fee-split', label: 'Fee Split', icon: IndianRupee },
    { id: 'transactions', label: 'Transactions', icon: FileText },
    { id: 'payouts', label: 'Payouts', icon: Wallet },
  ];

  return (
    <>
      <Helmet>
        <title>Billing & Subscriptions — TRICCI</title>
        <meta name="description" content="Manage your TRICCI subscription, view fee splits, and track payouts." />
        <link rel="canonical" href="https://tricci.in/billing" />
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="min-h-screen bg-background">
        <h1 className="sr-only">Billing & Subscriptions — TRICCI</h1>
        {/* ── Top Bar ── */}
        <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-[80px] z-30">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between h-14">
              <div className="flex items-center gap-2">
                <Wallet size={16} className="text-primary" />
                <span className="text-sm font-semibold text-foreground">Billing & Subscriptions</span>
              </div>
              {/* Role badge — read-only, no toggle */}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-muted border border-border rounded-lg">
                <span className="text-xs font-semibold text-muted-foreground capitalize">{userType}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          {/* ── Tab Nav ── */}
          <div className="flex gap-1 bg-card border border-border rounded-xl p-1 w-fit mb-8 overflow-x-auto">
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150 whitespace-nowrap ${
                  activeTab === tab.id ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}>
                <tab.icon size={15} />
                {tab.label}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {/* ── PLANS TAB ── */}
            {activeTab === 'plans' && (
              <motion.div key="plans" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }} className="space-y-8">
                <div className="text-center max-w-xl mx-auto">
                  <h2 className="text-3xl font-black text-foreground mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
                    {userType === 'employer' ? 'Employer Plans' : 'Consultant Plans'}
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    {userType === 'employer'
                      ? 'Post jobs and close positions. You only pay a placement fee when a hire is made — no upfront cost.'
                      : 'Submit candidates and earn on every successful placement. Start free, upgrade for more.'}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                  {plans.map(plan => (
                    <PlanCard key={plan.id} plan={plan} userType={userType} currentPlan={currentPlan} onSelect={handleSelectPlan} />
                  ))}
                </div>

                {/* Trust Signals */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto">
                  {[
                    { icon: Shield, label: 'No hidden fees', color: '#35c9ff' },
                    { icon: RefreshCw, label: 'Cancel anytime', color: '#22c55e' },
                    { icon: Lock, label: 'Secure payments', color: '#ffd035' },
                    { icon: Star, label: 'GST invoice included', color: '#FF6B35' },
                  ].map(item => (
                    <div key={item.label} className="flex items-center gap-2 p-3 rounded-xl bg-card border border-border">
                      <item.icon size={14} style={{ color: item.color }} />
                      <span className="text-xs font-semibold text-foreground">{item.label}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── FEE SPLIT TAB ── */}
            {activeTab === 'fee-split' && (
              <motion.div key="fee-split" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }} className="space-y-6 max-w-3xl">
                <FeeCalculator />

                {/* How It Works */}
                <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
                  <h3 className="font-black text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>How the Fee Split Works</h3>
                  <div className="space-y-4">
                    {[
                      {
                        step: '01',
                        title: 'Employer sets the fee',
                        desc: 'When posting a job, the employer sets a placement fee as a % of the candidate\'s CTC (typically 8–12%). This is the total amount paid on a successful hire.',
                        color: '#FF6B35',
                      },
                      {
                        step: '02',
                        title: 'Consultant submits & closes',
                        desc: 'A consultant submits a candidate. If the employer hires them, the position is marked closed and the fee is triggered.',
                        color: '#ffd035',
                      },
                      {
                        step: '03',
                        title: 'TRICCI collects & splits',
                        desc: 'TRICCI collects the full fee from the employer. 68.75% goes to the consultant who made the placement. TRICCI retains 31.25% as platform commission.',
                        color: '#35c9ff',
                      },
                      {
                        step: '04',
                        title: 'Consultant gets paid',
                        desc: 'The consultant\'s share is transferred to their registered bank account within 3–7 business days of fee collection.',
                        color: '#22c55e',
                      },
                    ].map(item => (
                      <div key={item.step} className="flex gap-4">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-black text-sm" style={{ backgroundColor: item.color + '20', color: item.color, border: `1.5px solid ${item.color}40` }}>
                          {item.step}
                        </div>
                        <div>
                          <p className="font-bold text-foreground text-sm">{item.title}</p>
                          <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Commission Table */}
                <div className="bg-card border border-border rounded-2xl overflow-hidden">
                  <div className="p-6 border-b border-border">
                    <h3 className="font-black text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>Commission by Plan</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left text-xs font-bold text-muted-foreground uppercase tracking-wider px-6 py-3">Plan</th>
                          <th className="text-left text-xs font-bold text-muted-foreground uppercase tracking-wider px-4 py-3">Consultant Share</th>
                          <th className="text-left text-xs font-bold text-muted-foreground uppercase tracking-wider px-4 py-3">TRICCI Commission</th>
                          <th className="text-left text-xs font-bold text-muted-foreground uppercase tracking-wider px-4 py-3">Payout Speed</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {[
                          { plan: 'Free', consultant: '68.75%', tricci: '31.25%', speed: '7 business days' },
                          { plan: 'Pro', consultant: '71%', tricci: '29%', speed: '3 business days', highlight: true },
                          { plan: 'Agency', consultant: '73%', tricci: '27%', speed: '1 business day' },
                        ].map(row => (
                          <tr key={row.plan} className={`hover:bg-muted/20 transition-colors ${row.highlight ? 'bg-primary/5' : ''}`}>
                            <td className="px-6 py-4 text-sm font-semibold text-foreground">
                              {row.plan}
                              {row.highlight && <span className="ml-2 text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">Popular</span>}
                            </td>
                            <td className="px-4 py-4 text-sm font-black text-secondary">{row.consultant}</td>
                            <td className="px-4 py-4 text-sm font-bold text-primary">{row.tricci}</td>
                            <td className="px-4 py-4 text-sm text-muted-foreground flex items-center gap-1.5">
                              <Clock size={13} /> {row.speed}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── TRANSACTIONS TAB ── */}
            {activeTab === 'transactions' && (
              <motion.div key="transactions" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }} className="space-y-6">
                {/* Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-card border border-border rounded-2xl p-6">
                    <p className="text-sm text-muted-foreground mb-1">Total Earned</p>
                    <p className="text-3xl font-black text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>₹3,06,500</p>
                    <p className="text-xs text-muted-foreground mt-1">2 placements</p>
                  </div>
                  <div className="bg-card border border-border rounded-2xl p-6">
                    <p className="text-sm text-muted-foreground mb-1">Subscription Paid</p>
                    <p className="text-3xl font-black text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>₹3,998</p>
                    <p className="text-xs text-muted-foreground mt-1">2 months Pro</p>
                  </div>
                  <div className="bg-card border border-border rounded-2xl p-6">
                    <p className="text-sm text-muted-foreground mb-1">Net Received</p>
                    <p className="text-3xl font-black text-primary" style={{ fontFamily: 'var(--font-heading)' }}>₹3,02,502</p>
                    <p className="text-xs text-green-400 mt-1 flex items-center gap-1"><ArrowUpRight size={11} /> After fees</p>
                  </div>
                </div>

                {/* Transaction Table */}
                <div className="bg-card border border-border rounded-2xl overflow-hidden">
                  <div className="flex items-center justify-between p-6 border-b border-border">
                    <h3 className="font-black text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>Transaction History</h3>
                    <button className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">
                      <FileText size={13} /> Export CSV
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left text-xs font-bold text-muted-foreground uppercase tracking-wider px-6 py-3">Transaction</th>
                          <th className="text-left text-xs font-bold text-muted-foreground uppercase tracking-wider px-4 py-3 hidden sm:table-cell">Date</th>
                          <th className="text-left text-xs font-bold text-muted-foreground uppercase tracking-wider px-4 py-3">Amount</th>
                          <th className="text-left text-xs font-bold text-muted-foreground uppercase tracking-wider px-4 py-3">Status</th>
                          <th className="px-4 py-3" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {TRANSACTIONS.map(txn => (
                          <tr key={txn.id} className="hover:bg-muted/20 transition-colors">
                            <td className="px-6 py-4">
                              <p className="text-sm font-semibold text-foreground">{txn.description}</p>
                              <p className="text-xs font-mono text-muted-foreground mt-0.5">{txn.id}</p>
                            </td>
                            <td className="px-4 py-4 text-sm text-muted-foreground hidden sm:table-cell">{txn.date}</td>
                            <td className="px-4 py-4">
                              <span className={`text-sm font-black ${txn.type === 'credit' ? 'text-green-400' : 'text-foreground'}`} style={{ fontFamily: 'var(--font-heading)' }}>
                                {txn.type === 'credit' ? '+' : '−'}₹{txn.amount.toLocaleString('en-IN')}
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                                txn.status === 'settled' ? 'bg-green-500/15 text-green-400 border-green-500/30' : 'bg-muted text-muted-foreground border-border'
                              }`}>
                                {txn.status === 'settled' ? 'Settled' : 'Paid'}
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              <button className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                                <Eye size={12} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── PAYOUTS TAB ── */}
            {activeTab === 'payouts' && (
              <motion.div key="payouts" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }} className="space-y-6 max-w-3xl">
                {/* Bank Account */}
                <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-black text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>Payout Account</h3>
                    <button className="text-xs font-semibold text-primary hover:underline">Change</button>
                  </div>
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/40 border border-border">
                    <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                      <Building2 size={18} className="text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-foreground text-sm">HDFC Bank — Savings Account</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Account ending ••••4821 · IFSC: HDFC0001234</p>
                    </div>
                    <span className="flex items-center gap-1 text-xs text-green-400 font-semibold bg-green-500/10 border border-green-500/20 px-2.5 py-1 rounded-full">
                      <CheckCircle size={11} /> Verified
                    </span>
                  </div>
                </div>

                {/* Pending Payouts */}
                <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
                  <h3 className="font-black text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>Pending Payouts</h3>
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="w-12 h-12 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mb-3">
                      <CheckCircle size={20} className="text-green-400" />
                    </div>
                    <p className="font-semibold text-foreground text-sm">All clear!</p>
                    <p className="text-xs text-muted-foreground mt-1">No pending payouts. All earnings have been settled.</p>
                  </div>
                </div>

                {/* Payout History */}
                <div className="bg-card border border-border rounded-2xl overflow-hidden">
                  <div className="p-6 border-b border-border">
                    <h3 className="font-black text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>Payout History</h3>
                  </div>
                  <div className="divide-y divide-border">
                    {[
                      { id: 'PAY-2026-002', date: '12 Jun 2026', amount: 154000, placement: 'Meera Krishnan @ BrandForce', days: 3 },
                      { id: 'PAY-2026-001', date: '17 Apr 2026', amount: 82500, placement: 'Aditya Verma @ TechStack Co.', days: 3 },
                    ].map(p => (
                      <div key={p.id} className="flex items-center gap-4 px-6 py-4 hover:bg-muted/20 transition-colors">
                        <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
                          <IndianRupee size={16} className="text-green-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground text-sm">₹{p.amount.toLocaleString('en-IN')}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{p.placement}</p>
                        </div>
                        <div className="text-right hidden sm:block">
                          <p className="text-xs text-muted-foreground">{p.date}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end mt-0.5">
                            <Clock size={10} /> {p.days} day payout
                          </p>
                        </div>
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full border bg-green-500/15 text-green-400 border-green-500/30">
                          Paid
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Payout Schedule Info */}
                <div className="flex items-start gap-3 p-4 rounded-xl bg-accent/10 border border-accent/20">
                  <TrendingUp size={16} className="text-accent shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Upgrade to Pro for faster payouts</p>
                    <p className="text-xs text-muted-foreground mt-1">Free plan: 7 business days · Pro plan: 3 business days · Agency: 1 business day</p>
                    <button onClick={() => setActiveTab('plans')}
                      className="flex items-center gap-1 text-xs text-primary font-semibold mt-2 hover:gap-2 transition-all">
                      View Pro plan <ChevronRight size={12} />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Upgrade Modal */}
      <AnimatePresence>
        {selectedPlan && <UpgradeModal plan={selectedPlan} onClose={() => setSelectedPlan(null)} />}
      </AnimatePresence>
    </>
  );
}
