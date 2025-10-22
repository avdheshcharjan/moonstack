import React, { useState } from 'react';

interface FAQItem {
  question: string;
  answer: string;
}

const FAQ: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqItems: FAQItem[] = [
    {
      question: 'What is this prediction platform?',
      answer: 'This is a binary options trading platform where you can predict whether cryptocurrency prices will go up (PUMP) or down (DUMP) by a specific expiry time. You bet with USDC and earn rewards based on market probabilities.',
    },
    {
      question: 'How do I place a prediction?',
      answer: 'Connect your wallet, select your default bet size in settings, then swipe right for PUMP (price goes up), swipe left for DUMP (price goes down), or swipe up to SKIP. Your predictions are batched and executed together when you confirm.',
    },
    {
      question: 'What does the payout calculation mean?',
      answer: 'The payout shown includes your bet amount plus potential profit. For example, if you bet $5 and see $6.50 (1.3x), you get back $6.50 total if you win - that is your $5 bet plus $1.50 profit.',
    },
    {
      question: 'How is the payout determined?',
      answer: 'Payouts are based on market probabilities. Higher probability outcomes pay less, while lower probability outcomes pay more. The multiplier shown (e.g., 1.3x) indicates your total return relative to your bet size.',
    },
    {
      question: 'What is the implied probability?',
      answer: 'The bearish/bullish spectrum shows the market\'s implied probability that the price will go up or down. This is calculated from the option prices and helps you assess the market sentiment.',
    },
    {
      question: 'When do predictions expire?',
      answer: 'Each prediction card shows the time remaining until expiry. You can see countdowns like "2d" (2 days), "5h" (5 hours), or "30m" (30 minutes). Your position settles at the expiry time.',
    },
    {
      question: 'How does batched trading work?',
      answer: 'Instead of executing each prediction immediately, your predictions are added to a batch. You can review all your predictions and submit them together in a single transaction, saving on gas fees.',
    },
    {
      question: 'Can I change my default bet size?',
      answer: 'Yes! Go to "My Bets" tab and select your preferred bet size ($1, $5, $10, or $25). This setting is saved per wallet address and applies to all future predictions.',
    },
    {
      question: 'Where can I see my active predictions?',
      answer: 'Go to the "My Bets" tab to view all your predictions. You can switch between "Ongoing" to see active positions and "Completed" to see expired predictions.',
    },
    {
      question: 'What cryptocurrencies can I predict on?',
      answer: 'Currently, you can make predictions on major cryptocurrencies including Bitcoin (BTC), Ethereum (ETH), BNB, Solana (SOL), and XRP. More assets may be added in the future.',
    },
    {
      question: 'Do I need USDC to place predictions?',
      answer: 'Yes, all predictions are placed using USDC. Make sure you have sufficient USDC balance in your connected wallet before placing predictions.',
    },
    {
      question: 'What happens if the price is exactly at the threshold?',
      answer: 'Binary options typically settle based on whether the price is strictly above or below the strike price at expiry. Check the specific contract terms for exact settlement rules.',
    },
  ];

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="text-center mb-8">
        <div className="text-6xl mb-4">❓</div>
        <h1 className="text-3xl font-bold text-white mb-2">Frequently Asked Questions</h1>
        <p className="text-slate-400">Everything you need to know about making predictions</p>
      </div>

      <div className="space-y-3">
        {faqItems.map((item, index) => (
          <div
            key={index}
            className="bg-slate-800/50 rounded-2xl border border-slate-700 overflow-hidden"
          >
            <button
              onClick={() => toggleFAQ(index)}
              className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-slate-700/30 transition-colors"
            >
              <span className="text-white font-semibold pr-4">{item.question}</span>
              <svg
                className={`w-5 h-5 text-purple-400 flex-shrink-0 transition-transform ${
                  openIndex === index ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            {openIndex === index && (
              <div className="px-6 pb-4 text-slate-300 leading-relaxed">
                {item.answer}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default FAQ;
