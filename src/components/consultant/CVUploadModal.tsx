/**
 * Enhanced CV Upload Modal
 * - CV upload is FIRST priority
 * - Auto-parses CV and pre-fills fields
 * - Manual fields are OPTIONAL if CV parsing succeeds
 * - City selection auto-fills state
 */

import { useState, useRef } from 'react';
import { motion } from 'motion/react';
import {
  Upload, X, Loader2, Sparkles, AlertCircle, CheckCircle,
  MapPin
} from 'lucide-react';
import { getStateFromCity, getAllCities } from '@/lib/city-state-mapping';

interface CVUploadModalProps {
  onClose: () => void;
  onSuccess: (candidateData: CandidateData) => void;
}

export interface CandidateData {
  name: string;
  email: string;
  phone: string;
  currentRole: string;
  currentCTC: string;
  expectedCTC: string;
  experience: string;
  location: string; // City
  state?: string;
  skills: string[];
  fileName: string;
}

export default function CVUploadModal({ onClose, onSuccess }: CVUploadModalProps) {
  const [step, setStep] = useState<'upload' | 'review'>('upload');
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState('');
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);

  // Parsed data
  const [parsedData, setParsedData] = useState<Partial<CandidateData> | null>(null);

  // Manual fields (optional, only required if CV parsing fails)
  const [formData, setFormData] = useState<Partial<CandidateData>>({
    name: '',
    email: '',
    phone: '',
    currentRole: '',
    currentCTC: '',
    expectedCTC: '',
    experience: '',
    location: '',
    state: '',
    skills: [],
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle CV file selection
  async function handleCVUpload(file: File) {
    setParseError('');
    setCvFile(file);
    await parseCV(file);
  }

  // Parse CV using backend
  async function parseCV(file: File) {
    setParsing(true);
    try {
      const fd = new FormData();
      fd.append('cv', file);

      const res = await fetch('/api/consultant/cv-bank/parse', {
        method: 'POST',
        body: fd,
      });

      const data = await res.json();

      if (!res.ok || !data.parsed) {
        setParseError(
          data.reason === 'no_text'
            ? 'Could not extract text. Try a different format (PDF, Word).'
            : 'Could not parse CV automatically. Please fill details manually.'
        );
        setStep('review');
        return;
      }

      const parsed = data.parsed as Partial<CandidateData>;
      setParsedData(parsed);

      // Auto-fill form with parsed data
      setFormData(prev => ({
        ...prev,
        name: parsed.name || prev.name,
        email: parsed.email || prev.email,
        phone: parsed.phone || prev.phone,
        currentRole: parsed.currentRole || prev.currentRole,
        currentCTC: parsed.currentCTC || prev.currentCTC,
        expectedCTC: parsed.expectedCTC || prev.expectedCTC,
        experience: parsed.experience || prev.experience,
        location: parsed.location || prev.location,
        // Auto-fill state based on parsed location (city)
        state: parsed.location
          ? getStateFromCity(parsed.location)
          : prev.state,
        skills: Array.isArray(parsed.skills)
          ? parsed.skills
          : prev.skills,
      }));

      setStep('review');
    } catch (err) {
      console.error('CV parse error:', err);
      setParseError('Something went wrong. Please try again.');
      setStep('review');
    } finally {
      setParsing(false);
    }
  }

  // Handle city change to auto-fill state
  function handleCityChange(city: string) {
    setFormData(prev => ({
      ...prev,
      location: city,
      // Auto-fill state based on city
      state: getStateFromCity(city),
    }));
  }

  // Save candidate
  function handleSave() {
    // Validate required fields
    if (!formData.name?.trim()) {
      setParseError('Full name is required');
      return;
    }

    if (!formData.email?.trim() && !parsedData?.email) {
      setParseError('Email is required');
      return;
    }

    const candidateData: CandidateData = {
      name: formData.name || parsedData?.name || '',
      email: formData.email || parsedData?.email || '',
      phone: formData.phone || parsedData?.phone || '',
      currentRole: formData.currentRole || parsedData?.currentRole || '',
      currentCTC: formData.currentCTC || parsedData?.currentCTC || '',
      expectedCTC: formData.expectedCTC || parsedData?.expectedCTC || '',
      experience: formData.experience || parsedData?.experience || '',
      location: formData.location || parsedData?.location || '',
      state: formData.state || '',
      skills: Array.isArray(formData.skills)
        ? formData.skills
        : (Array.isArray(parsedData?.skills) ? parsedData.skills : []),
      fileName: cvFile?.name || '',
    };

    onSuccess(candidateData);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="relative bg-card border border-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-card">
          <h2 className="text-xl font-black text-foreground">
            {step === 'upload' ? 'Upload CV' : 'Review & Complete'}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* STEP 1: CV Upload */}
          {step === 'upload' && (
            <div className="space-y-4">
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles size={16} className="text-primary" />
                  <p className="text-sm font-semibold text-foreground">
                    Upload CV (PDF, Word)
                  </p>
                </div>
                <p className="text-xs text-muted-foreground mb-4">
                  We'll automatically extract details from your CV. You can review and edit before saving.
                </p>

                {/* Drag & Drop Area */}
                <div
                  onDragOver={e => {
                    e.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={e => {
                    e.preventDefault();
                    setDragging(false);
                    const files = e.dataTransfer.files;
                    if (files[0]) handleCVUpload(files[0]);
                  }}
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                    dragging
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50 hover:bg-muted/30'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx"
                    className="hidden"
                    onChange={e => {
                      const f = e.target.files?.[0];
                      if (f) handleCVUpload(f);
                    }}
                  />

                  <div onClick={() => fileInputRef.current?.click()}>
                    {parsing ? (
                      <>
                        <Loader2 size={32} className="mx-auto text-primary animate-spin mb-2" />
                        <p className="text-sm font-semibold text-foreground">Parsing CV...</p>
                      </>
                    ) : cvFile ? (
                      <>
                        <CheckCircle size={32} className="mx-auto text-green-600 mb-2" />
                        <p className="text-sm font-semibold text-foreground">{cvFile.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">Click to change</p>
                      </>
                    ) : (
                      <>
                        <Upload size={32} className="mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm font-semibold text-foreground">Drop CV here</p>
                        <p className="text-xs text-muted-foreground">or click to browse</p>
                      </>
                    )}
                  </div>
                </div>

                {/* Error */}
                {parseError && cvFile && (
                  <div className="flex gap-2 mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                    <AlertCircle size={16} className="text-yellow-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-yellow-600">{parseError}</p>
                  </div>
                )}

                {/* Next Button */}
                {cvFile && (
                  <button
                    onClick={() => setStep('review')}
                    className="w-full mt-4 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
                  >
                    {parsing ? 'Parsing...' : 'Continue to Review'}
                  </button>
                )}
              </div>

              {/* Help Text */}
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-xs text-muted-foreground">
                  💡 <strong>Tip:</strong> Upload a clear CV in PDF or Word format for best results. We extract name, email, experience, skills, and more automatically.
                </p>
              </div>
            </div>
          )}

          {/* STEP 2: Review & Manual Fill */}
          {step === 'review' && (
            <div className="space-y-4">
              {/* Parsed Data Info */}
              {parsedData && !parseError && (
                <div className="flex gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <CheckCircle size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-green-600">
                    ✓ CV parsed successfully. Review the details below.
                  </p>
                </div>
              )}

              {/* Form Fields */}
              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label className="text-sm font-semibold text-foreground mb-1.5 block">
                    Full Name *
                  </label>
                  <input
                    value={formData.name || ''}
                    onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                    placeholder="As it appears in CV"
                    className="w-full bg-muted border border-border rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                  />
                </div>

                {/* Email & Phone */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-foreground mb-1.5 block">
                      Email
                    </label>
                    <input
                      value={formData.email || ''}
                      onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                      placeholder="candidate@email.com"
                      type="email"
                      className="w-full bg-muted border border-border rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-foreground mb-1.5 block">
                      Phone
                    </label>
                    <input
                      value={formData.phone || ''}
                      onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))}
                      placeholder="+91-9876543210"
                      className="w-full bg-muted border border-border rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>
                </div>

                {/* Current Role & Experience */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-foreground mb-1.5 block">
                      Current Role
                    </label>
                    <input
                      value={formData.currentRole || ''}
                      onChange={e => setFormData(p => ({ ...p, currentRole: e.target.value }))}
                      placeholder="Senior Engineer"
                      className="w-full bg-muted border border-border rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-foreground mb-1.5 block">
                      Experience (years)
                    </label>
                    <input
                      value={formData.experience || ''}
                      onChange={e => setFormData(p => ({ ...p, experience: e.target.value }))}
                      placeholder="5"
                      className="w-full bg-muted border border-border rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>
                </div>

                {/* CTC */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-foreground mb-1.5 block">
                      Current CTC (LPA)
                    </label>
                    <input
                      value={formData.currentCTC || ''}
                      onChange={e => setFormData(p => ({ ...p, currentCTC: e.target.value }))}
                      placeholder="12"
                      className="w-full bg-muted border border-border rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-foreground mb-1.5 block">
                      Expected CTC (LPA)
                    </label>
                    <input
                      value={formData.expectedCTC || ''}
                      onChange={e => setFormData(p => ({ ...p, expectedCTC: e.target.value }))}
                      placeholder="18"
                      className="w-full bg-muted border border-border rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>
                </div>

                {/* Location & State */}
                <div>
                  <label className="text-sm font-semibold text-foreground mb-1.5 block flex items-center gap-1">
                    <MapPin size={14} /> City
                  </label>
                  <input
                    list="cities"
                    value={formData.location || ''}
                    onChange={e => handleCityChange(e.target.value)}
                    placeholder="Mumbai, Bangalore, etc."
                    className="w-full bg-muted border border-border rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                  />
                  <datalist id="cities">
                    {[
                      'Mumbai', 'Bangalore', 'Hyderabad', 'Delhi', 'Pune', 'Chennai',
                      'Kolkata', 'Ahmedabad', 'Surat', 'Jaipur', 'Lucknow', 'Kanpur',
                      'Nagpur', 'Indore', 'Thane', 'Bhopal', 'Visakhapatnam', 'Vadodara',
                      'Ghaziabad', 'Ludhiana', 'Coimbatore', 'Kochi', 'Chandigarh', 'Gurgaon'
                    ].map(city => (
                      <option key={city} value={city} />
                    ))}
                  </datalist>
                </div>

                {/* State (Auto-filled) */}
                <div>
                  <label className="text-sm font-semibold text-foreground mb-1.5 block text-muted-foreground">
                    State (Auto-filled)
                  </label>
                  <input
                    value={formData.state || ''}
                    readOnly
                    placeholder="Select a city first"
                    className="w-full bg-muted/50 border border-border rounded-lg px-4 py-2.5 text-sm text-muted-foreground cursor-not-allowed"
                  />
                  {formData.state && (
                    <p className="text-xs text-green-600 mt-1">✓ Auto-filled from city</p>
                  )}
                </div>

                {/* Skills */}
                <div>
                  <label className="text-sm font-semibold text-foreground mb-1.5 block">
                    Key Skills
                  </label>
                  <textarea
                    value={Array.isArray(formData.skills) ? formData.skills.join(', ') : ''}
                    onChange={e =>
                      setFormData(p => ({
                        ...p,
                        skills: e.target.value
                          .split(',')
                          .map(s => s.trim())
                          .filter(s => s),
                      }))
                    }
                    placeholder="React, TypeScript, Node.js..."
                    rows={2}
                    className="w-full bg-muted border border-border rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors resize-none"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Separate skills with commas
                  </p>
                </div>
              </div>

              {/* Error */}
              {parseError && (
                <div className="flex gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <AlertCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-600">{parseError}</p>
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setStep('upload')}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-border text-foreground font-semibold text-sm hover:bg-muted transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
                >
                  Add to CV Bank
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
