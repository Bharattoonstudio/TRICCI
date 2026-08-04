import { Helmet } from '@dr.pogodin/react-helmet';
import { toast } from 'sonner';
import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  User, Upload, FileText, Eye, CheckCircle,
  Bell, Briefcase, MapPin, GraduationCap,
  Plus, Trash2, TrendingUp, Star,
  Phone, Mail, Globe, Lock,
  AlertCircle, X, Send, Loader2,
  Sparkles, Bot, Zap, Brain,
  Download, RefreshCw, Shield, ChevronRight,
  IndianRupee, BarChart3
} from 'lucide-react';
import { useSession, signOut } from '@/lib/auth/auth-client';
import { useNavigate } from 'react-router-dom';
import AccountDetails from '@/components/shared/AccountDetails';
import AgreementGate from '@/components/shared/AgreementGate';
import ConsultantSubmissionsCard from '@/components/candidate/ConsultantSubmissionsCard';

// ─── TIC GPT ─────────────────────────────────────────────────────────────────
const TIC_GPT_ID = 'g-6a1b310c327c8191a48366560e14fd6e-tic-1-0-talent-intelligence-copilot';
const TIC_GPT_BASE = `https://chatgpt.com/g/${TIC_GPT_ID}`;
function openTicGpt(prompt: string) {
  window.open(`${TIC_GPT_BASE}?q=${encodeURIComponent(prompt)}`, '_blank', 'noopener,noreferrer');
}

// ─── PDF text extraction ──────────────────────────────────────────────────────

// ─── Types ────────────────────────────────────────────────────────────────────
type VisibilityLevel = 'public' | 'consultants' | 'private';
interface Experience { id: number; title: string; company: string; duration: string; current: boolean; }
interface Education { id: number; degree: string; institution: string; year: string; }

interface CandidateProfile {
  currentTitle?: string;
  location?: string;
  phone?: string;
  mobileVerified?: boolean;
  summary?: string;
  currentCTC?: number;
  expectedCTC?: number;
  noticePeriod?: number;
  totalExperience?: number;
  skills?: string[];
  experience?: Experience[];
  education?: Education[];
  cvUrl?: string;
  cvFileName?: string;
  cvUploadedAt?: string;
  visibility?: VisibilityLevel;
  profileComplete?: number;
}

// ─── Mobile OTP Modal ─────────────────────────────────────────────────────────
function MobileOtpModal({ phone, onVerified, onClose }: {
  phone: string; onVerified: () => void; onClose: () => void;
}) {
  const [step, setStep] = useState<'send' | 'verify'>('send');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  async function sendOtp() {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/otp/send', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: phone, purpose: 'verify' }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Failed to send OTP'); return; }
      setSent(true); setStep('verify');
    } catch { setError('Something went wrong'); }
    finally { setLoading(false); }
  }

  async function verifyOtp() {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/otp/verify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: phone, otp, purpose: 'verify' }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Invalid OTP'); return; }
      onVerified();
    } catch { setError('Something went wrong'); }
    finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Phone size={15} className="text-primary" />
            </div>
            <h3 className="font-black text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
              Verify Mobile
            </h3>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={18} />
          </button>
        </div>

        <p className="text-sm text-muted-foreground mb-5">
          {step === 'send'
            ? <>We&rsquo;ll send a 6-digit OTP to your registered email to verify <strong className="text-foreground">{phone}</strong>.</>
            : <>Enter the 6-digit code sent to your email. It expires in 10 minutes.</>}
        </p>

        {step === 'verify' && (
          <input
            type="text" inputMode="numeric" maxLength={6}
            value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
            placeholder="_ _ _ _ _ _"
            className="w-full bg-background border border-border rounded-xl px-4 py-3 text-center text-2xl font-black tracking-[0.5em] text-foreground focus:outline-none focus:border-primary transition-colors mb-4"
          />
        )}

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-4">
            <AlertCircle size={13} /> {error}
          </div>
        )}

        <div className="flex gap-3">
          {step === 'send' ? (
            <button onClick={sendOtp} disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-white font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50">
              {loading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              {loading ? 'Sending…' : 'Send OTP'}
            </button>
          ) : (
            <>
              <button onClick={() => { setStep('send'); setSent(false); setOtp(''); }}
                className="px-4 py-3 rounded-xl border border-border text-muted-foreground text-sm hover:text-foreground transition-colors">
                Resend
              </button>
              <button onClick={verifyOtp} disabled={loading || otp.length < 6}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-white font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50">
                {loading ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle size={15} />}
                {loading ? 'Verifying…' : 'Verify'}
              </button>
            </>
          )}
        </div>
        {sent && step === 'verify' && (
          <p className="text-xs text-muted-foreground text-center mt-3">
            Didn&rsquo;t get it? Check your spam folder or click Resend.
          </p>
        )}
      </motion.div>
    </div>
  );
}

// ─── Profile Completeness Ring ────────────────────────────────────────────────
function CompletenessRing({ pct }: { pct: number }) {
  const r = 28; const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <div className="relative w-20 h-20 flex items-center justify-center">
      <svg width="80" height="80" className="-rotate-90">
        <circle cx="40" cy="40" r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
        <circle cx="40" cy="40" r={r} fill="none" stroke="hsl(var(--primary))" strokeWidth="6"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.8s ease' }} />
      </svg>
      <span className="absolute text-lg font-black text-foreground">{pct}%</span>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
type TabId = 'profile' | 'cv' | 'visibility' | 'alerts' | 'ai' | 'applications' | 'account';

export default function CandidateProfilePage() {
  const { isPending, session } = useSession();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>('profile');
  const [profile, setProfile] = useState<CandidateProfile>({});
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [showOtpModal, setShowOtpModal] = useState(false);

  // Agreement gate — nothing works until this is accepted (SOP cross-cutting rule)
  const [agreementSigned, setAgreementSigned] = useState<boolean | null>(null);
  useEffect(() => {
    fetch('/api/candidate/agreement')
      .then(r => r.json())
      .then((d: { signed?: boolean }) => setAgreementSigned(!!d.signed))
      .catch(() => setAgreementSigned(false));
  }, []);

  // CV state
  const [cvUploading, setCvUploading] = useState(false);
  const [cvParsing, setCvParsing] = useState(false);
  const [cvError, setCvError] = useState('');
  const cvInputRef = useRef<HTMLInputElement>(null);

  // Applications state
  type ApplicationRow = {
    id: number; status: string; appliedAt: string;
    jobId: string; jobTitle: string; company: string;
    location: string; locationType: string; ctcLabel: string;
    experience: string; department: string; jobStatus: string;
  };
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [appsLoading, setAppsLoading] = useState(false);

  // Form fields (controlled)
  const [form, setForm] = useState({
    currentTitle: '', location: '', phone: '', summary: '',
    currentCTC: '', expectedCTC: '', noticePeriod: '', totalExperience: '',
    visibility: 'consultants' as VisibilityLevel,
  });
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [experience, setExperience] = useState<Experience[]>([]);
  const [education, setEducation] = useState<Education[]>([]);

  // Load profile
  const loadProfile = useCallback(async () => {
    try {
      const res = await fetch('/api/candidate/profile');
      if (res.status === 401) { navigate('/login'); return; }
      const data = await res.json();
      const p: CandidateProfile = data.profile ?? {};
      setProfile(p);
      setUserName(data.user?.name ?? '');
      setUserEmail(data.user?.email ?? '');
      setForm({
        currentTitle: p.currentTitle ?? '',
        location: p.location ?? '',
        phone: p.phone ?? '',
        summary: p.summary ?? '',
        currentCTC: p.currentCTC ? String(p.currentCTC / 100000) : '',
        expectedCTC: p.expectedCTC ? String(p.expectedCTC / 100000) : '',
        noticePeriod: p.noticePeriod ? String(p.noticePeriod) : '',
        totalExperience: p.totalExperience ? String(p.totalExperience) : '',
        visibility: (p.visibility as VisibilityLevel) ?? 'consultants',
      });
      setSkills(p.skills ?? []);
      setExperience(p.experience ?? []);
      setEducation(p.education ?? []);

      // No redirect — always show the dashboard regardless of profile completeness.
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    if (!isPending && !session) { navigate('/login'); return; }
    if (session) loadProfile();
  }, [session, isPending, loadProfile, navigate]);

  // Load applications when tab is opened
  useEffect(() => {
    if (activeTab !== 'applications') return;
    setAppsLoading(true);
    fetch('/api/candidate/applications')
      .then(r => r.json())
      .then(data => setApplications(data.applications ?? []))
      .catch(() => setApplications([]))
      .finally(() => setAppsLoading(false));
  }, [activeTab]);

  // Save profile
  async function saveProfile() {
    setSaving(true); setSaveMsg('');
    try {
      const body = {
        currentTitle: form.currentTitle,
        location: form.location,
        phone: form.phone,
        summary: form.summary,
        currentCTC: form.currentCTC ? Math.round(parseFloat(form.currentCTC) * 100000) : null,
        expectedCTC: form.expectedCTC ? Math.round(parseFloat(form.expectedCTC) * 100000) : null,
        noticePeriod: form.noticePeriod ? parseInt(form.noticePeriod) : null,
        totalExperience: form.totalExperience ? parseInt(form.totalExperience) : null,
        skills, experience, education,
        visibility: form.visibility,
      };
      const res = await fetch('/api/candidate/profile', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        setProfile(data.profile);
        setSaveMsg('Saved successfully!');
        setTimeout(() => setSaveMsg(''), 3000);
      }
    } catch { setSaveMsg('Save failed. Try again.'); }
    finally { setSaving(false); }
  }

  // CV upload + parse
  async function handleCvFile(file: File) {
    if (!file) return;
    setCvError('');

    // 1. Upload to server
    setCvUploading(true);
    let uploadedOk = false;
    try {
      const fd = new FormData(); fd.append('cv', file);
      const res = await fetch('/api/candidate/cv-upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) { setCvError(data.error ?? 'Upload failed'); return; }
      setProfile(p => ({ ...p, cvUrl: data.cvUrl, cvFileName: data.cvFileName }));
      uploadedOk = true;
    } catch { setCvError('Upload failed'); return; }
    finally { setCvUploading(false); }

    if (!uploadedOk) return;

    // 2. Parse CV with OpenAI and auto-fill form
    setCvParsing(true);
    try {
      const fd2 = new FormData(); fd2.append('cv', file);
      const res = await fetch('/api/candidate/cv-parse', { method: 'POST', body: fd2 });
      if (res.ok) {
        const { parsed, reason } = await res.json();
        if (parsed) {
          setForm(f => ({
            ...f,
            phone: parsed.phone || f.phone || '',
            location: parsed.location || f.location || '',
            currentTitle: parsed.currentTitle || f.currentTitle || '',
            totalExperience: parsed.totalExperience || f.totalExperience || '',
            currentCTC: parsed.currentCTC || f.currentCTC || '',
            expectedCTC: parsed.expectedCTC || f.expectedCTC || '',
            summary: parsed.summary || f.summary || '',
          }));
          if (parsed.skills?.length > 0) {
            setSkills(parsed.skills.slice(0, 12));
          }
          toast.success('CV parsed — profile fields auto-filled. Review and save.');
        } else {
          console.warn('[cv-parse] no parsed data, reason:', reason);
          toast.error('Could not extract data from CV. Please fill the form manually.');
        }
      }
    } catch (e) {
      console.error('[cv-parse] frontend error', e);
      /* non-fatal — CV is already uploaded */
    } finally { setCvParsing(false); }
  }

  // Skills
  function addSkill() {
    const s = skillInput.trim();
    if (s && !skills.includes(s)) setSkills(prev => [...prev, s]);
    setSkillInput('');
  }

  // Experience
  function addExperience() {
    setExperience(prev => [...prev, { id: Date.now(), title: '', company: '', duration: '', current: false }]);
  }
  function updateExp(id: number, field: keyof Experience, value: string | boolean) {
    setExperience(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e));
  }
  function removeExp(id: number) { setExperience(prev => prev.filter(e => e.id !== id)); }

  // Education
  function addEducation() {
    setEducation(prev => [...prev, { id: Date.now(), degree: '', institution: '', year: '' }]);
  }
  function updateEdu(id: number, field: keyof Education, value: string) {
    setEducation(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e));
  }
  function removeEdu(id: number) { setEducation(prev => prev.filter(e => e.id !== id)); }

  const pct = profile.profileComplete ?? 0;
  const isNewUser = pct < 20;

  const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: 'profile', label: 'My Profile', icon: User },
    { id: 'cv', label: 'CV / Resume', icon: FileText },
    { id: 'applications', label: 'Applications', icon: Briefcase },
    { id: 'visibility', label: 'Visibility', icon: Eye },
    { id: 'alerts', label: 'Job Alerts', icon: Bell },
    { id: 'ai', label: 'AI Copilot', icon: Bot },
    { id: 'account', label: 'My Account', icon: Lock },
  ];

  if (isPending || loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>My Profile — TRICCI</title>
        <meta name="description" content="Manage your candidate profile, upload your CV, set job preferences and get AI-powered career guidance on TRICCI." />
        <link rel="canonical" href="https://tricci.in/candidate/profile" />
        <meta name="robots" content="noindex" />
      </Helmet>

      {/* ── Agreement Gate (blocks everything until accepted) ── */}
      {agreementSigned === false && (
        <AgreementGate
          role="candidate"
          endpoint="/api/candidate/agreement"
          onAccepted={() => setAgreementSigned(true)}
        />
      )}

      {/* ── OTP Modal ── */}
      {showOtpModal && (
        <MobileOtpModal
          phone={form.phone}
          onVerified={() => {
            setShowOtpModal(false);
            setProfile(p => ({ ...p, mobileVerified: true }));
            setSaveMsg('Mobile number verified!');
            setTimeout(() => setSaveMsg(''), 3000);
          }}
          onClose={() => setShowOtpModal(false)}
        />
      )}

      {/* ── Welcome Banner (new users) ── */}
      <AnimatePresence>
        {isNewUser && (
          <motion.div
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.5 }}
            className="relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #E8470A 0%, #6B4FBB 100%)' }}
          >
            {/* Decorative orbs */}
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-20"
              style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />
            <div className="absolute bottom-0 left-1/3 w-48 h-48 rounded-full opacity-10"
              style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)', transform: 'translateY(50%)' }} />

            <div className="container mx-auto px-4 py-10 md:py-14 relative z-10">
              <div className="max-w-2xl">
                <div className="flex items-center gap-2 mb-3">
                  <Star size={16} className="text-yellow-300" />
                  <span className="text-white/80 text-sm font-semibold uppercase tracking-wider">Welcome to TRICCI</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-black text-white mb-3 leading-tight"
                  style={{ fontFamily: 'var(--font-heading)' }}>
                  Welcome to the World of Opportunity, {userName.split(' ')[0]}!
                </h1>
                <p className="text-white/80 text-base md:text-lg mb-6 leading-relaxed">
                  India&rsquo;s smartest recruitment marketplace connects you directly with top employers and verified consultants.
                  Complete your profile to unlock your full potential.
                </p>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => { setActiveTab('cv'); cvInputRef.current?.click(); }}
                    className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white text-primary font-bold text-sm hover:bg-white/90 transition-colors shadow-lg"
                  >
                    <Upload size={16} /> Add Your CV
                  </button>
                  <button
                    onClick={() => setActiveTab('profile')}
                    className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white/20 border border-white/30 text-white font-bold text-sm hover:bg-white/30 transition-colors"
                  >
                    <User size={16} /> Complete Profile
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Profile Header (returning users) ── */}
      {!isNewUser && (
        <div className="bg-card border-b border-border">
          <div className="container mx-auto px-4 py-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                <User size={28} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-black text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
                  {userName}
                </h1>
                <p className="text-muted-foreground text-sm">{form.currentTitle || 'Add your job title'}</p>
                <div className="flex flex-wrap items-center gap-3 mt-1">
                  {form.location && <span className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin size={11} />{form.location}</span>}
                  <span className="flex items-center gap-1 text-xs text-muted-foreground"><Mail size={11} />{userEmail}</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <CompletenessRing pct={pct} />
                  <p className="text-xs text-muted-foreground mt-1">Complete</p>
                </div>
                <button onClick={() => { signOut(); navigate('/'); }}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-lg border border-border">
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="bg-card border-b border-border sticky top-[80px] z-20">
        <div className="container mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto scrollbar-hide py-1">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold whitespace-nowrap rounded-lg transition-all ${
                  activeTab === id
                    ? 'text-primary bg-primary/10'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}>
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tab Content ── */}
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <AnimatePresence mode="wait">

          {/* ════ PROFILE TAB ════ */}
          {activeTab === 'profile' && (
            <motion.div key="profile" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }} className="space-y-6">

              {/* CV Upload — always at top of profile */}
              <div className="bg-card border border-border rounded-2xl p-6">
                <h2 className="font-black text-foreground mb-2 flex items-center gap-2"
                  style={{ fontFamily: 'var(--font-heading)' }}>
                  <Upload size={16} className="text-primary" /> Upload CV / Resume
                </h2>
                <p className="text-sm text-muted-foreground mb-5">
                  Upload your CV and we&rsquo;ll automatically extract your details to fill your profile. Supports PDF, DOC, DOCX (max 10MB).
                </p>

                <input ref={cvInputRef} type="file" accept=".pdf,.doc,.docx" className="hidden"
                  onChange={e => e.target.files?.[0] && handleCvFile(e.target.files[0])} />

                <div
                  onClick={() => cvInputRef.current?.click()}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); e.dataTransfer.files[0] && handleCvFile(e.dataTransfer.files[0]); }}
                  className="border-2 border-dashed border-border hover:border-primary rounded-2xl p-10 text-center cursor-pointer transition-colors group"
                >
                  {cvUploading || cvParsing ? (
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 size={32} className="animate-spin text-primary" />
                      <p className="text-sm font-semibold text-foreground">
                        {cvUploading ? 'Uploading CV…' : 'Parsing your CV and auto-filling profile…'}
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                        <Upload size={24} className="text-primary" />
                      </div>
                      <div>
                        <p className="font-bold text-foreground">Drag &amp; drop your CV here</p>
                        <p className="text-sm text-muted-foreground mt-1">or click to browse files</p>
                      </div>
                      <p className="text-xs text-muted-foreground">PDF, DOC, DOCX — max 10MB</p>
                    </div>
                  )}
                </div>

                {cvError && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm mt-4">
                    <AlertCircle size={14} /> {cvError}
                  </div>
                )}

                {profile.cvUrl && (
                  <div className="mt-5 p-4 rounded-xl bg-green-500/5 border border-green-500/20 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
                      <FileText size={18} className="text-green-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground text-sm truncate">{profile.cvFileName ?? 'Your CV'}</p>
                      {profile.cvUploadedAt && (
                        <p className="text-xs text-muted-foreground">
                          Uploaded {new Date(profile.cvUploadedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1 text-xs text-green-400 font-semibold">
                        <CheckCircle size={12} /> Uploaded
                      </span>
                      <a href={profile.cvUrl} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-muted text-muted-foreground text-xs font-semibold hover:text-foreground transition-colors">
                        <Download size={12} /> View
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {/* Basic Info */}
              <div className="bg-card border border-border rounded-2xl p-6">
                <h2 className="font-black text-foreground mb-5 flex items-center gap-2"
                  style={{ fontFamily: 'var(--font-heading)' }}>
                  <User size={16} className="text-primary" /> Basic Information
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Full Name</label>
                    <input value={userName} disabled
                      className="w-full bg-muted/30 border border-border rounded-xl px-4 py-3 text-sm text-muted-foreground cursor-not-allowed" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Current Job Title</label>
                    <input value={form.currentTitle} onChange={e => setForm(f => ({ ...f, currentTitle: e.target.value }))}
                      placeholder="e.g. Senior Product Manager"
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Email Address
                    </label>
                    <input value={userEmail} disabled
                      className="w-full bg-muted/30 border border-border rounded-xl px-4 py-3 text-sm text-muted-foreground cursor-not-allowed" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Mobile Number <span className="text-red-400">*</span>
                    </label>
                    <div className="flex gap-2">
                      <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                        placeholder="+91 9023023455" type="tel"
                        className="flex-1 bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors" />
                      {profile.mobileVerified ? (
                        <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-semibold shrink-0">
                          <CheckCircle size={13} /> Verified
                        </div>
                      ) : (
                        <button onClick={() => form.phone && setShowOtpModal(true)}
                          disabled={!form.phone}
                          className="px-3 py-2 rounded-xl bg-secondary/10 border border-secondary/20 text-secondary text-xs font-semibold hover:bg-secondary/20 transition-colors disabled:opacity-40 shrink-0">
                          Verify
                        </button>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Location</label>
                    <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                      placeholder="e.g. Bengaluru, Karnataka"
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Total Experience (years)</label>
                    <input value={form.totalExperience} onChange={e => setForm(f => ({ ...f, totalExperience: e.target.value }))}
                      placeholder="e.g. 7" type="number" min="0" max="50"
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors" />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Professional Summary</label>
                  <textarea value={form.summary} onChange={e => setForm(f => ({ ...f, summary: e.target.value }))}
                    rows={4} placeholder="Briefly describe your professional background, key strengths and career goals…"
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors resize-none" />
                </div>
              </div>

              {/* CTC & Notice */}
              <div className="bg-card border border-border rounded-2xl p-6">
                <h2 className="font-black text-foreground mb-5 flex items-center gap-2"
                  style={{ fontFamily: 'var(--font-heading)' }}>
                  <IndianRupee size={16} className="text-primary" /> Compensation &amp; Availability
                  <span className="text-xs text-red-400 font-normal ml-1">* Required</span>
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Current CTC (LPA) <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
                      <input value={form.currentCTC} onChange={e => setForm(f => ({ ...f, currentCTC: e.target.value }))}
                        placeholder="e.g. 12" type="number" min="0" step="0.5"
                        className="w-full bg-background border border-border rounded-xl pl-7 pr-12 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors" />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">LPA</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Expected CTC (LPA) <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
                      <input value={form.expectedCTC} onChange={e => setForm(f => ({ ...f, expectedCTC: e.target.value }))}
                        placeholder="e.g. 18" type="number" min="0" step="0.5"
                        className="w-full bg-background border border-border rounded-xl pl-7 pr-12 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors" />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">LPA</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Notice Period (days)</label>
                    <input value={form.noticePeriod} onChange={e => setForm(f => ({ ...f, noticePeriod: e.target.value }))}
                      placeholder="e.g. 30" type="number" min="0" max="180"
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors" />
                  </div>
                </div>
              </div>

              {/* Skills */}
              <div className="bg-card border border-border rounded-2xl p-6">
                <h2 className="font-black text-foreground mb-5 flex items-center gap-2"
                  style={{ fontFamily: 'var(--font-heading)' }}>
                  <Zap size={16} className="text-primary" /> Skills
                </h2>
                <div className="flex gap-2 mb-4">
                  <input value={skillInput} onChange={e => setSkillInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                    placeholder="Type a skill and press Enter"
                    className="flex-1 bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors" />
                  <button onClick={addSkill}
                    className="px-4 py-2.5 rounded-xl bg-primary text-white font-bold text-sm hover:opacity-90 transition-opacity">
                    <Plus size={15} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {skills.map(s => (
                    <span key={s} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold">
                      {s}
                      <button onClick={() => setSkills(prev => prev.filter(x => x !== s))}
                        className="text-primary/60 hover:text-primary transition-colors">
                        <X size={11} />
                      </button>
                    </span>
                  ))}
                  {skills.length === 0 && <p className="text-sm text-muted-foreground">No skills added yet.</p>}
                </div>
              </div>

              {/* Experience */}
              <div className="bg-card border border-border rounded-2xl p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="font-black text-foreground flex items-center gap-2"
                    style={{ fontFamily: 'var(--font-heading)' }}>
                    <Briefcase size={16} className="text-primary" /> Work Experience
                  </h2>
                  <button onClick={addExperience}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors">
                    <Plus size={13} /> Add
                  </button>
                </div>
                <div className="space-y-4">
                  {experience.map(exp => (
                    <div key={exp.id} className="p-4 rounded-xl bg-muted/30 border border-border space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input value={exp.title} onChange={e => updateExp(exp.id, 'title', e.target.value)}
                          placeholder="Job Title"
                          className="bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors" />
                        <input value={exp.company} onChange={e => updateExp(exp.id, 'company', e.target.value)}
                          placeholder="Company Name"
                          className="bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors" />
                      </div>
                      <div className="flex gap-3 items-center">
                        <input value={exp.duration} onChange={e => updateExp(exp.id, 'duration', e.target.value)}
                          placeholder="e.g. Jan 2022 – Present"
                          className="flex-1 bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors" />
                        <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer shrink-0">
                          <input type="checkbox" checked={exp.current}
                            onChange={e => updateExp(exp.id, 'current', e.target.checked)}
                            className="accent-primary" />
                          Current
                        </label>
                        <button onClick={() => removeExp(exp.id)} className="text-red-400 hover:text-red-300 transition-colors shrink-0">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {experience.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No experience added yet. Click &ldquo;Add&rdquo; to get started.</p>
                  )}
                </div>
              </div>

              {/* Education */}
              <div className="bg-card border border-border rounded-2xl p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="font-black text-foreground flex items-center gap-2"
                    style={{ fontFamily: 'var(--font-heading)' }}>
                    <GraduationCap size={16} className="text-primary" /> Education
                  </h2>
                  <button onClick={addEducation}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors">
                    <Plus size={13} /> Add
                  </button>
                </div>
                <div className="space-y-4">
                  {education.map(edu => (
                    <div key={edu.id} className="p-4 rounded-xl bg-muted/30 border border-border">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <input value={edu.degree} onChange={e => updateEdu(edu.id, 'degree', e.target.value)}
                          placeholder="Degree / Course"
                          className="bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors" />
                        <input value={edu.institution} onChange={e => updateEdu(edu.id, 'institution', e.target.value)}
                          placeholder="Institution Name"
                          className="bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors" />
                        <div className="flex gap-2">
                          <input value={edu.year} onChange={e => updateEdu(edu.id, 'year', e.target.value)}
                            placeholder="Year (e.g. 2019)"
                            className="flex-1 bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors" />
                          <button onClick={() => removeEdu(edu.id)} className="text-red-400 hover:text-red-300 transition-colors">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {education.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No education added yet.</p>
                  )}
                </div>
              </div>

              {/* Save Button */}
              <div className="flex items-center gap-4">
                <button onClick={saveProfile} disabled={saving}
                  className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-primary text-white font-bold hover:opacity-90 transition-opacity disabled:opacity-50">
                  {saving ? <><Loader2 size={16} className="animate-spin" /> Saving…</> : <><CheckCircle size={16} /> Save Profile</>}
                </button>
                {saveMsg && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className={`text-sm font-semibold ${saveMsg.includes('fail') ? 'text-red-400' : 'text-green-400'}`}>
                    {saveMsg}
                  </motion.p>
                )}
              </div>
            </motion.div>
          )}

          {/* ════ CV TAB ════ */}
          {activeTab === 'cv' && (
            <motion.div key="cv" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }} className="space-y-6">

              <div className="bg-card border border-border rounded-2xl p-6">
                <h2 className="font-black text-foreground mb-2 flex items-center gap-2"
                  style={{ fontFamily: 'var(--font-heading)' }}>
                  <FileText size={16} className="text-primary" /> Your CV
                </h2>
                {profile.cvUrl ? (
                  <div className="mt-2 p-4 rounded-xl bg-green-500/5 border border-green-500/20 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
                      <FileText size={18} className="text-green-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground text-sm truncate">{profile.cvFileName ?? 'Your CV'}</p>
                      {profile.cvUploadedAt && (
                        <p className="text-xs text-muted-foreground">
                          Uploaded {new Date(profile.cvUploadedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1 text-xs text-green-400 font-semibold">
                        <CheckCircle size={12} /> Uploaded
                      </span>
                      <a href={profile.cvUrl} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-muted text-muted-foreground text-xs font-semibold hover:text-foreground transition-colors">
                        <Download size={12} /> View
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 flex flex-col items-center gap-3 py-8 text-center">
                    <FileText size={32} className="text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">No CV uploaded yet.</p>
                    <button onClick={() => setActiveTab('profile')}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white font-bold text-sm hover:opacity-90 transition-opacity">
                      <Upload size={14} /> Upload CV from Profile tab
                    </button>
                  </div>
                )}
              </div>

            </motion.div>
          )}

          {/* ════ VISIBILITY TAB ════ */}
          {activeTab === 'visibility' && (
            <motion.div key="visibility" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }} className="space-y-6">
              <div className="bg-card border border-border rounded-2xl p-6">
                <h2 className="font-black text-foreground mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
                  Profile Visibility
                </h2>
                <p className="text-sm text-muted-foreground mb-6">
                  Control who can see your profile and contact you on TRICCI.
                </p>
                <div className="space-y-3">
                  {([
                    { value: 'public', icon: Globe, label: 'Public', desc: 'Visible to all employers and consultants on TRICCI' },
                    { value: 'consultants', icon: Shield, label: 'Consultants Only', desc: 'Only verified consultants can view your full profile' },
                    { value: 'private', icon: Lock, label: 'Private', desc: 'Hidden from search. Only you can see your profile' },
                  ] as const).map(({ value, icon: Icon, label, desc }) => (
                    <button key={value} onClick={() => setForm(f => ({ ...f, visibility: value }))}
                      className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${
                        form.visibility === value
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/40 bg-muted/20'
                      }`}>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        form.visibility === value ? 'bg-primary/10' : 'bg-muted'
                      }`}>
                        <Icon size={18} className={form.visibility === value ? 'text-primary' : 'text-muted-foreground'} />
                      </div>
                      <div className="flex-1">
                        <p className={`font-bold text-sm ${form.visibility === value ? 'text-primary' : 'text-foreground'}`}>{label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                      </div>
                      {form.visibility === value && <CheckCircle size={18} className="text-primary shrink-0" />}
                    </button>
                  ))}
                </div>
                <button onClick={saveProfile} disabled={saving}
                  className="mt-6 flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-white font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50">
                  {saving ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle size={15} />}
                  {saving ? 'Saving…' : 'Save Visibility'}
                </button>
              </div>
            </motion.div>
          )}

          {/* ════ APPLICATIONS TAB ════ */}
          {activeTab === 'applications' && (
            <motion.div key="applications" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }} className="space-y-6">
              <div className="bg-card border border-border rounded-2xl p-6">
                <h2 className="font-black text-foreground mb-1 flex items-center gap-2"
                  style={{ fontFamily: 'var(--font-heading)' }}>
                  <Briefcase size={16} className="text-primary" /> My Applications
                </h2>
                <p className="text-sm text-muted-foreground mb-6">
                  Jobs you&apos;ve applied to directly via TRICCI.
                </p>

                {appsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 size={28} className="animate-spin text-primary" />
                  </div>
                ) : applications.length === 0 ? (
                  <div className="text-center py-12 rounded-xl bg-muted/30 border border-border">
                    <Briefcase size={32} className="text-muted-foreground mx-auto mb-3" />
                    <p className="font-semibold text-foreground text-sm mb-1">No applications yet</p>
                    <p className="text-xs text-muted-foreground mb-4">Browse open roles and hit &quot;Apply Now&quot; to get started.</p>
                    <a href="/jobs"
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white font-bold text-sm hover:opacity-90 transition-opacity">
                      <Briefcase size={14} /> Browse Jobs
                    </a>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {applications.map(app => {
                      const statusConfig: Record<string, { label: string; className: string }> = {
                        applied:           { label: 'Applied',           className: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
                        review:            { label: 'Under Review',      className: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
                        shortlisted:       { label: 'Shortlisted ⭐',    className: 'bg-primary/10 text-primary border-primary/20' },
                        interview:         { label: 'Interview Stage',   className: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
                        selected:          { label: 'Selected ✅',       className: 'bg-green-500/10 text-green-400 border-green-500/20' },
                        offered:           { label: 'Offer Received 📄', className: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
                        rejected:          { label: 'Not Selected',      className: 'bg-red-500/10 text-red-400 border-red-500/20' },
                        placed:            { label: 'Placed 🎉',         className: 'bg-primary/10 text-primary border-primary/20' },
                      };
                      const cfg = statusConfig[app.status] ?? statusConfig.applied;
                      return (
                        <a key={app.id} href={`/jobs/${app.jobId}`}
                          className="block bg-background border border-border rounded-xl p-4 hover:border-primary/40 transition-colors group">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-foreground text-sm group-hover:text-primary transition-colors truncate"
                                style={{ fontFamily: 'var(--font-heading)' }}>{app.jobTitle}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{app.company} · {app.location}</p>
                              <div className="flex items-center gap-2 mt-2 flex-wrap">
                                <span className="text-xs text-muted-foreground">{app.ctcLabel}</span>
                                <span className="text-muted-foreground/40">·</span>
                                <span className="text-xs text-muted-foreground">{app.experience}</span>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2 shrink-0">
                              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${cfg.className}`}>
                                {cfg.label}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(app.appliedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </span>
                            </div>
                          </div>
                        </a>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Consultant Submissions — includes interview details, view-only */}
              <ConsultantSubmissionsCard />
            </motion.div>
          )}

          {/* ════ JOB ALERTS TAB ════ */}
          {activeTab === 'alerts' && (
            <motion.div key="alerts" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }}>
              <div className="bg-card border border-border rounded-2xl p-6">
                <h2 className="font-black text-foreground mb-2 flex items-center gap-2"
                  style={{ fontFamily: 'var(--font-heading)' }}>
                  <Bell size={16} className="text-primary" /> Job Alert Preferences
                </h2>
                <p className="text-sm text-muted-foreground mb-6">
                  Get notified when new jobs matching your profile are posted. Manage your alert subscriptions below.
                </p>
                <div className="p-5 rounded-xl bg-muted/30 border border-border text-center">
                  <Bell size={28} className="text-muted-foreground mx-auto mb-3" />
                  <p className="font-semibold text-foreground text-sm mb-1">Job alerts are managed from the Jobs page</p>
                  <p className="text-xs text-muted-foreground mb-4">Browse jobs and subscribe to alerts that match your preferences.</p>
                  <a href="/jobs"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white font-bold text-sm hover:opacity-90 transition-opacity">
                    <Briefcase size={14} /> Browse Jobs
                  </a>
                </div>
              </div>
            </motion.div>
          )}

          {/* ════ AI COPILOT TAB ════ */}
          {activeTab === 'ai' && (
            <motion.div key="ai" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }} className="space-y-5">

              <div className="bg-gradient-to-br from-secondary/10 to-primary/10 border border-secondary/20 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-secondary/20 flex items-center justify-center">
                    <Bot size={20} className="text-secondary" />
                  </div>
                  <div>
                    <h2 className="font-black text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
                      TIC 1.0 — AI Copilot
                    </h2>
                    <p className="text-xs text-muted-foreground">Talent Intelligence Copilot powered by GPT</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Your personal AI career coach. Get ATS-optimised CV rewrites, salary benchmarks, interview prep, and personalised job match insights.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  {
                    icon: RefreshCw, color: '#E8470A', title: 'Rewrite My CV',
                    desc: 'Get an ATS-optimised version of your CV with stronger action verbs and keywords.',
                    action: () => openTicGpt(`Please rewrite and optimise my CV for ATS systems. My current role is ${form.currentTitle || 'professional'} with ${form.totalExperience || 'several'} years of experience. Skills: ${skills.join(', ') || 'see CV'}. Make it compelling and keyword-rich.`),
                  },
                  {
                    icon: Sparkles, color: '#6B4FBB', title: 'AI Suggested Changes',
                    desc: 'Get specific improvement suggestions for your current CV and profile.',
                    action: () => openTicGpt(`Review my professional profile and suggest specific improvements. Role: ${form.currentTitle || 'professional'}. Experience: ${form.totalExperience || '?'} years. Current CTC: ${form.currentCTC || '?'} LPA. Expected: ${form.expectedCTC || '?'} LPA. Skills: ${skills.join(', ') || 'not listed'}. What should I improve to get better job matches?`),
                  },
                  {
                    icon: BarChart3, color: '#22c55e', title: 'Salary Benchmark',
                    desc: 'Find out what professionals with your profile earn in the current market.',
                    action: () => openTicGpt(`What is the current market salary range for a ${form.currentTitle || 'professional'} with ${form.totalExperience || '5'} years of experience in India? My current CTC is ${form.currentCTC || '?'} LPA. Skills: ${skills.slice(0, 5).join(', ') || 'general'}. Give me a detailed salary benchmark.`),
                  },
                  {
                    icon: Brain, color: '#ffd035', title: 'Interview Prep',
                    desc: 'Practice common interview questions for your target role and industry.',
                    action: () => openTicGpt(`Help me prepare for interviews for a ${form.currentTitle || 'professional'} role. Give me the top 10 interview questions I should prepare for, along with tips on how to answer them effectively. My background: ${form.summary?.slice(0, 200) || 'experienced professional'}`),
                  },
                  {
                    icon: TrendingUp, color: '#E8470A', title: 'Career Path Advice',
                    desc: 'Explore career growth options and what skills to build next.',
                    action: () => openTicGpt(`I am a ${form.currentTitle || 'professional'} with ${form.totalExperience || '5'} years of experience. Skills: ${skills.join(', ') || 'general'}. What are the best career growth paths for me? What skills should I develop next to maximise my career trajectory and earning potential in India?`),
                  },
                  {
                    icon: Download, color: '#6B4FBB', title: 'Generate New CV',
                    desc: 'Create a fresh, professionally formatted CV from your profile data.',
                    action: () => openTicGpt(`Generate a complete, professionally formatted CV for me. Name: ${userName}. Title: ${form.currentTitle || 'Professional'}. Location: ${form.location || 'India'}. Experience: ${form.totalExperience || '?'} years. Current CTC: ${form.currentCTC || '?'} LPA. Skills: ${skills.join(', ') || 'see below'}. Summary: ${form.summary || 'Experienced professional'}. Please format it in a clean, ATS-friendly layout.`),
                  },
                ].map(({ icon: Icon, color, title, desc, action }) => (
                  <button key={title} onClick={action}
                    className="flex items-start gap-4 p-5 rounded-2xl bg-card border border-border hover:border-primary/40 transition-all text-left group hover:shadow-md">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110"
                      style={{ backgroundColor: color + '15', border: `1.5px solid ${color}30` }}>
                      <Icon size={18} style={{ color }} />
                    </div>
                    <div>
                      <p className="font-bold text-foreground text-sm mb-1">{title}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                    </div>
                    <ChevronRight size={16} className="text-muted-foreground ml-auto shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>

              <div className="bg-muted/30 border border-border rounded-2xl p-4 text-center">
                <p className="text-xs text-muted-foreground">
                  TIC Copilot opens in ChatGPT with your profile context pre-loaded. A free ChatGPT account is required.
                </p>
              </div>
            </motion.div>
          )}

          {/* ── ACCOUNT TAB ── */}
          {activeTab === 'account' && (
            <motion.div key="account" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }} className="space-y-6">
              <AccountDetails theme="light" />
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </>
  );
}
