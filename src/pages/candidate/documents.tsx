/**
 * Candidate Documents Page
 * Shows all document requests from employers: Pending, Completed, All
 */
import { useState, useEffect, useCallback } from 'react';
import { Loader2, FileText, Clock, CheckCircle2 } from 'lucide-react';
import DocumentRequestCard from '@/components/candidate/DocumentRequestCard';

interface DocRequest {
  id: number;
  entityType: 'submission' | 'application';
  entityId: string;
  documentLabels: string[];
  message: string | null;
  status: string;
  jobTitle?: string | null;
  companyName?: string | null;
}
interface DocSubmission {
  id: number;
  entityType: 'submission' | 'application';
  entityId: string;
  documentLabel: string;
  fileUrl: string;
  fileName: string;
}

export default function DocumentsPage() {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<DocRequest[]>([]);
  const [documents, setDocuments] = useState<DocSubmission[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'completed' | 'all'>('pending');

  const load = useCallback(() => {
    fetch('/api/candidate/documents')
      .then(r => r.json())
      .then(d => { setRequests(d.requests || []); setDocuments(d.documents || []); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const pending = requests.filter(r => r.status !== 'completed');
  const completed = requests.filter(r => r.status === 'completed');
  const displayed = activeTab === 'pending' ? pending : activeTab === 'completed' ? completed : requests;

  const tabs = [
    { id: 'pending', label: 'Pending', count: pending.length, icon: Clock },
    { id: 'completed', label: 'Completed', count: completed.length, icon: CheckCircle2 },
    { id: 'all', label: 'All', count: requests.length, icon: FileText },
  ] as const;

  function docsFor(req: DocRequest) {
    return documents.filter(d => d.entityType === req.entityType && d.entityId === req.entityId);
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-foreground">My Documents</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Upload documents requested by employers
          </p>
        </div>

        {/* Tabs */}
        <div className="max-w-3xl mx-auto px-4 flex gap-1 pb-4 border-t border-border/50">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 px-4 py-2 font-semibold text-sm rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon size={16} />
                {tab.label}
                {tab.count > 0 && (
                  <span className="ml-1 px-2 py-0.5 bg-background/20 rounded-full text-xs">
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={24} className="animate-spin text-muted-foreground" />
          </div>
        ) : displayed.length === 0 ? (
          <div className="text-center py-16">
            <FileText size={40} className="text-muted-foreground mx-auto mb-3 opacity-30" />
            <p className="text-muted-foreground font-semibold">
              {activeTab === 'pending'
                ? 'No pending document requests'
                : activeTab === 'completed'
                ? 'No completed requests'
                : 'No document requests yet'}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              {activeTab === 'pending' &&
                'When an employer requests documents from you, it will appear here.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayed.map(request => (
              <DocumentRequestCard
                key={request.id}
                request={request}
                documents={docsFor(request)}
                onUploaded={load}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
