'use client';

import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { BASE_CHAIN_ID } from '../utils/contracts';

export interface WalletContextType {
    walletAddress: string | null;
    chainId: number | null;
    isConnecting: boolean;
    connectWallet: () => Promise<void>;
    disconnectWallet: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
    const { address, chainId, isConnecting: wagmiIsConnecting } = useAccount();
    const { connect, connectors } = useConnect();
    const { disconnect } = useDisconnect();
    
    const [walletAddress, setWalletAddress] = useState<string | null>(null);
    const [localChainId, setLocalChainId] = useState<number | null>(null);

    // Sync wagmi state with local state
    useEffect(() => {
        if (address) {
            console.log('✅ Wallet connected via OnchainKit:', address);
            setWalletAddress(address);
        } else {
            setWalletAddress(null);
        }
    }, [address]);

    useEffect(() => {
        if (chainId) {
            console.log('🔄 Chain ID:', chainId);
            setLocalChainId(chainId);
            
            // If switched away from Base, disconnect
            if (chainId !== BASE_CHAIN_ID) {
                console.log('⚠️ Not on Base chain');
            }
        } else {
            setLocalChainId(null);
        }
    }, [chainId]);

    const connectWallet = async (): Promise<void> => {
        try {
            console.log('🔵 Connecting wallet via OnchainKit...');
            
            // Find Coinbase Wallet connector
            const coinbaseConnector = connectors.find(
                (connector) => connector.id === 'coinbaseWalletSDK'
            );
            
            if (coinbaseConnector) {
                connect({ connector: coinbaseConnector });
            } else {
                console.error('❌ Coinbase Wallet connector not found');
                alert('Wallet connector not available. Please refresh the page.');
            }
        } catch (error) {
            console.error('❌ Error connecting wallet:', error);
            alert('Connection failed. Please try again.');
        }
    };

    const disconnectWallet = (): void => {
        console.log('🔴 Disconnecting wallet');
        disconnect();
    };

    const value: WalletContextType = {
        walletAddress,
        chainId: localChainId,
        isConnecting: wagmiIsConnecting,
        connectWallet,
        disconnectWallet,
    };

    return (
        <WalletContext.Provider value={value}>
            {children}
        </WalletContext.Provider>
    );
}

export function useWallet(): WalletContextType {
    const context = useContext(WalletContext);

    if (context === undefined) {
        throw new Error('useWallet must be used within a WalletProvider');
    }

    return context;
}
