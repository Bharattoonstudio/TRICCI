/**
 * Candidate Offers Page
 * Shows all job offers: Pending, Accepted, Declined, Withdrawn
 * Allows accepting/declining offers with joining date selection
 */
import { useState, useEffect } from 'react';
import { Loader2, Briefcase, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import OfferCard from '@/components/candidate/OfferCard';

interface Offer {
  id: number;
  companyName: string;
  jobTitle: string;
  offerStatus: string;
  offerCtcLpa?: number;
  offerExpiryDate?: string;
  joiningDate?: string;
  offerNote?: string;
}

export default function OffersPage() {
  const [loading, setLoading] = useState(true);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'accepted' | 'all'>('pending');

  useEffect(() => {
    fetch('/api/candidate/offers')
      .then(r => r.json())
      .then(d => setOffers(d.offers || []))
      .finally(() => setLoading(false));
  }, []);

  const pending = offers.filter(o => o.offerStatus === 'sent');
  const accepted = offers.filter(o => o.offerStatus === 'accepted');
  const displayed = activeTab === 'pending' ? pending : activeTab === 'accepted' ? accepted : offers;

  const tabs = [
    { id: 'pending', label: 'Pending', count: pending.length, icon: AlertCircle },
    { id: 'accepted', label: 'Accepted', count: accepted.length, icon: CheckCircle2 },
    { id: 'all', label: 'All', count: offers.length, icon: Briefcase },
  ] as const;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-foreground">My Offers</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review and respond to job offers from companies
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
            <Briefcase size={40} className="text-muted-foreground mx-auto mb-3 opacity-30" />
            <p className="text-muted-foreground font-semibold">
              {activeTab === 'pending'
                ? 'No pending offers'
                : activeTab === 'accepted'
                ? 'No accepted offers'
                : 'No offers yet'}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              {activeTab === 'pending' &&
                'Check back soon! When a company sends you an offer, it will appear here.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayed.map(offer => (
              <OfferCard
                key={offer.id}
                offer={offer}
                onUpdated={() => {
                  // Refresh offers
                  fetch('/api/candidate/offers')
                    .then(r => r.json())
                    .then(d => setOffers(d.offers || []))
                    .catch(() => {});
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
