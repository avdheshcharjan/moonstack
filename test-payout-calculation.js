/**
 * Test script to verify payout calculations match the Pricing.txt examples
 */

// Example from Pricing.txt:
// Monthly 100k Up
const monthlyUpExample = {
  name: "Monthly 100k Up",
  pricePerContract: 1906.13,  // Price from order.price / 1e8
  strikeWidth: 2000,           // Max payout (strikes: 98k/100k)
  betSize: 0.1,                // Default bet size ($0.10 USDC)
};

// Monthly 100k Down
const monthlyDownExample = {
  name: "Monthly 100k Down",
  pricePerContract: 191.16,    // Price from order.price / 1e8
  strikeWidth: 2000,           // Max payout (strikes: 100k/102k)
  betSize: 0.1,                // Default bet size ($0.10 USDC)
};

function calculatePayout(pricePerContract, strikeWidth, betSize) {
  const contracts = betSize / pricePerContract;
  const payout = contracts * strikeWidth;
  const multiplier = (payout / betSize).toFixed(2);
  return { contracts, payout, multiplier };
}

console.log("=".repeat(70));
console.log("PAYOUT CALCULATION TEST");
console.log("=".repeat(70));

// Test UP bet
console.log(`\n${monthlyUpExample.name}:`);
console.log(`  Price per contract: $${monthlyUpExample.pricePerContract}`);
console.log(`  Strike width: $${monthlyUpExample.strikeWidth}`);
console.log(`  Bet size: $${monthlyUpExample.betSize}`);

const upResult = calculatePayout(
  monthlyUpExample.pricePerContract,
  monthlyUpExample.strikeWidth,
  monthlyUpExample.betSize
);

console.log(`  → Contracts bought: ${upResult.contracts.toFixed(6)}`);
console.log(`  → Expected payout: $${upResult.payout.toFixed(2)}`);
console.log(`  → Multiplier: ${upResult.multiplier}x`);
console.log(`  → Profit if win: $${(upResult.payout - monthlyUpExample.betSize).toFixed(2)}`);

// Test DOWN bet
console.log(`\n${monthlyDownExample.name}:`);
console.log(`  Price per contract: $${monthlyDownExample.pricePerContract}`);
console.log(`  Strike width: $${monthlyDownExample.strikeWidth}`);
console.log(`  Bet size: $${monthlyDownExample.betSize}`);

const downResult = calculatePayout(
  monthlyDownExample.pricePerContract,
  monthlyDownExample.strikeWidth,
  monthlyDownExample.betSize
);

console.log(`  → Contracts bought: ${downResult.contracts.toFixed(6)}`);
console.log(`  → Expected payout: $${downResult.payout.toFixed(2)}`);
console.log(`  → Multiplier: ${downResult.multiplier}x`);
console.log(`  → Profit if win: $${(downResult.payout - monthlyDownExample.betSize).toFixed(2)}`);

// Test with different bet sizes
console.log("\n" + "=".repeat(70));
console.log("TESTING DIFFERENT BET SIZES");
console.log("=".repeat(70));

const betSizes = [1, 5, 10];
betSizes.forEach(betSize => {
  const result = calculatePayout(
    monthlyUpExample.pricePerContract,
    monthlyUpExample.strikeWidth,
    betSize
  );

  console.log(`\n$${betSize} bet on ${monthlyUpExample.name}:`);
  console.log(`  → Contracts: ${result.contracts.toFixed(6)}`);
  console.log(`  → Payout: $${result.payout.toFixed(2)}`);
  console.log(`  → Multiplier: ${result.multiplier}x`);
  console.log(`  → Profit: $${(result.payout - betSize).toFixed(2)}`);
});

console.log("\n" + "=".repeat(70));
console.log("✓ All calculations complete!");
console.log("=".repeat(70));
