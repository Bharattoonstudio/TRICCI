import { useState, useRef, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Upload, Search, Download, Trash2, User, FileText,
  Phone, Mail, Briefcase, MapPin, Star, Plus, X,
  CheckCircle, Clock, Eye, Sparkles, Loader2
} from 'lucide-react';
import SubmitToJobModal from './SubmitToJobModal';

// ─── Types ────────────────────────────────────────────────────────────────────
interface CVEntry {
  id: string;
  name: string;
  email: string;
  phone: string;
  currentRole: string;
  currentCTC: string;
  expectedCTC: string;
  experience: string;
  location: string;
  skills: string[];
  tags: string[];
  uploadedAt: string;
  fileName: string;
  fileSize: string;
  starred: boolean;
  notes: string;
}

// ─── CV Bank starts empty — consultants add their own candidates ──────────────
const SEED_CVS: CVEntry[] = [];

// ─── Tag pill ─────────────────────────────────────────────────────────────────
function TagPill({ label, onRemove }: { label: string; onRemove?: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs bg-secondary/15 text-secondary border border-secondary/20 px-2 py-0.5 rounded-full font-semibold">
      {label}
      {onRemove && (
        <button onClick={onRemove} className="hover:text-red-400 transition-colors">
          <X size={10} />
        </button>
      )}
    </span>
  );
}

// ─── CV Detail Drawer ─────────────────────────────────────────────────────────
function CVDetailDrawer({ cv, onClose, onUpdate }: { cv: CVEntry; onClose: () => void; onUpdate: (cv: CVEntry) => void }) {
  const [notes, setNotes] = useState(cv.notes);
  const [newTag, setNewTag] = useState('');

  function addTag() {
    if (!newTag.trim() || cv.tags.includes(newTag.trim())) return;
    onUpdate({ ...cv, tags: [...cv.tags, newTag.trim()] });
    setNewTag('');
  }

  function removeTag(tag: string) {
    onUpdate({ ...cv, tags: cv.tags.filter(t => t !== tag) });
  }

  function saveNotes() {
    onUpdate({ ...cv, notes });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="relative bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-border">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center border border-border">
              <span className="text-xl font-black text-foreground">{cv.name.split(' ').map(n => n[0]).join('')}</span>
            </div>
            <div>
              <h2 className="text-xl font-black text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>{cv.name}</h2>
              <p className="text-sm text-muted-foreground">{cv.currentRole} &middot; {cv.location}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground">
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Contact */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: Mail, label: 'Email', value: cv.email },
              { icon: Phone, label: 'Phone', value: cv.phone },
              { icon: Briefcase, label: 'Current CTC', value: cv.currentCTC },
              { icon: Star, label: 'Expected CTC', value: cv.expectedCTC },
              { icon: Clock, label: 'Experience', value: cv.experience },
              { icon: MapPin, label: 'Location', value: cv.location },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-3 p-3 bg-muted/40 rounded-xl border border-border">
                <Icon size={14} className="text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-sm font-semibold text-foreground">{value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Skills */}
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Skills</p>
            <div className="flex flex-wrap gap-2">
              {cv.skills.map(s => (
                <span key={s} className="text-xs bg-muted text-muted-foreground px-2.5 py-1 rounded-lg border border-border">{s}</span>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Tags</p>
            <div className="flex flex-wrap gap-2 mb-3">
              {cv.tags.map(tag => <TagPill key={tag} label={tag} onRemove={() => removeTag(tag)} />)}
            </div>
            <div className="flex gap-2">
              <input
                value={newTag}
                onChange={e => setNewTag(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addTag()}
                placeholder="Add a tag..."
                className="flex-1 bg-muted border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
              />
              <button onClick={addTag} className="px-3 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:opacity-90 transition-opacity">
                <Plus size={14} />
              </button>
            </div>
          </div>

          {/* Notes */}
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Notes</p>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Add notes about this candidate..."
              className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors resize-none"
            />
            <button onClick={saveNotes} className="mt-2 text-xs text-primary font-semibold hover:underline">Save notes</button>
          </div>

          {/* File info */}
          <div className="flex items-center justify-between p-4 bg-muted/40 rounded-xl border border-border">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-red-500/15 flex items-center justify-center">
                <FileText size={16} className="text-red-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{cv.fileName}</p>
                <p className="text-xs text-muted-foreground">{cv.fileSize} &middot; Uploaded {cv.uploadedAt}</p>
              </div>
            </div>
            <button className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-bold hover:opacity-90 transition-opacity">
              <Download size={13} /> Download
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ConsultantCVBank() {
  const [cvs, setCVs] = useState<CVEntry[]>(SEED_CVS);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [selectedCV, setSelectedCV] = useState<CVEntry | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  interface BackendCvEntry {
    id: number; name: string; email: string; phone: string | null; currentRole: string | null;
    currentCTC: string | null; expectedCTC: string | null; experience: string | null; location: string | null;
    skills: string[] | null; tags: string[] | null; notes: string | null; starred: boolean; createdAt: string;
  }
  function fromBackend(e: BackendCvEntry): CVEntry {
    return {
      id: String(e.id), name: e.name, email: e.email, phone: e.phone ?? '',
      currentRole: e.currentRole ?? '', currentCTC: e.currentCTC ?? '', expectedCTC: e.expectedCTC ?? '',
      experience: e.experience ?? '', location: e.location ?? '', skills: e.skills ?? [], tags: e.tags ?? [],
      uploadedAt: new Date(e.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
      fileName: `${e.name.toLowerCase().replace(/\s+/g, '_')}_cv.pdf`, fileSize: '—',
      starred: e.starred, notes: e.notes ?? '',
    };
  }

  useEffect(() => {
    fetch('/api/consultant/cv-bank')
      .then(r => r.json())
      .then((d: { entries?: BackendCvEntry[] }) => setCVs((d.entries ?? []).map(fromBackend)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // New CV form
  const [newCV, setNewCV] = useState({
    name: '', email: '', phone: '', currentRole: '', currentCTC: '',
    expectedCTC: '', experience: '', location: '', skills: '', notes: '',
  });

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    cvs.forEach(cv => cv.tags.forEach(t => tags.add(t)));
    return Array.from(tags).sort();
  }, [cvs]);

  const filteredCVs = useMemo(() => {
    let list = cvs;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(cv =>
        cv.name.toLowerCase().includes(q) ||
        cv.currentRole.toLowerCase().includes(q) ||
        cv.skills.some(s => s.toLowerCase().includes(q)) ||
        cv.location.toLowerCase().includes(q) ||
        cv.tags.some(t => t.toLowerCase().includes(q))
      );
    }
    if (tagFilter) {
      list = list.filter(cv => cv.tags.includes(tagFilter));
    }
    return list;
  }, [cvs, searchQuery, tagFilter]);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    // In real app: parse the file
    setShowUpload(true);
  }

  async function handleAddCV() {
    if (!newCV.name || !newCV.email) return;
    try {
      const res = await fetch('/api/consultant/cv-bank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newCV,
          skills: newCV.skills.split(',').map(s => s.trim()).filter(Boolean),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setCVs(prev => [fromBackend(data.entry), ...prev]);
        setNewCV({ name: '', email: '', phone: '', currentRole: '', currentCTC: '', expectedCTC: '', experience: '', location: '', skills: '', notes: '' });
        setShowUpload(false);
      }
    } catch { /* silent */ }
  }

  async function toggleStar(id: string) {
    const cv = cvs.find(c => c.id === id);
    if (!cv) return;
    setCVs(prev => prev.map(c => c.id === id ? { ...c, starred: !c.starred } : c));
    fetch(`/api/consultant/cv-bank/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ starred: !cv.starred }),
    }).catch(() => {});
  }

  async function deleteCV(id: string) {
    setCVs(prev => prev.filter(cv => cv.id !== id));
    fetch(`/api/consultant/cv-bank/${id}`, { method: 'DELETE' }).catch(() => {});
  }

  function exportCVBank() {
    const headers = ['Name', 'Email', 'Phone', 'Current Role', 'Current CTC', 'Expected CTC', 'Experience', 'Location', 'Skills', 'Tags', 'Notes', 'Uploaded'];
    const rows = cvs.map(cv => [
      cv.name, cv.email, cv.phone, cv.currentRole, cv.currentCTC, cv.expectedCTC,
      cv.experience, cv.location, cv.skills.join('; '), cv.tags.join('; '), cv.notes, cv.uploadedAt,
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tricci-cv-bank-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadBulkTemplate() {
    const headers = ['Name', 'Email', 'Phone', 'Current Role', 'Current CTC', 'Expected CTC', 'Experience', 'Location', 'Skills'];
    const sample = ['Jane Doe', 'jane@example.com', '9876543210', 'Software Engineer', '12', '18', '5', 'Bangalore', 'React; Node.js; TypeScript'];
    const csv = [headers, sample].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tricci-bulk-upload-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  // Minimal, safe CSV parser (handles quoted fields containing commas) —
  // deliberately hand-rolled rather than adding a new npm dependency
  // (papaparse etc.) this late for a simple, well-defined format.
  function parseCsv(text: string): string[][] {
    const rows: string[][] = [];
    let row: string[] = [];
    let field = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (inQuotes) {
        if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
        else if (c === '"') { inQuotes = false; }
        else { field += c; }
      } else {
        if (c === '"') inQuotes = true;
        else if (c === ',') { row.push(field); field = ''; }
        else if (c === '\n' || c === '\r') {
          if (c === '\r' && text[i + 1] === '\n') i++;
          row.push(field); field = '';
          if (row.some(f => f.trim() !== '')) rows.push(row);
          row = [];
        } else { field += c; }
      }
    }
    if (field !== '' || row.length > 0) { row.push(field); rows.push(row); }
    return rows;
  }

  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkResult, setBulkResult] = useState<{ added: number; skippedInvalid: number; skippedDuplicate: number } | null>(null);
  const bulkFileInputRef = useRef<HTMLInputElement>(null);

  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState('');
  const parseFileInputRef = useRef<HTMLInputElement>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showSubmitToJob, setShowSubmitToJob] = useState(false);

  async function handleParseResume(file: File) {
    setParsing(true);
    setParseError('');
    try {
      const fd = new FormData();
      fd.append('cv', file);
      const res = await fetch('/api/consultant/cv-bank/parse', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) {
        setParseError('Could not parse this resume. Please fill the fields manually.');
        return;
      }
      if (!data.parsed) {
        setParseError(
          data.reason === 'no_text' ? 'Could not extract text from this file — try a different format.' :
          'Could not parse this resume automatically. Please fill the fields manually.'
        );
        return;
      }
      const p = data.parsed as Record<string, unknown>;
      setNewCV(f => ({
        ...f,
        name: typeof p.name === 'string' ? p.name : f.name,
        email: typeof p.email === 'string' ? p.email : f.email,
        phone: typeof p.phone === 'string' ? p.phone : f.phone,
        currentRole: typeof p.currentRole === 'string' ? p.currentRole : f.currentRole,
        currentCTC: typeof p.currentCTC === 'string' ? p.currentCTC : f.currentCTC,
        expectedCTC: typeof p.expectedCTC === 'string' ? p.expectedCTC : f.expectedCTC,
        experience: typeof p.experience === 'string' ? p.experience : f.experience,
        location: typeof p.location === 'string' ? p.location : f.location,
        skills: Array.isArray(p.skills) ? p.skills.join(', ') : f.skills,
      }));
    } catch {
      setParseError('Something went wrong parsing the resume. Please fill the fields manually.');
    } finally {
      setParsing(false);
      if (parseFileInputRef.current) parseFileInputRef.current.value = '';
    }
  }

  async function handleBulkFile(file: File) {
    setBulkUploading(true);
    setBulkResult(null);
    try {
      const text = await file.text();
      const rows = parseCsv(text);
      if (rows.length < 2) { setBulkUploading(false); return; }
      const headers = rows[0].map(h => h.trim().toLowerCase());
      const idx = (name: string) => headers.indexOf(name);
      const entries = rows.slice(1).map(r => ({
        name: r[idx('name')]?.trim(),
        email: r[idx('email')]?.trim(),
        phone: r[idx('phone')]?.trim(),
        currentRole: r[idx('current role')]?.trim(),
        currentCTC: r[idx('current ctc')]?.trim(),
        expectedCTC: r[idx('expected ctc')]?.trim(),
        experience: r[idx('experience')]?.trim(),
        location: r[idx('location')]?.trim(),
        skills: r[idx('skills')]?.split(';').map(s => s.trim()).filter(Boolean) ?? [],
      }));

      const res = await fetch('/api/consultant/cv-bank/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries }),
      });
      if (res.ok) {
        const data = await res.json();
        setBulkResult(data);
        // Reload CV bank
        fetch('/api/consultant/cv-bank').then(r => r.json()).then((d: { entries?: BackendCvEntry[] }) => setCVs((d.entries ?? []).map(fromBackend)));
      }
    } catch { /* silent */ }
    finally {
      setBulkUploading(false);
      if (bulkFileInputRef.current) bulkFileInputRef.current.value = '';
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-black text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>My CV Bank</h3>
          <p className="text-sm text-muted-foreground">{cvs.length} candidates stored &middot; Your private talent pool</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCVBank}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-card border border-border text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
            <Download size={14} /> Export
          </button>
          <input
            ref={bulkFileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleBulkFile(f); }}
          />
          <button onClick={() => bulkFileInputRef.current?.click()}
            disabled={bulkUploading}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-card border border-border text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50">
            <Upload size={14} /> {bulkUploading ? 'Uploading…' : 'Bulk Upload (CSV)'}
          </button>
          <button onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity">
            <Plus size={14} /> Add Candidate
          </button>
          {selectedIds.size > 0 && (
            <button onClick={() => setShowSubmitToJob(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-bold hover:bg-green-500 transition-colors">
              <Briefcase size={14} /> Submit {selectedIds.size} to Job
            </button>
          )}
        </div>
      </div>

      {bulkResult && (
        <div className="flex items-center justify-between gap-3 bg-primary/5 border border-primary/20 rounded-xl px-4 py-3">
          <p className="text-sm text-foreground">
            <span className="font-bold">{bulkResult.added}</span> candidates added
            {bulkResult.skippedDuplicate > 0 && <span className="text-muted-foreground">, {bulkResult.skippedDuplicate} duplicate{bulkResult.skippedDuplicate === 1 ? '' : 's'} skipped</span>}
            {bulkResult.skippedInvalid > 0 && <span className="text-muted-foreground">, {bulkResult.skippedInvalid} invalid row{bulkResult.skippedInvalid === 1 ? '' : 's'} skipped</span>}
          </p>
          <button onClick={() => setBulkResult(null)} className="text-xs text-muted-foreground hover:text-foreground">Dismiss</button>
        </div>
      )}
      <button onClick={downloadBulkTemplate} className="text-xs text-primary hover:underline -mt-2">
        Download CSV template for bulk upload
      </button>

      {/* Search + Tag filter */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by name, role, skill, location..."
            className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
          />
        </div>
        <select
          value={tagFilter}
          onChange={e => setTagFilter(e.target.value)}
          className="bg-card border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
        >
          <option value="">All Tags</option>
          {allTags.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
          dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/30'
        }`}
      >
        <Upload size={24} className="text-muted-foreground mx-auto mb-2" />
        <p className="text-sm font-semibold text-foreground">Drop CV files here or click to upload</p>
        <p className="text-xs text-muted-foreground mt-1">PDF, DOC, DOCX supported</p>
        <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={() => setShowUpload(true)} />
      </div>

      {/* CV Cards */}
      <div className="grid gap-3">
        {loading && (
          <div className="col-span-full flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        )}
        {!loading && filteredCVs.length === 0 && (
          <div className="py-16 text-center bg-card border border-border rounded-2xl">
            <User size={32} className="text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-muted-foreground text-sm">No candidates found.</p>
          </div>
        )}
        {filteredCVs.map(cv => (
          <motion.div
            key={cv.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border rounded-2xl p-5 hover:border-primary/30 transition-colors group"
          >
            <div className="flex items-start gap-4">
              {/* Selection checkbox */}
              <input
                type="checkbox"
                checked={selectedIds.has(cv.id)}
                onChange={() => setSelectedIds(prev => { const s = new Set(prev); s.has(cv.id) ? s.delete(cv.id) : s.add(cv.id); return s; })}
                className="mt-1 w-4 h-4 rounded border-border shrink-0"
              />
              {/* Avatar */}
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center border border-border shrink-0">
                <span className="text-sm font-black text-foreground">{cv.name.split(' ').map(n => n[0]).join('')}</span>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <p className="font-black text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>{cv.name}</p>
                  {cv.starred && <Star size={13} className="text-yellow-400" fill="currentColor" />}
                </div>
                <p className="text-sm text-muted-foreground mb-2">{cv.currentRole} &middot; {cv.location}</p>

                <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3 flex-wrap">
                  <span className="flex items-center gap-1"><Briefcase size={11} /> {cv.experience}</span>
                  <span className="flex items-center gap-1"><Mail size={11} /> {cv.email}</span>
                  <span className="flex items-center gap-1"><Phone size={11} /> {cv.phone}</span>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-2">
                  {cv.skills.slice(0, 4).map(s => (
                    <span key={s} className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-md border border-border">{s}</span>
                  ))}
                  {cv.skills.length > 4 && <span className="text-xs text-muted-foreground">+{cv.skills.length - 4}</span>}
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {cv.tags.map(tag => <TagPill key={tag} label={tag} />)}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => setSelectedCV(cv)}
                  className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors border border-border"
                  title="View details">
                  <Eye size={14} />
                </button>
                <button onClick={() => toggleStar(cv.id)}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors border ${
                    cv.starred ? 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' : 'bg-muted text-muted-foreground border-border hover:text-yellow-400'
                  }`}
                  title={cv.starred ? 'Unstar' : 'Star'}>
                  <Star size={14} fill={cv.starred ? 'currentColor' : 'none'} />
                </button>
                <button onClick={() => deleteCV(cv.id)}
                  className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-red-400 transition-colors border border-border"
                  title="Delete">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {/* CTC row */}
            <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
              <div className="flex items-center gap-4 text-xs">
                <span className="text-muted-foreground">Current: <span className="font-semibold text-foreground">{cv.currentCTC}</span></span>
                <span className="text-muted-foreground">Expected: <span className="font-semibold text-primary">{cv.expectedCTC}</span></span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <FileText size={11} />
                <span>{cv.fileName}</span>
                <span>&middot;</span>
                <span>{cv.uploadedAt}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Add Candidate Modal */}
      <AnimatePresence>
        {showUpload && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowUpload(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="relative bg-card border border-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl"
            >
              <div className="flex items-center justify-between p-6 border-b border-border">
                <h2 className="text-xl font-black text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>Add Candidate to CV Bank</h2>
                <button onClick={() => setShowUpload(false)} className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground">
                  <X size={16} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                {/* Parse from Resume — pre-fills the fields below, still requires review before saving */}
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles size={14} className="text-primary" />
                    <p className="text-sm font-semibold text-foreground">Parse from Resume</p>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">Upload a CV and we'll pre-fill the fields below — review before saving, nothing is fabricated.</p>
                  <input
                    ref={parseFileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx"
                    className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleParseResume(f); }}
                  />
                  <button
                    onClick={() => parseFileInputRef.current?.click()}
                    disabled={parsing}
                    className="flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-50"
                  >
                    {parsing ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                    {parsing ? 'Parsing…' : 'Upload CV to Parse'}
                  </button>
                  {parseError && <p className="text-xs text-red-500 mt-2">{parseError}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {[
                    { key: 'name', label: 'Full Name *', placeholder: 'Candidate name' },
                    { key: 'phone', label: 'Phone', placeholder: '+91 98765 43210' },
                  ].map(({ key, label, placeholder }) => (
                    <div key={key}>
                      <label className="text-sm font-semibold text-foreground mb-1.5 block">{label}</label>
                      <input value={(newCV as Record<string, string>)[key]} onChange={e => setNewCV(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder}
                        className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors" />
                    </div>
                  ))}
                </div>
                <div>
                  <label className="text-sm font-semibold text-foreground mb-1.5 block">Email *</label>
                  <input value={newCV.email} onChange={e => setNewCV(f => ({ ...f, email: e.target.value }))} placeholder="candidate@email.com" type="email"
                    className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { key: 'currentRole', label: 'Current Role', placeholder: 'e.g. Senior PM' },
                    { key: 'location', label: 'Location', placeholder: 'e.g. Bengaluru' },
                    { key: 'currentCTC', label: 'Current CTC', placeholder: 'e.g. ₹24 LPA' },
                    { key: 'expectedCTC', label: 'Expected CTC', placeholder: 'e.g. ₹30 LPA' },
                    { key: 'experience', label: 'Experience', placeholder: 'e.g. 7 years' },
                  ].map(({ key, label, placeholder }) => (
                    <div key={key}>
                      <label className="text-sm font-semibold text-foreground mb-1.5 block">{label}</label>
                      <input value={(newCV as Record<string, string>)[key]} onChange={e => setNewCV(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder}
                        className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors" />
                    </div>
                  ))}
                </div>
                <div>
                  <label className="text-sm font-semibold text-foreground mb-1.5 block">Skills (comma separated)</label>
                  <input value={newCV.skills} onChange={e => setNewCV(f => ({ ...f, skills: e.target.value }))} placeholder="React, Node.js, AWS"
                    className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-foreground mb-1.5 block">Notes</label>
                  <textarea value={newCV.notes} onChange={e => setNewCV(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Any notes about this candidate..."
                    className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors resize-none" />
                </div>
              </div>
              <div className="flex gap-3 p-6 pt-0">
                <button onClick={() => setShowUpload(false)} className="flex-1 py-3 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
                  Cancel
                </button>
                <button onClick={handleAddCV} className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                  <CheckCircle size={14} /> Save to CV Bank
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CV Detail Drawer */}
      <AnimatePresence>
        {selectedCV && (
          <CVDetailDrawer
            cv={selectedCV}
            onClose={() => setSelectedCV(null)}
            onUpdate={updated => {
              setCVs(prev => prev.map(cv => cv.id === updated.id ? updated : cv));
              setSelectedCV(updated);
              fetch(`/api/consultant/cv-bank/${updated.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tags: updated.tags, notes: updated.notes }),
              }).catch(() => {});
            }}
          />
        )}
      </AnimatePresence>

      {showSubmitToJob && (
        <SubmitToJobModal
          entryIds={Array.from(selectedIds)}
          onClose={() => setShowSubmitToJob(false)}
          onDone={() => { setShowSubmitToJob(false); setSelectedIds(new Set()); }}
        />
      )}
    </div>
  );
}
