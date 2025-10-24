/// <reference path="../global.d.ts" />
import { useState, useEffect } from 'react';
import { BrowserProvider } from 'ethers';
import { BASE_CHAIN_ID } from '../utils/contracts';
import { getCryptoKeyAccount } from '@base-org/account';

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
      setIsConnecting(true);

      // Only use Base Account SDK - no fallback to injected wallet
      try {
        // Check if already connected
        const existingAccount = await getCryptoKeyAccount();

        if (existingAccount?.account?.address) {
          const address = existingAccount.account.address;
          // Only log if this is a new connection (not already set)
          if (!walletAddress || walletAddress.toLowerCase() !== address.toLowerCase()) {
            console.log('Base Account connected:', address);
          }
          setWalletAddress(address);
          setChainId(BASE_CHAIN_ID);
          localStorage.setItem(WALLET_STORAGE_KEY, address);
          localStorage.setItem(CHAIN_STORAGE_KEY, BASE_CHAIN_ID.toString());
          return;
        }

        // If not connected, silently return (user needs to click the SignInWithBaseButton)
        // Don't log repeatedly to avoid console spam
      } catch (baseAccountError) {
        // Silently handle - Base Account not available yet
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
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

  // Restore wallet connection on mount - but don't auto-reconnect Base Account
  useEffect(() => {
    const restoreConnection = async (): Promise<void> => {
      if (typeof window === 'undefined') return;

      const savedAddress = localStorage.getItem(WALLET_STORAGE_KEY);
      const savedChainId = localStorage.getItem(CHAIN_STORAGE_KEY);

      if (!savedAddress) return;

      try {
        // Try Base Account SDK first - only restore if ALREADY authenticated
        try {
          const cryptoAccount = await getCryptoKeyAccount();

          if (cryptoAccount?.account?.address) {
            // Only restore if the saved address matches the current Base Account
            if (cryptoAccount.account.address.toLowerCase() === savedAddress.toLowerCase()) {
              console.log('Restoring Base Account connection');
              setWalletAddress(cryptoAccount.account.address);
              setChainId(savedChainId ? parseInt(savedChainId) : BASE_CHAIN_ID);
              return;
            } else {
              // Different account - clear saved data
              console.log('Saved address does not match Base Account, clearing');
              localStorage.removeItem(WALLET_STORAGE_KEY);
              localStorage.removeItem(CHAIN_STORAGE_KEY);
              return;
            }
          }
        } catch (baseError) {
          console.log('Base Account not available for auto-connect');
        }

        // If Base Account is not available, DON'T auto-restore
        // User should explicitly click Sign in with Base button
        console.log('Base Account not connected, clearing saved address');
        localStorage.removeItem(WALLET_STORAGE_KEY);
        localStorage.removeItem(CHAIN_STORAGE_KEY);
      } catch (error) {
        console.error('Error restoring wallet connection:', error);
        localStorage.removeItem(WALLET_STORAGE_KEY);
        localStorage.removeItem(CHAIN_STORAGE_KEY);
      }
    };

    restoreConnection();
  }, []);

  // Listen for Base Account changes via polling (Base Account SDK doesn't have events)
  useEffect(() => {
    if (!walletAddress) return;

    const checkInterval = setInterval(async () => {
      try {
        const cryptoAccount = await getCryptoKeyAccount();

        // If Base Account is disconnected, clear the wallet state
        if (!cryptoAccount?.account?.address) {
          console.log('Base Account disconnected, clearing wallet state');
          disconnectWallet();
        }
        // If different account, update the state
        else if (cryptoAccount.account.address.toLowerCase() !== walletAddress.toLowerCase()) {
          console.log('Base Account changed, updating wallet address');
          setWalletAddress(cryptoAccount.account.address);
          localStorage.setItem(WALLET_STORAGE_KEY, cryptoAccount.account.address);
        }
      } catch (error) {
        console.log('Error checking Base Account status:', error);
      }
    }, 3000); // Check every 3 seconds

    return () => clearInterval(checkInterval);
  }, [walletAddress]);

  return {
    walletAddress,
    chainId,
    isConnecting,
    connectWallet,
    disconnectWallet,
  };
}
