/// <reference path="../global.d.ts" />
import { useState, useEffect } from 'react';
import { BASE_CHAIN_ID } from '../utils/contracts';
import { getCryptoKeyAccount } from '@base-org/account';
import { baseAccountSDK } from '../providers/BaseAccountProvider';

interface UseWalletReturn {
  walletAddress: string | null;
  chainId: number | null;
  isConnecting: boolean;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
}

const WALLET_STORAGE_KEY = 'moonstack_wallet_address';
const CHAIN_STORAGE_KEY = 'moonstack_chain_id';

export function useWallet(): UseWalletReturn {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);

  const connectWallet = async (): Promise<void> => {
    try {
      console.log('[useWallet] Connecting to Base Account...');
      setIsConnecting(true);

      // Use Base Account SDK exclusively - no fallback to MetaMask/Coinbase Wallet
      const provider = baseAccountSDK.getProvider();
      console.log('[useWallet] Base Account provider initialized');

      // Request connection via wallet_connect
      const response = await provider.request({ method: 'wallet_connect' }) as any;
      console.log('[useWallet] wallet_connect response:', response);

      // Handle the response structure: { accounts: [{ address: '0x...' }], chainIds: [...] }
      if (response?.accounts && response.accounts.length > 0) {
        // Extract the smart account address from the first account object
        const smartAccountAddress = response.accounts[0].address;
        console.log('[useWallet] Base Account connection response:', response);
        console.log('[useWallet] Base Account address:', smartAccountAddress);
        console.log('[useWallet] Full account object:', response.accounts[0]);

        // Save and set the smart account address
        setWalletAddress(smartAccountAddress);
        setChainId(BASE_CHAIN_ID);
        localStorage.setItem(WALLET_STORAGE_KEY, smartAccountAddress);
        localStorage.setItem(CHAIN_STORAGE_KEY, BASE_CHAIN_ID.toString());
      } else {
        console.error('[useWallet] No accounts returned from Base Account');
        throw new Error('Failed to connect to Base Account. Please try again.');
      }
    } catch (error) {
      console.error('[useWallet] Error connecting to Base Account:', error);
      alert('Failed to connect to Base Account. Please try again.');
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = (): void => {
    setWalletAddress(null);
    setChainId(null);
    localStorage.removeItem(WALLET_STORAGE_KEY);
    localStorage.removeItem(CHAIN_STORAGE_KEY);

    // Also clear Base Account session if exists
    // Note: Base Account SDK doesn't have a direct logout method,
    // but clearing localStorage prevents auto-reconnect
    console.log('Wallet disconnected');
  };

  // Restore wallet connection on mount - only run once
  useEffect(() => {
    const restoreConnection = async (): Promise<void> => {
      if (typeof window === 'undefined') return;

      const savedAddress = localStorage.getItem(WALLET_STORAGE_KEY);
      const savedChainId = localStorage.getItem(CHAIN_STORAGE_KEY);

      if (!savedAddress) return;

      console.log('[useWallet] Restore: Attempting to restore saved address:', savedAddress);

      try {
        // Use Base Account SDK exclusively
        const provider = baseAccountSDK.getProvider();
        const response = await provider.request({ method: 'eth_accounts' }) as any;
        console.log('[useWallet] Restore: eth_accounts response:', response);

        // Handle both response formats: string[] or { accounts: [{ address: '0x...' }] }
        let smartAccountAddress: string | null = null;

        if (Array.isArray(response) && response.length > 0) {
          // Old format: string array
          smartAccountAddress = response[0];
        } else if (response?.accounts && response.accounts.length > 0) {
          // New format: object with accounts array
          smartAccountAddress = response.accounts[0].address;
        }

        if (smartAccountAddress) {
          console.log('[useWallet] Restore: Base Account smart wallet found:', smartAccountAddress);

          // Check if this matches the saved address
          if (smartAccountAddress.toLowerCase() === savedAddress.toLowerCase()) {
            setWalletAddress(smartAccountAddress);
            setChainId(savedChainId ? parseInt(savedChainId) : BASE_CHAIN_ID);
            console.log('[useWallet] Restore: Base Account restored successfully');
            return;
          } else {
            console.log('[useWallet] Restore: Base Account address mismatch - different account connected');
            console.log('[useWallet] Expected:', savedAddress);
            console.log('[useWallet] Got:', smartAccountAddress);
            console.log('[useWallet] Clearing old address. User needs to reconnect.');
            // Clear silently - don't set state, just clean localStorage
            localStorage.removeItem(WALLET_STORAGE_KEY);
            localStorage.removeItem(CHAIN_STORAGE_KEY);
          }
        } else {
          console.log('[useWallet] Restore: No Base Account connected');
          // Clear saved address if no account is connected
          localStorage.removeItem(WALLET_STORAGE_KEY);
          localStorage.removeItem(CHAIN_STORAGE_KEY);
        }
      } catch (error) {
        console.log('[useWallet] Restore: Error checking Base Account:', error);
        // Don't clear storage on error - user might just need to reconnect
      }
    };

    restoreConnection();
  }, []);

  // Base Account SDK doesn't emit accountsChanged/chainChanged events like window.ethereum
  // Account changes are handled through the Base Account SDK modal/UI
  // No event listeners needed

  return {
    walletAddress,
    chainId,
    isConnecting,
    connectWallet,
    disconnectWallet,
  };
}
