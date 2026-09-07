/**
 * OfferCard — display single job offer for candidate
 * Shows: company, job, CTC, expiry, joining date, accept/reject buttons
 */
import { useState } from 'react';
import { CheckCircle2, XCircle, AlertCircle, Calendar, DollarSign } from 'lucide-react';
import OfferDetailModal from './OfferDetailModal';

interface OfferCardProps {
  offer: {
    id: number;
    companyName: string;
    jobTitle: string;
    offerStatus: string;
    offerCtcLpa?: number;
    offerExpiryDate?: string;
    joiningDate?: string;
    offerNote?: string;
  };
  onUpdated: () => void;
}

export default function OfferCard({ offer, onUpdated }: OfferCardProps) {
  const [showDetail, setShowDetail] = useState(false);

  const isExpired = offer.offerExpiryDate && new Date(offer.offerExpiryDate) < new Date();
  const daysLeft = offer.offerExpiryDate
    ? Math.ceil((new Date(offer.offerExpiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const isPending = offer.offerStatus === 'sent';
  const isAccepted = offer.offerStatus === 'accepted';
  const isDeclined = offer.offerStatus === 'declined';
  const isWithdrawn = offer.offerStatus === 'withdrawn';

  return (
    <>
      <div className={`border rounded-xl p-5 transition-all cursor-pointer hover:shadow-md ${
        isWithdrawn ? 'bg-red-500/5 border-red-500/20' :
        isDeclined ? 'bg-gray-500/5 border-gray-500/20' :
        isAccepted ? 'bg-green-500/5 border-green-500/20' :
        'bg-blue-500/5 border-blue-500/20'
      }`}
      onClick={() => setShowDetail(true)}>
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h4 className="font-bold text-foreground text-lg">{offer.jobTitle}</h4>
            <p className="text-sm text-muted-foreground">{offer.companyName}</p>
          </div>
          <span className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ml-2 ${
            isAccepted ? 'bg-green-500/20 text-green-700 flex items-center gap-1' :
            isDeclined ? 'bg-gray-500/20 text-gray-700' :
            isWithdrawn ? 'bg-red-500/20 text-red-700' :
            'bg-blue-500/20 text-blue-700'
          }`}>
            {isAccepted && <CheckCircle2 size={12} />}
            {isDeclined && <XCircle size={12} />}
            {isWithdrawn && <AlertCircle size={12} />}
            {offer.offerStatus}
          </span>
        </div>

        {/* CTC & Expiry */}
        <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
          {offer.offerCtcLpa && (
            <div className="flex items-center gap-2 text-foreground">
              <DollarSign size={16} className="text-muted-foreground" />
              <span className="font-semibold">₹{offer.offerCtcLpa}L</span>
            </div>
          )}
          {offer.offerExpiryDate && !isAccepted && !isDeclined && !isWithdrawn && (
            <div className={`flex items-center gap-2 ${
              isExpired ? 'text-red-600' :
              daysLeft! <= 3 ? 'text-orange-600' :
              'text-muted-foreground'
            }`}>
              <Calendar size={16} />
              <span className="font-semibold">
                {isExpired ? 'Expired' : `${daysLeft} days left`}
              </span>
            </div>
          )}
        </div>

        {/* Joining Date (if accepted) */}
        {isAccepted && offer.joiningDate && (
          <div className="p-2 bg-green-500/10 border border-green-500/20 rounded text-xs text-green-700 font-semibold">
            Joining: {new Date(offer.joiningDate).toLocaleDateString('en-IN')}
          </div>
        )}

        {/* Withdrawn Notice */}
        {isWithdrawn && (
          <div className="p-2 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-700 font-semibold">
            This offer has been withdrawn by the company
          </div>
        )}

        {/* Expired Notice */}
        {isPending && isExpired && (
          <div className="p-2 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-700 font-semibold">
            This offer has expired
          </div>
        )}

        {/* Click to view button */}
        <button className="w-full mt-4 text-xs font-semibold text-primary hover:underline">
          View Details →
        </button>
      </div>

      {/* Detail Modal */}
      {showDetail && (
        <OfferDetailModal
          offer={offer}
          onClose={() => setShowDetail(false)}
          onUpdated={() => {
            setShowDetail(false);
            onUpdated();
          }}
        />
      )}
    </>
  );
}
