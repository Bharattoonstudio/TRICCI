/**
 * ConsultantTier — reputation tier badge (spec: Gold/Silver/Bronze/Diamond
 * verification levels). Computed client-side from metrics that already
 * exist (selection rate, total submissions) — no new backend needed.
 */
export type Tier = 'diamond' | 'gold' | 'silver' | 'bronze' | 'new';

export interface TierInfo {
  tier: Tier;
  label: string;
  emoji: string;
  color: string;
}

export function computeTier(totalSubmissions: number, selectionRatePct: number): TierInfo {
  if (totalSubmissions === 0) return { tier: 'new', label: 'New', emoji: '🌱', color: '#94a3b8' };
  if (totalSubmissions >= 10 && selectionRatePct >= 30) return { tier: 'diamond', label: 'Diamond', emoji: '💎', color: '#60a5fa' };
  if (totalSubmissions >= 5 && selectionRatePct >= 20) return { tier: 'gold', label: 'Gold', emoji: '🥇', color: '#eab308' };
  if (totalSubmissions >= 3 && selectionRatePct >= 10) return { tier: 'silver', label: 'Silver', emoji: '🥈', color: '#9ca3af' };
  return { tier: 'bronze', label: 'Bronze', emoji: '🥉', color: '#d97706' };
}

export function TierBadge({ totalSubmissions, selectionRatePct, size = 'md' }: { totalSubmissions: number; selectionRatePct: number; size?: 'sm' | 'md' }) {
  const info = computeTier(totalSubmissions, selectionRatePct);
  const padding = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-bold ${padding}`}
      style={{ backgroundColor: `${info.color}20`, color: info.color, border: `1px solid ${info.color}40` }}
    >
      {info.emoji} {info.label}
    </span>
  );
}
