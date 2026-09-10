/**
 * GamificationCard — points, login streak, achievement badges, and
 * leaderboard rank for the consultant Overview tab. Everything except
 * login streak is computed live from real data server-side (see
 * /api/consultant/gamification and /api/consultant/leaderboard) —
 * nothing here is fabricated or hardcoded.
 */
import { useState, useEffect } from 'react';
import { Loader2, Flame, Trophy } from 'lucide-react';

interface Badge { id: string; label: string; emoji: string; unlocked: boolean; }
interface GamificationData {
  points: number;
  streak: number;
  badges: Badge[];
}
interface LeaderboardRow { rank: number; name: string; points: number; isYou: boolean; }
interface LeaderboardData {
  top10: LeaderboardRow[];
  myRank: { rank: number; points: number } | null;
  totalRanked: number;
}

export default function GamificationCard() {
  const [data, setData] = useState<GamificationData | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  useEffect(() => {
    fetch('/api/consultant/gamification')
      .then(r => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function loadLeaderboard() {
    setShowLeaderboard(true);
    if (leaderboard) return;
    fetch('/api/consultant/leaderboard').then(r => r.json()).then(setLeaderboard).catch(() => {});
  }

  if (loading) {
    return <div className="rounded-2xl border p-6 flex justify-center" style={{ background: '#0d0d0d', borderColor: '#ffffff0d' }}><Loader2 size={18} className="animate-spin text-white/30" /></div>;
  }
  if (!data) return null;

  return (
    <div className="rounded-2xl border p-6" style={{ background: '#0d0d0d', borderColor: '#ffffff0d' }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider">Your Progress</h3>
        <button onClick={loadLeaderboard} className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
          <Trophy size={12} /> Leaderboard
        </button>
      </div>

      <div className="flex items-center gap-6 mb-5">
        <div>
          <p className="text-2xl font-black text-white" style={{ fontFamily: 'var(--font-heading)' }}>{data.points.toLocaleString('en-IN')}</p>
          <p className="text-[11px] text-white/30">Points</p>
        </div>
        <div className="flex items-center gap-1.5">
          <Flame size={18} className={data.streak > 0 ? 'text-orange-400' : 'text-white/20'} />
          <div>
            <p className="text-lg font-black text-white" style={{ fontFamily: 'var(--font-heading)' }}>{data.streak}</p>
            <p className="text-[11px] text-white/30">Day streak</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {data.badges.map(b => (
          <div
            key={b.id}
            title={b.unlocked ? b.label : `Locked: ${b.label}`}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold border ${
              b.unlocked ? 'bg-primary/15 border-primary/30 text-primary' : 'bg-white/5 border-white/10 text-white/25'
            }`}
          >
            <span className={b.unlocked ? '' : 'grayscale opacity-40'}>{b.emoji}</span>
            {b.label}
          </div>
        ))}
      </div>

      {showLeaderboard && (
        <div className="mt-5 pt-5 border-t border-white/5">
          {!leaderboard ? (
            <div className="flex justify-center py-4"><Loader2 size={16} className="animate-spin text-white/30" /></div>
          ) : (
            <>
              <p className="text-[11px] text-white/30 mb-3">Top Consultants This Month</p>
              <div className="space-y-1.5">
                {leaderboard.top10.length === 0 && <p className="text-xs text-white/30">No submissions yet this month.</p>}
                {leaderboard.top10.map(row => (
                  <div key={row.rank} className={`flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg ${row.isYou ? 'bg-primary/10 border border-primary/25' : ''}`}>
                    <span className={row.isYou ? 'font-bold text-primary' : 'text-white/60'}>
                      {row.rank}. {row.name}{row.isYou ? ' (You)' : ''}
                    </span>
                    <span className="text-white/40">{row.points} pts</span>
                  </div>
                ))}
              </div>
              {leaderboard.myRank && leaderboard.myRank.rank > 10 && (
                <p className="text-xs text-white/40 mt-3">Your rank: #{leaderboard.myRank.rank} of {leaderboard.totalRanked} ({leaderboard.myRank.points} pts)</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
