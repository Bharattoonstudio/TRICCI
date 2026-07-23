/**
 * useSubmissions — fetches real submission records from the employer API
 * and exposes a `updateStatus` function that calls PUT /api/submissions/:id/status.
 * All ATS sub-components share this hook so they stay in sync.
 */
import { useState, useEffect, useCallback } from 'react';
import type { SubmissionRecord, SubmissionStatus } from './types.js';

interface RawSubmission {
  id: number;
  candidateName: string;
  candidateEmail: string;
  candidatePhone?: string | null;
  jobTitle?: string;
  jobId?: string;
  consultantName?: string;
  consultantEmail?: string;
  cvUrl?: string | null;
  status: string;
  createdAt: string;
}

export function useSubmissions() {
  const [submissions, setSubmissions] = useState<SubmissionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/employer/submissions');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { submissions?: RawSubmission[] };
      const rows: SubmissionRecord[] = (data.submissions ?? []).map((s: RawSubmission) => ({
        id: s.id,
        candidateName: s.candidateName,
        candidateEmail: s.candidateEmail,
        candidatePhone: s.candidatePhone,
        jobTitle: s.jobTitle ?? 'Unknown Role',
        jobId: s.jobId ?? '',
        consultantName: s.consultantName,
        consultantEmail: s.consultantEmail,
        cvUrl: s.cvUrl,
        status: (s.status as SubmissionStatus) ?? 'pending',
        createdAt: s.createdAt,
      }));
      setSubmissions(rows);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateStatus = useCallback(async (id: number, status: SubmissionStatus): Promise<boolean> => {
    try {
      const res = await fetch(`/api/submissions/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) return false;
      // Optimistic update
      setSubmissions(prev => prev.map(s => s.id === id ? { ...s, status } : s));
      return true;
    } catch {
      return false;
    }
  }, []);

  return { submissions, loading, error, reload: load, updateStatus };
}
