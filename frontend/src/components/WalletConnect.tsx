import React, { useState, useEffect, useCallback } from 'react';
import blockchainService from '../services/blockchain';
import { useWallet } from '../hooks/useWallet';

interface WalletConnectProps {
  onConnect?: (address: string) => void;
  onDisconnect?: () => void;
}

const WalletConnect: React.FC<WalletConnectProps> = ({ onConnect, onDisconnect }) => {
  const { isConnected, address, connect, disconnect } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const checkConnection = useCallback(async () => {
    try {
      if (blockchainService.isConnected()) {
        if (address) {
          onConnect?.(address);
        }
      }
    } catch (error) {
      console.error('Error checking connection:', error);
    }
  }, [address, onConnect]);

  const handleDisconnect = useCallback(() => {
    disconnect();
    onDisconnect?.();
  }, [disconnect, onDisconnect]);

  useEffect(() => {
    // Check if wallet is already connected
    checkConnection();
    
    // Setup wallet change listener
    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        handleDisconnect();
      } else {
        onConnect?.(accounts[0]);
      }
    };

    blockchainService.setupWalletListener(handleAccountsChanged);

    return () => {
      blockchainService.removeWalletListener(handleAccountsChanged);
    };
  }, [checkConnection, handleDisconnect, onConnect]);

  const handleConnect = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      await connect();
      onConnect?.(address);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to connect wallet');
    } finally {
      setIsLoading(false);
    }
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    }}>
      {isConnected ? (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: '#10b981',
            boxShadow: '0 0 8px rgba(16, 185, 129, 0.5)'
          }} />
          <span style={{
            fontSize: '14px',
            fontWeight: '500',
            color: '#1e293b',
            fontFamily: 'monospace'
          }}>
            {formatAddress(address)}
          </span>
          <button
            onClick={handleDisconnect}
            style={{
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.3)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            Disconnect
          </button>
        </div>
      ) : (
        <button
          onClick={handleConnect}
          disabled={isLoading}
          style={{
            background: '#fff',
            color: '#111',
            border: '1.5px solid #111',
            borderRadius: '12px',
            padding: '12px 20px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            transition: 'all 0.3s ease',
            opacity: isLoading ? 0.7 : 1,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: 'none',
          }}
          onMouseOver={(e) => {
            if (!isLoading) {
              e.currentTarget.style.background = '#f3f4f6';
              e.currentTarget.style.color = '#111';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)';
            }
          }}
          onMouseOut={(e) => {
            if (!isLoading) {
              e.currentTarget.style.background = '#fff';
              e.currentTarget.style.color = '#111';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }
          }}
        >
          {isLoading ? (
            <>
              <div style={{
                width: '16px',
                height: '16px',
                border: '2px solid #111',
                borderTop: '2px solid transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
              Connecting...
            </>
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="7" width="18" height="10" rx="5" />
                <circle cx="8" cy="12" r="2" />
                <circle cx="16" cy="12" r="2" />
              </svg>
              Connect Wallet
            </>
          )}
        </button>
      )}
      
      {error && (
        <div style={{
          color: '#ef4444',
          fontSize: '12px',
          marginTop: '4px'
        }}>
          {error}
        </div>
      )}
      
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default WalletConnect; 