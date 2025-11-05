import { AnimatePresence, motion, PanInfo, useMotionValue, useTransform } from 'framer-motion';
import React, { useState } from 'react';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  onDontShowAgain: () => void;
}

interface CardData {
  id: number;
  title: string;
  content: React.ReactNode;
  icon?: string;
}

const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
  onComplete,
  onDontShowAgain,
}) => {
  const [currentCard, setCurrentCard] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [direction, setDirection] = useState<'left' | 'right' | 'up'>(
    'right'
  );

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateZ = useTransform(x, [-200, 200], [-15, 15]);
  const opacity = useTransform(
    x,
    [-200, -100, 0, 100, 200],
    [0.5, 1, 1, 1, 0.5]
  );

  const cards: CardData[] = [
    // Card 1 - Swipe Mechanics
    {
      id: 1,
      title: 'Swipe to Predict',
      icon: '👆',
      content: (
        <div className="space-y-6">
          <p className="text-slate-300 text-center">
            Master the gestures to make your predictions
          </p>

          <div className="grid grid-cols-3 gap-3">
            {/* NO */}
            <motion.div
              animate={{ x: [-5, 0, -5] }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="flex flex-col items-center gap-2 p-4 bg-red-500/10 rounded-xl border border-red-500/20"
            >
              <div className="text-4xl text-red-400">←</div>
              <div className="text-center">
                <div className="text-red-400 font-bold text-sm">NO</div>
                <div className="text-slate-500 text-xs mt-1">
                  Swipe left
                </div>
              </div>
            </motion.div>

            {/* SKIP */}
            <motion.div
              animate={{ y: [-5, 0, -5] }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="flex flex-col items-center gap-2 p-4 bg-purple-500/10 rounded-xl border border-purple-500/20"
            >
              <div className="text-4xl text-purple-400">↑</div>
              <div className="text-center">
                <div className="text-purple-400 font-bold text-sm">SKIP</div>
                <div className="text-slate-500 text-xs mt-1">
                  Swipe up
                </div>
              </div>
            </motion.div>

            {/* YES */}
            <motion.div
              animate={{ x: [5, 0, 5] }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="flex flex-col items-center gap-2 p-4 bg-green-500/10 rounded-xl border border-green-500/20"
            >
              <div className="text-4xl text-green-400">→</div>
              <div className="text-center">
                <div className="text-green-400 font-bold text-sm">YES</div>
                <div className="text-slate-500 text-xs mt-1">
                  Swipe right
                </div>
              </div>
            </motion.div>
          </div>

          <div className="bg-slate-800/50 rounded-lg p-4">
            <p className="text-slate-400 text-sm text-center">
              Try it now! Swipe right to continue →
            </p>
          </div>
        </div>
      ),
    },

    // Card 2 - Multipliers & Payouts
    {
      id: 2,
      title: 'Multipliers Explained',
      icon: '💰',
      content: (
        <div className="space-y-6">
          <p className="text-slate-300 text-center">
            Your payout depends on the odds and your bet size
          </p>

          <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl p-6 border border-purple-500/30">
            <div className="text-center space-y-4">
              <div className="text-white text-lg font-semibold">
                Example
              </div>
              <div className="flex items-center justify-center gap-3 text-2xl font-bold">
                <span className="text-green-400">$1</span>
                <span className="text-slate-500">×</span>
                <span className="text-purple-400">2.5x</span>
                <span className="text-slate-500">=</span>
                <span className="text-yellow-400">$2.50</span>
              </div>
              <div className="text-slate-400 text-sm">
                Bet Amount × Multiplier = Payout
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3 bg-slate-800/50 rounded-lg p-3">
              <div className="text-2xl">📊</div>
              <div className="flex-1">
                <div className="text-white text-sm font-medium">
                  Higher odds = Higher payout
                </div>
                <div className="text-slate-400 text-xs">
                  Riskier bets pay more
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-slate-800/50 rounded-lg p-3">
              <div className="text-2xl">🎯</div>
              <div className="flex-1">
                <div className="text-white text-sm font-medium">
                  Check both YES and NO odds
                </div>
                <div className="text-slate-400 text-xs">
                  Choose the side with better value
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
    },

    // Card 3 - Payout Timing
    {
      id: 3,
      title: 'When You Get Paid',
      icon: '⏰',
      content: (
        <div className="space-y-6">
          <p className="text-slate-300 text-center">
            Payouts are settled the day after expiry around 5pm SGT
          </p>

          <div className="bg-slate-800/50 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center text-2xl border border-blue-500/30">
                1
              </div>
              <div className="flex-1">
                <div className="text-white font-semibold">Make Prediction</div>
                <div className="text-slate-400 text-sm">
                  Choose YES or NO
                </div>
              </div>
            </div>

            <div className="h-8 w-px bg-gradient-to-b from-blue-500/50 to-purple-500/50 ml-6" />

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center text-2xl border border-purple-500/30">
                2
              </div>
              <div className="flex-1">
                <div className="text-white font-semibold">
                  Wait for Expiry
                </div>
                <div className="text-slate-400 text-sm">
                  Track your prediction
                </div>
              </div>
            </div>

            <div className="h-8 w-px bg-gradient-to-b from-purple-500/50 to-green-500/50 ml-6" />

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center text-2xl border border-green-500/30">
                3
              </div>
              <div className="flex-1">
                <div className="text-white font-semibold">Get Paid</div>
                <div className="text-slate-400 text-sm">
                  Next day ~5pm SGT
                </div>
              </div>
            </div>
          </div>

          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
            <div className="flex gap-3">
              <div className="text-2xl">💡</div>
              <div className="flex-1">
                <div className="text-yellow-400 font-semibold text-sm">
                  Important
                </div>
                <div className="text-slate-300 text-sm">
                  Your prediction must be correct at the expiry time to
                  win
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
    },

    // Card 4 - Cart & Batch Execution
    {
      id: 4,
      title: 'Add to Cart',
      icon: '🛒',
      content: (
        <div className="space-y-6">
          <p className="text-slate-300 text-center">
            Save predictions to your cart and execute them all at once
          </p>

          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <div className="text-white font-bold text-lg">Your Cart</div>
              <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center border border-purple-500/30">
                <span className="text-purple-400 font-bold">3</span>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              {['BTC > $95,000', 'ETH > $3,500', 'SOL < $200'].map(
                (item, i) => (
                  <div
                    key={i}
                    className="bg-slate-800 rounded-lg p-3 flex items-center justify-between"
                  >
                    <div className="text-white text-sm">{item}</div>
                    <div className="text-green-400 text-sm font-semibold">
                      $5.00
                    </div>
                  </div>
                )
              )}
            </div>

            <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="text-white font-semibold">Total</div>
                <div className="text-purple-400 font-bold text-lg">
                  $15.00
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3 bg-slate-800/50 rounded-lg p-3">
              <div className="text-2xl">⚡</div>
              <div className="flex-1">
                <div className="text-white text-sm font-medium">
                  One-click execution
                </div>
                <div className="text-slate-400 text-xs">
                  All predictions in one transaction
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-slate-800/50 rounded-lg p-3">
              <div className="text-2xl">💾</div>
              <div className="flex-1">
                <div className="text-white text-sm font-medium">
                  Saved locally
                </div>
                <div className="text-slate-400 text-xs">
                  Your cart persists across sessions
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
    },

    // Card 5 - Reward Points
    {
      id: 5,
      title: 'Rewards Coming Soon',
      icon: '🎁',
      content: (
        <div className="space-y-6">
          <p className="text-slate-300 text-center">
            Earn points for every prediction, win, and streak
          </p>

          <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-xl p-6 border border-yellow-500/30 relative overflow-hidden">
            <div className="absolute top-2 right-2">
              <div className="bg-yellow-500 text-slate-900 text-xs font-bold px-3 py-1 rounded-full">
                COMING SOON
              </div>
            </div>

            <div className="text-center space-y-4 pt-6">
              <div className="text-6xl">🏅</div>
              <div className="text-white text-xl font-bold">
                Reward Points System
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-800/50 rounded-lg p-4 text-center">
              <div className="text-3xl mb-2">🎯</div>
              <div className="text-white text-sm font-semibold">
                Prediction Points
              </div>
              <div className="text-slate-400 text-xs mt-1">
                Earn for every bet
              </div>
            </div>

            <div className="bg-slate-800/50 rounded-lg p-4 text-center">
              <div className="text-3xl mb-2">🏆</div>
              <div className="text-white text-sm font-semibold">
                Win Bonuses
              </div>
              <div className="text-slate-400 text-xs mt-1">
                Extra for wins
              </div>
            </div>

            <div className="bg-slate-800/50 rounded-lg p-4 text-center">
              <div className="text-3xl mb-2">🔥</div>
              <div className="text-white text-sm font-semibold">
                Streak Rewards
              </div>
              <div className="text-slate-400 text-xs mt-1">
                Win streaks pay more
              </div>
            </div>

            <div className="bg-slate-800/50 rounded-lg p-4 text-center">
              <div className="text-3xl mb-2">🎖️</div>
              <div className="text-white text-sm font-semibold">
                Achievements
              </div>
              <div className="text-slate-400 text-xs mt-1">
                Unlock badges
              </div>
            </div>
          </div>
        </div>
      ),
    },

    // Card 6 - Leaderboard
    {
      id: 6,
      title: 'Climb the Leaderboard',
      icon: '🏆',
      content: (
        <div className="space-y-6">
          <p className="text-slate-300 text-center">
            Compete with other traders and earn your place at the top
          </p>

          <div className="bg-slate-800/50 rounded-xl p-4 space-y-3">
            {/* Top 3 */}
            {[
              { rank: '🥇', wallet: '0x1234...5678', pnl: '+$1,250.00' },
              { rank: '🥈', wallet: '0x8765...4321', pnl: '+$890.50' },
              { rank: '🥉', wallet: '0xabcd...ef12', pnl: '+$675.25' },
            ].map((entry, i) => (
              <div
                key={i}
                className={`flex items-center justify-between p-3 rounded-lg ${i === 0
                  ? 'bg-yellow-500/10 border border-yellow-500/30'
                  : 'bg-slate-900/50'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <div className="text-2xl">{entry.rank}</div>
                  <div className="font-mono text-white text-sm">
                    {entry.wallet}
                  </div>
                </div>
                <div className="text-green-400 font-bold">{entry.pnl}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-800/50 rounded-lg p-3 text-center">
              <div className="text-slate-400 text-xs mb-1">Total PnL</div>
              <div className="text-white font-bold">💵</div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-3 text-center">
              <div className="text-slate-400 text-xs mb-1">Win Rate</div>
              <div className="text-white font-bold">📊</div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-3 text-center">
              <div className="text-slate-400 text-xs mb-1">ROI %</div>
              <div className="text-white font-bold">📈</div>
            </div>
          </div>

          <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
            <div className="flex gap-3">
              <div className="text-2xl">👥</div>
              <div className="flex-1">
                <div className="text-purple-400 font-semibold text-sm">
                  Find it in Leaders Tab
                </div>
                <div className="text-slate-300 text-sm">
                  Check the bottom navigation bar
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
    },

    // Card 7 - Gas-Free Transactions
    {
      id: 7,
      title: 'Zero Gas Fees',
      icon: '⚡',
      content: (
        <div className="space-y-6">
          <p className="text-slate-300 text-center">
            All transactions are sponsored - you never pay gas fees
          </p>

          <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl p-6 border border-green-500/30">
            <div className="text-center space-y-4">
              <div className="text-6xl">⚡</div>
              <div className="text-white text-2xl font-bold">
                100% Gas-Free
              </div>
              <div className="text-green-400 text-lg font-semibold">
                Powered by Base Paymaster
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3 bg-slate-800/50 rounded-lg p-4">
              <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center text-2xl border border-green-500/30">
                ✓
              </div>
              <div className="flex-1">
                <div className="text-white font-semibold">
                  No ETH Required
                </div>
                <div className="text-slate-400 text-sm">
                  Only USDC needed to trade
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-slate-800/50 rounded-lg p-4">
              <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center text-2xl border border-green-500/30">
                ✓
              </div>
              <div className="flex-1">
                <div className="text-white font-semibold">
                  Instant Transactions
                </div>
                <div className="text-slate-400 text-sm">
                  No waiting for gas calculations
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-slate-800/50 rounded-lg p-4">
              <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center text-2xl border border-green-500/30">
                ✓
              </div>
              <div className="flex-1">
                <div className="text-white font-semibold">
                  Better Returns
                </div>
                <div className="text-slate-400 text-sm">
                  Keep 100% of your profits
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
    },

    // Card 8 - Reading Prediction Cards
    // {
    //   id: 8,
    //   title: 'Understanding the Cards',
    //   icon: '📊',
    //   content: (
    //     <div className="space-y-6">
    //       <p className="text-slate-300 text-center">
    //         Learn how to read prediction cards effectively
    //       </p>

    //       <div className="bg-slate-800/50 rounded-xl p-4 space-y-4">
    //         <div className="flex items-start gap-3">
    //           <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0 border border-blue-500/30">
    //             <span className="text-blue-400 font-bold">1</span>
    //           </div>
    //           <div className="flex-1">
    //             <div className="text-white font-semibold text-sm">
    //               Current Price
    //             </div>
    //             <div className="text-slate-400 text-xs">
    //               Live price with 24h change
    //             </div>
    //           </div>
    //         </div>

    //         <div className="flex items-start gap-3">
    //           <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0 border border-purple-500/30">
    //             <span className="text-purple-400 font-bold">2</span>
    //           </div>
    //           <div className="flex-1">
    //             <div className="text-white font-semibold text-sm">
    //               Threshold Price
    //             </div>
    //             <div className="text-slate-400 text-xs">
    //               The target price to beat
    //             </div>
    //           </div>
    //         </div>

    //         <div className="flex items-start gap-3">
    //           <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center flex-shrink-0 border border-green-500/30">
    //             <span className="text-green-400 font-bold">3</span>
    //           </div>
    //           <div className="flex-1">
    //             <div className="text-white font-semibold text-sm">
    //               Bearish/Bullish Bar
    //             </div>
    //             <div className="text-slate-400 text-xs">
    //               Market sentiment indicator
    //             </div>
    //           </div>
    //         </div>

    //         <div className="flex items-start gap-3">
    //           <div className="w-8 h-8 bg-yellow-500/20 rounded-lg flex items-center justify-center flex-shrink-0 border border-yellow-500/30">
    //             <span className="text-yellow-400 font-bold">4</span>
    //           </div>
    //           <div className="flex-1">
    //             <div className="text-white font-semibold text-sm">
    //               Price Chart
    //             </div>
    //             <div className="text-slate-400 text-xs">
    //               Historical price trends
    //             </div>
    //           </div>
    //         </div>

    //         <div className="flex items-start gap-3">
    //           <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center flex-shrink-0 border border-red-500/30">
    //             <span className="text-red-400 font-bold">5</span>
    //           </div>
    //           <div className="flex-1">
    //             <div className="text-white font-semibold text-sm">
    //               Payout & Multiplier
    //             </div>
    //             <div className="text-slate-400 text-xs">
    //               Shown on YES and NO buttons
    //             </div>
    //           </div>
    //         </div>
    //       </div>

    //       <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
    //         <div className="flex gap-3">
    //           <div className="text-2xl">💡</div>
    //           <div className="flex-1">
    //             <div className="text-blue-400 font-semibold text-sm">Tip</div>
    //             <div className="text-slate-300 text-sm">
    //               Compare multipliers to find the best value bets
    //             </div>
    //           </div>
    //         </div>
    //       </div>
    //     </div>
    //   ),
    // },

    // Card 9 - Wallet & Funding
    // {
    //   id: 9,
    //   title: 'Get Started',
    //   icon: '🚀',
    //   content: (
    //     <div className="space-y-6">
    //       <p className="text-slate-300 text-center">
    //         You're ready to start predicting and winning!
    //       </p>

    //       <div className="space-y-3">
    //         <div className="flex items-start gap-3 bg-slate-800/50 rounded-lg p-4">
    //           <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center text-xl flex-shrink-0 border border-purple-500/30">
    //             1
    //           </div>
    //           <div className="flex-1">
    //             <div className="text-white font-semibold">
    //               Connect Wallet
    //             </div>
    //             <div className="text-slate-400 text-sm">
    //               Sign in with Base Account for instant smart wallet access
    //             </div>
    //           </div>
    //         </div>

    //         <div className="flex items-start gap-3 bg-slate-800/50 rounded-lg p-4">
    //           <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center text-xl flex-shrink-0 border border-blue-500/30">
    //             2
    //           </div>
    //           <div className="flex-1">
    //             <div className="text-white font-semibold">Fund with USDC</div>
    //             <div className="text-slate-400 text-sm">
    //               Add USDC to your wallet to start making predictions
    //             </div>
    //           </div>
    //         </div>

    //         <div className="flex items-start gap-3 bg-slate-800/50 rounded-lg p-4">
    //           <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center text-xl flex-shrink-0 border border-green-500/30">
    //             3
    //           </div>
    //           <div className="flex-1">
    //             <div className="text-white font-semibold">
    //               Start Swiping
    //             </div>
    //             <div className="text-slate-400 text-sm">
    //               Make predictions and watch your profits grow
    //             </div>
    //           </div>
    //         </div>
    //       </div>

    //       <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl p-4 border border-purple-500/30">
    //         <div className="flex gap-3 items-center">
    //           <div className="text-3xl">❓</div>
    //           <div className="flex-1">
    //             <div className="text-white font-semibold">Need Help?</div>
    //             <div className="text-slate-300 text-sm">
    //               Check the FAQ tab for guides and answers
    //             </div>
    //           </div>
    //         </div>
    //       </div>

    //       {/* Don't show again checkbox */}
    //       <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
    //         <label className="flex items-center gap-3 cursor-pointer">
    //           <input
    //             type="checkbox"
    //             checked={dontShowAgain}
    //             onChange={(e) => setDontShowAgain(e.target.checked)}
    //             className="w-5 h-5 rounded border-slate-600 bg-slate-800 text-purple-500 focus:ring-purple-500 focus:ring-offset-0 cursor-pointer"
    //           />
    //           <span className="text-white text-sm font-medium">
    //             Don't show this again
    //           </span>
    //         </label>
    //       </div>
    //     </div>
    //   ),
    // },
  ];

  const handleDragEnd = (
    event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    const swipeThreshold = 100;
    const { offset, velocity } = info;

    // Up swipe - skip/close
    if (offset.y < -swipeThreshold || velocity.y < -500) {
      setDirection('up');
      handleClose();
      return;
    }

    // Right swipe - next card
    if (offset.x > swipeThreshold || velocity.x > 500) {
      setDirection('right');
      handleNext();
      return;
    }

    // Left swipe - previous card
    if (offset.x < -swipeThreshold || velocity.x < -500) {
      setDirection('left');
      handlePrevious();
      return;
    }
  };

  const handleNext = () => {
    if (currentCard < cards.length - 1) {
      setDirection('right');
      setCurrentCard((prev) => prev + 1);
    } else {
      // Last card - complete onboarding
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentCard > 0) {
      setDirection('left');
      setCurrentCard((prev) => prev - 1);
    }
  };

  const handleComplete = () => {
    if (dontShowAgain) {
      onDontShowAgain();
    } else {
      onComplete();
    }
    onClose();
  };

  const handleClose = () => {
    if (dontShowAgain) {
      onDontShowAgain();
    }
    onClose();
  };

  const getExitDirection = () => {
    if (direction === 'left') return { x: -300, opacity: 0 };
    if (direction === 'right') return { x: 300, opacity: 0 };
    if (direction === 'up') return { y: -300, opacity: 0 };
    return { x: 300, opacity: 0 };
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100]"
            onClick={handleClose}
          />

          {/* Modal Container */}
          <div className="fixed inset-0 z-[101] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative w-full max-w-md"
            >
              {/* Close button */}
              <button
                onClick={handleClose}
                className="absolute -top-12 right-0 text-slate-400 hover:text-white transition-colors z-10"
                aria-label="Close"
              >
                <svg
                  className="w-8 h-8"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>

              {/* Progress Dots */}
              <div className="flex items-center justify-center gap-2 mb-4">
                {cards.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentCard(index)}
                    className={`h-2 rounded-full transition-all ${index === currentCard
                      ? 'w-8 bg-purple-500'
                      : 'w-2 bg-slate-600 hover:bg-slate-500'
                      }`}
                  />
                ))}
              </div>

              {/* Card */}
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={currentCard}
                  custom={direction}
                  initial={
                    direction === 'left'
                      ? { x: -300, opacity: 0 }
                      : direction === 'up'
                        ? { y: 300, opacity: 0 }
                        : { x: 300, opacity: 0 }
                  }
                  animate={{ x: 0, y: 0, opacity: 1 }}
                  exit={getExitDirection()}
                  transition={{
                    type: 'spring',
                    stiffness: 300,
                    damping: 30,
                  }}
                  drag
                  dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                  dragElastic={0.7}
                  onDragEnd={handleDragEnd}
                  style={{ x, y, rotateZ, opacity }}
                  className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-slate-700/50 overflow-hidden cursor-grab active:cursor-grabbing"
                >
                  <div className="p-6">
                    {/* Card Header */}
                    <div className="text-center mb-6">
                      {cards[currentCard].icon && (
                        <div className="text-6xl mb-3">
                          {cards[currentCard].icon}
                        </div>
                      )}
                      <h2 className="text-2xl font-bold text-white mb-2">
                        {cards[currentCard].title}
                      </h2>
                      <div className="text-slate-400 text-sm">
                        {currentCard + 1} of {cards.length}
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className="min-h-[400px] max-h-[45vh] overflow-y-auto">
                      {cards[currentCard].content}
                    </div>

                    {/* Navigation Buttons */}
                    <div className="flex items-center justify-between gap-3 mt-6 pt-6 border-t border-slate-700/50">
                      <button
                        onClick={handlePrevious}
                        disabled={currentCard === 0}
                        className="px-6 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed text-white font-semibold transition-all active:scale-95"
                      >
                        Previous
                      </button>

                      <div className="text-slate-500 text-sm">
                        Swipe to navigate
                      </div>

                      <button
                        onClick={
                          currentCard === cards.length - 1
                            ? handleComplete
                            : handleNext
                        }
                        className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold transition-all active:scale-95"
                      >
                        {currentCard === cards.length - 1
                          ? 'Get Started'
                          : 'Next'}
                      </button>
                    </div>
                  </div>

                  {/* Bottom Accent */}
                  <div className="h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500" />
                </motion.div>
              </AnimatePresence>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default OnboardingModal;


