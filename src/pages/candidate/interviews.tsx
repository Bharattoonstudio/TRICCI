/**
 * Candidate Interviews Page
 * Shows all interviews: Upcoming, Completed, All
 * Tabs to filter by status
 */
import { useState, useEffect } from 'react';
import { Loader2, Calendar, CheckCircle2, MessageCircle } from 'lucide-react';
import InterviewRoundCard from '@/components/candidate/InterviewRoundCard';

interface Interview {
  id: number;
  round: number;
  roundName?: string;
  status: string;
  scheduledAt?: string;
  completedAt?: string;
  feedback?: string;
  score?: number;
  reasonForSelection?: string;
  nextSteps?: string;
  jobTitle: string;
  companyName: string;
}

export default function InterviewsPage() {
  const [loading, setLoading] = useState(true);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'completed' | 'all'>('upcoming');

  useEffect(() => {
    fetch('/api/candidate/interviews')
      .then(r => r.json())
      .then(d => setInterviews(d.interviews || []))
      .finally(() => setLoading(false));
  }, []);

  const upcoming = interviews.filter(i => i.status === 'scheduled' && i.scheduledAt);
  const completed = interviews.filter(i => i.status === 'completed');
  const displayed = activeTab === 'upcoming' ? upcoming : activeTab === 'completed' ? completed : interviews;

  const tabs = [
    { id: 'upcoming', label: 'Upcoming', count: upcoming.length, icon: Calendar },
    { id: 'completed', label: 'Completed', count: completed.length, icon: CheckCircle2 },
    { id: 'all', label: 'All', count: interviews.length, icon: MessageCircle },
  ] as const;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-foreground">My Interviews</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track your interview schedule and feedback
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
            <Calendar size={40} className="text-muted-foreground mx-auto mb-3 opacity-30" />
            <p className="text-muted-foreground font-semibold">
              {activeTab === 'upcoming'
                ? 'No upcoming interviews'
                : activeTab === 'completed'
                ? 'No completed interviews'
                : 'No interviews yet'}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              {activeTab === 'upcoming' &&
                'When a company schedules an interview, it will appear here.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayed.map(interview => (
              <InterviewRoundCard
                key={interview.id}
                round={interview}
                jobTitle={interview.jobTitle}
                companyName={interview.companyName}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
