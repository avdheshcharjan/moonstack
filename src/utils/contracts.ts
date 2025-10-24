/**
 * OptionBook contract address on Base (v2 - r10)
 * @see https://basescan.org/address/0xd58b814C7Ce700f251722b5555e25aE0fa8169A1
 */
export const OPTION_BOOK_ADDRESS = '0xd58b814C7Ce700f251722b5555e25aE0fa8169A1';

/**
 * USDC contract address on Base
 * @see https://basescan.org/address/0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
 */
export const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

/**
 * WETH contract address on Base
 * @see https://basescan.org/address/0x4200000000000000000000000000000000000006
 */
export const WETH_ADDRESS = '0x4200000000000000000000000000000000000006';

/**
 * Unique referrer address for tracking positions
 */
export const REFERRER_ADDRESS = '0x0000000000000000000000000000000000000001';

/**
 * BTC price feed address on Base
 * @see https://basescan.org/address/0x64c911996D3c6aC71f9b455B1E8E7266BcbD848F
 */
export const BTC_FEED = '0x64c911996D3c6aC71f9b455B1E8E7266BcbD848F';

/**
 * ETH price feed address on Base
 * @see https://basescan.org/address/0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70
 */
export const ETH_FEED = '0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70';

/**
 * SOL price feed address on Base
 */
export const SOL_FEED = '0x975043adBb80fc32276CbF9Bbcfd4A601a12462D';

/**
 * BNB price feed address on Base
 */
export const BNB_FEED = '0x4b7836916781CAAfbb7Bd1E5FDd20ED544B453b1';

/**
 * XRP price feed address on Base
 */
export const XRP_FEED = '0x9f0C1dD78C4CBdF5b9cf923a549A201EdC676D34';

/**
 * DOGE price feed address on Base
 */
export const DOGE_FEED = '0x8422f3d3CAFf15Ca682939310d6A5e619AE08e57';

/**
 * PAXG price feed address on Base
 */
export const PAXG_FEED = '0x5213eBB69743b85644dbB6E25cdF994aFBb8cF31';

/**
 * Base network chain ID
 */
export const BASE_CHAIN_ID = 8453;

/**
 * EntryPoint contract address for ERC-4337 (v0.7)
 * @see https://docs.alchemy.com/docs/entrypoint-addresses
 */
export const ENTRYPOINT_ADDRESS = '0x0000000071727De22E5E9d8BAf0edAc6f37da032';

/**
 * Bundler URL for Base network (configure in .env.local)
 */
export const BUNDLER_URL = process.env.NEXT_PUBLIC_BUNDLER_URL || '';

/**
 * Paymaster URL for Base network (configure in .env.local)
 */
export const PAYMASTER_URL = process.env.NEXT_PUBLIC_PAYMASTER_URL || '';

/**
 * OptionBook ABI (v2) - uses fillOrder method
 */
export const OPTION_BOOK_ABI = [
  {
    "inputs": [
      {
        "components": [
          { "internalType": "address", "name": "maker", "type": "address" },
          { "internalType": "uint256", "name": "orderExpiryTimestamp", "type": "uint256" },
          { "internalType": "address", "name": "collateral", "type": "address" },
          { "internalType": "bool", "name": "isCall", "type": "bool" },
          { "internalType": "address", "name": "priceFeed", "type": "address" },
          { "internalType": "address", "name": "implementation", "type": "address" },
          { "internalType": "bool", "name": "isLong", "type": "bool" },
          { "internalType": "uint256", "name": "maxCollateralUsable", "type": "uint256" },
          { "internalType": "uint256[]", "name": "strikes", "type": "uint256[]" },
          { "internalType": "uint256", "name": "expiry", "type": "uint256" },
          { "internalType": "uint256", "name": "price", "type": "uint256" },
          { "internalType": "uint256", "name": "numContracts", "type": "uint256" },
          { "internalType": "bytes", "name": "extraOptionData", "type": "bytes" }
        ],
        "internalType": "struct OptionBook.Order",
        "name": "order",
        "type": "tuple"
      },
      { "internalType": "bytes", "name": "signature", "type": "bytes" },
      { "internalType": "address", "name": "referrer", "type": "address" }
    ],
    "name": "fillOrder",
    "outputs": [{ "internalType": "address", "name": "optionAddress", "type": "address" }],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

/**
 * ERC20 ABI - approve, allowance, and balanceOf functions
 */
export const ERC20_ABI = [
  {
    "inputs": [
      { "internalType": "address", "name": "spender", "type": "address" },
      { "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "approve",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "owner", "type": "address" },
      { "internalType": "address", "name": "spender", "type": "address" }
    ],
    "name": "allowance",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "owner", "type": "address" }
    ],
    "name": "balanceOf",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
] as const;
