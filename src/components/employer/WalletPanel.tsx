/**
 * WalletPanel — Employer wallet & Razorpay top-up
 *
 * Shows current balance, transaction history, and a "Add Credits" button
 * that opens the Razorpay Standard Checkout modal.
 *
 * Razorpay checkout.js is loaded lazily on first click to avoid blocking
 * the dashboard load.
 */
import { useEffect, useState, useCallback } from 'react';
import { motion } from 'motion/react';
import { Wallet, Plus, RefreshCw, CheckCircle2, XCircle, Clock, IndianRupee, Loader2, AlertCircle, FlaskConical, Copy, Check } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface WalletData {
  balance_paise: number;
  balance_rupees: number;
  transactions: Transaction[];
}

interface Transaction {
  id: number;
  razorpay_order_id: string;
  razorpay_payment_id: string | null;
  amount_paise: number;
  currency: string;
  status: 'created' | 'paid' | 'failed';
  receipt: string | null;
  created_at: string;
}

// Razorpay global type
declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}
interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpayResponse) => void;
  prefill?: { name?: string; email?: string };
  theme?: { color?: string };
  modal?: { ondismiss?: () => void };
}
interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}
interface RazorpayInstance {
  open(): void;
  on(event: string, handler: (response: { error: { description: string } }) => void): void;
}

// ── Preset top-up amounts ─────────────────────────────────────────────────────
const PRESETS = [
  { label: '₹500', paise: 50000 },
  { label: '₹1,000', paise: 100000 },
  { label: '₹2,000', paise: 200000 },
  { label: '₹5,000', paise: 500000 },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatRupees(paise: number) {
  return (paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) { resolve(); return; }

    // Check if script tag already exists (e.g. previous failed attempt)
    const existing = document.querySelector('script[src*="checkout.razorpay.com"]');
    if (existing) {
      existing.remove();
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.crossOrigin = 'anonymous';

    const timer = setTimeout(() => {
      script.remove();
      reject(new Error('Razorpay checkout timed out. Check your internet connection and try again.'));
    }, 10000);

    script.onload = () => { clearTimeout(timer); resolve(); };
    script.onerror = () => {
      clearTimeout(timer);
      script.remove();
      reject(new Error('Could not load Razorpay checkout. Please disable any ad blockers and try again.'));
    };

    document.head.appendChild(script);
  });
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function WalletPanel({ userName, userEmail }: { userName?: string; userEmail?: string }) {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<number>(100000); // ₹1,000 default
  const [customAmount, setCustomAmount] = useState('');
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState('');
  const [lastSuccess, setLastSuccess] = useState<{ amount: string; paymentId: string } | null>(null);
  const [isTestMode, setIsTestMode] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const fetchWallet = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/payments/wallet');
      if (!res.ok) throw new Error('Failed to load wallet');
      const data = await res.json() as WalletData;
      setWallet(data);
    } catch {
      setError('Could not load wallet. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWallet();
    // Detect test vs live mode on mount so banner shows immediately
    fetch('/api/payments/mode')
      .then(r => r.json())
      .then((d: { mode: string }) => { if (d.mode === 'test') setIsTestMode(true); })
      .catch(() => {});
  }, [fetchWallet]);

  const effectiveAmount = customAmount
    ? Math.round(parseFloat(customAmount) * 100)
    : selectedPreset;

  async function handleTopUp() {
    setPayError('');
    if (!effectiveAmount || effectiveAmount < 100) {
      setPayError('Minimum deposit is ₹1');
      return;
    }
    if (effectiveAmount > 5_000_000) {
      setPayError('Maximum single deposit is ₹50,000');
      return;
    }

    setPaying(true);
    try {
      // Load Razorpay script lazily
      await loadRazorpayScript();

      // Create order on backend
      const orderRes = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount_paise: effectiveAmount }),
      });
      if (!orderRes.ok) {
        const d = await orderRes.json().catch(() => ({})) as { error?: string };
        throw new Error(d.error ?? 'Failed to create order');
      }
      const { order_id, amount, currency, key_id } = await orderRes.json() as {
        order_id: string; amount: number; currency: string; key_id: string;
      };

      // Detect test mode from key prefix
      if (key_id?.startsWith('rzp_test_')) setIsTestMode(true);

      // Open Razorpay modal
      const rzp = new window.Razorpay({
        key: key_id,
        amount,
        currency,
        name: 'TRICCI',
        description: 'Wallet Top-up',
        order_id,
        prefill: { name: userName, email: userEmail },
        theme: { color: '#E8470A' },
        modal: {
          ondismiss: () => {
            setPaying(false);
            setPayError('Payment cancelled. Your money was not charged.');
          },
        },
        handler: async (response: RazorpayResponse) => {
          try {
            const verifyRes = await fetch('/api/payments/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });
            if (!verifyRes.ok) {
              const d = await verifyRes.json().catch(() => ({})) as { error?: string };
              throw new Error(d.error ?? 'Verification failed');
            }
            setLastSuccess({
              amount: `₹${formatRupees(effectiveAmount)}`,
              paymentId: response.razorpay_payment_id,
            });
            await fetchWallet(); // refresh balance
          } catch (err) {
            setPayError(err instanceof Error ? err.message : 'Payment verification failed. Contact support.');
          } finally {
            setPaying(false);
          }
        },
      });

      rzp.on('payment.failed', (response) => {
        setPayError(`Payment failed: ${response.error.description}`);
        setPaying(false);
      });

      rzp.open();
    } catch (err) {
      setPayError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setPaying(false);
    }
  }

  function copyToClipboard(text: string, field: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    }).catch(() => {});
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Balance card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative overflow-hidden rounded-2xl border border-[#E8470A]/30 bg-gradient-to-br from-[#E8470A]/10 via-card to-[#6B4FBB]/10 p-6"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[#E8470A]/5 to-transparent pointer-events-none" />
        <div className="relative flex items-start justify-between">
          <div>
            <p className="text-xs font-bold tracking-widest text-muted-foreground uppercase mb-1">Wallet Balance</p>
            {loading ? (
              <div className="h-10 w-32 rounded-lg bg-muted animate-pulse" />
            ) : (
              <p className="text-4xl font-black text-foreground">
                ₹{formatRupees(wallet?.balance_paise ?? 0)}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">Available credits for TRICCI services</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-[#E8470A]/15 border border-[#E8470A]/30 flex items-center justify-center">
            <Wallet size={22} className="text-[#E8470A]" />
          </div>
        </div>
        <button
          onClick={fetchWallet}
          disabled={loading}
          className="absolute top-4 right-16 p-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
          title="Refresh balance"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </motion.div>

      {/* Success banner */}
      {lastSuccess && (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-start gap-3 rounded-xl bg-green-500/10 border border-green-500/25 px-4 py-3"
        >
          <CheckCircle2 size={16} className="text-green-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-bold text-green-400">{lastSuccess.amount} added successfully!</p>
            <p className="text-xs text-muted-foreground mt-0.5">Payment ID: <span className="font-mono">{lastSuccess.paymentId}</span></p>
          </div>
          <button onClick={() => setLastSuccess(null)} className="ml-auto text-muted-foreground hover:text-foreground">
            <XCircle size={14} />
          </button>
        </motion.div>
      )}

      {/* ── Test-mode banner ── */}
      {isTestMode && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-yellow-500/30 bg-yellow-500/8 p-4 space-y-3"
        >
          <div className="flex items-center gap-2">
            <FlaskConical size={14} className="text-yellow-400 shrink-0" />
            <p className="text-xs font-bold text-yellow-300 uppercase tracking-wider">Test Mode — Use these credentials</p>
          </div>
          <div className="grid grid-cols-1 gap-2 text-xs">
            {[
              { label: 'Card number', value: '5267 3181 8797 5449' },
              { label: 'Expiry', value: '12/26' },
              { label: 'CVV', value: '123' },
              { label: 'UPI (success)', value: 'success@razorpay' },
              { label: 'UPI (failure)', value: 'failure@razorpay' },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between bg-black/20 rounded-lg px-3 py-1.5">
                <span className="text-muted-foreground">{label}</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-yellow-200">{value}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(value.replace(/\s/g, ''), label)}
                    className="text-muted-foreground hover:text-yellow-300 transition-colors"
                    title="Copy"
                  >
                    {copiedField === label ? <Check size={11} className="text-green-400" /> : <Copy size={11} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">⚠️ Do NOT use <code className="bg-black/30 px-1 rounded">4111 1111 1111 1111</code> — that's an international card and will be rejected in test mode.</p>
        </motion.div>
      )}

      {/* Top-up section */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Plus size={16} className="text-[#E8470A]" />
          <h3 className="font-bold text-foreground text-sm">Add Credits</h3>
        </div>

        {/* Preset amounts */}
        <div className="grid grid-cols-4 gap-2">
          {PRESETS.map(p => (
            <button
              key={p.paise}
              onClick={() => { setSelectedPreset(p.paise); setCustomAmount(''); }}
              className={`py-2.5 rounded-xl text-sm font-bold border transition-all ${
                selectedPreset === p.paise && !customAmount
                  ? 'bg-[#E8470A] text-white border-[#E8470A] shadow-sm'
                  : 'bg-muted border-border text-muted-foreground hover:text-foreground hover:border-[#E8470A]/40'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Custom amount */}
        <div className="relative">
          <IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="number"
            min="1"
            max="50000"
            placeholder="Custom amount (e.g. 3000)"
            value={customAmount}
            onChange={e => { setCustomAmount(e.target.value); setSelectedPreset(0); }}
            className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#E8470A]/60 focus:ring-1 focus:ring-[#E8470A]/30 transition-colors"
          />
        </div>

        {/* Error */}
        {payError && (
          <div className="flex items-start gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            <AlertCircle size={13} className="mt-0.5 shrink-0" />
            {payError}
          </div>
        )}

        {/* Pay button */}
        <button
          onClick={handleTopUp}
          disabled={paying || !effectiveAmount || effectiveAmount < 100}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-[#E8470A] to-[#6B4FBB] text-white font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-40 shadow-sm"
        >
          {paying ? (
            <><Loader2 size={15} className="animate-spin" /> Processing…</>
          ) : (
            <><Plus size={15} /> Add {effectiveAmount >= 100 ? `₹${formatRupees(effectiveAmount)}` : 'Credits'} via Razorpay</>
          )}
        </button>

        <p className="text-[11px] text-muted-foreground text-center">
          Secured by Razorpay · UPI, Cards, Net Banking, Wallets accepted
        </p>
      </div>

      {/* Transaction history */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h3 className="font-bold text-foreground text-sm">Transaction History</h3>
          {wallet && <span className="text-xs text-muted-foreground">{wallet.transactions.length} records</span>}
        </div>

        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="p-6 text-center text-sm text-muted-foreground">{error}</div>
        ) : !wallet?.transactions.length ? (
          <div className="p-8 text-center">
            <Wallet size={32} className="mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No transactions yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Your deposits will appear here</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {wallet.transactions.map(tx => (
              <div key={tx.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    tx.status === 'paid' ? 'bg-green-500/15' :
                    tx.status === 'failed' ? 'bg-red-500/15' : 'bg-yellow-500/15'
                  }`}>
                    {tx.status === 'paid' ? <CheckCircle2 size={14} className="text-green-400" /> :
                     tx.status === 'failed' ? <XCircle size={14} className="text-red-400" /> :
                     <Clock size={14} className="text-yellow-400" />}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">₹{formatRupees(tx.amount_paise)}</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {tx.razorpay_payment_id ?? tx.razorpay_order_id.slice(0, 20) + '…'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                    tx.status === 'paid' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                    tx.status === 'failed' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                    'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                  }`}>
                    {tx.status === 'paid' ? 'Paid' : tx.status === 'failed' ? 'Failed' : 'Pending'}
                  </span>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(tx.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
