'use client';

import { useState, useEffect } from 'react';
import { PointTransaction, PointsHistoryResponse } from '@/src/types/points';

interface PointsHistoryProps {
  walletAddress: string;
}

export default function PointsHistory({ walletAddress }: PointsHistoryProps) {
  const [history, setHistory] = useState<PointsHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const limit = 20;

  useEffect(() => {
    fetchHistory();
  }, [walletAddress, filter, page]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const offset = (page - 1) * limit;
      const typeParam = filter !== 'ALL' ? `&type=${filter}` : '';
      
      const response = await fetch(
        `/api/points/history?wallet=${walletAddress}&limit=${limit}&offset=${offset}${typeParam}`
      );
      const data = await response.json();

      if (response.ok) {
        setHistory(data);
      }
    } catch (error) {
      console.error('Error fetching points history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'TRADE':
        return (
          <div className="bg-blue-500/20 p-2 rounded-lg">
            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
        );
      case 'REFERRAL_BONUS':
        return (
          <div className="bg-green-500/20 p-2 rounded-lg">
            <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
        );
      case 'ADMIN_ADJUSTMENT':
        return (
          <div className="bg-purple-500/20 p-2 rounded-lg">
            <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
          </div>
        );
      default:
        return null;
    }
  };

  const getTransactionLabel = (tx: PointTransaction) => {
    switch (tx.transaction_type) {
      case 'TRADE':
        const profit = tx.metadata?.profit_usd;
        if (profit !== undefined) {
          if (profit > 0) return `Trade Profit: $${profit.toFixed(2)}`;
          if (profit < 0) return `Trade Loss: $${Math.abs(profit).toFixed(2)}`;
          return 'Break-even Trade';
        }
        return 'Trade';
      case 'REFERRAL_BONUS':
        const tier = tx.metadata?.bonus_tier;
        if (tier) {
          return `Referral Bonus (${tier})`;
        }
        return 'Referral Bonus';
      case 'ADMIN_ADJUSTMENT':
        return 'Admin Adjustment';
      default:
        return tx.transaction_type;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (loading && !history) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="animate-pulse bg-gray-800/50 rounded-xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-gray-700 rounded-lg"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-700 rounded w-3/4"></div>
              <div className="h-3 bg-gray-700 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {['ALL', 'TRADE', 'REFERRAL_BONUS', 'ADMIN_ADJUSTMENT'].map((type) => (
          <button
            key={type}
            onClick={() => {
              setFilter(type);
              setPage(1);
            }}
            className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors
              ${filter === type 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
              }`}
          >
            {type.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Transaction List */}
      {history && history.transactions.length > 0 ? (
        <>
          <div className="space-y-2">
            {history.transactions.map((tx) => (
              <div
                key={tx.id}
                className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 hover:bg-gray-800/70 
                         transition-colors duration-200"
              >
                <div className="flex items-start gap-4">
                  {getTransactionIcon(tx.transaction_type)}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-white font-medium text-sm">
                          {getTransactionLabel(tx)}
                        </p>
                        <p className="text-gray-400 text-xs mt-1">
                          {formatDate(tx.created_at)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-yellow-400 font-bold text-lg">
                          +{tx.points_earned.toLocaleString()}
                        </p>
                        <p className="text-gray-400 text-xs">points</p>
                      </div>
                    </div>
                    
                    {/* Transaction Link */}
                    {tx.source_tx_hash && (
                      <a
                        href={`https://basescan.org/tx/${tx.source_tx_hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 text-xs hover:underline mt-2 inline-flex items-center gap-1"
                      >
                        View on Basescan
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {(history.hasMore || page > 1) && (
            <div className="flex items-center justify-between pt-4">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="px-4 py-2 bg-gray-800 text-white rounded-lg disabled:opacity-50 
                         disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
              >
                Previous
              </button>
              <span className="text-gray-400 text-sm">
                Page {page}
              </span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={!history.hasMore}
                className="px-4 py-2 bg-gray-800 text-white rounded-lg disabled:opacity-50 
                         disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-12">
          <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-gray-400 text-sm">No transactions yet</p>
        </div>
      )}
    </div>
  );
}

