import React from 'react';
import { useWallet } from '../hooks/useWallet';

interface WalletProtectionProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const WalletProtection: React.FC<WalletProtectionProps> = ({ children, fallback }) => {
  const { isConnected, connect } = useWallet();

  if (isConnected) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      padding: '40px',
      textAlign: 'center'
    }}>
      <div style={{
        background: '#fff',
        padding: '40px',
        borderRadius: '16px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        maxWidth: '500px',
        width: '100%'
      }}>
        <div style={{
          width: '80px',
          height: '80px',
          background: '#f3f4f6',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px',
          border: '3px solid #e5e7eb'
        }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
        </div>
        
        <h2 style={{
          fontSize: '1.5rem',
          fontWeight: '600',
          color: '#111',
          marginBottom: '12px'
        }}>
          Wallet Connection Required
        </h2>
        
        <p style={{
          color: '#6b7280',
          fontSize: '1rem',
          lineHeight: '1.5',
          marginBottom: '32px'
        }}>
          Untuk mengakses fitur ini, Anda harus terhubung dengan wallet terlebih dahulu. 
          Wallet akan digunakan sebagai identitas Anda dalam sistem.
        </p>
        
        <button
          onClick={connect}
          style={{
            background: '#111',
            color: '#fff',
            border: 'none',
            borderRadius: '12px',
            padding: '14px 32px',
            fontSize: '1rem',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            margin: '0 auto'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#333';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#111';
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
          </svg>
          Connect Wallet
        </button>
        
        <div style={{
          marginTop: '24px',
          padding: '16px',
          background: '#f9fafb',
          borderRadius: '8px',
          border: '1px solid #e5e7eb'
        }}>
          <p style={{
            fontSize: '0.875rem',
            color: '#6b7280',
            margin: 0
          }}>
            <strong>Mengapa perlu wallet?</strong><br/>
            Wallet digunakan sebagai identitas unik Anda untuk:
          </p>
          <ul style={{
            fontSize: '0.875rem',
            color: '#6b7280',
            margin: '8px 0 0 0',
            paddingLeft: '20px',
            textAlign: 'left'
          }}>
            <li>Mengupload dan menyimpan video ke IPFS</li>
            <li>Mencatat transaksi di blockchain</li>
            <li>Melihat riwayat upload pribadi</li>
            <li>Memverifikasi kepemilikan konten</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default WalletProtection; 