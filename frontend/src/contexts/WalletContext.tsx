import React, { createContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import blockchainService from '../services/blockchain';

interface WalletContextType {
  isConnected: boolean;
  address: string;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState('');

  useEffect(() => {
    // On mount, check if wallet is already connected
    const check = async () => {
      if (blockchainService.isConnected()) {
        const addr = await blockchainService.getCurrentAccount();
        if (addr) {
          setIsConnected(true);
          setAddress(addr);
        }
      }
    };
    check();

    // Listen for account changes
    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        setIsConnected(false);
        setAddress('');
      } else {
        setIsConnected(true);
        setAddress(accounts[0]);
      }
    };
    blockchainService.setupWalletListener(handleAccountsChanged);
    return () => blockchainService.removeWalletListener(handleAccountsChanged);
  }, []);

  const connect = async () => {
    const addr = await blockchainService.connectWallet();
    if (addr) {
      setIsConnected(true);
      setAddress(addr);
    }
  };

  const disconnect = () => {
    setIsConnected(false);
    setAddress('');
  };

  return (
    <WalletContext.Provider value={{ isConnected, address, connect, disconnect }}>
      {children}
    </WalletContext.Provider>
  );
};

// Export the context for use in the hook file
export { WalletContext };
export type { WalletContextType }; 