import { RawOrderData, ParsedOrder } from '../types/orders';

const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const BTC_FEED = '0x64c911996D3c6aC71f9b455B1E8E7266BcbD848F';

/**
 * Parses raw order data from the API into a structured format for display.
 *
 * Decimal scaling:
 * - Strikes: divided by 1e8 (8 decimals)
 * - Price: divided by 1e8 (8 decimals)
 * - Max collateral: divided by token decimals (6 for USDC, 18 for WETH)
 *
 * Contract calculations: Always use Math.floor() to avoid exceeding approved amounts.
 *
 * @param orderData Raw order data from the API
 * @returns Parsed order with human-readable values
 */
export function parseOrder(orderData: RawOrderData): ParsedOrder {
  const order = orderData.order;
  const strikes = order.strikes.map(s => Number(s) / 1e8);
  const price = Number(order.price) / 1e8;

  const isUSDC = order.collateral.toLowerCase() === USDC_ADDRESS.toLowerCase();
  const decimals = isUSDC ? 1e6 : 1e18;
  const maxSize = Number(order.maxCollateralUsable) / decimals;

  const isBinary = order.type === 'binaries';

  let strategyType: 'BINARY' | 'SPREAD' | 'BUTTERFLY' | 'CONDOR';
  if (isBinary) {
    strategyType = 'BINARY';
  } else if (strikes.length === 2) {
    strategyType = 'SPREAD';
  } else if (strikes.length === 3) {
    strategyType = 'BUTTERFLY';
  } else if (strikes.length === 4) {
    strategyType = 'CONDOR';
  } else {
    strategyType = 'SPREAD';
  }

  const underlying = order.priceFeed.toLowerCase() === BTC_FEED.toLowerCase() ? 'BTC' : 'ETH';

  return {
    strategyType,
    underlying,
    isCall: order.isCall,
    strikes,
    strikeWidth: strikes.length >= 2 ? Math.abs(strikes[1] - strikes[0]) : 0,
    expiry: new Date(order.expiry * 1000),
    pricePerContract: price,
    maxSize,
    rawOrder: orderData,
    isBinary,
    binaryName: isBinary ? order.name : undefined
  };
}
