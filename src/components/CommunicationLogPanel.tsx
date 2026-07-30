import { useEffect, useState } from 'react';
import { MessageSquare, Phone, Mail, Users, StickyNote, Send, Loader2 } from 'lucide-react';

export type CommEntityType = 'job' | 'application' | 'submission';

interface Entry {
  id: number;
  type: string;
  message: string;
  createdAt: string;
  createdByUserId: string | null;
  createdByName: string | null;
}

interface Props {
  entityType: CommEntityType;
  entityId: string | number;
}

const TYPE_META: Record<string, { label: string; icon: typeof StickyNote; color: string }> = {
  whatsapp: { label: 'WhatsApp', icon: MessageSquare, color: 'text-green-500' },
  email: { label: 'Email', icon: Mail, color: 'text-blue-400' },
  call: { label: 'Call', icon: Phone, color: 'text-amber-500' },
  meeting: { label: 'Meeting', icon: Users, color: 'text-purple-400' },
  note: { label: 'Note', icon: StickyNote, color: 'text-muted-foreground' },
};

export default function CommunicationLogPanel({ entityType, entityId }: Props) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState('note');
  const [posting, setPosting] = useState(false);

  function load() {
    setLoading(true);
    fetch(`/api/communication-log?entityType=${entityType}&entityId=${entityId}`)
      .then(r => r.json())
      .then(data => {
        if (data.entries) setEntries(data.entries);
        else setError(data.error || 'Could not load communication log');
      })
      .catch(() => setError('Could not load communication log'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [entityType, entityId]);

  async function handleAdd() {
    if (!message.trim() || posting) return;
    setPosting(true);
    setError('');
    try {
      const res = await fetch('/api/communication-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityType, entityId: String(entityId), type, message: message.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to add entry');
      }
      setMessage('');
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add entry');
    } finally {
      setPosting(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Add entry */}
      <div className="bg-muted/30 border border-border rounded-xl p-3 space-y-2">
        <div className="flex gap-1.5 flex-wrap">
          {Object.entries(TYPE_META).map(([key, meta]) => {
            const Icon = meta.icon;
            return (
              <button key={key} type="button" onClick={() => setType(key)}
                className={`flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-full border transition-colors ${
                  type === key ? 'bg-primary/15 border-primary text-primary' : 'bg-background border-border text-muted-foreground hover:text-foreground'
                }`}>
                <Icon size={11} /> {meta.label}
              </button>
            );
          })}
        </div>
        <div className="flex gap-2">
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Log a call, WhatsApp update, email summary, or note…"
            rows={2}
            className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary resize-none"
          />
          <button
            onClick={handleAdd}
            disabled={posting || !message.trim()}
            className="shrink-0 self-end flex items-center justify-center w-9 h-9 rounded-lg bg-primary text-primary-foreground disabled:opacity-40 hover:opacity-90 transition-opacity"
          >
            {posting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          </button>
        </div>
        {error && <p className="text-[11px] text-red-500">{error}</p>}
      </div>

      {/* Timeline */}
      {loading ? (
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <Loader2 size={16} className="animate-spin" />
        </div>
      ) : entries.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-6">No communication logged yet.</p>
      ) : (
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {entries.map(entry => {
            const meta = TYPE_META[entry.type] ?? TYPE_META.note;
            const Icon = meta.icon;
            return (
              <div key={entry.id} className="flex gap-2.5 bg-card border border-border rounded-lg p-3">
                <Icon size={14} className={`shrink-0 mt-0.5 ${meta.color}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-foreground whitespace-pre-wrap break-words">{entry.message}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {entry.createdByName ?? 'Unknown'} · {new Date(entry.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
