'use client';

import React from 'react';
import Link from 'next/link';

interface FAQItem {
  question: string;
  answer: string | JSX.Element;
  category: string;
}

const FAQPage = () => {
  const faqs: FAQItem[] = [
    {
      category: 'Getting Started',
      question: 'What is Thetanuts Options Trading?',
      answer: 'Thetanuts is a decentralized options trading platform built on the Base network. It allows you to trade various options strategies including spreads, butterflies, condors, and binary options on crypto assets like BTC and ETH.'
    },
    {
      category: 'Getting Started',
      question: 'How do I get started?',
      answer: (
        <>
          <ol className="list-decimal list-inside space-y-2">
            <li>Click "Connect Wallet" or "Sign in with Base" in the top right corner</li>
            <li>Follow the prompts to create or connect your Base Account (Smart Wallet)</li>
            <li>Ensure you have USDC in your wallet for trading</li>
            <li>Browse the market and select an option to trade</li>
          </ol>
        </>
      )
    },
    {
      category: 'Getting Started',
      question: 'What wallet do I need?',
      answer: 'You can sign in with Base Account (Smart Wallet). No browser extension needed! The platform uses Base\'s native Smart Wallet technology, which creates a secure wallet for you automatically when you sign in.'
    },
    {
      category: 'Trading Basics',
      question: 'What network should I use?',
      answer: 'All trading happens on the Base network (Chain ID: 8453). When you connect your wallet, you\'ll be prompted to switch to Base if you\'re not already on it.'
    },
    {
      category: 'Trading Basics',
      question: 'What is USDC and why do I need it?',
      answer: 'USDC is a stablecoin pegged to the US Dollar. You need USDC in your wallet to purchase options. The platform uses USDC (with 6 decimals) as the primary collateral for options trading on Base.'
    },
    {
      category: 'Trading Basics',
      question: 'How do I buy an option?',
      answer: (
        <>
          <ol className="list-decimal list-inside space-y-2">
            <li>Sign in with Base Account (Smart Wallet)</li>
            <li>Browse available options using the filters</li>
            <li>Click on an option card to view details</li>
            <li>Select your bet size ($1, $5, $10, or $25)</li>
            <li>Click "Buy Option" and approve the transaction</li>
            <li>The platform will first approve USDC spending, then execute the trade</li>
          </ol>
        </>
      )
    },
    {
      category: 'Option Types',
      question: 'What are the different option types?',
      answer: (
        <>
          <ul className="list-disc list-inside space-y-2">
            <li><strong>Binary Options:</strong> Simple up/down bets on whether the price will be above or below a range at expiry</li>
            <li><strong>Spreads (2 strikes):</strong> Buy one strike and sell another to limit risk and reward</li>
            <li><strong>Butterflies (3 strikes):</strong> Profit when the price stays near the middle strike</li>
            <li><strong>Condors (4 strikes):</strong> Profit when the price stays within a range</li>
          </ul>
        </>
      )
    },
    {
      category: 'Option Types',
      question: 'What is a binary option?',
      answer: 'A binary option is a simple bet on whether the asset price will be above (for calls) or below (for puts) a specified price range at expiry. They have a fixed payout and are easier to understand than traditional options strategies.'
    },
    {
      category: 'Option Types',
      question: 'What is the difference between Call and Put options?',
      answer: 'Call options profit when the price goes UP, while Put options profit when the price goes DOWN. Choose calls if you\'re bullish and puts if you\'re bearish on the underlying asset.'
    },
    {
      category: 'Trading Mechanics',
      question: 'How do bet sizes work?',
      answer: 'You can select preset bet sizes of $1, $5, $10, or $25 USDC. The platform automatically calculates how many contracts you can buy based on the premium per contract. Larger bets give you more contracts and higher potential payouts.'
    },
    {
      category: 'Trading Mechanics',
      question: 'What is the max payout?',
      answer: 'The max payout depends on the strike width and number of contracts. For example, a spread with a $1,000 strike width and 0.5 contracts would have a max payout of $500. The exact calculation is shown in the order details modal.'
    },
    {
      category: 'Trading Mechanics',
      question: 'What is the premium?',
      answer: 'The premium is the price you pay per contract to enter the position. It\'s shown in USDC and is deducted from your wallet when you buy. The premium is what you can lose if the option expires out of the money.'
    },
    {
      category: 'Trading Mechanics',
      question: 'What is ROI (Return on Investment)?',
      answer: 'ROI shows your potential profit as a percentage of your bet. For example, if you bet $10 and the max payout is $100, your ROI is 1000%. Higher ROI options typically have lower probability of success.'
    },
    {
      category: 'Portfolio & Positions',
      question: 'How do I view my positions?',
      answer: 'Click the "My Positions" tab at the top of the page. You\'ll see all your active positions, including how much you invested, expiry dates, and transaction hashes. You must have your wallet connected to view positions.'
    },
    {
      category: 'Portfolio & Positions',
      question: 'Can I sell my options before expiry?',
      answer: 'Currently, the platform does not support selling options before expiry. Options must be held until expiration. This is a limitation of the current smart contract implementation.'
    },
    {
      category: 'Portfolio & Positions',
      question: 'What happens at expiry?',
      answer: 'At expiry, the option is automatically settled based on the final price of the underlying asset. If the option expires in the money, you receive the payout automatically. If it expires out of the money, you lose your premium.'
    },
    {
      category: 'Portfolio & Positions',
      question: 'How are positions stored?',
      answer: 'Your positions are stored locally in your browser (localStorage) and linked to your wallet address. If you clear your browser data or use a different browser, you won\'t see your positions, but they\'re still recorded on the blockchain and can be verified via BaseScan.'
    },
    {
      category: 'Technical Details',
      question: 'What is the OptionBook contract?',
      answer: 'The OptionBook contract (0xd58b814C7Ce700f251722b5555e25aE0fa8169A1) is the smart contract on Base that handles all option trades. It uses the fillOrder method to execute trades and manages the option lifecycle.'
    },
    {
      category: 'Technical Details',
      question: 'What is a referrer address?',
      answer: 'The referrer address tracks who referred users to the platform. It\'s currently set to a default address but can be customized. Referrers may earn rewards based on trading volume from their referrals.'
    },
    {
      category: 'Technical Details',
      question: 'Why do I need to approve USDC?',
      answer: 'Before trading, you must approve the OptionBook contract to spend your USDC. This is a standard security measure in DeFi that allows the contract to pull the exact amount needed for your trade.'
    },
    {
      category: 'Technical Details',
      question: 'What price feeds are used?',
      answer: (
        <>
          The platform uses Chainlink price feeds on Base:
          <ul className="list-disc list-inside mt-2 ml-4">
            <li>BTC: 0x64c911996D3c6aC71f9b455B1E8E7266BcbD848F</li>
            <li>ETH: 0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70</li>
          </ul>
        </>
      )
    },
    {
      category: 'Risks & Safety',
      question: 'What are the risks?',
      answer: (
        <>
          <ul className="list-disc list-inside space-y-2">
            <li><strong>Loss of Premium:</strong> You can lose 100% of your premium if the option expires out of the money</li>
            <li><strong>Smart Contract Risk:</strong> While audited, smart contracts can have bugs or vulnerabilities</li>
            <li><strong>Market Risk:</strong> Crypto markets are highly volatile and unpredictable</li>
            <li><strong>No Early Exit:</strong> You cannot sell options before expiry</li>
            <li><strong>Gas Fees:</strong> Network fees can add up, especially during high congestion</li>
          </ul>
        </>
      )
    },
    {
      category: 'Risks & Safety',
      question: 'Is this platform audited?',
      answer: 'You should verify the audit status of the smart contracts independently. Always do your own research before trading with real funds.'
    },
    {
      category: 'Risks & Safety',
      question: 'What if I lose my wallet access?',
      answer: 'If you lose access to your wallet, you lose access to your positions and any profits. Always keep your seed phrase secure and backed up. Never share it with anyone.'
    },
    {
      category: 'Features',
      question: 'How often is market data updated?',
      answer: 'Market data is fetched when you load the page or click the "Refresh Orders" button. In production, it\'s recommended to refresh every 30 seconds to get the latest prices and available orders.'
    },
    {
      category: 'Features',
      question: 'Can I filter orders?',
      answer: 'Yes! You can filter by strategy type (spreads, butterflies, condors), underlying asset (BTC or ETH), and switch between regular options and binary options using the filters at the top of the market page.'
    },
    {
      category: 'Features',
      question: 'What does "Max Size" mean?',
      answer: 'Max Size shows the maximum amount of collateral (in USDC) that can be used for that specific order. This is set by the order maker and represents the largest position you can take.'
    }
  ];

  const categories = Array.from(new Set(faqs.map(faq => faq.category)));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <Link
            href="/"
            className="inline-block mb-4 text-blue-100 hover:text-white transition"
          >
            ← Back to Market
          </Link>
          <h1 className="text-4xl font-bold mb-2">Frequently Asked Questions</h1>
          <p className="text-blue-100">Everything you need to know about trading options on Thetanuts</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Quick Navigation */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">Quick Navigation</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {categories.map((category) => (
              <a
                key={category}
                href={`#${category.toLowerCase().replace(/\s+/g, '-')}`}
                className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition text-center font-semibold"
              >
                {category}
              </a>
            ))}
          </div>
        </div>

        {/* FAQ by Category */}
        {categories.map((category) => (
          <div
            key={category}
            id={category.toLowerCase().replace(/\s+/g, '-')}
            className="mb-8"
          >
            <h2 className="text-2xl font-bold mb-4 text-gray-800 border-b-2 border-blue-600 pb-2">
              {category}
            </h2>
            <div className="space-y-4">
              {faqs
                .filter(faq => faq.category === category)
                .map((faq, index) => (
                  <div
                    key={index}
                    className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition"
                  >
                    <h3 className="text-lg font-bold text-gray-800 mb-3">
                      {faq.question}
                    </h3>
                    <div className="text-gray-700 leading-relaxed">
                      {faq.answer}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}

        {/* Still Have Questions */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg shadow-lg p-8 text-center">
          <h2 className="text-2xl font-bold mb-3">Still Have Questions?</h2>
          <p className="mb-6 text-blue-100">
            Can&apos;t find what you&apos;re looking for? Check the official documentation or join our community.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <a
              href="https://docs.thetanuts.finance/"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white text-blue-600 px-6 py-3 rounded-lg font-bold hover:bg-blue-50 transition"
            >
              View Docs
            </a>
            <Link
              href="/"
              className="bg-white/20 text-white px-6 py-3 rounded-lg font-bold hover:bg-white/30 transition"
            >
              Back to Trading
            </Link>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-8 bg-yellow-50 border-l-4 border-yellow-500 p-6 rounded">
          <h3 className="font-bold text-yellow-800 mb-2">⚠️ Important Disclaimer</h3>
          <p className="text-yellow-700 text-sm">
            Options trading involves significant risk and may not be suitable for all investors. You can lose your entire investment.
            Past performance does not guarantee future results. This platform is provided for informational and educational purposes.
            Always do your own research and never invest more than you can afford to lose. Cryptocurrency trading carries additional risks
            due to market volatility and regulatory uncertainty.
          </p>
        </div>
      </div>
    </div>
  );
};

export default FAQPage;
