import { BinaryPair, ExpiryFilter } from '@/src/types/prediction';

/**
 * Categorizes a BinaryPair's expiry into a filter category
 * @param pair Binary pair to categorize
 * @returns The expiry filter category this pair belongs to
 */
export function categorizeExpiry(pair: BinaryPair): ExpiryFilter | null {
  const now = new Date();
  const expiryDate = new Date(pair.expiry);
  const diffMs = expiryDate.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  // Expired options
  if (diffMs <= 0) {
    return null;
  }

  // 1D: expires within 24 hours
  if (diffHours <= 24) {
    return '1D';
  }

  // 2D: expires within 48 hours (but more than 24)
  if (diffHours <= 48) {
    return '2D';
  }

  // 3D: expires within 72 hours (but more than 48)
  if (diffHours <= 72) {
    return '3D';
  }

  // Weekly: expires within 7 days (but more than 3)
  if (diffDays <= 7) {
    return 'weekly';
  }

  // Monthly: expires within 30 days (but more than 7)
  if (diffDays <= 30) {
    return 'monthly';
  }

  // Quarterly: expires in more than 30 days
  return 'quarterly';
}

/**
 * Filters binary pairs based on the selected expiry filter
 * @param pairs All binary pairs
 * @param filter Selected filter
 * @returns Filtered pairs
 */
export function filterPairsByExpiry(pairs: BinaryPair[], filter: ExpiryFilter): BinaryPair[] {
  if (filter === 'all') {
    return pairs.filter(pair => categorizeExpiry(pair) !== null);
  }

  return pairs.filter(pair => categorizeExpiry(pair) === filter);
}

/**
 * Sorts pairs by expiry date (soonest first)
 * @param pairs Binary pairs to sort
 * @returns Sorted pairs with soonest expiry first
 */
export function sortPairsByExpiry(pairs: BinaryPair[]): BinaryPair[] {
  return [...pairs].sort((a, b) => {
    return new Date(a.expiry).getTime() - new Date(b.expiry).getTime();
  });
}

/**
 * Counts how many pairs belong to each expiry category
 * @param pairs All binary pairs
 * @returns Record of counts for each filter category
 */
export function countPairsByExpiry(pairs: BinaryPair[]): Record<ExpiryFilter, number> {
  const counts: Record<ExpiryFilter, number> = {
    'all': 0,
    '1D': 0,
    '2D': 0,
    '3D': 0,
    'weekly': 0,
    'monthly': 0,
    'quarterly': 0,
  };

  pairs.forEach(pair => {
    const category = categorizeExpiry(pair);
    if (category) {
      counts[category]++;
      counts['all']++;
    }
  });

  return counts;
}
