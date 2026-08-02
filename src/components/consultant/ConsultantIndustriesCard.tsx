/**
 * ConsultantIndustriesCard — points 23-24: after signing the agreement,
 * consultants must complete their profile with industries of expertise,
 * plus a separate dropdown for industries they want to work in.
 */
import { useState, useEffect } from 'react';
import { Loader2, CheckCircle2, Briefcase } from 'lucide-react';

const INDUSTRIES = [
  'IT & Software', 'BFSI (Banking/Finance/Insurance)', 'Healthcare & Pharma',
  'E-commerce & Retail', 'Manufacturing', 'EdTech', 'FMCG', 'Real Estate & Construction',
  'Telecom', 'Media & Entertainment', 'Logistics & Supply Chain', 'Automotive',
  'Energy & Utilities', 'Hospitality & Travel', 'Legal', 'Government / Public Sector',
];

function IndustryPicker({ label, selected, onChange }: { label: string; selected: string[]; onChange: (v: string[]) => void }) {
  function toggle(industry: string) {
    onChange(selected.includes(industry) ? selected.filter(i => i !== industry) : [...selected, industry]);
  }
  return (
    <div>
      <p className="text-xs font-semibold text-white/50 mb-2">{label}</p>
      <div className="flex flex-wrap gap-2">
        {INDUSTRIES.map(ind => (
          <button
            key={ind}
            type="button"
            onClick={() => toggle(ind)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              selected.includes(ind)
                ? 'bg-primary/15 border-primary/40 text-primary font-semibold'
                : 'bg-white/5 border-white/10 text-white/50 hover:border-white/20'
            }`}
          >
            {ind}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ConsultantIndustriesCard() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [specialisation, setSpecialisation] = useState('');
  const [yearsExperience, setYearsExperience] = useState('');
  const [expertise, setExpertise] = useState<string[]>([]);
  const [interested, setInterested] = useState<string[]>([]);

  useEffect(() => {
    fetch('/api/consultant/profile')
      .then(r => r.json())
      .then(d => {
        setSpecialisation(d.specialisation || '');
        setYearsExperience(d.yearsExperience != null ? String(d.yearsExperience) : '');
        setExpertise(d.industriesExpertise || []);
        setInterested(d.industriesInterested || []);
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch('/api/consultant/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          specialisation,
          yearsExperience: yearsExperience ? Number(yearsExperience) : undefined,
          industriesExpertise: expertise,
          industriesInterested: interested,
        }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-[#111] border border-white/10 rounded-2xl p-6 flex justify-center">
        <Loader2 size={20} className="animate-spin text-white/40" />
      </div>
    );
  }

  return (
    <div className="bg-[#111] border border-white/10 rounded-2xl p-6 space-y-5">
      <div className="flex items-center gap-2">
        <Briefcase size={16} className="text-primary" />
        <h3 className="text-sm font-bold text-white">Industry Expertise</h3>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-white/40 mb-1">Specialisation</label>
          <input
            value={specialisation}
            onChange={e => setSpecialisation(e.target.value)}
            placeholder="e.g. Tech recruitment"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30"
          />
        </div>
        <div>
          <label className="block text-xs text-white/40 mb-1">Years of Experience</label>
          <input
            type="number" min="0"
            value={yearsExperience}
            onChange={e => setYearsExperience(e.target.value)}
            placeholder="e.g. 5"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30"
          />
        </div>
      </div>

      <IndustryPicker label="Industries of Expertise" selected={expertise} onChange={setExpertise} />
      <IndustryPicker label="Industries You Want to Work In" selected={interested} onChange={setInterested} />

      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 bg-primary text-primary-foreground text-sm font-bold px-4 py-2.5 rounded-xl disabled:opacity-60"
      >
        {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <CheckCircle2 size={14} /> : null}
        {saving ? 'Saving...' : saved ? 'Saved' : 'Save Changes'}
      </button>
    </div>
  );
}
