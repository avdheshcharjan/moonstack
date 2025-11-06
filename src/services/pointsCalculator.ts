// Points calculation service based on profit-weighted formula

import { DbUserPosition } from '@/src/utils/supabase';

/**
 * Calculate points for a settled trade based on profit/loss
 * 
 * Formula:
 * - Profit > 0: 10 points per $1 profit
 * - Loss < 0: 2 points per $1 loss (encourages participation)
 * - Break-even = 0: 5 points flat (participation bonus)
 * 
 * @param position - Settled user position
 * @returns Points earned (always positive)
 */
export function calculateTradePoints(position: DbUserPosition): number {
  if (!position.is_settled) {
    throw new Error('Cannot calculate points for unsettled position');
  }

  const pnl = Number(position.pnl) || 0;
  
  // Break-even trade: flat participation bonus
  if (pnl === 0) {
    return 5;
  }
  
  // Profitable trade: 10 points per $1 profit
  if (pnl > 0) {
    return Math.floor(pnl * 10);
  }
  
  // Loss: 2 points per $1 loss (absolute value)
  // This encourages continued participation even after losses
  return Math.floor(Math.abs(pnl) * 2);
}

/**
 * Calculate total points from multiple positions
 * 
 * @param positions - Array of settled positions
 * @returns Total points earned
 */
export function calculateTotalPoints(positions: DbUserPosition[]): number {
  return positions.reduce((total, position) => {
    if (position.is_settled) {
      return total + calculateTradePoints(position);
    }
    return total;
  }, 0);
}

/**
 * Get points breakdown by profit/loss
 * 
 * @param positions - Array of settled positions
 * @returns Breakdown of points from wins, losses, and break-evens
 */
export function getPointsBreakdown(positions: DbUserPosition[]): {
  profit_points: number;
  loss_points: number;
  breakeven_points: number;
  total_points: number;
} {
  const breakdown = {
    profit_points: 0,
    loss_points: 0,
    breakeven_points: 0,
    total_points: 0,
  };

  positions.forEach((position) => {
    if (!position.is_settled) return;

    const pnl = Number(position.pnl) || 0;
    const points = calculateTradePoints(position);

    if (pnl > 0) {
      breakdown.profit_points += points;
    } else if (pnl < 0) {
      breakdown.loss_points += points;
    } else {
      breakdown.breakeven_points += points;
    }
  });

  breakdown.total_points = 
    breakdown.profit_points + 
    breakdown.loss_points + 
    breakdown.breakeven_points;

  return breakdown;
}

